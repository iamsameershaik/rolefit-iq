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

    const supabase       = createServiceClient();
    const started        = Date.now();
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

    if (sessionError) return err("DB_ERROR", "Error fetching session: " + sessionError.message, 500);
    if (!session)     return err("NOT_FOUND", "Session not found or deleted", 404);

    if (session.status === "created" || session.status === "uploading") {
      return err("PRECONDITION_FAILED",
        `Session is not ready for analysis (status: ${session.status}). Upload and index documents first.`, 400);
    }

    // ── Fetch documents with raw_text ───────────────────────────
    const { data: documents, error: docsError } = await supabase
      .from("documents")
      .select("id, document_type, job_index, title, raw_text, status, created_at")
      .eq("session_id", session_id)
      .eq("status", "indexed")
      .is("deleted_at", null)
      .order("created_at", { ascending: true });

    if (docsError) return err("DB_ERROR", "Error fetching documents: " + docsError.message, 500);

    const cvDocs = (documents ?? []).filter(
      (d: { document_type: string }) => d.document_type === "resume"
    );
    const jdDocs = (documents ?? []).filter(
      (d: { document_type: string }) => d.document_type === "job_description"
    );

    if (cvDocs.length === 0) {
      return err("PRECONDITION_FAILED",
        "No indexed CV found in this session. Upload a CV first.", 400);
    }
    if (jdDocs.length === 0) {
      return err("PRECONDITION_FAILED",
        "No indexed job descriptions found in this session. Upload at least one JD.", 400);
    }

    // Pick the most recently created CV (last in ascending created_at order)
    const cvDoc = cvDocs[cvDocs.length - 1] as { id: string; raw_text: string; title: string | null };

    log.info("Analysis starting", {
      session_id,
      metadata: { jd_count: jdDocs.length, cv_chars: (cvDoc.raw_text ?? "").length },
    });

    // ── Clear existing analyses (re-run support) ────────────────
    await supabase.from("analyses").delete().eq("session_id", session_id);

    // ── Update session status ───────────────────────────────────
    await supabase
      .from("sessions")
      .update({ status: SESSION_STATUS.ANALYSING, updated_at: new Date().toISOString() })
      .eq("id", session_id);

    await supabase.from("ai_events").insert({
      session_id,
      event_type: AI_EVENT_TYPE.ANALYSIS_STARTED,
      stage: "analysis",
      status: "pending",
      metadata: {
        jd_count:   jdDocs.length,
        cv_doc_id:  cvDoc.id,
        cv_chars:   (cvDoc.raw_text ?? "").length,
        session_status_before: session.status,
      },
    });

    const analyses: unknown[] = [];

    // ── Analyse each JD ─────────────────────────────────────────
    for (const jdDoc of jdDocs as Array<{
      id: string; job_index: number; title: string | null; raw_text: string;
    }>) {
      const jobStarted = Date.now();
      const jobTitle   = jdDoc.title ?? `Job Description ${jdDoc.job_index}`;

      await supabase.from("ai_events").insert({
        session_id,
        event_type: AI_EVENT_TYPE.ANALYSIS_JOB_STARTED,
        stage: "analysis",
        status: "pending",
        metadata: {
          document_id: jdDoc.id,
          job_index:   jdDoc.job_index,
          job_title:   jobTitle,
          jd_chars:    (jdDoc.raw_text ?? "").length,
        },
      });

      let output;
      try {
        const candidateChunks: RetrievedChunk[] = [{
          id:            cvDoc.id,
          session_id,
          document_id:   cvDoc.id,
          document_type: "resume",
          job_index:     null,
          section_label: null,
          chunk_index:   0,
          content:       cvDoc.raw_text ?? "",
          similarity:    1.0,
        }];

        const jdChunks: RetrievedChunk[] = [{
          id:            jdDoc.id,
          session_id,
          document_id:   jdDoc.id,
          document_type: "job_description",
          job_index:     jdDoc.job_index,
          section_label: null,
          chunk_index:   0,
          content:       jdDoc.raw_text ?? "",
          similarity:    1.0,
        }];

        output = await provider.generateStructuredAnalysis({
          session_id,
          candidate_chunks: candidateChunks,
          jd_chunks:        jdChunks,
          job_index:        jdDoc.job_index,
          job_title:        jobTitle,
        });
      } catch (analysisErr) {
        const msg = (analysisErr as Error).message;
        log.error("Analysis failed for JD", {
          session_id,
          metadata: { document_id: jdDoc.id, job_index: jdDoc.job_index, error: msg },
        });

        await supabase.from("ai_events").insert({
          session_id,
          event_type:   AI_EVENT_TYPE.ANALYSIS_FAILED,
          stage:        "analysis",
          status:       "failed",
          latency_ms:   Date.now() - jobStarted,
          metadata:     { document_id: jdDoc.id, job_index: jdDoc.job_index, error: msg },
        });

        await supabase
          .from("sessions")
          .update({ status: SESSION_STATUS.FAILED, updated_at: new Date().toISOString() })
          .eq("id", session_id);

        return err(
          "ANALYSIS_ERROR",
          `AI analysis failed for "${jobTitle}" (job ${jdDoc.job_index}): ${msg}`,
          500,
        );
      }

      // ── Store analysis ────────────────────────────────────────
      const { data: savedAnalysis, error: insertError } = await supabase
        .from("analyses")
        .insert({
          session_id,
          job_document_id:         jdDoc.id,
          job_index:               jdDoc.job_index,
          fit_tier:                output.fit_tier,
          fit_estimate:            output.fit_estimate,
          evidence_strength:       output.evidence_strength,
          risk_level:              output.risk_level,
          preparation_priority:    output.preparation_priority,
          summary:                 output.summary,
          strengths:               output.strengths,
          skill_gaps:              output.skill_gaps,
          experience_alignment:    output.experience_alignment,
          risk_flags:              output.risk_flags,
          interview_questions:     output.interview_questions,
          talking_points:          output.talking_points,
          rewrite_recommendations: output.rewrite_recommendations,
          evidence:                output.evidence,
        })
        .select("*")
        .single();

      if (insertError) {
        log.error("Failed to store analysis", {
          session_id,
          metadata: {
            document_id:   jdDoc.id,
            job_index:     jdDoc.job_index,
            error:         insertError.message,
            error_details: insertError.details,
            error_code:    insertError.code,
          },
        });

        await supabase
          .from("sessions")
          .update({ status: SESSION_STATUS.FAILED, updated_at: new Date().toISOString() })
          .eq("id", session_id);

        return err(
          "DB_ERROR",
          `Failed to store analysis for job ${jdDoc.job_index}: ${insertError.message}`,
          500,
          insertError.details,
        );
      }

      analyses.push(savedAnalysis);

      const evidenceCount = Array.isArray(output.evidence) ? output.evidence.length : 0;
      await supabase.from("ai_events").insert({
        session_id,
        event_type: AI_EVENT_TYPE.ANALYSIS_JOB_COMPLETED,
        stage:      "analysis",
        status:     "success",
        latency_ms: Date.now() - jobStarted,
        metadata: {
          document_id:    jdDoc.id,
          job_index:      jdDoc.job_index,
          fit_tier:       output.fit_tier,
          fit_estimate:   output.fit_estimate,
          evidence_count: evidenceCount,
          used_fallback:  (output as Record<string, unknown>).used_fallback ?? false,
        },
      });

      log.info("JD analysed", {
        session_id,
        metadata: {
          job_index:    jdDoc.job_index,
          fit_tier:     output.fit_tier,
          fit_estimate: output.fit_estimate,
          latency_ms:   Date.now() - jobStarted,
        },
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
      stage:      "analysis",
      status:     "success",
      latency_ms: Date.now() - started,
      metadata:   { analyses_count: analyses.length, jd_count: jdDocs.length },
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
