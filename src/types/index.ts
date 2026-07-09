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
export type EvidenceType = 'Direct' | 'Adjacent' | 'Transferable' | 'Missing';
export type GapType = 'Missing' | 'Weakly evidenced' | 'Adjacent only';

export interface ExperienceAlignment {
  requirement: string;
  alignment: string;
  evidenceType: EvidenceType;
  evidence: string[];
}

export interface EvidenceSnippetType {
  id: string;
  text: string;
  source: string;
  sourceType: 'cv' | 'jd';
  relevance: string;
  evidenceType?: EvidenceType;
}

export interface SkillGap {
  skill: string;
  currentLevel: string;
  impact: 'High' | 'Medium' | 'Low';
  suggestedAction: string;
  relatedJDs: string[];
  gapType?: GapType;
  evidenceBasis?: string;
}

export interface RiskFlag {
  title: string;
  explanation: string;
  severity: RiskLevel;
  relatedJDs: string[];
  isRealGap?: boolean;
}

export interface Strength {
  title: string;
  explanation: string;
  evidenceStrength: EvidenceStrength;
  relatedJDs: string[];
  evidenceType?: EvidenceType;
  whyItMattersForRole?: string;
}

export interface InterviewQuestion {
  question: string;
  answerAngle: string;
  evidenceToMention: string;
  riskToAvoid: string;
  whyThisWillBeAsked?: string;
}

export interface RewriteRecommendation {
  jdId: string;
  professionalSummary: string;
  bulletImprovements: string[];
  keywordSuggestions: string[];
  doNotClaim: string[];
  preparationGaps?: string[];
}

export interface JDAnalysis {
  id: string;
  title: string;
  company: string;
  location?: string;
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
  experienceAlignment?: ExperienceAlignment[];
  fitSummary: string;
  strongestAlignment: string[];
  weakestAlignment: string[];
  candidateNarrative: string;
  /** Raw job_document_id from backend — used to call generate-tailored-cv */
  jobDocumentId?: string;
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

// ── Tailored CV types ───────────────────────────────────────────

export interface TailoredCVBullet {
  section: string;
  original_signal: string;
  tailored_bullet: string;
  evidence_basis: string;
  confidence: 'High' | 'Medium' | 'Low';
}

export interface TailoredCVProjectBullet {
  project_name: string;
  tailored_bullet: string;
  evidence_basis: string;
  confidence: 'High' | 'Medium' | 'Low';
}

export interface TailoredCV {
  target_role: {
    role_title: string;
    company_name: string | null;
    location: string | null;
  };
  candidate: {
    name: string;
    headline: string;
    location: string | null;
  };
  tailored_cv: {
    professional_summary: string;
    core_skills: string[];
    experience_bullets: TailoredCVBullet[];
    project_bullets: TailoredCVProjectBullet[];
    keyword_alignment: string[];
    do_not_claim: string[];
    preparation_gaps: string[];
  };
  notes: {
    grounding_summary: string;
    limitations: string[];
  };
}
