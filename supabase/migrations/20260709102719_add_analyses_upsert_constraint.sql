-- Add unique constraint to support upsert by (session_id, job_document_id)
ALTER TABLE analyses
  ADD CONSTRAINT analyses_session_job_document_unique
  UNIQUE (session_id, job_document_id);
