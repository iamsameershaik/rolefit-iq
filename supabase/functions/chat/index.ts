import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handleCors } from "../_shared/cors.ts";
import { ok, err, internalError } from "../_shared/response.ts";
import { createServiceClient } from "../_shared/supabaseClient.ts";
import { createLogger } from "../_shared/logger.ts";
import { validateSessionId, requiredString } from "../_shared/validation.ts";
import { AI_EVENT_TYPE, RETRIEVAL, EMBEDDING, LLM } from "../_shared/constants.ts";
import { OpenAIProvider } from "../_shared/openaiProvider.ts";
import { retrieveRelevantChunks } from "../_shared/retrieval.ts";
import {
  findOutOfRangeJD,
  parseAllJDReferences,
  deriveSlotId,
} from "../_shared/roleValidation.ts";
import type { RetrievedChunk } from "../_shared/types.ts";

const log = createLogger("chat");

// ── Build labelled multi-JD context block ────────────────────────────────────
// When the user asks about multiple JDs (e.g. "Compare JD 2 and JD 3"),
// we retrieve chunks per slot and build an explicitly labelled context block.
// This prevents the LLM from confusing JD 2 evidence with JD 3 evidence.
async function buildMultiSlotContext(
  supabase: ReturnType<typeof createServiceClient>,
  provider: OpenAIProvider,
  sessionId: string,
  question: string,
  slotIndices: number[],
  availableByIndex: Record<number, { title: string | null; slot_id: string | null }>,
): Promise<{ context: string; allChunks: RetrievedChunk[] }> {
  const allChunks: RetrievedChunk[] = [];
  const blocks: string[] = [];

  for (const idx of slotIndices) {
    const slotId = deriveSlotId("job_description", idx);
    const meta = availableByIndex[idx];

    if (!meta) {
      blocks.push(
        `=== JD ${idx} (${slotId.toUpperCase()}) ===\n[NOT UPLOADED — this job description has not been indexed in this session]`
      );
      continue;
    }

    const title   = meta.title ?? `Job ${idx}`;
    const titleLine = `=== JD ${idx} / slot ${slotId} / "${title}" ===`;

    // Retrieve chunks scoped exactly to this job_index
    const result = await retrieveRelevantChunks(supabase, provider, {
      session_id:           sessionId,
      query:                question,
      match_count:          6,
      filter_document_type: "job_description",
      filter_job_index:     idx,
    });

    if (result.chunks.length === 0) {
      blocks.push(`${titleLine}\n[No evidence chunks found for this JD]`);
    } else {
      const chunkLines = result.chunks.map((c, i) => {
        const label = `${slotId.toUpperCase()} · ${c.section_label ?? "General"} · Chunk ${String(c.chunk_index).padStart(2, "0")}`;
        return `[${i + 1}] ${label}\n${c.content}`;
      });
      blocks.push(`${titleLine}\n${chunkLines.join("\n\n---\n\n")}`);
      allChunks.push(...result.chunks);
    }
  }

  // Also retrieve CV chunks
  const cvResult = await retrieveRelevantChunks(supabase, provider, {
    session_id:           sessionId,
    query:                question,
    match_count:          4,
    filter_document_type: "resume",
    filter_job_index:     null,
  });

  if (cvResult.chunks.length > 0) {
    const cvLines = cvResult.chunks.map((c, i) => {
      const label = `CV · ${c.section_label ?? "General"} · Chunk ${String(c.chunk_index).padStart(2, "0")}`;
      return `[${i + 1}] ${label}\n${c.content}`;
    });
    blocks.push(`=== CANDIDATE CV ===\n${cvLines.join("\n\n---\n\n")}`);
    allChunks.push(...cvResult.chunks);
  }

  return {
    context: blocks.join("\n\n" + "═".repeat(60) + "\n\n"),
    allChunks,
  };
}

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "POST") {
    return err("METHOD_NOT_ALLOWED", "POST required", 405);
  }

  try {
    const body = await req.json().catch(() => null);
    if (!body) return err("BAD_REQUEST", "Request body must be valid JSON", 400);

    let session_id: string, content: string;
    try {
      session_id = validateSessionId(body?.session_id);
      content    = requiredString(body?.content, "content");
    } catch (validationErr) {
      return err("VALIDATION_ERROR", (validationErr as Error).message, 400);
    }

    // ── Check for out-of-range JD references (JD 4+) before any DB work ──
    const outOfRange = findOutOfRangeJD(content);
    if (outOfRange !== null) {
      const supabase2 = createServiceClient();
      const politeRefusal =
        `I can only answer questions about JD 1–JD 3 in this session. ` +
        `JD ${outOfRange} has not been uploaded. ` +
        `Please ask about one of the available job descriptions.`;

      await supabase2.from("chat_messages").insert({
        session_id, role: "assistant", content: politeRefusal,
        citations: [], retrieved_chunk_ids: [],
        metadata: { model: "guardrail", reason: "jd_out_of_range" },
      });
      log.info("Out-of-range JD refusal", { session_id, metadata: { out_of_range: outOfRange } });
      return ok({ answer: politeRefusal, citations: [], retrieved_chunk_ids: [],
        retrieved_chunks: [], message_id: null, user_message_id: null, model: "guardrail" });
    }

    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      return err("CONFIGURATION_ERROR", "OPENAI_API_KEY is not configured", 500);
    }

    const supabase       = createServiceClient();
    const started        = Date.now();
    const embeddingModel = Deno.env.get("OPENAI_EMBEDDING_MODEL") ?? EMBEDDING.MODEL;
    const chatModel      = Deno.env.get("OPENAI_CHAT_MODEL") ?? LLM.CHAT_MODEL;
    const provider       = new OpenAIProvider(apiKey, embeddingModel, chatModel);

    // ── Verify session ──────────────────────────────────────────
    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .select("id, status, deleted_at")
      .eq("id", session_id)
      .is("deleted_at", null)
      .maybeSingle();

    if (sessionError) return err("DB_ERROR", "Error fetching session", 500, sessionError.message);
    if (!session)     return err("NOT_FOUND", "Session not found or deleted", 404);

    // ── Persist user message ────────────────────────────────────
    const { data: userMsg, error: userMsgError } = await supabase
      .from("chat_messages")
      .insert({ session_id, role: "user", content })
      .select("id, created_at")
      .single();

    if (userMsgError) {
      log.warn("Failed to persist user message", { session_id, metadata: { error: userMsgError.message } });
    }

    await supabase.from("ai_events").insert({
      session_id,
      event_type: AI_EVENT_TYPE.CHAT_REQUESTED,
      stage: "chat",
      status: "pending",
      metadata: { content_length: content.length, session_status: session.status },
    });

    // ── Fetch recent conversation history ───────────────────────
    const { data: history } = await supabase
      .from("chat_messages")
      .select("role, content")
      .eq("session_id", session_id)
      .order("created_at", { ascending: false })
      .limit(8);

    const conversationHistory = (history ?? [])
      .reverse()
      .filter((m: { role: string }) => m.role === "user" || m.role === "assistant")
      .slice(0, 6) as Array<{ role: string; content: string }>;

    // ── Fetch available JD metadata keyed by job_index ──────────
    const { data: jdDocs } = await supabase
      .from("documents")
      .select("slot_id, job_index, title")
      .eq("session_id", session_id)
      .eq("document_type", "job_description")
      .eq("status", "indexed")
      .is("deleted_at", null)
      .order("job_index", { ascending: true });

    // Build stable index→metadata map (keyed by job_index, not array position)
    const availableByIndex: Record<number, { title: string | null; slot_id: string | null }> = {};
    for (const doc of (jdDocs ?? []) as Array<{ slot_id: string | null; job_index: number | null; title: string | null }>) {
      if (doc.job_index !== null) {
        availableByIndex[doc.job_index] = { title: doc.title, slot_id: doc.slot_id };
      }
    }

    const availableSlotIds = Object.values(availableByIndex)
      .map((d) => d.slot_id ?? "")
      .filter(Boolean);

    // ── Detect which JD numbers the user is asking about ────────
    // parseAllJDReferences handles "Compare JD 2 and JD 3" → [2, 3]
    const referencedJDs = parseAllJDReferences(content);
    const isMultiJDQuestion = referencedJDs.length >= 2;

    // Check if any specifically referenced JD is not uploaded
    for (const idx of referencedJDs) {
      const slotId = deriveSlotId("job_description", idx);
      if (!availableSlotIds.includes(slotId)) {
        const politeRefusal =
          `JD ${idx} has not been uploaded in this session. ` +
          `Available job descriptions: ${availableSlotIds.map((s) => s.toUpperCase()).join(", ") || "none"}. ` +
          `Please ask about one of the available JDs.`;

        await supabase.from("chat_messages").insert({
          session_id, role: "assistant", content: politeRefusal,
          citations: [], retrieved_chunk_ids: [],
          metadata: { model: "guardrail", reason: "jd_not_uploaded", jd_index: idx },
        });

        return ok({ answer: politeRefusal, citations: [], retrieved_chunk_ids: [],
          retrieved_chunks: [], message_id: null, user_message_id: userMsg?.id ?? null, model: "guardrail" });
      }
    }

    // ── Retrieval ────────────────────────────────────────────────
    const retrievalStart = Date.now();
    let evidenceContext: string;
    let allChunks: RetrievedChunk[];

    if (isMultiJDQuestion) {
      // Multi-slot retrieval: one labelled block per referenced JD + CV
      // This is the key fix for JD 2 / JD 3 confusion in comparisons
      const multiResult = await buildMultiSlotContext(
        supabase, provider, session_id, content, referencedJDs, availableByIndex
      );
      evidenceContext = multiResult.context;
      allChunks = multiResult.allChunks;
    } else {
      // Single JD or general question: standard retrieval
      const singleJobIndex = referencedJDs.length === 1 ? referencedJDs[0] : null;
      let retrievalResult;
      try {
        retrievalResult = await retrieveRelevantChunks(supabase, provider, {
          session_id,
          query:                content,
          match_count:          RETRIEVAL.DEFAULT_MATCH_COUNT,
          filter_document_type: null,
          filter_job_index:     singleJobIndex,
        });
      } catch (retrievalErr) {
        const msg = (retrievalErr as Error).message;
        log.error("Retrieval failed", { session_id, metadata: { error: msg } });
        return err("RETRIEVAL_ERROR", "Failed to retrieve evidence chunks", 500, msg);
      }
      allChunks = retrievalResult.chunks;

      // Format with stable slot labels
      if (allChunks.length === 0) {
        evidenceContext = "[No retrieved evidence available]";
      } else {
        evidenceContext = allChunks.map((c, i) => {
          const slot = c.slot_id ?? (c.document_type === "resume" ? "cv" : deriveSlotId("job_description", c.job_index));
          const source =
            c.document_type === "resume"
              ? `CV · ${c.section_label ?? "General"} · Chunk ${String(c.chunk_index).padStart(2, "0")}`
              : `${slot.toUpperCase()} · ${c.section_label ?? "General"} · Chunk ${String(c.chunk_index).padStart(2, "0")}`;
          return `[${i + 1}] ${source}\n${c.content}`;
        }).join("\n\n---\n\n");
      }
    }

    const retrievalLatency = Date.now() - retrievalStart;

    await supabase.from("ai_events").insert({
      session_id,
      event_type: AI_EVENT_TYPE.RETRIEVAL_EXECUTED,
      stage: "chat",
      status: "success",
      latency_ms: retrievalLatency,
      metadata: { chunks_retrieved: allChunks.length, embedding_model: embeddingModel },
    });

    log.info("Chunks retrieved", { session_id, metadata: { chunks: allChunks.length, latency_ms: retrievalLatency } });

    // ── Generate grounded answer ────────────────────────────────
    const answerStart = Date.now();
    let answerOutput;
    try {
      answerOutput = await provider.generateGroundedAnswer({
        session_id,
        question:             content,
        retrieved_chunks:     allChunks,
        conversation_history: conversationHistory,
        available_slot_ids:   availableSlotIds,
        evidence_context_override: isMultiJDQuestion ? evidenceContext : undefined,
      });
    } catch (answerErr) {
      const msg = (answerErr as Error).message;
      log.error("Answer generation failed", { session_id, metadata: { error: msg } });

      await supabase.from("ai_events").insert({
        session_id,
        event_type: AI_EVENT_TYPE.CHAT_COMPLETED,
        stage: "chat",
        status: "failed",
        latency_ms: Date.now() - answerStart,
        metadata: { error: msg },
      });

      return err("GENERATION_ERROR", "Failed to generate answer", 500, msg);
    }

    const answerLatency = Date.now() - answerStart;

    // ── Persist assistant message ───────────────────────────────
    const citationsForDb = answerOutput.citations.map((c) => ({
      source:      c.source,
      source_type: c.source_type,
      excerpt:     c.excerpt,
      relevance:   c.relevance,
    }));

    const chunkIds = allChunks.map((c) => c.id);

    const { data: assistantMsg, error: assistantMsgError } = await supabase
      .from("chat_messages")
      .insert({
        session_id,
        role:                "assistant",
        content:             answerOutput.answer,
        citations:           citationsForDb,
        retrieved_chunk_ids: chunkIds,
        metadata: { model: chatModel, retrieval_count: allChunks.length },
      })
      .select("id, created_at")
      .single();

    if (assistantMsgError) {
      log.warn("Failed to persist assistant message", { session_id, metadata: { error: assistantMsgError.message } });
    }

    const totalLatency = Date.now() - started;

    await supabase.from("ai_events").insert({
      session_id,
      event_type: AI_EVENT_TYPE.CHAT_COMPLETED,
      stage: "chat",
      status: "success",
      latency_ms: totalLatency,
      metadata: {
        content_length:    content.length,
        answer_length:     answerOutput.answer.length,
        chunks_retrieved:  allChunks.length,
        citations_count:   answerOutput.citations.length,
        model:             chatModel,
        answer_latency_ms: answerLatency,
        is_multi_jd:       isMultiJDQuestion,
      },
    });

    log.info("Chat completed", { session_id, metadata: {
      chunks_retrieved: allChunks.length,
      citations_count:  answerOutput.citations.length,
      latency_ms:       totalLatency,
      is_multi_jd:      isMultiJDQuestion,
    }});

    return ok({
      answer:              answerOutput.answer,
      citations:           citationsForDb,
      retrieved_chunk_ids: chunkIds,
      retrieved_chunks:    allChunks,
      message_id:          assistantMsg?.id ?? null,
      user_message_id:     userMsg?.id ?? null,
      model:               chatModel,
    });
  } catch (e) {
    log.error("Unexpected error in chat", { metadata: { error: String(e) } });
    return internalError(e);
  }
});
