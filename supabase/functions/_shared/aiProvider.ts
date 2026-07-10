import type { RetrievedChunk, Citation } from "./types.ts";

// ── AI Provider abstraction layer ────────────────────────────────
// This interface allows swapping OpenAI ↔ AWS Bedrock/Claude without
// rewriting any product logic. All business logic references AIProvider only.
//
// Swap strategy:
//   1. Implement a new class satisfying AIProvider (e.g. BedrockProvider)
//   2. Update the factory in each Edge Function to return the new provider
//   3. No changes to analysis, chat, or retrieval logic required
//
// Phase 1: Interface only — no implementation yet.
// Phase 2: OpenAI implementation wired in.
// Phase 3+: Bedrock/Claude implementation available as drop-in.

export interface AnalysisInput {
  session_id: string;
  candidate_chunks: RetrievedChunk[];
  jd_chunks: RetrievedChunk[];
  job_index: number;
  job_title?: string;
}

export interface AnalysisOutput {
  fit_tier: "Strong" | "Moderate" | "Developing";
  fit_estimate: number;            // 0–100
  evidence_strength: "Strong" | "Moderate" | "Weak";
  risk_level: "Low" | "Medium" | "High";
  preparation_priority: "Low" | "Medium" | "High";
  summary: string;
  score_explanation: Record<string, unknown>;
  strengths: unknown[];
  skill_gaps: unknown[];
  experience_alignment: unknown[];
  risk_flags: unknown[];
  interview_questions: unknown[];
  talking_points: string[];
  rewrite_recommendations: Record<string, unknown>;
  evidence: unknown[];
}

export interface GroundedAnswerInput {
  session_id: string;
  question: string;
  retrieved_chunks: RetrievedChunk[];
  conversation_history: Array<{ role: string; content: string }>;
  available_slot_ids?: string[];
}

export interface GroundedAnswerOutput {
  answer: string;
  citations: Citation[];
  retrieved_chunk_ids: string[];
}

export interface RewriteInput {
  session_id: string;
  job_index: number;
  candidate_chunks: RetrievedChunk[];
  jd_chunks: RetrievedChunk[];
}

export interface RewriteOutput {
  professional_summary: string;
  bullet_improvements: string[];
  keyword_suggestions: string[];
  do_not_claim: string[];
}

export interface AIProvider {
  /**
   * Create a 1536-dimension embedding vector for the given input string.
   * Used during the chunking/indexing pipeline.
   */
  createEmbedding(input: string): Promise<number[]>;

  /**
   * Generate structured role-fit analysis from candidate and JD chunks.
   * Returns a fully typed AnalysisOutput suitable for storing in the analyses table.
   */
  generateStructuredAnalysis(input: AnalysisInput): Promise<AnalysisOutput>;

  /**
   * Answer a grounded question using retrieved evidence chunks.
   * Returns the answer text with citations back to source documents.
   */
  generateGroundedAnswer(input: GroundedAnswerInput): Promise<GroundedAnswerOutput>;

  /**
   * Generate JD-specific CV rewrite recommendations.
   * Must only strengthen existing evidence — never invent experience.
   */
  generateRewriteRecommendations(input: RewriteInput): Promise<RewriteOutput>;
}
