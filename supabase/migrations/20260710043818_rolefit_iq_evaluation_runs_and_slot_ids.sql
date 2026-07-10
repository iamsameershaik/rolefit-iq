/*
# Wire evaluation_runs and add slot_id support

## Overview
This migration properly wires the evaluation_runs table into the analysis pipeline
and adds stable slot_id columns to documents, chunks, and analyses so JD identity
is deterministic (jd-01, jd-02, jd-03) rather than relying on array index or
retrieval order.

## Changes

### evaluation_runs table (enhanced)
- Added columns: model_used, total_jobs_compared, latency_ms, error_message
- These allow one evaluation_run per analysis attempt to track model, timing,
  job count, and failure reasons.

### documents table
- Added slot_id text column (e.g. 'cv', 'jd-01', 'jd-02', 'jd-03')
- This is a stable label that survives re-ordering, re-upload, and refresh.

### chunks table
- Added slot_id text column to propagate identity to evidence chunks.

### analyses table
- Added evaluation_run_id uuid column referencing evaluation_runs.
- Added slot_id text column so each analysis is linked to its JD slot.
- Added score_explanation jsonb column (already added by prior migration,
  but ensuring it exists here for completeness).

### Indexes
- Index on analyses.evaluation_run_id for run-level queries.
- Index on documents.slot_id for slot-based lookups.
- Index on chunks.slot_id for evidence filtering.

## Security
- RLS already enabled on all tables. No policy changes needed — existing
  anon SELECT policies cover the new columns automatically.
- evaluation_runs already has anon SELECT policy.

## Important Notes
1. slot_id is derived from job_index at insert time: job_index 1→'jd-01', etc.
   The CV document gets slot_id='cv'.
2. evaluation_run_id links each analysis row to the run that created it,
   enabling observability queries like "show all analyses from run X."
3. All new columns are nullable to maintain backward compatibility with
   existing rows.
*/

-- ─────────────────────────────────────────────
-- EVALUATION RUNS — add observability columns
-- ─────────────────────────────────────────────
ALTER TABLE evaluation_runs
  ADD COLUMN IF NOT EXISTS model_used text,
  ADD COLUMN IF NOT EXISTS total_jobs_compared int,
  ADD COLUMN IF NOT EXISTS latency_ms int,
  ADD COLUMN IF NOT EXISTS error_message text;

-- ─────────────────────────────────────────────
-- DOCUMENTS — add slot_id
-- ─────────────────────────────────────────────
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS slot_id text;

-- ─────────────────────────────────────────────
-- CHUNKS — add slot_id
-- ─────────────────────────────────────────────
ALTER TABLE chunks
  ADD COLUMN IF NOT EXISTS slot_id text;

-- ─────────────────────────────────────────────
-- ANALYSES — add evaluation_run_id and slot_id
-- ─────────────────────────────────────────────
ALTER TABLE analyses
  ADD COLUMN IF NOT EXISTS evaluation_run_id uuid REFERENCES evaluation_runs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS slot_id text;

-- Ensure score_explanation exists (may already exist from prior migration)
ALTER TABLE analyses
  ADD COLUMN IF NOT EXISTS score_explanation jsonb DEFAULT '{}'::jsonb;

-- ─────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_analyses_evaluation_run_id ON analyses(evaluation_run_id);
CREATE INDEX IF NOT EXISTS idx_documents_slot_id ON documents(slot_id);
CREATE INDEX IF NOT EXISTS idx_chunks_slot_id ON chunks(slot_id);

-- ─────────────────────────────────────────────
-- BACKFILL slot_id for existing rows
-- ─────────────────────────────────────────────
UPDATE documents
  SET slot_id = CASE
    WHEN document_type = 'resume' THEN 'cv'
    WHEN document_type = 'job_description' AND job_index = 1 THEN 'jd-01'
    WHEN document_type = 'job_description' AND job_index = 2 THEN 'jd-02'
    WHEN document_type = 'job_description' AND job_index = 3 THEN 'jd-03'
    ELSE NULL
  END
  WHERE slot_id IS NULL;

UPDATE chunks
  SET slot_id = CASE
    WHEN document_type = 'resume' THEN 'cv'
    WHEN document_type = 'job_description' AND job_index = 1 THEN 'jd-01'
    WHEN document_type = 'job_description' AND job_index = 2 THEN 'jd-02'
    WHEN document_type = 'job_description' AND job_index = 3 THEN 'jd-03'
    ELSE NULL
  END
  WHERE slot_id IS NULL;

UPDATE analyses
  SET slot_id = CASE
    WHEN job_index = 1 THEN 'jd-01'
    WHEN job_index = 2 THEN 'jd-02'
    WHEN job_index = 3 THEN 'jd-03'
    ELSE NULL
  END
  WHERE slot_id IS NULL;
