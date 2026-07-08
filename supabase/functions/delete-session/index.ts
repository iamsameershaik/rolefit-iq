import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handleCors } from "../_shared/cors.ts";
import { ok, err, internalError } from "../_shared/response.ts";
import { createServiceClient } from "../_shared/supabaseClient.ts";
import { createLogger } from "../_shared/logger.ts";
import { validateSessionId } from "../_shared/validation.ts";
import { SESSION_STATUS, DOCUMENT_STATUS, AI_EVENT_TYPE } from "../_shared/constants.ts";

const log = createLogger("delete-session");

// GDPR right-to-delete pathway:
// This function implements soft deletion throughout — no data is permanently
// removed in this call. Hard deletion (GDPR erasure) should be implemented
// as a separate scheduled job or admin endpoint in production.
//
// Soft delete sets deleted_at + status='deleted' on:
//   - The session row
//   - All documents belonging to the session
//   - All chunks belonging to the session (embeddings included)
//
// Analyses, chat_messages, and ai_events cascade-delete via FK ON DELETE CASCADE
// when the session row is hard-deleted in a future GDPR erasure job.
//
// Data retention policy (implement in production):
//   - Soft-deleted sessions: retain for 30 days before hard deletion
//   - Hard deletion: permanently removes session + all cascaded data
//   - GDPR erasure request: trigger immediate hard deletion

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "POST" && req.method !== "DELETE") {
    return err("METHOD_NOT_ALLOWED", "POST or DELETE required", 405);
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
    const now = new Date().toISOString();
    const started = Date.now();

    // Verify session exists and is not already deleted
    const { data: session, error: sessionFetchError } = await supabase
      .from("sessions")
      .select("id, status, deleted_at")
      .eq("id", session_id)
      .maybeSingle();

    if (sessionFetchError) {
      return err("DB_ERROR", "Error fetching session", 500, sessionFetchError.message);
    }
    if (!session) {
      return err("NOT_FOUND", "Session not found", 404);
    }
    if (session.deleted_at !== null) {
      // Idempotent — already deleted, return success
      return ok({ session_id, already_deleted: true });
    }

    // Soft delete: documents
    const { error: docsError } = await supabase
      .from("documents")
      .update({ deleted_at: now, status: DOCUMENT_STATUS.DELETED })
      .eq("session_id", session_id)
      .is("deleted_at", null);

    if (docsError) {
      log.warn("Error soft-deleting documents", { session_id, metadata: { error: docsError.message } });
    }

    // Soft delete: chunks
    const { error: chunksError } = await supabase
      .from("chunks")
      .update({ deleted_at: now })
      .eq("session_id", session_id)
      .is("deleted_at", null);

    if (chunksError) {
      log.warn("Error soft-deleting chunks", { session_id, metadata: { error: chunksError.message } });
    }

    // Soft delete: session itself (last — after children are marked)
    const { error: sessionError } = await supabase
      .from("sessions")
      .update({ deleted_at: now, status: SESSION_STATUS.DELETED, updated_at: now })
      .eq("id", session_id);

    if (sessionError) {
      return err("DB_ERROR", "Failed to delete session", 500, sessionError.message);
    }

    // Log observability event
    await supabase.from("ai_events").insert({
      session_id,
      event_type: AI_EVENT_TYPE.SESSION_DELETED,
      stage: "session",
      status: "success",
      latency_ms: Date.now() - started,
      metadata: { soft_delete: true },
    });

    log.info("Session soft-deleted", { session_id });

    return ok({ session_id, deleted: true, deleted_at: now });
  } catch (e) {
    log.error("Unexpected error in delete-session", { metadata: { error: String(e) } });
    return internalError(e);
  }
});
