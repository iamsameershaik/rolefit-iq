// Shared CORS headers required on every Supabase Edge Function response.
// These must be present on preflight (OPTIONS), success, AND error responses.
// Without these, the browser will block responses from the Supabase functions domain.

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

/** Return a CORS preflight response for OPTIONS requests. */
export function handleCors(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  return null;
}
