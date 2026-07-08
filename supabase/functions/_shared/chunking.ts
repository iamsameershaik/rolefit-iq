import type { ChunkRow } from "./types.ts";

// ── Chunking pipeline (Phase 2 scaffold) ─────────────────────────
// Splits raw document text into overlapping chunks suitable for embedding.
//
// Design decisions documented here for Phase 2 implementation:
//
// Strategy: sentence-aware sliding window
//   - Split on paragraph breaks and sentence boundaries
//   - Target chunk size: ~400 tokens (~1,600 chars) — balance context vs precision
//   - Overlap: ~50 tokens (~200 chars) — ensures boundary sentences are covered
//   - Section labels: detect headers (ALL CAPS, Title Case lines) for metadata
//
// Why not fixed character splitting:
//   Mid-sentence splits hurt embedding quality — the vector doesn't capture
//   complete semantic meaning. Sentence-aware splitting produces better retrieval.
//
// Why overlap:
//   Key evidence near chunk boundaries would otherwise be split across two chunks
//   with neither chunk containing enough context to be retrieved reliably.
//
// Token estimation:
//   ~4 chars per token is a safe approximation for English text.
//   Use tiktoken (npm:@dqbd/tiktoken) for precise counts in Phase 2.
//
// Large file handling:
//   Files > 50KB should be chunked asynchronously to avoid Edge Function timeouts.
//   TODO Phase 2+: Move chunking to a background job triggered after upload.
//   Use Supabase pg_cron or a webhook queue (Upstash QStash / AWS SQS).

export interface ChunkInput {
  session_id: string;
  document_id: string;
  document_type: string;
  job_index: number | null;
  raw_text: string;
}

export interface ChunkResult {
  session_id: string;
  document_id: string;
  document_type: string;
  job_index: number | null;
  section_label: string | null;
  chunk_index: number;
  content: string;
  token_estimate: number;
}

/**
 * Split raw document text into retrieval-ready chunks.
 * Phase 1: Returns an empty array — chunking runs in Phase 2.
 * Phase 2: Implement sentence-aware sliding window logic.
 */
export function chunkDocument(_input: ChunkInput): ChunkResult[] {
  // TODO Phase 2: Implement chunking pipeline
  // 1. Normalise whitespace and line endings
  // 2. Detect section headers (store as section_label)
  // 3. Split into paragraphs
  // 4. Merge small paragraphs / split large paragraphs by sentence boundary
  // 5. Apply sliding window overlap
  // 6. Estimate token count per chunk (~4 chars/token)
  // 7. Return ChunkResult[] ready for DB insert + embedding
  return [];
}

/**
 * Estimate token count for a string without a tokeniser library.
 * Approximation only — use tiktoken for precise counts in Phase 2.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Convert ChunkResult[] to database insert payloads (no embeddings yet).
 * Embeddings are added in a separate pass after all chunks are stored.
 */
export function toChunkRows(chunks: ChunkResult[]): Omit<ChunkRow, "id" | "created_at" | "deleted_at" | "embedding">[] {
  return chunks.map((c) => ({
    session_id: c.session_id,
    document_id: c.document_id,
    document_type: c.document_type,
    job_index: c.job_index,
    section_label: c.section_label,
    chunk_index: c.chunk_index,
    content: c.content,
    token_estimate: c.token_estimate,
  }));
}
