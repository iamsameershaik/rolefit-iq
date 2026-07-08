import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handleCors } from "../_shared/cors.ts";
import { ok, err, internalError } from "../_shared/response.ts";
import { createServiceClient } from "../_shared/supabaseClient.ts";
import { createLogger } from "../_shared/logger.ts";
import { optionalString } from "../_shared/validation.ts";
import { SESSION_STATUS, AI_EVENT_TYPE } from "../_shared/constants.ts";

const log = createLogger("create-session");

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "POST") {
    return err("METHOD_NOT_ALLOWED", "POST required", 405);
  }

  try {
    const body = await req.json().catch(() => ({}));
    const title  = optionalString(body?.title,  "title");
    const source = optionalString(body?.source, "source") ?? "anonymous";

    const supabase = createServiceClient();
    const started = Date.now();

    // Create session row
    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .insert({ title, status: SESSION_STATUS.CREATED, source })
      .select("id, created_at, updated_at, title, status, summary, source, deleted_at")
      .single();

    if (sessionError) {
      log.error("Failed to create session", { metadata: { error: sessionError.message } });
      return err("DB_ERROR", "Failed to create session", 500, sessionError.message);
    }

    // Log observability event — no raw document content here
    await supabase.from("ai_events").insert({
      session_id: session.id,
      event_type: AI_EVENT_TYPE.SESSION_CREATED,
      stage: "session",
      status: "success",
      latency_ms: Date.now() - started,
      metadata: { source },
    });

    log.info("Session created", { session_id: session.id, metadata: { source } });

    return ok({ session });
  } catch (e) {
    log.error("Unexpected error in create-session", { metadata: { error: String(e) } });
    return internalError(e);
  }
});
