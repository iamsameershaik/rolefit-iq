// Frontend API client for RoleFit IQ.
// All write operations go through Supabase Edge Functions — never direct table writes.
// OPENAI_API_KEY and SUPABASE_SERVICE_ROLE_KEY never appear here.

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!SUPABASE_URL || !SUPABASE_ANON) {
  console.warn("[apiClient] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not set.");
}

// ── Envelope ─────────────────────────────────────────────────────

export interface ApiSuccess<T> { success: true;  data: T }
export interface ApiError      { success: false; error: { code: string; message: string; details?: unknown } }
export type ApiResult<T> = ApiSuccess<T> | ApiError;

// ── Shared row shapes ─────────────────────────────────────────────

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

// Analysis row as returned from analyses table (JSONB fields typed as unknown)
export interface AnalysisRowData {
  id: string;
  session_id: string;
  job_document_id: string | null;
  job_index: number | null;
  created_at: string;
  updated_at: string;
  fit_tier: string | null;
  fit_estimate: number | null;
  evidence_strength: string | null;
  risk_level: string | null;
  preparation_priority: string | null;
  summary: string | null;
  strengths: unknown;
  skill_gaps: unknown;
  experience_alignment: unknown;
  risk_flags: unknown;
  interview_questions: unknown;
  talking_points: unknown;
  rewrite_recommendations: unknown;
  evidence: unknown;
}

export interface GetSessionData {
  session: SessionData;
  documents: DocumentData[];
  total_chunks: number;
  analyses: AnalysisRowData[];
  chat_messages: unknown[];
  event_summary: { total_events: number; latest_event: unknown };
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

export interface ChatCitation {
  source: string;
  source_type: "cv" | "jd";
  excerpt: string;
  relevance: string;
}

export interface ChatResponseData {
  answer: string;
  citations: ChatCitation[];
  retrieved_chunk_ids: string[];
  retrieved_chunks: RetrievedChunk[];
  message_id: string | null;
  user_message_id: string | null;
  model: string;
}

export interface AnalyseSessionResult {
  session_id: string;
  analyses: AnalysisRowData[];
  analyses_count: number;
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

// ── Core fetch helper ─────────────────────────────────────────────

async function callFunction<T>(
  slug: string,
  options: { method?: string; body?: unknown; params?: Record<string, string> } = {}
): Promise<ApiResult<T>> {
  const { method = "POST", body, params } = options;
  let url = `${SUPABASE_URL}/functions/v1/${slug}`;
  if (params) url += `?${new URLSearchParams(params).toString()}`;

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
    try { json = await response.json(); }
    catch {
      return { success: false, error: { code: "PARSE_ERROR", message: `Non-JSON response (HTTP ${response.status})` } };
    }

    if (!response.ok) {
      const e = json as Record<string, unknown>;
      return {
        success: false,
        error: {
          code:    (e?.error as Record<string,unknown>)?.code as string ?? "HTTP_ERROR",
          message: (e?.error as Record<string,unknown>)?.message as string ?? `HTTP ${response.status}`,
          details: e,
        },
      };
    }

    const envelope = json as Record<string, unknown>;
    if (typeof envelope?.success !== "boolean") {
      return { success: false, error: { code: "UNEXPECTED_RESPONSE", message: "Bad envelope shape", details: json } };
    }

    return json as ApiResult<T>;
  } catch (networkErr) {
    return { success: false, error: { code: "NETWORK_ERROR", message: networkErr instanceof Error ? networkErr.message : "Network error" } };
  }
}

// ── Public API ────────────────────────────────────────────────────

export function createSession(opts: { title?: string; source?: string } = {}) {
  return callFunction<{ session: SessionData }>("create-session", {
    body: { title: opts.title ?? null, source: opts.source ?? "web" },
  });
}

export function uploadDocument(payload: {
  session_id: string;
  document_type: "resume" | "job_description";
  raw_text: string;
  title?: string;
  file_name?: string;
  job_index?: number | null;
}) {
  return callFunction<UploadDocumentResult>("upload-document", { body: payload });
}

export function getSession(sessionId: string) {
  return callFunction<GetSessionData>("get-session", {
    method: "GET",
    params: { session_id: sessionId },
  });
}

export function analyseSession(sessionId: string) {
  return callFunction<AnalyseSessionResult>("analyse-session", {
    body: { session_id: sessionId },
  });
}

export function sendChatMessage(payload: {
  session_id: string;
  content: string;
  selected_job_index?: number | null;
}) {
  return callFunction<ChatResponseData>("chat", { body: payload });
}

export function testRetrieval(payload: {
  session_id: string;
  query: string;
  match_count?: number;
  filter_document_type?: "resume" | "job_description" | null;
  filter_job_index?: number | null;
}) {
  return callFunction<TestRetrievalResult>("test-retrieval", { body: payload });
}

export function deleteSession(sessionId: string) {
  return callFunction<{ session_id: string; deleted: boolean }>("delete-session", {
    body: { session_id: sessionId },
  });
}
