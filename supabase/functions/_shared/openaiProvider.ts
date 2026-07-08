import type { AIProvider, AnalysisInput, AnalysisOutput, GroundedAnswerInput, GroundedAnswerOutput, RewriteInput, RewriteOutput } from "./aiProvider.ts";

// ── OpenAI Provider (Phase 2 scaffold) ──────────────────────────
// This class satisfies the AIProvider interface using OpenAI APIs.
//
// Phase 1: All methods throw NotImplementedError — no API calls are made.
// Phase 2: Replace each throw with real implementation:
//   - createEmbedding   → POST /embeddings  (model: text-embedding-3-small)
//   - generateStructuredAnalysis → POST /chat/completions with JSON mode
//   - generateGroundedAnswer     → POST /chat/completions with retrieved context
//   - generateRewriteRecommendations → POST /chat/completions
//
// Required secret (Phase 2): OPENAI_API_KEY
//   Set via: Supabase Dashboard → Edge Functions → Secrets
//   Do NOT add to frontend .env — this key must stay server-side.
//
// Model choices (Phase 2 defaults):
//   Embeddings: text-embedding-3-small (1536 dims, cost-efficient)
//   Analysis:   gpt-4o (structured JSON output, high reasoning)
//   Chat:       gpt-4o-mini (lower latency for conversational responses)
//
// Swap to AWS Bedrock: implement BedrockProvider in bedrockProvider.stub.ts
// and update the provider factory — zero changes to business logic required.

class NotImplementedError extends Error {
  constructor(method: string) {
    super(
      `OpenAI provider method '${method}' is not implemented in Phase 1. ` +
      "This will be wired in Phase 2 when OPENAI_API_KEY is available. " +
      "The Edge Function placeholder returns a descriptive message instead."
    );
    this.name = "NotImplementedError";
  }
}

export class OpenAIProvider implements AIProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async createEmbedding(_input: string): Promise<number[]> {
    // Phase 2 implementation:
    // const response = await fetch("https://api.openai.com/v1/embeddings", {
    //   method: "POST",
    //   headers: { "Authorization": `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
    //   body: JSON.stringify({ model: "text-embedding-3-small", input: _input }),
    // });
    // const data = await response.json();
    // return data.data[0].embedding;
    throw new NotImplementedError("createEmbedding");
  }

  async generateStructuredAnalysis(_input: AnalysisInput): Promise<AnalysisOutput> {
    // Phase 2 implementation:
    // Build a structured prompt using prompts.ts ANALYSIS_PROMPT.
    // Call gpt-4o with response_format: { type: "json_object" }.
    // Parse and validate the JSON output.
    // Return typed AnalysisOutput.
    throw new NotImplementedError("generateStructuredAnalysis");
  }

  async generateGroundedAnswer(_input: GroundedAnswerInput): Promise<GroundedAnswerOutput> {
    // Phase 2 implementation:
    // Build context from _input.retrieved_chunks.
    // Include conversation_history for multi-turn awareness.
    // Use GROUNDED_ANSWER_PROMPT from prompts.ts.
    // Return answer with citations mapped from chunk IDs.
    throw new NotImplementedError("generateGroundedAnswer");
  }

  async generateRewriteRecommendations(_input: RewriteInput): Promise<RewriteOutput> {
    // Phase 2 implementation:
    // Use REWRITE_PROMPT from prompts.ts.
    // Guardrail: instruct model to only strengthen existing evidence.
    // Include do_not_claim as a model constraint.
    throw new NotImplementedError("generateRewriteRecommendations");
  }
}
