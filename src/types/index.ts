export type Page = 'landing' | 'upload' | 'results' | 'jd-detail';

export type DocumentStatus = 'empty' | 'uploaded' | 'indexed';

export interface DocumentSlot {
  id: string;
  type: 'cv' | 'jd';
  title: string;
  description: string;
  status: DocumentStatus;
  fileName?: string;
  charCount?: number;
  chunkCount?: number;
  pasteOpen?: boolean;
  pasteText?: string;
}

export interface WorkspaceState {
  cv: DocumentSlot;
  jds: [DocumentSlot, DocumentSlot, DocumentSlot];
}

export interface MetricItem {
  label: string;
  value: string;
  id: string;
}

export interface PipelineStage {
  key: string;
  label: string;
  active: boolean;
}

// ── Analysis types ──────────────────────────────────────────────

export type FitTier = 'Strong' | 'Moderate' | 'Developing';
export type EvidenceStrength = 'Strong' | 'Moderate' | 'Weak';
export type RiskLevel = 'Low' | 'Medium' | 'High';
export type PreparationPriority = 'Low' | 'Medium' | 'High';
export type SkillSignal = 'strong' | 'moderate' | 'weak' | 'missing';

export interface EvidenceSnippetType {
  id: string;
  text: string;
  source: string;   // e.g. "CV · Projects · Chunk 04"
  sourceType: 'cv' | 'jd';
  relevance: string;
}

export interface SkillGap {
  skill: string;
  currentLevel: string;
  impact: 'High' | 'Medium' | 'Low';
  suggestedAction: string;
  relatedJDs: string[];
}

export interface RiskFlag {
  title: string;
  explanation: string;
  severity: RiskLevel;
  relatedJDs: string[];
}

export interface Strength {
  title: string;
  explanation: string;
  evidenceStrength: EvidenceStrength;
  relatedJDs: string[];
}

export interface InterviewQuestion {
  question: string;
  answerAngle: string;
  evidenceToMention: string;
  riskToAvoid: string;
}

export interface RewriteRecommendation {
  jdId: string;
  professionalSummary: string;
  bulletImprovements: string[];
  keywordSuggestions: string[];
  doNotClaim: string[];
}

export interface JDAnalysis {
  id: string;
  title: string;
  company: string;
  fitTier: FitTier;
  explainableFitEstimate: number;
  evidenceStrength: EvidenceStrength;
  riskLevel: RiskLevel;
  preparationPriority: PreparationPriority;
  matchedSkills: string[];
  missingSkills: string[];
  topStrengths: string[];
  skillGaps: SkillGap[];
  riskFlags: RiskFlag[];
  interviewQuestions: InterviewQuestion[];
  talkingPoints: string[];
  rewriteRecommendation: RewriteRecommendation;
  evidenceSnippets: EvidenceSnippetType[];
  fitSummary: string;
  strongestAlignment: string[];
  weakestAlignment: string[];
  candidateNarrative: string;
}

export interface CandidateProfile {
  name: string;
  positioning: string;
  location: string;
  roleSignalsDetected: number;
  cvChunksIndexed: number;
  primaryThemes: string[];
  evidenceChunks: number;
}

export interface MatrixSkill {
  skill: string;
  fde: SkillSignal;
  aiSolutions: SkillSignal;
  aiAutomation: SkillSignal;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: EvidenceSnippetType[];
  timestamp: string;
}
