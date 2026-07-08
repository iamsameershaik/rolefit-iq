import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handleCors } from "../_shared/cors.ts";
import { ok, err, internalError } from "../_shared/response.ts";
import { createServiceClient } from "../_shared/supabaseClient.ts";
import { createLogger } from "../_shared/logger.ts";
import { validateSessionId, requiredString } from "../_shared/validation.ts";
import { AI_EVENT_TYPE } from "../_shared/constants.ts";

const log = createLogger("chat");

// Phase 1 placeholder — grounded retrieval not yet connected.
// Phase 2 implementation plan:
//   1. Persist the user message to chat_messages table
//   2. Create embedding for the user question via AIProvider.createEmbedding()
//   3. Retrieve relevant chunks via retrieveChunks() (calls match_chunks RPC)
//   4. Call AIProvider.generateGroundedAnswer({ question, retrieved_chunks, history })
//   5. Persist assistant message with citations + retrieved_chunk_ids
//   6. Log ai_event with token_usage, retrieval latency, total latency
//   7. Return assistant message with citations
//
// Guardrails enforced at prompt level (see prompts.ts):
//   - Only answer from retrieved evidence
//   - Never invent experience or claim hiring outcomes
//   - Explicitly flag when evidence is insufficient

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

    // Log the chat request — content length only, not full text
    await supabase.from("ai_events").insert({
      session_id,
      event_type: AI_EVENT_TYPE.CHAT_REQUESTED,
      stage: "chat",
      status: "pending",
      metadata: {
        content_length: content.length,
        session_status: session.status,
        // content intentionally excluded from logs
      },
    });

    log.info("Chat message received", {
      session_id,
      metadata: { content_length: content.length },
    });

    // Phase 1 placeholder response
    return ok({
      role: "assistant",
      content:
        "Grounded assistant retrieval is not connected yet. Chat will be added in the next phase.",
      citations: [],
      retrieved_chunk_ids: [],
      session_id,
      phase: 1,
      next_steps: [
        "Phase 2: Embed question + retrieve chunks via match_chunks()",
        "Phase 2: Generate grounded answer via OpenAI with citation mapping",
        "Phase 2: Persist conversation to chat_messages table",
      ],
    });
  } catch (e) {
    log.error("Unexpected error in chat", { metadata: { error: String(e) } });
    return internalError(e);
  }
});
