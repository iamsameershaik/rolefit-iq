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

    if (sessionError) return err("DB_ERROR", "Error fetching session", 500, sessionError.message);
    if (!session)     return err("NOT_FOUND", "Session not found or deleted", 404);

    // Fetch documents — include metadata, omit raw_text (reduces payload)
    const { data: documents, error: docsError } = await supabase
      .from("documents")
      .select("id, session_id, created_at, updated_at, document_type, title, file_name, mime_type, text_char_count, status, job_index, slot_id, parse_warning, metadata, deleted_at")
      .eq("session_id", session_id)
      .is("deleted_at", null)
      .order("created_at", { ascending: true });

    if (docsError) {
      log.warn("Error fetching documents", { session_id, metadata: { error: docsError.message } });
    }

    // Fetch chunk document_ids in one query; group client-side to get per-document counts.
    const { data: chunkDocIds, error: chunkCountError } = await supabase
      .from("chunks")
      .select("document_id")
      .eq("session_id", session_id)
      .is("deleted_at", null);

    if (chunkCountError) {
      log.warn("Error fetching chunk counts", { session_id, metadata: { error: chunkCountError.message } });
    }

    const chunkCountByDoc: Record<string, number> = {};
    for (const row of chunkDocIds ?? []) {
      chunkCountByDoc[row.document_id] = (chunkCountByDoc[row.document_id] ?? 0) + 1;
    }
    const totalChunks = Object.values(chunkCountByDoc).reduce((a, b) => a + b, 0);

    const documentsWithCounts = (documents ?? []).map((doc: { id: string }) => ({
      ...doc,
      chunk_count: chunkCountByDoc[doc.id] ?? 0,
    }));

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

    // Fetch recent ai_events for observability summary
    const { data: events, error: eventsError } = await supabase
      .from("ai_events")
      .select("id, event_type, stage, status, created_at, latency_ms")
      .eq("session_id", session_id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (eventsError) {
      log.warn("Error fetching ai_events", { session_id, metadata: { error: eventsError.message } });
    }

    log.info("Session fetched", {
      session_id,
      metadata: { status: session.status, total_chunks: totalChunks },
    });

    return ok({
      session,
      documents:     documentsWithCounts,
      total_chunks:  totalChunks,
      analyses:      analyses ?? [],
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
