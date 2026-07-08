import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handleCors } from "../_shared/cors.ts";
import { ok, err, internalError } from "../_shared/response.ts";
import { createServiceClient } from "../_shared/supabaseClient.ts";
import { createLogger } from "../_shared/logger.ts";
import { validateSessionId } from "../_shared/validation.ts";

const log = createLogger("get-session");

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "GET" && req.method !== "POST") {
    return err("METHOD_NOT_ALLOWED", "GET or POST required", 405);
  }

  try {
    // Accept session_id from query param (GET) or body (POST)
    let session_id: string;
    try {
      if (req.method === "GET") {
        const url = new URL(req.url);
        session_id = validateSessionId(url.searchParams.get("session_id"));
      } else {
        const body = await req.json().catch(() => ({}));
        session_id = validateSessionId(body?.session_id);
      }
    } catch (validationErr) {
      return err("VALIDATION_ERROR", (validationErr as Error).message, 400);
    }

    const supabase = createServiceClient();

    // Fetch session
    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .select("id, created_at, updated_at, title, status, summary, source, deleted_at")
      .eq("id", session_id)
      .is("deleted_at", null)
      .maybeSingle();

    if (sessionError) {
      return err("DB_ERROR", "Error fetching session", 500, sessionError.message);
    }
    if (!session) {
      return err("NOT_FOUND", "Session not found or deleted", 404);
    }

    // Fetch documents — omit raw_text (not needed by frontend, reduces payload size)
    const { data: documents, error: docsError } = await supabase
      .from("documents")
      .select("id, session_id, created_at, updated_at, document_type, title, file_name, mime_type, text_char_count, status, job_index, parse_warning, deleted_at")
      .eq("session_id", session_id)
      .is("deleted_at", null)
      .order("created_at", { ascending: true });

    if (docsError) {
      log.warn("Error fetching documents", { session_id, metadata: { error: docsError.message } });
    }

    // Fetch analyses
    const { data: analyses, error: analysesError } = await supabase
      .from("analyses")
      .select("*")
      .eq("session_id", session_id)
      .order("job_index", { ascending: true });

    if (analysesError) {
      log.warn("Error fetching analyses", { session_id, metadata: { error: analysesError.message } });
    }

    // Fetch chat messages (most recent 50)
    const { data: chat_messages, error: chatError } = await supabase
      .from("chat_messages")
      .select("id, session_id, created_at, role, content, citations, retrieved_chunk_ids, metadata")
      .eq("session_id", session_id)
      .order("created_at", { ascending: true })
      .limit(50);

    if (chatError) {
      log.warn("Error fetching chat messages", { session_id, metadata: { error: chatError.message } });
    }

    // Fetch ai_events summary — count and most recent event only
    const { data: events, error: eventsError } = await supabase
      .from("ai_events")
      .select("id, event_type, stage, status, created_at, latency_ms")
      .eq("session_id", session_id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (eventsError) {
      log.warn("Error fetching ai_events", { session_id, metadata: { error: eventsError.message } });
    }

    log.info("Session fetched", { session_id, metadata: { status: session.status } });

    return ok({
      session,
      documents: documents ?? [],
      analyses: analyses ?? [],
      chat_messages: chat_messages ?? [],
      event_summary: {
        total_events: events?.length ?? 0,
        latest_event: events?.[0] ?? null,
      },
    });
  } catch (e) {
    log.error("Unexpected error in get-session", { metadata: { error: String(e) } });
    return internalError(e);
  }
});
