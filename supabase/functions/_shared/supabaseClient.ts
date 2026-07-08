import { createClient } from "npm:@supabase/supabase-js@2";

// Supabase service-role client for Edge Functions.
// Service role bypasses RLS — use only in trusted server-side code.
// NEVER expose SUPABASE_SERVICE_ROLE_KEY to the frontend.
//
// Scalability note: Deno edge function instances may be short-lived.
// The client is created per-request (inside Deno.serve handler) to avoid
// stale connections across cold starts.

export function createServiceClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !key) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in the Edge Function environment"
    );
  }

  return createClient(url, key, {
    auth: {
      // Service role client — no user session management needed
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
