import type { RetrievedChunk } from "./types.ts";

// ── Retrieval pipeline (Phase 2 scaffold) ─────────────────────────
// Retrieves evidence chunks via pgvector similarity search.
//
// Design decisions for Phase 2:
//
// Retrieval strategy: dense vector search via pgvector cosine similarity
//   - Query: embed the user question or JD requirement using the same model
//   - Search: call match_chunks() RPC with session_id scoping
//   - Reranking (Phase 3+): optional cross-encoder reranking for precision
//
// Why pgvector instead of a dedicated vector DB (Pinecone, Weaviate, etc.):
//   - Supabase already handles persistence — zero additional infrastructure
//   - pgvector with ivfflat is sufficient for datasets up to ~1M vectors
//   - All data stays in one system — simpler ops, consistent transactions
//   - Swap path: if scale demands it, add a Pinecone sync alongside pgvector
//     without changing the match_chunks() interface the rest of the code uses
//
// Retrieval parameters:
//   match_count=8 — sufficient for most analysis prompts (fits in context window)
//   Increase to 16-20 for full-document analysis tasks
//
// Evidence scoping:
//   For fit analysis: retrieve from BOTH resume AND specific jd (by job_index)
//   For grounded chat: retrieve from all documents in the session
//   For rewrite: retrieve from resume only, with JD requirements as query

export interface RetrievalQuery {
  session_id: string;
  query_embedding: number[];
  match_count?: number;
  filter_document_type?: "resume" | "job_description" | null;
  filter_job_index?: number | null;
}

export interface RetrievalResult {
  chunks: RetrievedChunk[];
  retrieval_latency_ms: number;
}

/**
 * Retrieve evidence chunks via pgvector similarity search.
 * Phase 1: Returns empty result — retrieval runs in Phase 2.
 * Phase 2: Call the match_chunks() Supabase RPC with the query embedding.
 */
export async function retrieveChunks(
  _supabase: unknown,
  _query: RetrievalQuery
): Promise<RetrievalResult> {
  // TODO Phase 2: Implement retrieval
  // const start = Date.now();
  // const { data, error } = await supabase.rpc("match_chunks", {
  //   query_embedding: query.query_embedding,
  //   match_session_id: query.session_id,
  //   match_count: query.match_count ?? 8,
  //   filter_document_type: query.filter_document_type ?? null,
  //   filter_job_index: query.filter_job_index ?? null,
  // });
  // if (error) throw error;
  // return { chunks: data as RetrievedChunk[], retrieval_latency_ms: Date.now() - start };
  return { chunks: [], retrieval_latency_ms: 0 };
}

/**
 * Format retrieved chunks into a context block for LLM prompts.
 * Each chunk is labelled with its source for citation tracking.
 */
export function formatChunksAsContext(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) return "[No retrieved evidence available]";
  return chunks
    .map((c, i) => {
      const source =
        c.document_type === "resume"
          ? `CV · ${c.section_label ?? "General"} · Chunk ${String(c.chunk_index).padStart(2, "0")}`
          : `JD ${c.job_index} · ${c.section_label ?? "General"} · Chunk ${String(c.chunk_index).padStart(2, "0")}`;
      return `[${i + 1}] ${source}\n${c.content}`;
    })
    .join("\n\n---\n\n");
}
