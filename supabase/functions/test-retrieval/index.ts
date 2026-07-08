import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handleCors } from "../_shared/cors.ts";
import { ok, err, internalError } from "../_shared/response.ts";
import { createServiceClient } from "../_shared/supabaseClient.ts";
import { createLogger } from "../_shared/logger.ts";
import { validateSessionId, requiredString } from "../_shared/validation.ts";
import { AI_EVENT_TYPE, RETRIEVAL, EMBEDDING } from "../_shared/constants.ts";
import { retrieveRelevantChunks } from "../_shared/retrieval.ts";
import { OpenAIProvider } from "../_shared/openaiProvider.ts";

const log = createLogger("test-retrieval");

// Development/testing endpoint — allows validating that indexing and vector
// search work end-to-end before analysis and chat are wired up.
// Accepts a plain-text query, embeds it, and returns the top matching chunks.

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "POST") {
    return err("METHOD_NOT_ALLOWED", "POST required", 405);
  }

  try {
    const body = await req.json().catch(() => null);
    if (!body) return err("BAD_REQUEST", "Request body must be valid JSON", 400);

    let session_id: string, query: string;
    try {
      session_id = validateSessionId(body.session_id);
      query      = requiredString(body.query, "query");
    } catch (validationErr) {
      return err("VALIDATION_ERROR", (validationErr as Error).message, 400);
    }

    const matchCount: number = Math.min(
      typeof body.match_count === "number" ? body.match_count : RETRIEVAL.DEFAULT_MATCH_COUNT,
      RETRIEVAL.MAX_MATCH_COUNT,
    );

    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      return err("CONFIGURATION_ERROR", "OPENAI_API_KEY is not configured", 500);
    }

    const supabase       = createServiceClient();
    const embeddingModel = Deno.env.get("OPENAI_EMBEDDING_MODEL") ?? EMBEDDING.MODEL;
    const provider       = new OpenAIProvider(apiKey, embeddingModel);
    const started        = Date.now();

    // Verify session exists
    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .select("id, status, deleted_at")
      .eq("id", session_id)
      .is("deleted_at", null)
      .maybeSingle();

    if (sessionError) return err("DB_ERROR", "Error fetching session", 500, sessionError.message);
    if (!session)     return err("NOT_FOUND", "Session not found or deleted", 404);

    // Retrieve chunks via vector similarity
    const result = await retrieveRelevantChunks(supabase, provider, {
      session_id,
      query,
      match_count:          matchCount,
      filter_document_type: body.filter_document_type ?? null,
      filter_job_index:     body.filter_job_index     ?? null,
    });

    const totalLatency = Date.now() - started;

    // Log minimal event — query length only, not full text
    await supabase.from("ai_events").insert({
      session_id,
      event_type: AI_EVENT_TYPE.RETRIEVAL_TESTED,
      stage:      "retrieval",
      status:     "success",
      latency_ms: totalLatency,
      metadata: {
        query_length:        query.length,
        match_count:         matchCount,
        chunks_returned:     result.chunks.length,
        embedding_model:     embeddingModel,
        embedding_latency_ms: result.embedding_latency_ms,
        retrieval_latency_ms: result.retrieval_latency_ms,
      },
    });

    log.info("Retrieval tested", {
      session_id,
      metadata: {
        chunks_returned:     result.chunks.length,
        embedding_latency_ms: result.embedding_latency_ms,
        retrieval_latency_ms: result.retrieval_latency_ms,
      },
    });

    return ok({
      chunks:              result.chunks,
      query_length:        query.length,
      match_count:         matchCount,
      chunks_returned:     result.chunks.length,
      embedding_model:     embeddingModel,
      embedding_latency_ms: result.embedding_latency_ms,
      retrieval_latency_ms: result.retrieval_latency_ms,
      total_latency_ms:    totalLatency,
    });
  } catch (e) {
    log.error("Unexpected error in test-retrieval", { metadata: { error: String(e) } });
    return internalError(e);
  }
});
