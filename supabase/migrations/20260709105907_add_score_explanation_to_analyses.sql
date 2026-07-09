-- Add score_explanation JSONB column to analyses table
-- Used to store structured explainability data alongside each fit estimate
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS score_explanation jsonb DEFAULT '{}'::jsonb;
