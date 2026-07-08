/*
# RoleFit IQ — Initial Schema

## Overview
Complete database schema for the RoleFit IQ AI career intelligence cockpit.
Establishes all tables, pgvector infrastructure, indexes, RLS policies, and
the match_chunks retrieval function needed for the full application pipeline.

## New Tables

### sessions
One row per analysis workspace. A session holds one CV and up to three JDs.
Soft-deleted via deleted_at. Status tracks pipeline stage.

### documents
Stores raw text for CV (document_type='resume') and job descriptions
(document_type='job_description'). job_index 1-3 for JDs, NULL for resume.
Soft-deleted. Never include raw_text in logs — stored here only.

### chunks
Paragraph/section-level document chunks produced during the chunking pipeline.
embedding column (vector 1536) is NULL until the embedding pipeline runs in Phase 2.
ivfflat index is created ready for similarity search once embeddings exist.

### analyses
Structured AI analysis results per job description. All intelligence outputs
(strengths, gaps, risk_flags, interview_questions, etc.) stored as JSONB
for flexible schema evolution without further migrations.

### chat_messages
Grounded assistant conversation history. citations and retrieved_chunk_ids
link answers back to source evidence for explainability.

### ai_events
Lightweight observability/audit log. NEVER stores raw document text —
only counts, IDs, durations, statuses, and model names.

### evaluation_runs
Future quality evaluation infrastructure. Allows systematic quality checks
on analysis outputs without manual review.

## Security
- RLS enabled on all tables.
- MVP is no-auth (anonymous sessions). Edge Functions use service role key
  which bypasses RLS entirely. Frontend reads via Edge Functions.
- SELECT policies open to anon+authenticated for direct reads if needed.
- No INSERT/UPDATE/DELETE policies for anon — all mutations via service role.
- Soft deletion throughout. No hard deletes.

## Vector Search
- pgvector extension enabled.
- ivfflat index on chunks.embedding (vector_cosine_ops, lists=100).
- match_chunks() SECURITY DEFINER RPC for retrieval pipeline.
- Uses cosine distance (<=>). similarity = 1 - distance.
- Filters: session_id (required), document_type (optional), job_index (optional).
- Only returns chunks with non-null embeddings.

## Important Notes
1. No user_id / auth.users references — single-tenant anonymous-session MVP.
   Add user_id + FK to auth.users when authentication is implemented.
2. session_id is the data isolation boundary, enforced at application layer.
3. ivfflat index requires data to be useful; fine for small datasets, upgrade to
   hnsw for production scale.
4. vector(1536) targets OpenAI text-embedding-ada-002 / text-embedding-3-small.
   Change dimension if switching to a different embedding model.
5. JSONB columns in analyses allow Phase 2+ to evolve AI output schema freely.
*/

-- ─────────────────────────────────────────────
-- EXTENSIONS
-- ─────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─────────────────────────────────────────────
-- SESSIONS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sessions (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  title         text,
  status        text        NOT NULL DEFAULT 'created',
  summary       text,
  source        text        DEFAULT 'anonymous',
  deleted_at    timestamptz,
  CONSTRAINT sessions_status_check CHECK (
    status IN ('created','uploading','indexed','analysing','analysed','failed','deleted')
  )
);

-- ─────────────────────────────────────────────
-- DOCUMENTS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS documents (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      uuid        NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  document_type   text        NOT NULL,
  title           text,
  file_name       text,
  mime_type       text,
  raw_text        text,
  text_char_count int,
  status          text        NOT NULL DEFAULT 'uploaded',
  job_index       int,
  parse_warning   text,
  deleted_at      timestamptz,
  CONSTRAINT documents_type_check CHECK (
    document_type IN ('resume','job_description')
  ),
  CONSTRAINT documents_status_check CHECK (
    status IN ('uploaded','parsing','parsed','chunking','indexed','failed','deleted')
  ),
  CONSTRAINT documents_job_index_check CHECK (
    (document_type = 'resume'          AND job_index IS NULL)
    OR (document_type = 'job_description' AND job_index IN (1, 2, 3))
  )
);

-- ─────────────────────────────────────────────
-- CHUNKS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chunks (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id     uuid        NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  document_id    uuid        NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  document_type  text        NOT NULL,
  job_index      int,
  section_label  text,
  chunk_index    int         NOT NULL,
  content        text        NOT NULL,
  token_estimate int,
  embedding      vector(1536),
  created_at     timestamptz NOT NULL DEFAULT now(),
  deleted_at     timestamptz,
  CONSTRAINT chunks_content_not_empty CHECK (char_length(content) > 0)
);

-- ─────────────────────────────────────────────
-- ANALYSES
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS analyses (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id              uuid        NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  job_document_id         uuid        REFERENCES documents(id) ON DELETE CASCADE,
  job_index               int,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  fit_tier                text,
  fit_estimate            int,
  evidence_strength       text,
  risk_level              text,
  preparation_priority    text,
  summary                 text,
  strengths               jsonb       DEFAULT '[]'::jsonb,
  skill_gaps              jsonb       DEFAULT '[]'::jsonb,
  experience_alignment    jsonb       DEFAULT '[]'::jsonb,
  risk_flags              jsonb       DEFAULT '[]'::jsonb,
  interview_questions     jsonb       DEFAULT '[]'::jsonb,
  talking_points          jsonb       DEFAULT '[]'::jsonb,
  rewrite_recommendations jsonb       DEFAULT '{}'::jsonb,
  evidence                jsonb       DEFAULT '[]'::jsonb
);

-- ─────────────────────────────────────────────
-- CHAT MESSAGES
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_messages (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id          uuid        NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  created_at          timestamptz NOT NULL DEFAULT now(),
  role                text        NOT NULL,
  content             text        NOT NULL,
  citations           jsonb       DEFAULT '[]'::jsonb,
  retrieved_chunk_ids uuid[]      DEFAULT '{}'::uuid[],
  metadata            jsonb       DEFAULT '{}'::jsonb,
  CONSTRAINT chat_messages_role_check CHECK (role IN ('user','assistant','system'))
);

-- ─────────────────────────────────────────────
-- AI EVENTS (observability)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_events (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    uuid        REFERENCES sessions(id) ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  event_type    text        NOT NULL,
  stage         text,
  status        text,
  metadata      jsonb       DEFAULT '{}'::jsonb,
  latency_ms    int,
  token_usage   jsonb,
  error_message text
  -- IMPORTANT: Never store raw CV/JD text in metadata.
  -- Only store: counts, IDs, durations, statuses, model names.
);

-- ─────────────────────────────────────────────
-- EVALUATION RUNS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS evaluation_runs (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid        REFERENCES sessions(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  name       text,
  status     text        DEFAULT 'created',
  results    jsonb       DEFAULT '{}'::jsonb,
  notes      text
);

-- ─────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_sessions_status     ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_deleted_at ON sessions(deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_documents_session_id  ON documents(session_id);
CREATE INDEX IF NOT EXISTS idx_documents_type        ON documents(document_type);
CREATE INDEX IF NOT EXISTS idx_documents_deleted_at  ON documents(deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_chunks_session_id    ON chunks(session_id);
CREATE INDEX IF NOT EXISTS idx_chunks_document_id   ON chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_chunks_document_type ON chunks(document_type);
CREATE INDEX IF NOT EXISTS idx_chunks_job_index     ON chunks(job_index);
CREATE INDEX IF NOT EXISTS idx_chunks_deleted_at    ON chunks(deleted_at) WHERE deleted_at IS NULL;

-- pgvector ivfflat index — cosine similarity
-- lists=100 is suitable for datasets up to ~1M vectors; use hnsw for production scale.
-- This index only accelerates queries on rows where embedding IS NOT NULL.
CREATE INDEX IF NOT EXISTS idx_chunks_embedding
  ON chunks USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_analyses_session_id      ON analyses(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_events_session_id     ON ai_events(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_events_event_type     ON ai_events(event_type);

-- ─────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────
-- Phase 1: No authentication. All mutations go through Edge Functions using
-- the service_role key which bypasses RLS entirely.
-- Anon SELECT policies allow future direct frontend reads.

ALTER TABLE sessions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents      ENABLE ROW LEVEL SECURITY;
ALTER TABLE chunks         ENABLE ROW LEVEL SECURITY;
ALTER TABLE analyses       ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages  ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_events      ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_runs ENABLE ROW LEVEL SECURITY;

-- sessions
DROP POLICY IF EXISTS "anon_select_sessions" ON sessions;
CREATE POLICY "anon_select_sessions" ON sessions FOR SELECT
  TO anon, authenticated USING (deleted_at IS NULL);

-- documents
DROP POLICY IF EXISTS "anon_select_documents" ON documents;
CREATE POLICY "anon_select_documents" ON documents FOR SELECT
  TO anon, authenticated USING (deleted_at IS NULL);

-- chunks (anon can read chunk metadata; embedding vectors returned via match_chunks RPC)
DROP POLICY IF EXISTS "anon_select_chunks" ON chunks;
CREATE POLICY "anon_select_chunks" ON chunks FOR SELECT
  TO anon, authenticated USING (deleted_at IS NULL);

-- analyses
DROP POLICY IF EXISTS "anon_select_analyses" ON analyses;
CREATE POLICY "anon_select_analyses" ON analyses FOR SELECT
  TO anon, authenticated USING (true);

-- chat_messages
DROP POLICY IF EXISTS "anon_select_chat_messages" ON chat_messages;
CREATE POLICY "anon_select_chat_messages" ON chat_messages FOR SELECT
  TO anon, authenticated USING (true);

-- ai_events
DROP POLICY IF EXISTS "anon_select_ai_events" ON ai_events;
CREATE POLICY "anon_select_ai_events" ON ai_events FOR SELECT
  TO anon, authenticated USING (true);

-- evaluation_runs
DROP POLICY IF EXISTS "anon_select_evaluation_runs" ON evaluation_runs;
CREATE POLICY "anon_select_evaluation_runs" ON evaluation_runs FOR SELECT
  TO anon, authenticated USING (true);

-- ─────────────────────────────────────────────
-- MATCH CHUNKS RPC (vector similarity search)
-- ─────────────────────────────────────────────
-- Used by the retrieval pipeline in Phase 2.
-- SECURITY DEFINER runs as the function owner (bypasses RLS for the chunks read).
-- Inputs:
--   query_embedding    — 1536-dimension vector from the query
--   match_session_id   — scope results to a specific workspace
--   match_count        — max results (default 8)
--   filter_document_type — 'resume' | 'job_description' | NULL (both)
--   filter_job_index   — 1 | 2 | 3 | NULL (all JDs)
-- Output columns: id, session_id, document_id, document_type, job_index,
--   section_label, chunk_index, content, similarity (0–1, higher = more similar)
CREATE OR REPLACE FUNCTION match_chunks(
  query_embedding      vector(1536),
  match_session_id     uuid,
  match_count          int  DEFAULT 8,
  filter_document_type text DEFAULT NULL,
  filter_job_index     int  DEFAULT NULL
)
RETURNS TABLE (
  id            uuid,
  session_id    uuid,
  document_id   uuid,
  document_type text,
  job_index     int,
  section_label text,
  chunk_index   int,
  content       text,
  similarity    float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.session_id,
    c.document_id,
    c.document_type,
    c.job_index,
    c.section_label,
    c.chunk_index,
    c.content,
    (1 - (c.embedding <=> query_embedding))::float AS similarity
  FROM chunks c
  WHERE
    c.session_id     = match_session_id
    AND c.deleted_at IS NULL
    AND c.embedding  IS NOT NULL
    AND (filter_document_type IS NULL OR c.document_type = filter_document_type)
    AND (filter_job_index     IS NULL OR c.job_index     = filter_job_index)
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
