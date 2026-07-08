import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handleCors } from "../_shared/cors.ts";
import { ok, err, internalError } from "../_shared/response.ts";
import { createServiceClient } from "../_shared/supabaseClient.ts";
import { createLogger } from "../_shared/logger.ts";
import {
  validateSessionId,
  validateDocumentType,
  validateJobIndex,
  validateRawTextLength,
  optionalString,
} from "../_shared/validation.ts";
import { DOCUMENT_STATUS, SESSION_STATUS, AI_EVENT_TYPE } from "../_shared/constants.ts";

const log = createLogger("upload-document");

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "POST") {
    return err("METHOD_NOT_ALLOWED", "POST required", 405);
  }

  try {
    const body = await req.json().catch(() => null);
    if (!body) return err("BAD_REQUEST", "Request body must be valid JSON", 400);

    // Validate inputs
    let session_id: string, document_type: "resume" | "job_description", job_index: number | null;
    try {
      session_id    = validateSessionId(body.session_id);
      document_type = validateDocumentType(body.document_type);
      job_index     = validateJobIndex(body.job_index, document_type);
      validateRawTextLength(body.raw_text ?? "");
    } catch (validationErr) {
      return err("VALIDATION_ERROR", (validationErr as Error).message, 400);
    }

    const raw_text      = (body.raw_text as string).trim();
    const title         = optionalString(body.title,     "title");
    const file_name     = optionalString(body.file_name, "file_name");
    const mime_type     = optionalString(body.mime_type, "mime_type");
    const text_char_count = raw_text.length;

    const supabase = createServiceClient();
    const started  = Date.now();

    // Verify session exists and is not deleted
    const { data: session, error: sessionFetchError } = await supabase
      .from("sessions")
      .select("id, status, deleted_at")
      .eq("id", session_id)
      .is("deleted_at", null)
      .maybeSingle();

    if (sessionFetchError) {
      return err("DB_ERROR", "Error fetching session", 500, sessionFetchError.message);
    }
    if (!session) {
      return err("NOT_FOUND", "Session not found or deleted", 404);
    }

    // Insert document — store raw_text for Phase 2 chunking
    // IMPORTANT: raw_text is stored in the documents table, NEVER in ai_events metadata
    const { data: document, error: docError } = await supabase
      .from("documents")
      .insert({
        session_id,
        document_type,
        title,
        file_name,
        mime_type,
        raw_text,
        text_char_count,
        status: DOCUMENT_STATUS.UPLOADED,
        job_index,
      })
      .select("id, session_id, created_at, document_type, title, file_name, text_char_count, status, job_index")
      .single();

    if (docError) {
      log.error("Failed to insert document", { session_id, metadata: { error: docError.message } });
      return err("DB_ERROR", "Failed to store document", 500, docError.message);
    }

    // Update session status to 'uploading'
    await supabase
      .from("sessions")
      .update({ status: SESSION_STATUS.UPLOADING, updated_at: new Date().toISOString() })
      .eq("id", session_id);

    // Log event — only counts and IDs, NOT raw_text
    await supabase.from("ai_events").insert({
      session_id,
      event_type: AI_EVENT_TYPE.DOCUMENT_UPLOADED,
      stage: "upload",
      status: "success",
      latency_ms: Date.now() - started,
      metadata: {
        document_id:   document.id,
        document_type,
        job_index,
        text_char_count,
        // raw_text intentionally excluded
      },
    });

    log.info("Document uploaded", {
      session_id,
      metadata: { document_id: document.id, document_type, job_index, text_char_count },
    });

    // TODO Phase 2: Trigger async chunking + embedding pipeline here.
    // Option A: Call a separate chunk-document Edge Function (fire-and-forget).
    // Option B: Insert a job into a queue table and process via pg_cron.
    // Option C: Use Supabase Realtime trigger or Webhook.
    // For now, document is stored as 'uploaded' — chunking happens in Phase 2.

    return ok({
      document: {
        id:             document.id,
        session_id:     document.session_id,
        created_at:     document.created_at,
        document_type:  document.document_type,
        title:          document.title,
        file_name:      document.file_name,
        text_char_count: document.text_char_count,
        status:         document.status,
        job_index:      document.job_index,
      },
    });
  } catch (e) {
    log.error("Unexpected error in upload-document", { metadata: { error: String(e) } });
    return internalError(e);
  }
});
