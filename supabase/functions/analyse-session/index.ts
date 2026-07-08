import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handleCors } from "../_shared/cors.ts";
import { ok, err, internalError } from "../_shared/response.ts";
import { createServiceClient } from "../_shared/supabaseClient.ts";
import { createLogger } from "../_shared/logger.ts";
import { validateSessionId } from "../_shared/validation.ts";
import { AI_EVENT_TYPE, SESSION_STATUS, EMBEDDING, LLM } from "../_shared/constants.ts";
import { OpenAIProvider } from "../_shared/openaiProvider.ts";
import type { RetrievedChunk } from "../_shared/types.ts";

const log = createLogger("analyse-session");

// For MVP, analysis uses the full raw_text of each document rather than chunk
// retrieval. At typical CV/JD lengths (2–20k tokens), this fits comfortably in
// gpt-4o's 128k context window and gives the model full document awareness.
// Phase 3+: switch to chunk retrieval for larger documents or multi-doc analysis.

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "POST") {
    return err("METHOD_NOT_ALLOWED", "POST required", 405);
  }

  try {
    const body = await req.json().catch(() => null);
    if (!body) return err("BAD_REQUEST", "Request body must be valid JSON", 400);

    let session_id: string;
    try {
      session_id = validateSessionId(body?.session_id);
    } catch (validationErr) {
      return err("VALIDATION_ERROR", (validationErr as Error).message, 400);
    }

    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      return err("CONFIGURATION_ERROR", "OPENAI_API_KEY is not configured", 500);
    }

    const supabase      = createServiceClient();
    const started       = Date.now();
    const embeddingModel = Deno.env.get("OPENAI_EMBEDDING_MODEL") ?? EMBEDDING.MODEL;
    const chatModel      = Deno.env.get("OPENAI_CHAT_MODEL") ?? LLM.ANALYSIS_MODEL;
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

    if (session.status === "created" || session.status === "uploading") {
      return err("PRECONDITION_FAILED", "Session documents are not yet fully indexed", 400);
    }

    // ── Fetch documents with raw_text ───────────────────────────
    const { data: documents, error: docsError } = await supabase
      .from("documents")
      .select("id, document_type, job_index, title, raw_text, status")
      .eq("session_id", session_id)
      .eq("status", "indexed")
      .is("deleted_at", null);

    if (docsError) return err("DB_ERROR", "Error fetching documents", 500, docsError.message);

    const cvDocs  = (documents ?? []).filter((d: { document_type: string }) => d.document_type === "resume");
    const jdDocs  = (documents ?? []).filter((d: { document_type: string }) => d.document_type === "job_description");

    if (cvDocs.length === 0) {
      return err("PRECONDITION_FAILED", "No indexed CV found in this session", 400);
    }
    if (jdDocs.length === 0) {
      return err("PRECONDITION_FAILED", "No indexed job descriptions found in this session", 400);
    }

    const cvDoc = cvDocs[0] as { id: string; raw_text: string; title: string | null };

    // ── Clear any existing analyses (allow re-run) ──────────────
    await supabase.from("analyses").delete().eq("session_id", session_id);

    // ── Update session status ───────────────────────────────────
    await supabase
      .from("sessions")
      .update({ status: SESSION_STATUS.ANALYSING, updated_at: new Date().toISOString() })
      .eq("id", session_id);

    await supabase.from("ai_events").insert({
      session_id,
      event_type: AI_EVENT_TYPE.ANALYSIS_REQUESTED,
      stage: "analysis",
      status: "pending",
      metadata: { jd_count: jdDocs.length, cv_doc_id: cvDoc.id },
    });

    log.info("Analysis started", { session_id, metadata: { jd_count: jdDocs.length } });

    const analyses: unknown[] = [];

    // ── Analyse each JD ─────────────────────────────────────────
    for (const jdDoc of jdDocs as Array<{ id: string; job_index: number; title: string | null; raw_text: string }>) {
      const jobStarted = Date.now();
      const jobTitle   = jdDoc.title ?? `Job Description ${jdDoc.job_index}`;

      await supabase.from("ai_events").insert({
        session_id,
        event_type: AI_EVENT_TYPE.ANALYSIS_REQUESTED,
        stage: "analysis",
        status: "pending",
        metadata: { document_id: jdDoc.id, job_index: jdDoc.job_index },
      });

      let output;
      try {
        // Pass full text as virtual chunks — works within gpt-4o's 128k context.
        const candidateChunks: RetrievedChunk[] = [{
          id: cvDoc.id,
          session_id,
          document_id: cvDoc.id,
          document_type: "resume",
          job_index: null,
          section_label: null,
          chunk_index: 0,
          content: cvDoc.raw_text ?? "",
          similarity: 1.0,
        }];

        const jdChunks: RetrievedChunk[] = [{
          id: jdDoc.id,
          session_id,
          document_id: jdDoc.id,
          document_type: "job_description",
          job_index: jdDoc.job_index,
          section_label: null,
          chunk_index: 0,
          content: jdDoc.raw_text ?? "",
          similarity: 1.0,
        }];

        output = await provider.generateStructuredAnalysis({
          session_id,
          candidate_chunks: candidateChunks,
          jd_chunks: jdChunks,
          job_index: jdDoc.job_index,
          job_title: jobTitle,
        });
      } catch (analysisErr) {
        const msg = (analysisErr as Error).message;
        log.error("Analysis failed for JD", { session_id, metadata: { document_id: jdDoc.id, error: msg } });

        await supabase.from("ai_events").insert({
          session_id,
          event_type: AI_EVENT_TYPE.ANALYSIS_FAILED,
          stage: "analysis",
          status: "failed",
          latency_ms: Date.now() - jobStarted,
          metadata: { document_id: jdDoc.id, job_index: jdDoc.job_index, error: msg },
        });

        // Mark session failed and return immediately
        await supabase
          .from("sessions")
          .update({ status: SESSION_STATUS.FAILED, updated_at: new Date().toISOString() })
          .eq("id", session_id);

        return err("ANALYSIS_ERROR", `Analysis failed for job ${jdDoc.job_index}: ${msg}`, 500);
      }

      // ── Store analysis ────────────────────────────────────────
      const { data: savedAnalysis, error: insertError } = await supabase
        .from("analyses")
        .insert({
          session_id,
          job_document_id:      jdDoc.id,
          job_index:            jdDoc.job_index,
          fit_tier:             output.fit_tier,
          fit_estimate:         output.fit_estimate,
          evidence_strength:    output.evidence_strength,
          risk_level:           output.risk_level,
          preparation_priority: output.preparation_priority,
          summary:              output.summary,
          strengths:            output.strengths,
          skill_gaps:           output.skill_gaps,
          experience_alignment: output.experience_alignment,
          risk_flags:           output.risk_flags,
          interview_questions:  output.interview_questions,
          talking_points:       output.talking_points,
          rewrite_recommendations: output.rewrite_recommendations,
          evidence:             output.evidence,
        })
        .select("*")
        .single();

      if (insertError) {
        log.error("Failed to store analysis", { session_id, metadata: { error: insertError.message } });
        return err("DB_ERROR", "Failed to store analysis", 500, insertError.message);
      }

      analyses.push(savedAnalysis);

      await supabase.from("ai_events").insert({
        session_id,
        event_type: AI_EVENT_TYPE.ANALYSIS_COMPLETED,
        stage: "analysis",
        status: "success",
        latency_ms: Date.now() - jobStarted,
        metadata: {
          document_id:   jdDoc.id,
          job_index:     jdDoc.job_index,
          fit_tier:      output.fit_tier,
          fit_estimate:  output.fit_estimate,
          chunk_count:   (output.evidence as unknown[]).length,
        },
      });

      log.info("JD analysed", {
        session_id,
        metadata: { job_index: jdDoc.job_index, fit_tier: output.fit_tier, fit_estimate: output.fit_estimate },
      });
    }

    // ── Mark session analysed ───────────────────────────────────
    await supabase
      .from("sessions")
      .update({ status: SESSION_STATUS.ANALYSED, updated_at: new Date().toISOString() })
      .eq("id", session_id);

    await supabase.from("ai_events").insert({
      session_id,
      event_type: AI_EVENT_TYPE.ANALYSIS_COMPLETED,
      stage: "analysis",
      status: "success",
      latency_ms: Date.now() - started,
      metadata: { analyses_count: analyses.length },
    });

    log.info("Session analysis complete", {
      session_id,
      metadata: { analyses_count: analyses.length, latency_ms: Date.now() - started },
    });

    return ok({ session_id, analyses, analyses_count: analyses.length });
  } catch (e) {
    log.error("Unexpected error in analyse-session", { metadata: { error: String(e) } });
    return internalError(e);
  }
});
