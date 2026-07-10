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
  SESSION_CREATED:          "session_created",
  SESSION_DELETED:          "session_deleted",
  DOCUMENT_UPLOADED:        "document_uploaded",
  DOCUMENT_CHUNKING_STARTED: "document_chunking_started",
  CHUNKS_CREATED:           "chunks_created",
  EMBEDDINGS_STARTED:       "embeddings_started",
  EMBEDDINGS_COMPLETED:     "embeddings_completed",
  DOCUMENT_INDEXED:         "document_indexed",
  DOCUMENT_INDEXING_FAILED: "document_indexing_failed",
  DOCUMENT_CHUNKED:         "document_chunked",
  DOCUMENT_EMBEDDED:        "document_embedded",
  ANALYSIS_REQUESTED:       "analysis_requested",
  ANALYSIS_STARTED:         "analysis_started",
  ANALYSIS_JOB_STARTED:     "analysis_job_started",
  ANALYSIS_JOB_COMPLETED:   "analysis_job_completed",
  ANALYSIS_COMPLETED:       "analysis_completed",
  ANALYSIS_FAILED:          "analysis_failed",
  TAILORED_CV_STARTED:      "tailored_cv_started",
  TAILORED_CV_FAILED:       "tailored_cv_failed",
  TAILORED_CV_COMPLETED:    "tailored_cv_completed",
  CHAT_REQUESTED:           "chat_requested",
  CHAT_COMPLETED:           "chat_completed",
  RETRIEVAL_EXECUTED:       "retrieval_executed",
  RETRIEVAL_TESTED:         "retrieval_tested",
  EMBEDDING_CREATED:        "embedding_created",
} as const;

// Chunking parameters
// Target 500–800 tokens (~2000–3200 chars) per chunk.
// Overlap 100–150 tokens (~400–600 chars) carries context across boundaries.
// Paragraph-aware splitting preserves semantic coherence for embedding quality.
export const CHUNKING = {
  TARGET_CHUNK_CHARS: 2_400,   // ~600 tokens at 4 chars/token
  OVERLAP_CHARS:      480,     // ~120 tokens overlap
  MAX_CHUNK_CHARS:    3_600,   // ~900 tokens hard cap before force-split
  MIN_CHUNK_CHARS:    100,     // Discard very short trailing chunks
} as const;

// Retrieval parameters
export const RETRIEVAL = {
  DEFAULT_MATCH_COUNT:   8,    // Evidence chunks per retrieval call
  ANALYSIS_MATCH_COUNT: 16,    // More context for full analysis runs
  MAX_MATCH_COUNT:      32,    // Absolute ceiling
} as const;

// Document size limits
export const LIMITS = {
  MAX_RAW_TEXT_CHARS:        80_000,  // ~20k tokens — sufficient for any CV or JD
  MAX_DOCUMENTS_PER_SESSION: 4,       // 1 CV + 3 JDs
  MAX_JD_COUNT:              3,
} as const;

// Embedding model configuration
// text-embedding-3-small: cost-efficient, 1536 dims, strong retrieval quality for English text.
// text-embedding-ada-002 would also work but 3-small is newer and cheaper at same quality.
// Changing this model would require re-embedding all existing chunks (schema dimension is fixed).
export const EMBEDDING = {
  MODEL:      "text-embedding-3-small",
  DIMENSIONS: 1536,
  // Max input chars to trim before embedding — 3-small limit is 8191 tokens (~32k chars).
  // Chunks are ~600 tokens each so we'll never hit this in practice.
  MAX_INPUT_CHARS: 6_000,
} as const;

// Analysis model configuration (Phase 3)
export const LLM = {
  ANALYSIS_MODEL:      "gpt-4o",
  CHAT_MODEL:          "gpt-4o-mini",
  ANALYSIS_TEMP:       0.2,
  CHAT_TEMP:           0.4,
  MAX_ANALYSIS_TOKENS: 4_096,
  MAX_CHAT_TOKENS:     1_024,
} as const;
