# RAG and LLM approach

## Implemented now

RoleFit IQ uses two complementary context strategies.

| Workflow | Context strategy | Why |
| --- | --- | --- |
| Role analysis | Full CV and selected JD text | A role-fit assessment needs complete coverage of both documents. |
| Conversational exploration | Vector-retrieved chunks plus recent chat history | Follow-up questions benefit from focused, cited evidence. |

## Indexing

- Documents are normalized and split on paragraphs with recognised section headings.
- Target chunk size is 2,400 characters, with 480-character overlap and a 3,600-character cap.
- Chunks use `text-embedding-3-small` and a `vector(1536)` column.
- Retrieval uses cosine similarity through the `match_chunks` RPC and an ivfflat index.

This keeps the implementation small and keeps retrieval data with the transactional application data.

## Analysis

`analyse-session` sends the selected CV and each indexed job description to the configured analysis model. The requested response is structured JSON containing fit tier, estimate, explanations, strengths, gaps, risks, interview preparation, rewrite guidance, and evidence.

The provider normalizes the response and makes one JSON-repair attempt. If both parsing attempts fail, it creates a conservative fallback rather than presenting unparsed model output as an analysis.

## Grounded chat

`chat` embeds the question, retrieves up to eight relevant chunks for a normal question, and sends them to the configured chat model. Multi-job questions retrieve separately scoped blocks for each referenced job and the CV, reducing evidence mixing between job slots.

## Tradeoffs

| Decision | Benefit | Cost or limitation |
| --- | --- | --- |
| Full text for analysis | Complete candidate/role comparison | Larger model request and cost. |
| RAG for chat | Focused evidence and source labels | Retrieval quality constrains answer quality. |
| pgvector in Supabase | Fewer systems and simple session filtering | Current ivfflat tuning is not a universal scale strategy. |
| Custom chunker | Small Deno-compatible implementation | Less configurable than a dedicated document-processing stack. |
| JSON mode | Predictable UI contracts | Model output still needs parsing and normalization. |

## MVP limitations

Input is plain text, embeddings are created serially, and the current retrieval approach is optimized for small per-session corpora. Citations are model-generated and should be treated as product evidence aids, not independent verification.

## Production roadmap

- Batch or queue embeddings with retry and idempotency controls.
- Evaluate retrieval quality with representative, consented evaluation fixtures.
- Consider HNSW or a dedicated retrieval service only when measured corpus size or latency warrants it.
- Add automated citation-to-chunk validation.
