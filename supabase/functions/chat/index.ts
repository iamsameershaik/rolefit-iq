import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handleCors } from "../_shared/cors.ts";
import { ok, err, internalError } from "../_shared/response.ts";
import { createServiceClient } from "../_shared/supabaseClient.ts";
import { createLogger } from "../_shared/logger.ts";
import { validateSessionId, requiredString } from "../_shared/validation.ts";
import { AI_EVENT_TYPE, RETRIEVAL, EMBEDDING, LLM } from "../_shared/constants.ts";
import { OpenAIProvider } from "../_shared/openaiProvider.ts";
import { retrieveRelevantChunks } from "../_shared/retrieval.ts";
import { findOutOfRangeJD, parseJDReference, deriveSlotId } from "../_shared/roleValidation.ts";

const log = createLogger("chat");

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

    // Optional: scope retrieval to a specific JD
    let selected_job_index: number | null =
      typeof body.selected_job_index === "number" ? body.selected_job_index : null;

    // ── Resolve JD number from user's question (e.g. "Job 2" → job_index=2) ──
    const referencedJD = parseJDReference(content);
    if (referencedJD !== null && selected_job_index === null) {
      selected_job_index = referencedJD;
    }

    // ── Check for out-of-range JD references (JD 4+) ──
    const outOfRange = findOutOfRangeJD(content);
    if (outOfRange !== null) {
      const politeRefusal =
        `I can only answer questions about JD 1–JD 3 in this session. ` +
        `JD ${outOfRange} has not been uploaded. ` +
        `Please ask about one of the available job descriptions.`;

      const { data: assistantMsg } = await supabase
        .from("chat_messages")
        .insert({
          session_id,
          role:      "assistant",
          content:   politeRefusal,
          citations: [],
          retrieved_chunk_ids: [],
          metadata:  { model: "guardrail", reason: "jd_out_of_range" },
        })
        .select("id, created_at")
        .single();

      return ok({
        answer:              politeRefusal,
        citations:           [],
        retrieved_chunk_ids: [],
        retrieved_chunks:    [],
        message_id:          assistantMsg?.id ?? null,
        user_message_id:     userMsg?.id ?? null,
        model:               "guardrail",
      });
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
      .insert({
        session_id,
        role:    "user",
        content: content,
      })
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

    // ── Fetch recent conversation history for context ───────────
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

    // ── Retrieve relevant chunks ────────────────────────────────
    const retrievalStart = Date.now();
    let retrievalResult;
    try {
      retrievalResult = await retrieveRelevantChunks(supabase, provider, {
        session_id,
        query:                content,
        match_count:          RETRIEVAL.DEFAULT_MATCH_COUNT,
        filter_document_type: null,
        filter_job_index:     selected_job_index,
      });
    } catch (retrievalErr) {
      const msg = (retrievalErr as Error).message;
      log.error("Retrieval failed", { session_id, metadata: { error: msg } });
      return err("RETRIEVAL_ERROR", "Failed to retrieve evidence chunks", 500, msg);
    }

    // ── Fetch available JD slot_ids for context ──────────────────
    const { data: jdDocs } = await supabase
      .from("documents")
      .select("slot_id, job_index")
      .eq("session_id", session_id)
      .eq("document_type", "job_description")
      .eq("status", "indexed")
      .is("deleted_at", null)
      .order("job_index", { ascending: true });

    const availableSlotIds = (jdDocs ?? [])
      .map((d: { slot_id: string | null; job_index: number | null }) =>
        d.slot_id ?? deriveSlotId("job_description", d.job_index))
      .filter(Boolean) as string[];

    // ── If user asked about a specific JD that hasn't been uploaded ──
    if (selected_job_index !== null && !availableSlotIds.includes(deriveSlotId("job_description", selected_job_index))) {
      const politeRefusal =
        `JD ${selected_job_index} has not been uploaded in this session. ` +
        `Only the following job descriptions are available: ${availableSlotIds.map(s => s.toUpperCase()).join(", ") || "none"}. ` +
        `Please ask about one of the available JDs.`;

      const { data: assistantMsg } = await supabase
        .from("chat_messages")
        .insert({
          session_id,
          role:      "assistant",
          content:   politeRefusal,
          citations: [],
          retrieved_chunk_ids: [],
          metadata:  { model: "guardrail", reason: "jd_not_uploaded" },
        })
        .select("id, created_at")
        .single();

      return ok({
        answer:              politeRefusal,
        citations:           [],
        retrieved_chunk_ids: [],
        retrieved_chunks:    [],
        message_id:          assistantMsg?.id ?? null,
        user_message_id:     userMsg?.id ?? null,
        model:               "guardrail",
      });
    }

    const retrievalLatency = Date.now() - retrievalStart;

    await supabase.from("ai_events").insert({
      session_id,
      event_type: AI_EVENT_TYPE.RETRIEVAL_EXECUTED,
      stage: "chat",
      status: "success",
      latency_ms: retrievalLatency,
      metadata: {
        chunks_retrieved:     retrievalResult.chunks.length,
        embedding_model:      embeddingModel,
        embedding_latency_ms: retrievalResult.embedding_latency_ms,
      },
    });

    log.info("Chunks retrieved", {
      session_id,
      metadata: { chunks: retrievalResult.chunks.length, latency_ms: retrievalLatency },
    });

    // ── Generate grounded answer ────────────────────────────────
    const answerStart = Date.now();
    let answerOutput;
    try {
      answerOutput = await provider.generateGroundedAnswer({
        session_id,
        question:             content,
        retrieved_chunks:     retrievalResult.chunks,
        conversation_history: conversationHistory,
        available_slot_ids:   availableSlotIds,
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
      source:        c.source,
      source_type:   c.source_type,
      excerpt:       c.excerpt,
      relevance:     c.relevance,
    }));

    const chunkIds = retrievalResult.chunks.map((c) => c.id);

    const { data: assistantMsg, error: assistantMsgError } = await supabase
      .from("chat_messages")
      .insert({
        session_id,
        role:                 "assistant",
        content:              answerOutput.answer,
        citations:            citationsForDb,
        retrieved_chunk_ids:  chunkIds,
        metadata: {
          model:           chatModel,
          retrieval_count: retrievalResult.chunks.length,
        },
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
        content_length:      content.length,
        answer_length:       answerOutput.answer.length,
        chunks_retrieved:    retrievalResult.chunks.length,
        citations_count:     answerOutput.citations.length,
        model:               chatModel,
        answer_latency_ms:   answerLatency,
      },
    });

    log.info("Chat completed", {
      session_id,
      metadata: {
        chunks_retrieved: retrievalResult.chunks.length,
        citations_count:  answerOutput.citations.length,
        latency_ms:       totalLatency,
      },
    });

    return ok({
      answer:               answerOutput.answer,
      citations:            citationsForDb,
      retrieved_chunk_ids:  chunkIds,
      retrieved_chunks:     retrievalResult.chunks,
      message_id:           assistantMsg?.id ?? null,
      user_message_id:      userMsg?.id ?? null,
      model:                chatModel,
    });
  } catch (e) {
    log.error("Unexpected error in chat", { metadata: { error: String(e) } });
    return internalError(e);
  }
});
