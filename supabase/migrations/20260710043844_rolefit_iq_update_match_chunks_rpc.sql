/*
# Update match_chunks RPC to return slot_id

## Overview
Drops and recreates match_chunks() to include slot_id in the return columns
so retrieved evidence chunks carry their stable JD slot identity through
to the chat context and citation labels.

## Changes
- DROP existing match_chunks() function
- Recreate with slot_id text column in RETURNS TABLE

## Security
- Function remains SECURITY DEFINER. No other security changes.
*/

DROP FUNCTION IF EXISTS match_chunks(vector(1536), uuid, int, text, int);

CREATE FUNCTION match_chunks(
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
  slot_id       text,
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
    c.slot_id,
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
