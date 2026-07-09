// Maps backend AnalysisRowData (from analyses table) to the frontend JDAnalysis type.

import type {
  JDAnalysis,
  FitTier,
  EvidenceStrength,
  RiskLevel,
  PreparationPriority,
  EvidenceType,
  GapType,
} from '../types';
import type { AnalysisRowData, DocumentData } from './apiClient';

// ── Backend JSON shapes from OpenAI output ────────────────────────

interface BackendStrength {
  title?: string;
  explanation?: string;
  evidence_strength?: string;
  evidence_type?: string;
  evidence?: string[];
  why_it_matters_for_role?: string;
}

interface BackendSkillGap {
  title?: string;
  impact?: string;
  suggested_action?: string;
  severity?: string;
  gap_type?: string;
  evidence_basis?: string;
  evidence?: string[];
}

interface BackendRiskFlag {
  title?: string;
  risk_level?: string;
  explanation?: string;
  mitigation?: string;
  is_real_gap?: boolean;
}

interface BackendInterviewQuestion {
  question?: string;
  answer_angle?: string;
  evidence_to_mention?: string[];
  risk_to_avoid?: string;
  why_this_will_be_asked?: string;
}

interface BackendTalkingPoint {
  title?: string;
  point?: string;
}

interface BackendRewrite {
  professional_summary?: string;
  bullet_improvements?: string[];
  keyword_suggestions?: string[];
  preparation_gaps?: string[];
  do_not_claim?: string[];
}

interface BackendEvidence {
  source?: string;
  snippet?: string;
  why_it_matters?: string;
  evidence_type?: string;
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
function toEvidenceType(v: string | undefined): EvidenceType | undefined {
  if (v === 'Direct' || v === 'Adjacent' || v === 'Transferable' || v === 'Missing') return v;
  return undefined;
}
function toGapType(v: string | undefined): GapType | undefined {
  if (v === 'Missing' || v === 'Weakly evidenced' || v === 'Adjacent only') return v;
  return undefined;
}
function clamp(n: number | null | undefined, min: number, max: number): number {
  if (typeof n !== 'number') return Math.floor((min + max) / 2);
  return Math.max(min, Math.min(max, Math.round(n)));
}
function asArray<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

// ── Main mapper ───────────────────────────────────────────────────

export function mapAnalysisRow(row: AnalysisRowData, jdDoc?: DocumentData): JDAnalysis {
  const jobIndex = row.job_index ?? 1;
  // Use job_document_id for a stable, unique tab ID when available
  const jdId     = row.job_document_id ? `jd-doc-${row.job_document_id}` : `jd-${jobIndex}`;

  // Prefer JD document metadata for title/company/location
  const jdMeta = (jdDoc?.metadata ?? {}) as Record<string, unknown>;
  const title = (jdMeta.role_title as string | undefined)
    ?? jdDoc?.title
    ?? jdDoc?.file_name?.replace(/\.[^.]+$/, '')
    ?? `Job Description ${jobIndex}`;
  const company = (jdMeta.company_name as string | undefined) ?? '';
  const location = (jdMeta.location as string | undefined) ?? undefined;

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
    company,
    location,
    fitTier:               toFitTier(row.fit_tier),
    explainableFitEstimate: clamp(row.fit_estimate, 0, 100),
    evidenceStrength:      toEvidenceStrength(row.evidence_strength),
    riskLevel:             toRiskLevel(row.risk_level),
    preparationPriority:   toPriority(row.preparation_priority),

    matchedSkills: strengths.slice(0, 4).map((s) => s.title ?? '').filter(Boolean),
    missingSkills: skillGaps.slice(0, 3).map((g) => g.title ?? '').filter(Boolean),
    topStrengths:  strengths.slice(0, 3).map((s) => s.title ?? '').filter(Boolean),

    skillGaps: skillGaps.map((g) => ({
      skill:           g.title ?? 'Unknown gap',
      currentLevel:    g.evidence_basis ?? g.evidence?.[0] ?? 'Not evidenced in CV',
      impact:          toImpact(g.impact),
      suggestedAction: g.suggested_action ?? '',
      relatedJDs:      [jdId],
      gapType:         toGapType(g.gap_type),
      evidenceBasis:   g.evidence_basis,
    })),

    riskFlags: riskFlags.map((f) => ({
      title:       f.title ?? 'Risk',
      explanation: [f.explanation, f.mitigation].filter(Boolean).join(' — '),
      severity:    toRiskLevel(f.risk_level),
      relatedJDs:  [jdId],
      isRealGap:   f.is_real_gap,
    })),

    interviewQuestions: interviewQs.map((q) => ({
      question:              q.question ?? '',
      answerAngle:           q.answer_angle ?? '',
      evidenceToMention:     q.evidence_to_mention?.[0] ?? '',
      riskToAvoid:           q.risk_to_avoid ?? '',
      whyThisWillBeAsked:    q.why_this_will_be_asked,
    })),

    talkingPoints: talkingPts.map((t) => t.point ?? t.title ?? '').filter(Boolean),

    rewriteRecommendation: {
      jdId,
      professionalSummary: rewrite.professional_summary ?? '',
      bulletImprovements:  rewrite.bullet_improvements  ?? [],
      keywordSuggestions:  rewrite.keyword_suggestions  ?? [],
      doNotClaim:          rewrite.do_not_claim          ?? [],
      preparationGaps:     rewrite.preparation_gaps      ?? [],
    },

    evidenceSnippets: evidenceList.slice(0, 8).map((e, i) => ({
      id:           `ev-${jdId}-${i}`,
      text:         e.snippet       ?? '',
      source:       e.source        ?? 'Retrieved evidence',
      sourceType:   (e.source ?? '').toLowerCase().startsWith('cv') ? 'cv' : 'jd',
      relevance:    e.why_it_matters ?? '',
      evidenceType: toEvidenceType(e.evidence_type),
    })),

    fitSummary:         row.summary ?? '',
    strongestAlignment: strengths.slice(0, 3).map((s) => {
      const tag = s.evidence_type ? ` [${s.evidence_type}]` : '';
      return `${s.title ?? ''}${tag}`;
    }).filter(Boolean),
    weakestAlignment:   skillGaps.slice(0, 3).map((g) => {
      const tag = g.gap_type ? ` (${g.gap_type})` : '';
      return `${g.title ?? ''}${tag}: ${toImpact(g.impact)} priority`;
    }).filter(Boolean),
    candidateNarrative: talkingPts.map((t) => t.point ?? t.title ?? '').filter(Boolean).join(' '),
  };
}

// Convenience: map a full analyses array with document hints for title/metadata
export function mapAnalysesArray(
  rows: AnalysisRowData[],
  docsByJobIndex?: Record<number, DocumentData>,
): JDAnalysis[] {
  // Deduplicate by job_index — keep the most recently created row per job
  const latestByJobIndex = new Map<number, AnalysisRowData>();
  for (const row of rows) {
    if (row.job_index === null) continue;
    const existing = latestByJobIndex.get(row.job_index);
    if (!existing || row.created_at > existing.created_at) {
      latestByJobIndex.set(row.job_index, row);
    }
  }
  return [...latestByJobIndex.values()]
    .sort((a, b) => (a.job_index ?? 0) - (b.job_index ?? 0))
    .map((r) => mapAnalysisRow(r, docsByJobIndex?.[r.job_index ?? 0]));
}
