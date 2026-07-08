// Frontend API client for RoleFit IQ.
// All write operations go through Supabase Edge Functions — never direct table writes.
// The anon key is used as the Bearer token; Edge Functions use service role internally.
//
// Security: OPENAI_API_KEY and SUPABASE_SERVICE_ROLE_KEY never appear here.
// Only VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are referenced.

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

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

// ── Data shapes returned from Edge Functions ─────────────────────

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
  chunk_count?: number;
}

export interface UploadDocumentResult {
  document: DocumentData;
  chunks_created: number;
  token_estimate: number;
  embedding_model: string;
  status: string;
}

export interface RetrievedChunk {
  id: string;
  session_id: string;
  document_id: string;
  document_type: string;
  job_index: number | null;
  section_label: string | null;
  chunk_index: number;
  content: string;
  similarity: number;
}

export interface TestRetrievalResult {
  chunks: RetrievedChunk[];
  query_length: number;
  match_count: number;
  chunks_returned: number;
  embedding_model: string;
  embedding_latency_ms: number;
  retrieval_latency_ms: number;
  total_latency_ms: number;
}

export interface GetSessionData {
  session: SessionData;
  documents: DocumentData[];
  total_chunks: number;
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
    url += `?${new URLSearchParams(params).toString()}`;
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
          code:    (errBody?.error as Record<string, unknown>)?.code as string ?? "HTTP_ERROR",
          message: (errBody?.error as Record<string, unknown>)?.message as string ?? `Request failed with status ${response.status}`,
          details: errBody,
        },
      };
    }

    const envelope = json as Record<string, unknown>;
    if (typeof envelope?.success !== "boolean") {
      return {
        success: false,
        error: {
          code:    "UNEXPECTED_RESPONSE",
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
        code:    "NETWORK_ERROR",
        message: networkError instanceof Error ? networkError.message : "Network request failed",
      },
    };
  }
}

// ── Public API ───────────────────────────────────────────────────

export async function createSession(
  opts: { title?: string; source?: string } = {}
): Promise<ApiResult<{ session: SessionData }>> {
  return callFunction("create-session", {
    body: { title: opts.title ?? null, source: opts.source ?? "web" },
  });
}

export async function uploadDocument(payload: {
  session_id: string;
  document_type: "resume" | "job_description";
  raw_text: string;
  title?: string;
  file_name?: string;
  job_index?: number | null;
}): Promise<ApiResult<UploadDocumentResult>> {
  return callFunction("upload-document", { body: payload });
}

export async function getSession(
  sessionId: string
): Promise<ApiResult<GetSessionData>> {
  return callFunction("get-session", {
    method: "GET",
    params: { session_id: sessionId },
  });
}

export async function analyseSession(
  sessionId: string
): Promise<ApiResult<{ status: string; message: string }>> {
  return callFunction("analyse-session", {
    body: { session_id: sessionId },
  });
}

export async function sendChatMessage(payload: {
  session_id: string;
  content: string;
}): Promise<ApiResult<{ role: string; content: string; citations: unknown[] }>> {
  return callFunction("chat", { body: payload });
}

export async function testRetrieval(payload: {
  session_id: string;
  query: string;
  match_count?: number;
  filter_document_type?: "resume" | "job_description" | null;
  filter_job_index?: number | null;
}): Promise<ApiResult<TestRetrievalResult>> {
  return callFunction("test-retrieval", { body: payload });
}

export async function deleteSession(
  sessionId: string
): Promise<ApiResult<{ session_id: string; deleted: boolean }>> {
  return callFunction("delete-session", {
    body: { session_id: sessionId },
  });
}
