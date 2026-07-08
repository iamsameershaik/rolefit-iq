import type { AIProvider, AnalysisInput, AnalysisOutput, GroundedAnswerInput, GroundedAnswerOutput, RewriteInput, RewriteOutput } from "./aiProvider.ts";
import { EMBEDDING } from "./constants.ts";
import { createLogger } from "./logger.ts";

// OpenAI Provider — active AI provider for MVP.
//
// Embeddings: text-embedding-3-small (1536 dims, cost-efficient, strong retrieval quality).
// This model was chosen over ada-002 for its lower cost at equivalent retrieval quality
// and over text-embedding-3-large for its smaller dimension footprint (1536 vs 3072),
// which keeps the ivfflat index compact and query latency low.
//
// Analysis + chat (Phase 3): gpt-4o / gpt-4o-mini — see LLM constants.
//
// Provider swap: implement BedrockProvider satisfying this same AIProvider interface
// and update the factory in each Edge Function — zero changes to business logic.

const log = createLogger("openaiProvider");

export class OpenAIProvider implements AIProvider {
  private apiKey: string;
  // Allow OPENAI_EMBEDDING_MODEL secret to override default at runtime without code changes.
  private embeddingModel: string;

  constructor(apiKey: string, embeddingModel?: string) {
    this.apiKey = apiKey;
    this.embeddingModel = embeddingModel ?? EMBEDDING.MODEL;
  }

  async createEmbedding(input: string): Promise<number[]> {
    if (!input || input.trim().length === 0) {
      throw new Error("createEmbedding: input must be non-empty");
    }

    // Trim to stay well under the model's 8191-token limit.
    // Chunks are ~600 tokens so trimming is a safety net, not normal behaviour.
    const trimmed = input.slice(0, EMBEDDING.MAX_INPUT_CHARS);

    const started = Date.now();

    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.embeddingModel,
        input: trimmed,
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      throw new Error(`OpenAI embeddings error ${response.status}: ${errText.slice(0, 200)}`);
    }

    const data = await response.json() as { data: Array<{ embedding: number[] }> };

    if (!Array.isArray(data.data?.[0]?.embedding)) {
      throw new Error("OpenAI embeddings returned unexpected response shape");
    }

    // Log model + latency only — never log the input text
    log.info("Embedding created", {
      metadata: {
        model: this.embeddingModel,
        dimensions: data.data[0].embedding.length,
        latency_ms: Date.now() - started,
      },
    });

    return data.data[0].embedding;
  }

  async generateStructuredAnalysis(_input: AnalysisInput): Promise<AnalysisOutput> {
    throw new Error("generateStructuredAnalysis not implemented — Phase 3");
  }

  async generateGroundedAnswer(_input: GroundedAnswerInput): Promise<GroundedAnswerOutput> {
    throw new Error("generateGroundedAnswer not implemented — Phase 3");
  }

  async generateRewriteRecommendations(_input: RewriteInput): Promise<RewriteOutput> {
    throw new Error("generateRewriteRecommendations not implemented — Phase 3");
  }
}
