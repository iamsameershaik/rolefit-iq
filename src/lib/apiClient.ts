// Frontend API client for RoleFit IQ.
// All write operations go through Supabase Edge Functions — never direct table writes.
// The anon key is used as the Bearer token; Edge Functions use service role internally.
//
// Security: OPENAI_API_KEY and SUPABASE_SERVICE_ROLE_KEY never appear here.
// Only VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are referenced.

const SUPABASE_URL    = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON   = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!SUPABASE_URL || !SUPABASE_ANON) {
  console.warn("[apiClient] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is not set — Edge Function calls will fail.");
}

// ── Standard response envelope ───────────────────────────────────

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: { code: string; message: string; details?: unknown };
}

export type ApiResult<T> = ApiSuccess<T> | ApiError;

// ── Session types returned from Edge Functions ───────────────────

export interface SessionData {
  id: string;
  created_at: string;
  updated_at: string;
  title: string | null;
  status: string;
  summary: string | null;
  source: string | null;
  deleted_at: string | null;
}

export interface DocumentData {
  id: string;
  session_id: string;
  created_at: string;
  document_type: "resume" | "job_description";
  title: string | null;
  file_name: string | null;
  text_char_count: number | null;
  status: string;
  job_index: number | null;
}

export interface GetSessionData {
  session: SessionData;
  documents: DocumentData[];
  analyses: unknown[];
  chat_messages: unknown[];
  event_summary: { total_events: number; latest_event: unknown };
}

// ── Core fetch helper ────────────────────────────────────────────

async function callFunction<T>(
  slug: string,
  options: { method?: string; body?: unknown; params?: Record<string, string> } = {}
): Promise<ApiResult<T>> {
  const { method = "POST", body, params } = options;

  let url = `${SUPABASE_URL}/functions/v1/${slug}`;
  if (params) {
    const qs = new URLSearchParams(params).toString();
    url += `?${qs}`;
  }

  try {
    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${SUPABASE_ANON}`,
        "Content-Type": "application/json",
        Apikey: SUPABASE_ANON,
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });

    let json: unknown;
    try {
      json = await response.json();
    } catch {
      return {
        success: false,
        error: {
          code: "PARSE_ERROR",
          message: `Edge Function returned non-JSON response (HTTP ${response.status})`,
        },
      };
    }

    if (!response.ok) {
      const errBody = json as Record<string, unknown>;
      return {
        success: false,
        error: {
          code: (errBody?.error as Record<string, unknown>)?.code as string ?? "HTTP_ERROR",
          message:
            (errBody?.error as Record<string, unknown>)?.message as string ??
            `Request failed with status ${response.status}`,
          details: errBody,
        },
      };
    }

    // Validate envelope shape
    const envelope = json as Record<string, unknown>;
    if (typeof envelope?.success !== "boolean") {
      return {
        success: false,
        error: {
          code: "UNEXPECTED_RESPONSE",
          message: "Edge Function response did not match expected envelope shape",
          details: json,
        },
      };
    }

    return json as ApiResult<T>;
  } catch (networkError) {
    return {
      success: false,
      error: {
        code: "NETWORK_ERROR",
        message: networkError instanceof Error ? networkError.message : "Network request failed",
      },
    };
  }
}

// ── Public API ───────────────────────────────────────────────────

/**
 * Create a new analysis workspace session.
 * Returns a session ID that links all subsequent uploads and analyses.
 */
export async function createSession(
  opts: { title?: string; source?: string } = {}
): Promise<ApiResult<{ session: SessionData }>> {
  return callFunction("create-session", {
    body: { title: opts.title ?? null, source: opts.source ?? "web" },
  });
}

/**
 * Upload (or paste) a document into an existing session.
 * raw_text is the plain-text content of the CV or JD.
 * Never call this with empty raw_text — validate before calling.
 */
export async function uploadDocument(payload: {
  session_id: string;
  document_type: "resume" | "job_description";
  raw_text: string;
  title?: string;
  file_name?: string;
  job_index?: number | null;
}): Promise<ApiResult<{ document: DocumentData }>> {
  return callFunction("upload-document", { body: payload });
}

/**
 * Fetch a complete session snapshot including documents, analyses, and chat history.
 * Returns null in the data shape if the session is not found.
 */
export async function getSession(
  sessionId: string
): Promise<ApiResult<GetSessionData>> {
  return callFunction("get-session", {
    method: "GET",
    params: { session_id: sessionId },
  });
}

/**
 * Request AI analysis for an indexed session.
 * Phase 1: returns a placeholder. Phase 2: triggers full fit analysis pipeline.
 */
export async function analyseSession(
  sessionId: string
): Promise<ApiResult<{ status: string; message: string }>> {
  return callFunction("analyse-session", {
    body: { session_id: sessionId },
  });
}

/**
 * Send a chat message to the grounded assistant.
 * Phase 1: returns a placeholder. Phase 2: retrieves chunks and calls LLM.
 */
export async function sendChatMessage(payload: {
  session_id: string;
  content: string;
}): Promise<ApiResult<{ role: string; content: string; citations: unknown[] }>> {
  return callFunction("chat", { body: payload });
}

/**
 * Soft-delete a session and all its documents/chunks.
 * GDPR right-to-delete pathway — data is marked deleted_at, not hard-erased.
 * Hard erasure should be run as a separate scheduled job in production.
 */
export async function deleteSession(
  sessionId: string
): Promise<ApiResult<{ session_id: string; deleted: boolean }>> {
  return callFunction("delete-session", {
    body: { session_id: sessionId },
  });
}
