# System overview

## Implemented now

RoleFit IQ is a React client backed by Supabase Edge Functions. Functions use PostgreSQL and pgvector for session data and retrieval evidence, and call OpenAI for embeddings and structured generation.

```mermaid
flowchart TB
  UI["React client\nlanding, upload, results, role detail"]
  API["Edge Functions\nsession, upload, analysis, chat, tailored CV"]
  DB[("Supabase PostgreSQL\nsessions, documents, chunks, analyses, chat, events")]
  V[("pgvector\nmatch_chunks RPC")]
  LLM["OpenAI\nembeddings and chat models"]

  UI --> API
  API --> DB
  API --> V
  API --> LLM
  V --> DB
```

## Indexing flow

```mermaid
sequenceDiagram
  participant U as User
  participant F as upload-document
  participant D as PostgreSQL
  participant O as OpenAI
  U->>F: CV or JD text
  F->>F: validate role and derive slot
  F->>D: store document
  F->>F: section-aware chunking
  loop each chunk
    F->>O: create embedding
  end
  F->>D: store chunks and vectors
  F->>D: update document and session status
```

## Analysis and chat paths

```mermaid
flowchart LR
  CV[Indexed CV] --> A[analyse-session]
  JD[Indexed JD] --> A
  A --> Full[Full-document structured analysis]
  Full --> AR[analyses and evaluation_runs]

  Q[Question] --> C[chat]
  C --> E[Question embedding]
  E --> R[match_chunks retrieval]
  R --> G[Grounded answer generation]
  G --> CM[chat_messages and citations]
```

## MVP boundary

The application has no conventional backend server: Edge Functions are the application boundary. The current architecture is designed for small session-scoped corpora and synchronous processing. See [data lifecycle](data-model-and-lifecycle.md), [security](../security/mvp-security-model.md), and [productionisation](../operations/productionisation-plan.md) for limitations and next steps.
