// Shared TypeScript types for the RoleFit IQ backend.
// These mirror the database schema and the AI provider contracts.
// Frontend types live in src/types/index.ts — keep in sync when evolving.

// ── Database row types ──────────────────────────────────────────

export interface SessionRow {
  id: string;
  created_at: string;
  updated_at: string;
  title: string | null;
  status: string;
  summary: string | null;
  source: string | null;
  deleted_at: string | null;
}

export interface DocumentRow {
  id: string;
  session_id: string;
  created_at: string;
  updated_at: string;
  document_type: "resume" | "job_description";
  title: string | null;
  file_name: string | null;
  mime_type: string | null;
  raw_text: string | null;
  text_char_count: number | null;
  status: string;
  job_index: number | null;
  parse_warning: string | null;
  deleted_at: string | null;
}

export interface ChunkRow {
  id: string;
  session_id: string;
  document_id: string;
  document_type: string;
  job_index: number | null;
  section_label: string | null;
  chunk_index: number;
  content: string;
  token_estimate: number | null;
  embedding: number[] | null;
  created_at: string;
  deleted_at: string | null;
}

export interface AnalysisRow {
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
  strengths: unknown[];
  skill_gaps: unknown[];
  experience_alignment: unknown[];
  risk_flags: unknown[];
  interview_questions: unknown[];
  talking_points: unknown[];
  rewrite_recommendations: Record<string, unknown>;
  evidence: unknown[];
}

export interface ChatMessageRow {
  id: string;
  session_id: string;
  created_at: string;
  role: "user" | "assistant" | "system";
  content: string;
  citations: unknown[];
  retrieved_chunk_ids: string[];
  metadata: Record<string, unknown>;
}

export interface AiEventRow {
  id: string;
  session_id: string | null;
  created_at: string;
  event_type: string;
  stage: string | null;
  status: string | null;
  metadata: Record<string, unknown>;
  latency_ms: number | null;
  token_usage: Record<string, unknown> | null;
  error_message: string | null;
}

// ── AI Provider interfaces ──────────────────────────────────────
// See aiProvider.ts for full interface definitions.

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

export interface Citation {
  chunk_id: string;
  source: string;      // e.g. "CV · Projects · Chunk 04"
  source_type: "cv" | "jd";
  excerpt: string;
  relevance: string;
}

// ── Request/response shapes for Edge Functions ──────────────────

export interface CreateSessionRequest {
  title?: string;
  source?: string;
}

export interface UploadDocumentRequest {
  session_id: string;
  document_type: "resume" | "job_description";
  title?: string;
  file_name?: string;
  raw_text: string;
  job_index?: number | null;
}

export interface GetSessionResponse {
  session: SessionRow;
  documents: Omit<DocumentRow, "raw_text">[];
  analyses: AnalysisRow[];
  chat_messages: ChatMessageRow[];
  event_summary: {
    total_events: number;
    latest_event: AiEventRow | null;
  };
}

export interface SendChatRequest {
  session_id: string;
  content: string;
}

export interface DeleteSessionRequest {
  session_id: string;
}
