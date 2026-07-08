import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handleCors } from "../_shared/cors.ts";
import { ok, err, internalError } from "../_shared/response.ts";
import { createServiceClient } from "../_shared/supabaseClient.ts";
import { createLogger } from "../_shared/logger.ts";
import { validateSessionId } from "../_shared/validation.ts";
import { AI_EVENT_TYPE } from "../_shared/constants.ts";

const log = createLogger("analyse-session");

// Phase 1 placeholder — AI analysis engine not yet connected.
// Phase 2 implementation plan:
//   1. Verify session has indexed CV + at least one JD (status = 'indexed')
//   2. For each JD document (job_index 1–3):
//      a. Retrieve CV chunks via match_chunks() using JD requirements as query
//      b. Retrieve JD chunks for the specific job_index
//      c. Call AIProvider.generateStructuredAnalysis(input)
//      d. Insert/upsert result into analyses table
//   3. Update session status to 'analysed'
//   4. Log ai_event with token_usage and latency_ms
//
// Scalability note:
//   For large documents, analysis should be queued rather than run synchronously.
//   Use Supabase pg_cron, a queue table + polling, or Upstash QStash.
//   The Edge Function would then return a job_id and the frontend polls get-session
//   for status changes (created → analysing → analysed).

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

    const supabase = createServiceClient();

    // Verify session exists
    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .select("id, status, deleted_at")
      .eq("id", session_id)
      .is("deleted_at", null)
      .maybeSingle();

    if (sessionError) {
      return err("DB_ERROR", "Error fetching session", 500, sessionError.message);
    }
    if (!session) {
      return err("NOT_FOUND", "Session not found or deleted", 404);
    }

    // Log the analysis request for observability
    await supabase.from("ai_events").insert({
      session_id,
      event_type: AI_EVENT_TYPE.ANALYSIS_REQUESTED,
      stage: "analysis",
      status: "pending",
      metadata: { session_status: session.status },
    });

    log.info("Analysis requested", { session_id, metadata: { status: session.status } });

    // Phase 1 placeholder response
    return ok({
      status: "pending",
      message:
        "Analysis engine not connected yet. AI analysis will be added in the next phase.",
      session_id,
      phase: 1,
      next_steps: [
        "Phase 2: OpenAI embedding + analysis pipeline",
        "Phase 2: match_chunks() retrieval for each JD",
        "Phase 2: Structured fit analysis stored in analyses table",
      ],
    });
  } catch (e) {
    log.error("Unexpected error in analyse-session", { metadata: { error: String(e) } });
    return internalError(e);
  }
});
