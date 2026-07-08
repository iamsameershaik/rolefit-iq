// ── AWS Bedrock Provider Stub ────────────────────────────────────
// This file documents how AWS Bedrock/Claude can be added as an AI provider
// without changing any product business logic.
//
// Why this stub exists:
//   The AIProvider interface in aiProvider.ts abstracts all AI calls.
//   Swapping providers = implementing a new class + updating the factory.
//   No changes to Edge Function logic, analysis pipelines, or chat flows.
//
// When to use Bedrock instead of OpenAI:
//   - Enterprise compliance requirements (data residency in AWS)
//   - Cost optimisation at scale (Bedrock pricing model)
//   - AWS ecosystem integration (IAM, VPC, CloudTrail)
//   - Access to Anthropic Claude models via AWS Marketplace
//
// How to implement (Phase 3+):
//
// 1. Add AWS credentials as Supabase Edge Function secrets:
//      AWS_ACCESS_KEY_ID
//      AWS_SECRET_ACCESS_KEY
//      AWS_REGION (e.g. "us-east-1")
//      BEDROCK_MODEL_ID (e.g. "anthropic.claude-3-5-sonnet-20241022-v2:0")
//
// 2. Implement BedrockProvider satisfying the AIProvider interface:
//
//    import { BedrockRuntimeClient, InvokeModelCommand }
//      from "npm:@aws-sdk/client-bedrock-runtime@3";
//
//    export class BedrockProvider implements AIProvider {
//      private client: BedrockRuntimeClient;
//      private modelId: string;
//
//      constructor(region: string, modelId: string) {
//        this.client = new BedrockRuntimeClient({ region });
//        this.modelId = modelId;
//      }
//
//      async createEmbedding(input: string): Promise<number[]> {
//        // Use Amazon Titan Embeddings or Cohere embed via Bedrock.
//        // Note: dimension may differ from 1536 — update vector(N) if needed.
//        const command = new InvokeModelCommand({
//          modelId: "amazon.titan-embed-text-v2:0",
//          body: JSON.stringify({ inputText: input }),
//        });
//        const resp = await this.client.send(command);
//        const parsed = JSON.parse(new TextDecoder().decode(resp.body));
//        return parsed.embedding;
//      }
//
//      async generateStructuredAnalysis(input: AnalysisInput): Promise<AnalysisOutput> {
//        // Use Claude via Bedrock with the same analysis prompt from prompts.ts.
//        // Claude supports structured JSON output natively.
//        ...
//      }
//
//      async generateGroundedAnswer(input: GroundedAnswerInput): Promise<GroundedAnswerOutput> {
//        // Same grounded answer prompt, Claude context window is large.
//        ...
//      }
//
//      async generateRewriteRecommendations(input: RewriteInput): Promise<RewriteOutput> {
//        // Same rewrite prompt + guardrails.
//        ...
//      }
//    }
//
// 3. Update the provider factory in each Edge Function:
//
//    Before (Phase 2):
//      const provider = new OpenAIProvider(Deno.env.get("OPENAI_API_KEY")!);
//
//    After (Phase 3):
//      const provider = new BedrockProvider(
//        Deno.env.get("AWS_REGION")!,
//        Deno.env.get("BEDROCK_MODEL_ID")!
//      );
//
// That is the complete swap. Zero changes to business logic.
//
// Architecture note on queueing (future):
//   For large documents, chunking + embedding should move to a background queue.
//   Options: Supabase pg_cron + polling, Supabase Realtime triggers,
//   or an external queue (SQS, Upstash QStash).
//   The upload-document function already leaves a clear TODO for this.

export {};  // Stub — no runtime exports in Phase 1
