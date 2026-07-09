import type {
  AIProvider,
  AnalysisInput,
  AnalysisOutput,
  GroundedAnswerInput,
  GroundedAnswerOutput,
  RewriteInput,
  RewriteOutput,
} from "./aiProvider.ts";
import { EMBEDDING, LLM } from "./constants.ts";
import { createLogger } from "./logger.ts";
import { buildAnalysisPrompt, buildGroundedAnswerPrompt } from "./prompts.ts";

// OpenAI Provider — the only active AI provider for MVP.
//
// Embeddings:  text-embedding-3-small (1536 dims) — see EMBEDDING constants.
// Analysis:    gpt-4o with JSON mode — structured fit assessment.
// Chat:        gpt-4o-mini — lower latency for conversational grounded answers.
//
// Provider swap path: implement BedrockProvider satisfying AIProvider and swap
// the factory in each Edge Function — no business logic changes required.

const log = createLogger("openaiProvider");

interface OpenAIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface OpenAIChatResponse {
  choices: Array<{ message: { content: string } }>;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

export class OpenAIProvider implements AIProvider {
  private apiKey: string;
  private embeddingModel: string;
  private chatModel: string;

  constructor(apiKey: string, embeddingModel?: string, chatModel?: string) {
    this.apiKey = apiKey;
    this.embeddingModel = embeddingModel ?? EMBEDDING.MODEL;
    this.chatModel = chatModel ?? LLM.ANALYSIS_MODEL;
  }

  // ── Embeddings ───────────────────────────────────────────────
  async createEmbedding(input: string): Promise<number[]> {
    if (!input || input.trim().length === 0) {
      throw new Error("createEmbedding: input must be non-empty");
    }

    const trimmed = input.slice(0, EMBEDDING.MAX_INPUT_CHARS);
    const started = Date.now();

    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: this.embeddingModel, input: trimmed }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      throw new Error(`OpenAI embeddings error ${response.status}: ${errText.slice(0, 200)}`);
    }

    const data = await response.json() as { data: Array<{ embedding: number[] }> };
    if (!Array.isArray(data.data?.[0]?.embedding)) {
      throw new Error("OpenAI embeddings returned unexpected response shape");
    }

    log.info("Embedding created", {
      metadata: {
        model: this.embeddingModel,
        dimensions: data.data[0].embedding.length,
        latency_ms: Date.now() - started,
      },
    });

    return data.data[0].embedding;
  }

  // ── Structured analysis ──────────────────────────────────────
  async generateStructuredAnalysis(input: AnalysisInput): Promise<AnalysisOutput> {
    const candidateContext = this.formatChunkContext(input.candidate_chunks);
    const jdContext        = this.formatChunkContext(input.jd_chunks);
    const jobTitle         = input.job_title ?? `Job ${input.job_index}`;

    const { system, user } = buildAnalysisPrompt(candidateContext, jdContext, jobTitle);
    const started = Date.now();

    const raw = await this.callChat({
      model: this.chatModel,
      temperature: LLM.ANALYSIS_TEMP,
      max_tokens: LLM.MAX_ANALYSIS_TOKENS,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user",   content: user },
      ],
    });

    const latency = Date.now() - started;
    log.info("Analysis generated", { metadata: { model: this.chatModel, latency_ms: latency } });

    // Try to parse; on failure retry once with a JSON repair prompt.
    let parsed: Record<string, unknown>;
    try {
      parsed = this.parseJSON(raw, "generateStructuredAnalysis");
    } catch (firstErr) {
      log.info("JSON parse failed on first attempt, retrying with repair prompt", {
        metadata: { error: (firstErr as Error).message },
      });
      try {
        const repairRaw = await this.callChat({
          model: this.chatModel,
          temperature: 0,
          max_tokens: LLM.MAX_ANALYSIS_TOKENS,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: system },
            { role: "user",   content: user },
            { role: "assistant", content: raw },
            {
              role: "user",
              content:
                "Your previous response was not valid JSON. Return ONLY the JSON object — no markdown fences, no extra text.",
            },
          ],
        });
        parsed = this.parseJSON(repairRaw, "generateStructuredAnalysis (repair)");
      } catch (repairErr) {
        // Both attempts failed — build a conservative fallback from available evidence.
        log.info("JSON repair also failed, using conservative fallback", {
          metadata: { error: (repairErr as Error).message },
        });
        parsed = this.buildConservativeFallback(
          candidateContext,
          jdContext,
          jobTitle,
          (firstErr as Error).message,
        );
      }
    }

    return this.normaliseAnalysisOutput(parsed);
  }

  // ── Grounded chat answer ─────────────────────────────────────
  async generateGroundedAnswer(input: GroundedAnswerInput): Promise<GroundedAnswerOutput> {
    const evidenceContext = this.formatChunkContext(input.retrieved_chunks);
    const { system, messages } = buildGroundedAnswerPrompt(
      input.question,
      evidenceContext,
      input.conversation_history,
    );

    const started = Date.now();

    const raw = await this.callChat({
      model: LLM.CHAT_MODEL,
      temperature: LLM.CHAT_TEMP,
      max_tokens: LLM.MAX_CHAT_TOKENS,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        ...messages as OpenAIMessage[],
      ],
    });

    const latency = Date.now() - started;
    log.info("Grounded answer generated", { metadata: { model: LLM.CHAT_MODEL, latency_ms: latency } });

    const parsed = this.parseJSON(raw, "generateGroundedAnswer") as {
      answer?: string;
      citations?: Array<{
        source?: string;
        document_type?: string;
        job_index?: number | null;
        snippet?: string;
        relevance?: string;
      }>;
    };

    const citations = (parsed.citations ?? []).map((c, i) => ({
      chunk_id:    input.retrieved_chunks[i]?.id ?? `cite-${i}`,
      source:      c.source ?? "Unknown source",
      source_type: (c.document_type === "resume" ? "cv" : "jd") as "cv" | "jd",
      excerpt:     c.snippet ?? "",
      relevance:   c.relevance ?? "",
    }));

    return {
      answer:             parsed.answer ?? "[No answer generated]",
      citations,
      retrieved_chunk_ids: input.retrieved_chunks.map((c) => c.id),
    };
  }

  // ── Rewrite recommendations ──────────────────────────────────
  // Handled within generateStructuredAnalysis — the analysis output includes
  // rewrite_recommendations as a top-level field. This method is a pass-through
  // that re-uses the analysis flow focused on the rewrite fields only.
  async generateRewriteRecommendations(_input: RewriteInput): Promise<RewriteOutput> {
    throw new Error("generateRewriteRecommendations: use generateStructuredAnalysis which includes rewrite_recommendations");
  }

  // ── Private helpers ──────────────────────────────────────────

  private formatChunkContext(chunks: Array<{ section_label?: string | null; chunk_index?: number; content: string; document_type?: string; job_index?: number | null }>): string {
    if (chunks.length === 0) return "[No content provided]";
    return chunks.map((c) => {
      const prefix = c.section_label ? `[${c.section_label}]\n` : "";
      return prefix + c.content;
    }).join("\n\n---\n\n");
  }

  private async callChat(params: {
    model: string;
    temperature: number;
    max_tokens: number;
    response_format?: { type: string };
    messages: OpenAIMessage[];
  }): Promise<string> {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      throw new Error(`OpenAI chat error ${response.status}: ${errText.slice(0, 300)}`);
    }

    const data = await response.json() as OpenAIChatResponse;
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error("OpenAI chat returned empty content");
    return content;
  }

  private parseJSON(raw: string, context: string): Record<string, unknown> {
    // Strip markdown code fences if present (defensive — JSON mode shouldn't add them)
    const cleaned = raw.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim();
    try {
      return JSON.parse(cleaned) as Record<string, unknown>;
    } catch {
      throw new Error(`${context}: JSON parse failed. Raw length=${raw.length}`);
    }
  }

  private buildConservativeFallback(
    candidateContext: string,
    jdContext: string,
    jobTitle: string,
    parseError: string,
  ): Record<string, unknown> {
    // Produce a minimal but honest analysis when OpenAI returns unparseable output.
    // Does NOT invent skills or experience — only what can be inferred from presence
    // of text. Marks evidence_strength as Weak and includes a warning.
    const hasCV = candidateContext.length > 50;
    const hasJD = jdContext.length > 50;
    return {
      fit_tier:             "Moderate",
      fit_estimate:         40,
      evidence_strength:    "Weak",
      risk_level:           "Medium",
      preparation_priority: "Medium",
      summary:
        `Analysis could not be fully generated for ${jobTitle} due to a parsing error. ` +
        `The CV and JD were received (CV: ${candidateContext.length} chars, JD: ${jdContext.length} chars). ` +
        `Review the documents and re-run analysis for a full assessment.`,
      strengths: hasCV
        ? [{ title: "CV provided", explanation: "Candidate submitted a CV for review.", evidence_strength: "Weak", evidence: [] }]
        : [],
      skill_gaps: hasJD
        ? [{ title: "Full analysis unavailable", impact: "Medium", suggested_action: "Re-run analysis.", severity: "Medium", evidence: [] }]
        : [],
      experience_alignment: [],
      risk_flags: [
        {
          title:      "Analysis parse failure",
          risk_level: "Medium",
          explanation: `The AI output could not be parsed: ${parseError.slice(0, 120)}`,
          mitigation: "Re-run analysis. If the error persists, shorten the documents.",
        },
      ],
      interview_questions:     [],
      talking_points:          [],
      rewrite_recommendations: { professional_summary: "", bullet_improvements: [], keyword_suggestions: [], do_not_claim: [] },
      evidence:                [],
      used_fallback:           true,
    };
  }

  private normaliseAnalysisOutput(raw: Record<string, unknown>): AnalysisOutput {
    const VALID_TIERS      = new Set(["Strong", "Moderate", "Developing"]);
    const VALID_STRENGTHS  = new Set(["Strong", "Moderate", "Weak"]);
    const VALID_RISK       = new Set(["Low", "Medium", "High"]);
    const VALID_PRIORITY   = new Set(["Low", "Medium", "High"]);

    const fit_tier = VALID_TIERS.has(raw.fit_tier as string)
      ? raw.fit_tier as AnalysisOutput["fit_tier"]
      : "Moderate";

    const fit_estimate = typeof raw.fit_estimate === "number"
      ? Math.max(0, Math.min(100, Math.round(raw.fit_estimate)))
      : 50;

    const evidence_strength = VALID_STRENGTHS.has(raw.evidence_strength as string)
      ? raw.evidence_strength as AnalysisOutput["evidence_strength"]
      : "Moderate";

    const risk_level = VALID_RISK.has(raw.risk_level as string)
      ? raw.risk_level as AnalysisOutput["risk_level"]
      : "Medium";

    const preparation_priority = VALID_PRIORITY.has(raw.preparation_priority as string)
      ? raw.preparation_priority as AnalysisOutput["preparation_priority"]
      : "Medium";

    const rewriteRaw = (raw.rewrite_recommendations ?? {}) as Record<string, unknown>;

    return {
      fit_tier,
      fit_estimate,
      evidence_strength,
      risk_level,
      preparation_priority,
      summary:                 typeof raw.summary === "string" ? raw.summary : "",
      strengths:               Array.isArray(raw.strengths)               ? raw.strengths               : [],
      skill_gaps:              Array.isArray(raw.skill_gaps)              ? raw.skill_gaps              : [],
      experience_alignment:    Array.isArray(raw.experience_alignment)    ? raw.experience_alignment    : [],
      risk_flags:              Array.isArray(raw.risk_flags)              ? raw.risk_flags              : [],
      interview_questions:     Array.isArray(raw.interview_questions)     ? raw.interview_questions     : [],
      talking_points:          Array.isArray(raw.talking_points)          ? raw.talking_points          : [],
      rewrite_recommendations: {
        professional_summary: typeof rewriteRaw.professional_summary === "string" ? rewriteRaw.professional_summary : "",
        bullet_improvements:  Array.isArray(rewriteRaw.bullet_improvements)  ? rewriteRaw.bullet_improvements  : [],
        keyword_suggestions:  Array.isArray(rewriteRaw.keyword_suggestions)  ? rewriteRaw.keyword_suggestions  : [],
        preparation_gaps:     Array.isArray(rewriteRaw.preparation_gaps)     ? rewriteRaw.preparation_gaps     : [],
        do_not_claim:         Array.isArray(rewriteRaw.do_not_claim)         ? rewriteRaw.do_not_claim         : [],
      },
      evidence: Array.isArray(raw.evidence) ? raw.evidence : [],
    };
  }
}
