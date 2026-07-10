-- Restrict direct access to session-scoped sensitive data.
-- Edge Functions use the service role and remain the current anonymous MVP access path.

DROP POLICY IF EXISTS "anon_select_sessions" ON sessions;
DROP POLICY IF EXISTS "anon_select_documents" ON documents;
DROP POLICY IF EXISTS "anon_select_chunks" ON chunks;
DROP POLICY IF EXISTS "anon_select_analyses" ON analyses;
DROP POLICY IF EXISTS "anon_select_chat_messages" ON chat_messages;
DROP POLICY IF EXISTS "anon_select_ai_events" ON ai_events;
DROP POLICY IF EXISTS "anon_select_evaluation_runs" ON evaluation_runs;

REVOKE EXECUTE ON FUNCTION public.match_chunks(vector(1536), uuid, integer, text, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.match_chunks(vector(1536), uuid, integer, text, integer)
  TO service_role;
