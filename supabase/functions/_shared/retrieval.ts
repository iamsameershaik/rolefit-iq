import type { AIProvider } from "./aiProvider.ts";
import type { RetrievedChunk } from "./types.ts";
import { RETRIEVAL, EMBEDDING } from "./constants.ts";

// ── Retrieval pipeline ────────────────────────────────────────────
//
// Dense vector search via pgvector cosine similarity.
//
// Why pgvector instead of a dedicated vector DB (Pinecone, Weaviate, etc.):
//   Supabase already handles persistence — zero additional infrastructure.
//   pgvector with ivfflat is sufficient for single-session datasets (~20–100 chunks).
//   All data stays in one system: consistent transactions, simpler ops, one backup.
//   Swap path: if scale demands it, mirror embeddings to a dedicated vector store
//   without changing the retrieveRelevantChunks() interface the rest of the code uses.
//
// Retrieval parameters:
//   match_count=8 fits comfortably in a gpt-4o context window for analysis prompts.
//   Increase to 16 for full-document analysis; see RETRIEVAL.ANALYSIS_MATCH_COUNT.

interface SupabaseClient {
  rpc(
    functionName: string,
    args: Record<string, unknown>,
  ): Promise<{ data: unknown; error: { message: string } | null }>;
}

export interface RetrievalInput {
  session_id: string;
  /** Plain text query — embedding is created internally by this function. */
  query: string;
  match_count?: number;
  filter_document_type?: "resume" | "job_description" | null;
  filter_job_index?: number | null;
}

export interface RetrievalResult {
  chunks: RetrievedChunk[];
  embedding_latency_ms: number;
  retrieval_latency_ms: number;
  embedding_model: string;
}

/**
 * Retrieve the most relevant chunks for a query using vector similarity search.
 *
 * Creates a query embedding, then calls the match_chunks() Supabase RPC which
 * uses cosine distance (<=> operator) on the pgvector ivfflat index.
 *
 * Both the AIProvider and SupabaseClient are injected so this function has no
 * global state and can be tested or swapped independently.
 */
export async function retrieveRelevantChunks(
  supabase: SupabaseClient,
  provider: AIProvider,
  input: RetrievalInput,
): Promise<RetrievalResult> {
  const matchCount = Math.min(
    input.match_count ?? RETRIEVAL.DEFAULT_MATCH_COUNT,
    RETRIEVAL.MAX_MATCH_COUNT,
  );

  // 1. Embed the query using the same model used during document indexing
  const embeddingStart = Date.now();
  const queryEmbedding = await provider.createEmbedding(input.query);
  const embeddingLatency = Date.now() - embeddingStart;

  // 2. Vector similarity search via match_chunks RPC (SECURITY DEFINER function)
  const retrievalStart = Date.now();
  const { data, error } = await supabase.rpc("match_chunks", {
    query_embedding:      queryEmbedding,
    match_session_id:     input.session_id,
    match_count:          matchCount,
    filter_document_type: input.filter_document_type ?? null,
    filter_job_index:     input.filter_job_index ?? null,
  });
  const retrievalLatency = Date.now() - retrievalStart;

  if (error) {
    throw new Error(`match_chunks RPC failed: ${error.message}`);
  }

  return {
    chunks: (data as RetrievedChunk[]) ?? [],
    embedding_latency_ms: embeddingLatency,
    retrieval_latency_ms: retrievalLatency,
    embedding_model: EMBEDDING.MODEL,
  };
}

/**
 * Format retrieved chunks into a labelled context block for LLM prompts.
 * Each chunk is numbered and sourced for citation tracking in Phase 3.
 */
export function formatChunksAsContext(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) return "[No retrieved evidence available]";
  return chunks
    .map((c, i) => {
      const slot = c.slot_id ?? (c.document_type === "resume" ? "cv" : `jd-${String(c.job_index ?? 0).padStart(2, "0")}`);
      const source =
        c.document_type === "resume"
          ? `CV · ${c.section_label ?? "General"} · Chunk ${String(c.chunk_index).padStart(2, "0")}`
          : `${slot.toUpperCase()} · ${c.section_label ?? "General"} · Chunk ${String(c.chunk_index).padStart(2, "0")}`;
      return `[${i + 1}] ${source}\n${c.content}`;
    })
    .join("\n\n---\n\n");
}
