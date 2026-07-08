// Maps backend AnalysisRowData (from analyses table) to the frontend JDAnalysis type.
// Keeps dashboard components unchanged — they always receive JDAnalysis regardless of
// whether the data came from Supabase or the mock dataset.

import type {
  JDAnalysis,
  FitTier,
  EvidenceStrength,
  RiskLevel,
  PreparationPriority,
} from '../types';
import type { AnalysisRowData } from './apiClient';

// ── Backend JSON shapes from OpenAI output ────────────────────────

interface BackendStrength {
  title?: string;
  explanation?: string;
  evidence_strength?: string;
  evidence?: string[];
}

interface BackendSkillGap {
  title?: string;
  impact?: string;
  suggested_action?: string;
  severity?: string;
  evidence?: string[];
}

interface BackendRiskFlag {
  title?: string;
  risk_level?: string;
  explanation?: string;
  mitigation?: string;
}

interface BackendInterviewQuestion {
  question?: string;
  answer_angle?: string;
  evidence_to_mention?: string[];
  risk_to_avoid?: string;
}

interface BackendTalkingPoint {
  title?: string;
  point?: string;
}

interface BackendRewrite {
  professional_summary?: string;
  bullet_improvements?: string[];
  keyword_suggestions?: string[];
  do_not_claim?: string[];
}

interface BackendEvidence {
  source?: string;
  snippet?: string;
  why_it_matters?: string;
}

// ── Validators ────────────────────────────────────────────────────

function toFitTier(v: string | null | undefined): FitTier {
  if (v === 'Strong' || v === 'Moderate' || v === 'Developing') return v;
  return 'Moderate';
}
function toEvidenceStrength(v: string | null | undefined): EvidenceStrength {
  if (v === 'Strong' || v === 'Moderate' || v === 'Weak') return v;
  return 'Moderate';
}
function toRiskLevel(v: string | null | undefined): RiskLevel {
  if (v === 'Low' || v === 'Medium' || v === 'High') return v;
  return 'Medium';
}
function toPriority(v: string | null | undefined): PreparationPriority {
  if (v === 'Low' || v === 'Medium' || v === 'High') return v;
  return 'Medium';
}
function toImpact(v: string | undefined): 'High' | 'Medium' | 'Low' {
  if (v === 'High' || v === 'Medium' || v === 'Low') return v;
  return 'Medium';
}
function clamp(n: number | null | undefined, min: number, max: number): number {
  if (typeof n !== 'number') return Math.floor((min + max) / 2);
  return Math.max(min, Math.min(max, Math.round(n)));
}
function asArray<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

// ── Main mapper ───────────────────────────────────────────────────

export function mapAnalysisRow(row: AnalysisRowData, jdTitle?: string): JDAnalysis {
  const jobIndex     = row.job_index ?? 1;
  const jdId         = `jd-${jobIndex}`;
  const title        = jdTitle ?? `Job Description ${jobIndex}`;

  const strengths    = asArray<BackendStrength>(row.strengths);
  const skillGaps    = asArray<BackendSkillGap>(row.skill_gaps);
  const riskFlags    = asArray<BackendRiskFlag>(row.risk_flags);
  const interviewQs  = asArray<BackendInterviewQuestion>(row.interview_questions);
  const talkingPts   = asArray<BackendTalkingPoint>(row.talking_points);
  const evidenceList = asArray<BackendEvidence>(row.evidence);
  const rewrite      = (row.rewrite_recommendations ?? {}) as BackendRewrite;

  return {
    id:                    jdId,
    title,
    company:               'Applied Role',
    fitTier:               toFitTier(row.fit_tier),
    explainableFitEstimate: clamp(row.fit_estimate, 0, 100),
    evidenceStrength:      toEvidenceStrength(row.evidence_strength),
    riskLevel:             toRiskLevel(row.risk_level),
    preparationPriority:   toPriority(row.preparation_priority),

    matchedSkills: strengths.slice(0, 4).map((s) => s.title ?? '').filter(Boolean),
    missingSkills: skillGaps.slice(0, 3).map((g) => g.title ?? '').filter(Boolean),
    topStrengths:  strengths.slice(0, 3).map((s) => s.title ?? '').filter(Boolean),

    skillGaps: skillGaps.map((g) => ({
      skill:          g.title ?? 'Unknown gap',
      currentLevel:   g.evidence?.[0] ?? 'Not evidenced in CV',
      impact:         toImpact(g.impact),
      suggestedAction: g.suggested_action ?? '',
      relatedJDs:     [jdId],
    })),

    riskFlags: riskFlags.map((f) => ({
      title:       f.title ?? 'Risk',
      explanation: [f.explanation, f.mitigation].filter(Boolean).join(' — '),
      severity:    toRiskLevel(f.risk_level),
      relatedJDs:  [jdId],
    })),

    interviewQuestions: interviewQs.map((q) => ({
      question:          q.question ?? '',
      answerAngle:       q.answer_angle ?? '',
      evidenceToMention: q.evidence_to_mention?.[0] ?? '',
      riskToAvoid:       q.risk_to_avoid ?? '',
    })),

    talkingPoints: talkingPts.map((t) => t.point ?? t.title ?? '').filter(Boolean),

    rewriteRecommendation: {
      jdId,
      professionalSummary: rewrite.professional_summary ?? '',
      bulletImprovements:  rewrite.bullet_improvements  ?? [],
      keywordSuggestions:  rewrite.keyword_suggestions  ?? [],
      doNotClaim:          rewrite.do_not_claim          ?? [],
    },

    evidenceSnippets: evidenceList.slice(0, 8).map((e, i) => ({
      id:         `ev-${jdId}-${i}`,
      text:       e.snippet       ?? '',
      source:     e.source        ?? 'Retrieved evidence',
      sourceType: (e.source ?? '').toLowerCase().startsWith('cv') ? 'cv' : 'jd',
      relevance:  e.why_it_matters ?? '',
    })),

    fitSummary:          row.summary ?? '',
    strongestAlignment:  strengths.slice(0, 3).map((s) => s.title ?? '').filter(Boolean),
    weakestAlignment:    skillGaps.slice(0, 3).map((g) => `${g.title ?? ''}: ${toImpact(g.impact)} priority`).filter(Boolean),
    candidateNarrative:  talkingPts.map((t) => t.point ?? t.title ?? '').filter(Boolean).join(' '),
  };
}

// Convenience: map a full analyses array, optionally with document title hints
export function mapAnalysesArray(
  rows: AnalysisRowData[],
  titleByJobIndex?: Record<number, string>,
): JDAnalysis[] {
  return rows
    .filter((r) => r.job_index !== null)
    .sort((a, b) => (a.job_index ?? 0) - (b.job_index ?? 0))
    .map((r) => mapAnalysisRow(r, titleByJobIndex?.[r.job_index ?? 0]));
}
