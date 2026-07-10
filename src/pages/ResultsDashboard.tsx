import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Loader2, AlertCircle, PlusSquare, Plus } from 'lucide-react';
import RetroColorBars from '../components/brand/RetroColorBars';
import CandidateSummaryCard from '../components/dashboard/CandidateSummaryCard';
import JDSummaryCard from '../components/dashboard/JDSummaryCard';
import RoleFitMatrix from '../components/dashboard/RoleFitMatrix';
import RoleComparisonSummary from '../components/dashboard/RoleComparisonSummary';
import StrengthsPanel from '../components/dashboard/StrengthsPanel';
import SkillGapsPanel from '../components/dashboard/SkillGapsPanel';
import RiskFlagsPanel from '../components/dashboard/RiskFlagsPanel';
import InterviewPrepPanel from '../components/dashboard/InterviewPrepPanel';
import RewriteRecommendationsPanel from '../components/dashboard/RewriteRecommendationsPanel';
import SystemTracePanel from '../components/dashboard/SystemTracePanel';
import ScoreExplanationDrawer from '../components/dashboard/ScoreExplanationDrawer';
import AssistantPanel from '../components/chat/AssistantPanel';
import { candidateProfile, jdAnalyses, roleFitMatrix } from '../data/mockData';
import { getSession } from '../lib/apiClient';
import type { DocumentData } from '../lib/apiClient';
import { mapAnalysesArray } from '../lib/analysisMapper';
import type { Page, JDAnalysis, Strength, SkillGap, RiskFlag, InterviewQuestion, CandidateProfile } from '../types';

interface Props {
  onNavigate: (page: Page, jdId?: string) => void;
  sessionId?: string | null;
  onNewWorkspace?: () => void;
  onAddMoreJDs?: () => void;
}

function buildConsolidated(analyses: JDAnalysis[]) {
  const strengths: Strength[] = analyses.flatMap((jd) =>
    jd.topStrengths.slice(0, 1).map((s) => ({
      title: s,
      explanation: `Evidenced across ${jd.title} analysis.`,
      evidenceStrength: jd.evidenceStrength,
      relatedJDs: [jd.id],
    }))
  );
  const uniqueGaps: SkillGap[] = [];
  const seenGap = new Set<string>();
  for (const jd of analyses) {
    for (const g of jd.skillGaps) {
      if (!seenGap.has(g.skill)) { seenGap.add(g.skill); uniqueGaps.push(g); }
    }
  }
  const uniqueFlags: RiskFlag[] = [];
  const seenFlag = new Set<string>();
  for (const jd of analyses) {
    for (const f of jd.riskFlags) {
      if (!seenFlag.has(f.title)) { seenFlag.add(f.title); uniqueFlags.push(f); }
    }
  }
  const questions: InterviewQuestion[] = analyses.flatMap((jd) =>
    jd.interviewQuestions.slice(0, 1)
  );
  return { strengths, uniqueGaps, uniqueFlags, questions };
}

function buildCandidateProfile(resumeDoc: DocumentData | undefined, totalChunks: number): CandidateProfile {
  const meta = (resumeDoc?.metadata ?? {}) as Record<string, unknown>;
  const themes = Array.isArray(meta.experience_themes) ? (meta.experience_themes as string[]) : [];
  const skills = Array.isArray(meta.top_skills) ? (meta.top_skills as string[]) : [];
  const primaryThemes = themes.length > 0 ? themes : skills.slice(0, 5);
  return {
    name:                (meta.candidate_name as string | undefined) ?? 'Candidate profile',
    positioning:         (meta.headline as string | undefined) ?? (meta.recent_role_title as string | undefined) ?? 'Uploaded CV indexed',
    location:            (meta.location as string | undefined) ?? 'Location not detected',
    roleSignalsDetected: primaryThemes.length,
    cvChunksIndexed:     resumeDoc?.chunk_count ?? 0,
    primaryThemes,
    evidenceChunks:      totalChunks,
  };
}

function isSessionNotFound(error: string): boolean {
  const lower = error.toLowerCase();
  return lower.includes('not found') || lower.includes('deleted') || lower.includes('not_found');
}

export default function ResultsDashboard({ onNavigate, sessionId, onNewWorkspace, onAddMoreJDs }: Props) {
  const isRealMode = !!sessionId;

  const [realAnalyses, setRealAnalyses]   = useState<JDAnalysis[] | null>(null);
  const [totalChunks, setTotalChunks]     = useState(0);
  const [docCount, setDocCount]           = useState(0);
  const [jdCount, setJdCount]             = useState(0);
  const [loading, setLoading]             = useState(false);
  const [loadError, setLoadError]         = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<string | null>(null);
  const [resumeDoc, setResumeDoc]         = useState<DocumentData | undefined>(undefined);
  const [explainAnalysis, setExplainAnalysis] = useState<JDAnalysis | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    setLoading(true);
    setLoadError(null);
    getSession(sessionId)
      .then((result) => {
        if (result.success) {
          const docs = result.data.documents ?? [];
          const jds  = docs.filter((d) => d.document_type === 'job_description');
          const cv   = docs.find((d) => d.document_type === 'resume');
          setDocCount(docs.length);
          setJdCount(jds.length);
          setTotalChunks(result.data.total_chunks);
          setSessionStatus(result.data.session.status);
          setResumeDoc(cv);

          if (result.data.analyses.length > 0) {
            const docsByJobIndex: Record<number, DocumentData> = {};
            for (const jd of jds) {
              if (jd.job_index !== null) docsByJobIndex[jd.job_index] = jd;
            }
            setRealAnalyses(mapAnalysesArray(result.data.analyses, docsByJobIndex));
          } else {
            setRealAnalyses([]);
          }
        } else {
          setLoadError(result.error.message);
        }
      })
      .catch((e) => setLoadError(String(e)))
      .finally(() => setLoading(false));
  }, [sessionId]);

  const hasRealAnalyses    = isRealMode && realAnalyses !== null && realAnalyses.length > 0;
  const displayAnalyses    = hasRealAnalyses ? realAnalyses! : (isRealMode ? [] : jdAnalyses);
  const showEmptyRealState = isRealMode && !loading && realAnalyses !== null && realAnalyses.length === 0;
  const showFullDashboard  = hasRealAnalyses || !isRealMode;
  const canAddMoreJDs      = isRealMode && jdCount < 3;

  const { strengths, uniqueGaps, uniqueFlags, questions } = buildConsolidated(
    showFullDashboard ? displayAnalyses : []
  );

  const displayCandidate = isRealMode
    ? buildCandidateProfile(resumeDoc, totalChunks)
    : candidateProfile;

  const docsIndexed = isRealMode ? docCount : 4;

  return (
    <>
    <div className="bg-[#F4F1EA] min-h-screen">
      <div className="border-b border-[#DDD8CE] bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => onNavigate('upload')}
              className="flex items-center gap-1.5 text-xs font-mono text-[#9A958F] hover:text-[#111111] transition-colors uppercase tracking-widest focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#111111] rounded-sm"
              aria-label="Back to workspace"
            >
              <ArrowLeft className="w-3 h-3" aria-hidden="true" />
              workspace
            </button>
            <div className="flex items-center gap-3">
              {isRealMode && onAddMoreJDs && (
                <button
                  onClick={onAddMoreJDs}
                  disabled={!canAddMoreJDs}
                  className="flex items-center gap-1.5 text-xs font-mono text-[#9A958F] hover:text-[#111111] transition-colors uppercase tracking-widest focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#111111] rounded-sm disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label={canAddMoreJDs ? 'Add more job descriptions' : 'Maximum 3 JDs reached'}
                  title={canAddMoreJDs ? 'Add more job descriptions' : 'Maximum of 3 JDs reached'}
                >
                  <Plus className="w-3 h-3" aria-hidden="true" />
                  {canAddMoreJDs ? 'add more JDs' : '3 JDs max'}
                </button>
              )}
              {isRealMode && onNewWorkspace && (
                <button
                  onClick={onNewWorkspace}
                  className="flex items-center gap-1.5 text-xs font-mono text-[#9A958F] hover:text-[#111111] transition-colors uppercase tracking-widest focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#111111] rounded-sm"
                  aria-label="Start a new workspace"
                >
                  <PlusSquare className="w-3 h-3" aria-hidden="true" />
                  new workspace
                </button>
              )}
            </div>
          </div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-[#6B6862] mb-1">
            {isRealMode ? (
              <span>
                RFQ-RESULTS-01 ·{' '}
                <span className="text-[#1A7A41]">{sessionId!.slice(0, 8)}</span>
                {hasRealAnalyses ? ' · live data' : loading ? ' · loading…' : ' · real session'}
              </span>
            ) : (
              'RFQ-RESULTS-01 · demo data'
            )}
          </p>
          <h1 className="text-2xl font-bold text-[#111111] mb-1">Results Dashboard</h1>
          <p className="text-sm text-[#6B6862] max-w-2xl">
            Compare role fit, evidence strength, gaps, risks, and interview readiness across your
            uploaded job descriptions.
          </p>
        </div>
      </div>

      <RetroColorBars height="h-1.5" />

      {loading && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="bg-white border border-[#DDD8CE] rounded-sm px-4 py-2 flex items-center gap-3">
            <Loader2 className="w-3.5 h-3.5 text-[#6B6862] animate-spin flex-shrink-0" aria-hidden="true" />
            <p className="font-mono text-[10px] text-[#6B6862] uppercase tracking-widest">
              Loading session data…
            </p>
          </div>
        </div>
      )}

      {loadError && !loading && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          {isSessionNotFound(loadError) ? (
            <div className="bg-[#FFF8E7] border border-[#FADDAA] rounded-sm px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-[#92600A] mb-1">
                  Workspace no longer available
                </p>
                <p className="text-xs text-[#6B6862] leading-relaxed">
                  This workspace may have been deleted or reset. Start a new workspace to continue.
                </p>
              </div>
              {onNewWorkspace && (
                <button
                  onClick={onNewWorkspace}
                  className="flex items-center gap-1.5 bg-[#111111] text-[#F4F1EA] font-mono text-[11px] uppercase tracking-widest px-4 py-2.5 rounded-sm hover:bg-[#222222] transition-colors whitespace-nowrap focus-visible:outline-none flex-shrink-0"
                >
                  Start new workspace
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              )}
            </div>
          ) : (
            <div className="bg-[#FFF8E7] border border-[#FADDAA] rounded-sm px-4 py-2 flex items-center gap-3">
              <AlertCircle className="w-3.5 h-3.5 text-[#92600A] flex-shrink-0" aria-hidden="true" />
              <p className="font-mono text-[10px] text-[#92600A] uppercase tracking-widest">
                Could not load session: {loadError}
              </p>
            </div>
          )}
        </div>
      )}

      {showEmptyRealState && !loadError && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
          <div className="bg-white border border-[#DDD8CE] rounded-sm p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-[#9A958F] mb-1.5">
                Real session · {sessionId!.slice(0, 8)}
                {docCount > 0 && ` · ${docCount} doc${docCount !== 1 ? 's' : ''} indexed`}
                {totalChunks > 0 && ` · ${totalChunks} chunks`}
              </p>
              <p className="text-sm font-semibold text-[#111111] mb-1">
                No analysis has been generated for this session yet
              </p>
              <p className="text-xs text-[#6B6862] leading-relaxed">
                {jdCount > 0
                  ? `${docCount} document${docCount !== 1 ? 's' : ''} are indexed and ready. Return to the workspace and click "Analyse role fit" to generate your analysis.`
                  : 'Upload at least one CV and one job description, then click "Analyse role fit".'}
              </p>
              {sessionStatus && sessionStatus !== 'indexed' && (
                <p className="font-mono text-[10px] text-[#9A958F] mt-2 uppercase tracking-widest">
                  Session status: {sessionStatus}
                </p>
              )}
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 flex-shrink-0">
              {onAddMoreJDs && canAddMoreJDs && (
                <button
                  onClick={onAddMoreJDs}
                  className="flex items-center gap-1.5 border border-[#DDD8CE] text-[#6B6862] font-mono text-[11px] uppercase tracking-widest px-4 py-2.5 rounded-sm hover:border-[#111111] hover:text-[#111111] transition-colors whitespace-nowrap focus-visible:outline-none"
                >
                  <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                  Add more JDs
                </button>
              )}
              <button
                onClick={() => onNavigate('upload')}
                className="flex items-center gap-1.5 bg-[#111111] text-[#F4F1EA] font-mono text-[11px] uppercase tracking-widest px-4 py-2.5 rounded-sm hover:bg-[#222222] transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#F4F1EA]"
              >
                Run analysis
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-[#9A958F] mb-3">
              Grounded assistant · available on indexed documents
            </p>
            <AssistantPanel sessionId={sessionId} jdCount={jdCount} />
          </div>
        </div>
      )}

      {showFullDashboard && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-[#9A958F] mb-3">01 · Candidate + system</p>
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
              <div className="xl:col-span-2">
                <CandidateSummaryCard candidate={displayCandidate} />
              </div>
              <SystemTracePanel
                documentsIndexed={docsIndexed}
                evidenceChunks={isRealMode ? totalChunks : candidateProfile.evidenceChunks}
                isRealMode={isRealMode}
                sessionId={sessionId ?? undefined}
                sessionStatus={sessionStatus ?? undefined}
                jdCount={isRealMode ? jdCount : undefined}
                analysesCount={isRealMode ? (realAnalyses?.length ?? 0) : undefined}
              />
            </div>
          </div>

          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-[#9A958F] mb-3">02 · Role fit estimates</p>
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {displayAnalyses.map((jd, i) => (
                <JDSummaryCard
                  key={jd.id}
                  id={jd.id}
                  index={i + 1}
                  title={jd.title}
                  company={jd.company}
                  location={jd.location}
                  fitTier={jd.fitTier}
                  explainableFitEstimate={jd.explainableFitEstimate}
                  evidenceStrength={jd.evidenceStrength}
                  riskLevel={jd.riskLevel}
                  topMatchedSkills={jd.matchedSkills}
                  topGap={jd.missingSkills[0] ?? '—'}
                  onViewDetail={() => onNavigate('jd-detail', jd.id)}
                  onScoreClick={() => setExplainAnalysis(jd)}
                />
              ))}
              {/* Add more JDs slot (real mode, slots remaining) */}
              {isRealMode && canAddMoreJDs && onAddMoreJDs && (
                <button
                  onClick={onAddMoreJDs}
                  className="group border-2 border-dashed border-[#DDD8CE] hover:border-[#9A958F] rounded-sm p-5 flex flex-col items-center justify-center gap-2 transition-colors min-h-[140px]"
                  aria-label="Add another job description"
                >
                  <Plus className="w-4 h-4 text-[#DDD8CE] group-hover:text-[#9A958F] transition-colors" aria-hidden="true" />
                  <span className="font-mono text-[10px] uppercase tracking-widest text-[#9A958F] group-hover:text-[#6B6862] transition-colors">
                    Add more JDs
                  </span>
                  <span className="font-mono text-[9px] text-[#DDD8CE] group-hover:text-[#9A958F] transition-colors">
                    {3 - jdCount} slot{3 - jdCount !== 1 ? 's' : ''} remaining
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Role portfolio comparison — real mode 2+ JDs; demo mode always */}
          {isRealMode && hasRealAnalyses && displayAnalyses.length >= 2 && (
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-[#9A958F] mb-3">
                03 · Role portfolio comparison
              </p>
              <p className="text-xs text-[#6B6862] mb-3 max-w-2xl">
                Compare how the active CV maps across uploaded roles using direct, adjacent, transferable,
                and missing evidence signals.
              </p>
              <div className="space-y-4">
                <RoleComparisonSummary analyses={displayAnalyses} />
                <RoleFitMatrix analyses={displayAnalyses} />
              </div>
            </div>
          )}

          {!isRealMode && (
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-[#9A958F] mb-3">03 · Evidence signal matrix</p>
              <RoleFitMatrix skills={roleFitMatrix} />
            </div>
          )}

          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-[#9A958F] mb-3">
              {isRealMode ? (displayAnalyses.length >= 2 ? '04' : '03') : '04'} · Analysis panels
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <StrengthsPanel strengths={strengths} />
              <SkillGapsPanel gaps={uniqueGaps.slice(0, 5)} />
              <RiskFlagsPanel flags={uniqueFlags} />
              <InterviewPrepPanel questions={questions} />
            </div>
          </div>

          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-[#9A958F] mb-3">
              {isRealMode ? (displayAnalyses.length >= 2 ? '05' : '04') : '05'} · JD-specific CV recommendations
            </p>
            <RewriteRecommendationsPanel jdAnalyses={displayAnalyses} />
          </div>

          {/* Retro band divider → transition to black assistant section */}
          <div className="-mx-4 sm:-mx-6 lg:-mx-8">
            {/* Stacked retro horizontal bands: warm orange, muted red, maroon, dark */}
            <div className="h-1.5 bg-[#D97706]" />
            <div className="h-1 bg-[#B91C1C]" />
            <div className="h-1 bg-[#7F1D1D]" />
            <div className="h-0.5 bg-[#450A0A]" />
            <div className="h-px bg-[#1a1a1a]" />
          </div>

          {/* Full-width black assistant section */}
          <div className="-mx-4 sm:-mx-6 lg:-mx-8 bg-black px-4 sm:px-6 lg:px-8 py-10">
            <div className="max-w-7xl mx-auto">
              <p className="font-mono text-[10px] uppercase tracking-widest text-[#666] mb-3">
                {isRealMode ? (displayAnalyses.length >= 2 ? '06' : '05') : '06'} · Grounded assistant
              </p>
              <AssistantPanel sessionId={sessionId} jdCount={isRealMode ? jdCount : undefined} />
            </div>
          </div>

          <div className="border-t border-[#DDD8CE] pt-4 flex flex-wrap gap-3">
            {['GDPR-ready architecture', 'Evidence-grounded recommendations', 'No hiring guarantees', 'WCAG-aware interface'].map((note) => (
              <span key={note} className="font-mono text-[10px] text-[#9A958F] uppercase tracking-widest border border-[#DDD8CE] px-2 py-1 rounded-sm bg-white">
                {note}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>

    {explainAnalysis && (
      <ScoreExplanationDrawer
        analysis={explainAnalysis}
        onClose={() => setExplainAnalysis(null)}
      />
    )}
    </>
  );
}
