import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handleCors } from "../_shared/cors.ts";
import { ok, err, internalError } from "../_shared/response.ts";
import { createServiceClient } from "../_shared/supabaseClient.ts";
import { createLogger } from "../_shared/logger.ts";
import { validateSessionId } from "../_shared/validation.ts";
import { AI_EVENT_TYPE, LLM } from "../_shared/constants.ts";
import { buildTailoredCVPrompt } from "../_shared/prompts.ts";

const log = createLogger("generate-tailored-cv");

interface OpenAIChatResponse {
  choices: Array<{ message: { content: string } }>;
}

async function callOpenAI(apiKey: string, system: string, user: string): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: LLM.ANALYSIS_MODEL,
      temperature: 0.2,
      max_tokens: 4096,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user",   content: user },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`OpenAI error ${response.status}: ${errText.slice(0, 200)}`);
  }

  const data = await response.json() as OpenAIChatResponse;
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenAI returned empty content");
  return content;
}

function parseJSON(raw: string): Record<string, unknown> {
  const cleaned = raw.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim();
  return JSON.parse(cleaned) as Record<string, unknown>;
}

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "POST") {
    return err("METHOD_NOT_ALLOWED", "POST required", 405);
  }

  try {
    const body = await req.json().catch(() => null);
    if (!body) return err("BAD_REQUEST", "Request body must be valid JSON", 400);

    let session_id: string;
    try {
      session_id = validateSessionId(body?.session_id);
    } catch (validationErr) {
      return err("VALIDATION_ERROR", (validationErr as Error).message, 400);
    }

    const job_document_id = body?.job_document_id;
    if (!job_document_id || typeof job_document_id !== "string") {
      return err("VALIDATION_ERROR", "job_document_id is required", 400);
    }

    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      return err("CONFIGURATION_ERROR", "OPENAI_API_KEY is not configured", 500);
    }

    const supabase = createServiceClient();
    const started  = Date.now();

    // ── Verify session ──────────────────────────────────────────
    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .select("id, status")
      .eq("id", session_id)
      .is("deleted_at", null)
      .maybeSingle();

    if (sessionError) return err("DB_ERROR", "Error fetching session: " + sessionError.message, 500);
    if (!session)     return err("NOT_FOUND", "Session not found or deleted", 404);

    // ── Fetch resume document ───────────────────────────────────
    const { data: cvDoc, error: cvError } = await supabase
      .from("documents")
      .select("id, raw_text, title, file_name")
      .eq("session_id", session_id)
      .eq("document_type", "resume")
      .eq("status", "indexed")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cvError) return err("DB_ERROR", "Error fetching CV: " + cvError.message, 500);
    if (!cvDoc)  return err("MISSING_RESUME", "No indexed CV found in this session.", 400);

    // ── Fetch selected JD document ──────────────────────────────
    const { data: jdDoc, error: jdError } = await supabase
      .from("documents")
      .select("id, raw_text, title, file_name, job_index")
      .eq("id", job_document_id)
      .eq("session_id", session_id)
      .eq("document_type", "job_description")
      .is("deleted_at", null)
      .maybeSingle();

    if (jdError) return err("DB_ERROR", "Error fetching JD: " + jdError.message, 500);
    if (!jdDoc)  return err("NOT_FOUND", "Job description not found in this session.", 404);

    // ── Fetch existing analysis ─────────────────────────────────
    const { data: analysis } = await supabase
      .from("analyses")
      .select("summary, fit_tier, fit_estimate, skill_gaps, strengths, rewrite_recommendations")
      .eq("session_id", session_id)
      .eq("job_document_id", job_document_id)
      .maybeSingle();

    const analysisSummary = analysis
      ? `Fit tier: ${analysis.fit_tier ?? "unknown"}. Fit estimate: ${analysis.fit_estimate ?? "unknown"}/100.\n${analysis.summary ?? ""}`
      : "No prior analysis available.";

    const jobTitle = jdDoc.title ?? jdDoc.file_name ?? "Target Role";

    // ── Log start event ─────────────────────────────────────────
    await supabase.from("ai_events").insert({
      session_id,
      event_type: AI_EVENT_TYPE.TAILORED_CV_STARTED,
      stage:      "tailored_cv",
      status:     "pending",
      metadata:   {
        job_document_id,
        job_title: jobTitle,
        cv_chars:  (cvDoc.raw_text ?? "").length,
        jd_chars:  (jdDoc.raw_text ?? "").length,
      },
    });

    // ── Generate tailored CV ────────────────────────────────────
    let output: Record<string, unknown>;
    try {
      const { system, user } = buildTailoredCVPrompt(
        cvDoc.raw_text ?? "",
        jdDoc.raw_text ?? "",
        jobTitle,
        analysisSummary,
      );

      const raw = await callOpenAI(apiKey, system, user);
      output = parseJSON(raw);
    } catch (genErr) {
      const msg = (genErr as Error).message;
      log.error("Tailored CV generation failed", {
        session_id,
        metadata: { job_document_id, error: msg },
      });

      await supabase.from("ai_events").insert({
        session_id,
        event_type:  AI_EVENT_TYPE.TAILORED_CV_FAILED,
        stage:       "tailored_cv",
        status:      "failed",
        latency_ms:  Date.now() - started,
        metadata:    { job_document_id, error: msg },
      });

      return err("GENERATION_ERROR", `Tailored CV generation failed: ${msg}`, 500);
    }

    const latency = Date.now() - started;

    // ── Log completion ──────────────────────────────────────────
    await supabase.from("ai_events").insert({
      session_id,
      event_type:  AI_EVENT_TYPE.TAILORED_CV_COMPLETED,
      stage:       "tailored_cv",
      status:      "success",
      latency_ms:  latency,
      metadata: {
        job_document_id,
        job_title:    jobTitle,
        latency_ms:   latency,
      },
    });

    log.info("Tailored CV generated", {
      session_id,
      metadata: { job_document_id, job_title: jobTitle, latency_ms: latency },
    });

    return ok({
      session_id,
      job_document_id,
      job_title: jobTitle,
      tailored_cv: output,
    });
  } catch (e) {
    log.error("Unexpected error in generate-tailored-cv", { metadata: { error: String(e) } });
    return internalError(e);
  }
});
