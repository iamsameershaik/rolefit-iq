// ── Prompt templates (Phase 2 scaffold) ──────────────────────────
// All LLM prompts are centralised here to enable:
//   - Easy iteration and A/B testing without touching function logic
//   - Consistent guardrails across all prompt types
//   - Clear audit trail of what the model is instructed to do/avoid
//
// Phase 1: Names and structure only — content will be filled in Phase 2.
// Phase 2: Replace TODO placeholders with carefully engineered prompts.
//
// Prompt engineering guidelines (Phase 2):
//   1. Always include a SYSTEM role message with role, task, and constraints
//   2. Include guardrails explicitly (what NOT to claim, what NOT to invent)
//   3. Request JSON output with schema for structured analysis prompts
//   4. Include evidence citations as a required output field
//   5. Use chain-of-thought for complex fit assessment
//   6. Keep temperature low (0.2-0.3) for analysis; slightly higher (0.5) for rewrite

// ── Prompt names (used for logging/observability) ────────────────
export const PROMPT_NAMES = {
  FIT_ANALYSIS:     "rolefit_iq_fit_analysis_v1",
  GROUNDED_ANSWER:  "rolefit_iq_grounded_answer_v1",
  CV_REWRITE:       "rolefit_iq_cv_rewrite_v1",
  SKILL_GAP:        "rolefit_iq_skill_gap_v1",
} as const;

// ── System context (shared across prompts) ───────────────────────
export const SYSTEM_CONTEXT = `
You are RoleFit IQ, an explainable career intelligence assistant.
Your purpose is to help candidates understand their fit for specific roles
based ONLY on evidence retrieved from their uploaded CV and job descriptions.

GUARDRAILS — you must ALWAYS follow these:
- Only draw conclusions from the provided retrieved evidence chunks.
- Never invent experience, skills, or qualifications not present in the CV.
- Never claim the candidate will get the job or be shortlisted.
- Use language like "evidence suggests", "the CV indicates", "based on retrieved text".
- Flag gaps explicitly rather than glossing over them.
- Avoid ATS score language or hiring probability framing.
`.trim();

// ── Analysis prompt (Phase 2 TODO) ──────────────────────────────
export function buildAnalysisPrompt(
  _candidateContext: string,
  _jdContext: string,
  _jobTitle: string
): string {
  // TODO Phase 2: Build structured analysis prompt
  // Include: SYSTEM_CONTEXT + role-specific instruction + JSON schema + guardrails
  // Request these fields: fit_tier, fit_estimate, evidence_strength, risk_level,
  //   preparation_priority, summary, strengths[], skill_gaps[], risk_flags[],
  //   interview_questions[], talking_points[], rewrite_recommendations, evidence[]
  return SYSTEM_CONTEXT;
}

// ── Grounded answer prompt (Phase 2 TODO) ────────────────────────
export function buildGroundedAnswerPrompt(
  _question: string,
  _evidenceContext: string,
  _conversationHistory: Array<{ role: string; content: string }>
): string {
  // TODO Phase 2: Build grounded chat prompt
  // Format: SYSTEM_CONTEXT + retrieved evidence + conversation history + question
  // Require citations in response: [chunk_id, source, excerpt, relevance]
  // If evidence is insufficient: say so explicitly rather than speculating
  return SYSTEM_CONTEXT;
}

// ── CV rewrite prompt (Phase 2 TODO) ────────────────────────────
export function buildRewritePrompt(
  _cvContext: string,
  _jdContext: string,
  _jobTitle: string
): string {
  // TODO Phase 2: Build CV rewrite prompt
  // Key instruction: only STRENGTHEN existing evidence, never INVENT new experience
  // Output fields: professional_summary, bullet_improvements[], keyword_suggestions[], do_not_claim[]
  // Include explicit do_not_claim guardrail in the prompt itself
  return SYSTEM_CONTEXT;
}
