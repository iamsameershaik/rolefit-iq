// ── Application constants ─────────────────────────────────────────

// Session status values — mirror database CHECK constraint
export const SESSION_STATUS = {
  CREATED:    "created",
  UPLOADING:  "uploading",
  INDEXED:    "indexed",
  ANALYSING:  "analysing",
  ANALYSED:   "analysed",
  FAILED:     "failed",
  DELETED:    "deleted",
} as const;

// Document status values
export const DOCUMENT_STATUS = {
  UPLOADED:  "uploaded",
  PARSING:   "parsing",
  PARSED:    "parsed",
  CHUNKING:  "chunking",
  INDEXED:   "indexed",
  FAILED:    "failed",
  DELETED:   "deleted",
} as const;

// Document types
export const DOCUMENT_TYPE = {
  RESUME:          "resume",
  JOB_DESCRIPTION: "job_description",
} as const;

// AI event types — used for observability/audit
export const AI_EVENT_TYPE = {
  SESSION_CREATED:    "session_created",
  SESSION_DELETED:    "session_deleted",
  DOCUMENT_UPLOADED:  "document_uploaded",
  DOCUMENT_CHUNKED:   "document_chunked",
  DOCUMENT_EMBEDDED:  "document_embedded",
  ANALYSIS_REQUESTED: "analysis_requested",
  ANALYSIS_COMPLETED: "analysis_completed",
  ANALYSIS_FAILED:    "analysis_failed",
  CHAT_REQUESTED:     "chat_requested",
  CHAT_COMPLETED:     "chat_completed",
  RETRIEVAL_EXECUTED: "retrieval_executed",
  EMBEDDING_CREATED:  "embedding_created",
} as const;

// Chunking parameters (Phase 2)
export const CHUNKING = {
  TARGET_CHUNK_CHARS: 1_600,   // ~400 tokens at 4 chars/token
  OVERLAP_CHARS:      200,     // ~50 tokens overlap
  MAX_CHUNK_CHARS:    2_400,   // Hard cap before force-split
  MIN_CHUNK_CHARS:    100,     // Discard very short trailing chunks
} as const;

// Retrieval parameters (Phase 2)
export const RETRIEVAL = {
  DEFAULT_MATCH_COUNT:   8,    // Evidence chunks per retrieval call
  ANALYSIS_MATCH_COUNT: 16,    // More context for full analysis runs
  MAX_MATCH_COUNT:      32,    // Absolute ceiling
} as const;

// Document size limits
export const LIMITS = {
  MAX_RAW_TEXT_CHARS:   200_000,  // ~50KB of text
  MAX_DOCUMENTS_PER_SESSION: 4,   // 1 CV + 3 JDs
  MAX_JD_COUNT: 3,
} as const;

// Embedding model configuration (Phase 2)
export const EMBEDDING = {
  MODEL:      "text-embedding-3-small",
  DIMENSIONS: 1536,
  // Note: if switching to a model with different dimensions,
  // update vector(1536) in the chunks table migration.
} as const;

// Analysis model configuration (Phase 2)
export const LLM = {
  ANALYSIS_MODEL:     "gpt-4o",
  CHAT_MODEL:         "gpt-4o-mini",
  ANALYSIS_TEMP:      0.2,
  CHAT_TEMP:          0.4,
  MAX_ANALYSIS_TOKENS: 4_096,
  MAX_CHAT_TOKENS:     1_024,
} as const;
