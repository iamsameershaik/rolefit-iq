import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import RetroColorBars from '../components/brand/RetroColorBars';
import CandidateSummaryCard from '../components/dashboard/CandidateSummaryCard';
import JDSummaryCard from '../components/dashboard/JDSummaryCard';
import RoleFitMatrix from '../components/dashboard/RoleFitMatrix';
import StrengthsPanel from '../components/dashboard/StrengthsPanel';
import SkillGapsPanel from '../components/dashboard/SkillGapsPanel';
import RiskFlagsPanel from '../components/dashboard/RiskFlagsPanel';
import InterviewPrepPanel from '../components/dashboard/InterviewPrepPanel';
import RewriteRecommendationsPanel from '../components/dashboard/RewriteRecommendationsPanel';
import SystemTracePanel from '../components/dashboard/SystemTracePanel';
import AssistantPanel from '../components/chat/AssistantPanel';
import { candidateProfile, jdAnalyses, roleFitMatrix } from '../data/mockData';
import { getSession } from '../lib/apiClient';
import { mapAnalysesArray } from '../lib/analysisMapper';
import type { Page, JDAnalysis, Strength, SkillGap, RiskFlag, InterviewQuestion } from '../types';

interface Props {
  onNavigate: (page: Page, jdId?: string) => void;
  sessionId?: string | null;
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

export default function ResultsDashboard({ onNavigate, sessionId }: Props) {
  // isRealMode is true whenever a live session ID exists — separates real from demo.
  const isRealMode = !!sessionId;

  const [realAnalyses, setRealAnalyses]   = useState<JDAnalysis[] | null>(null);
  const [totalChunks, setTotalChunks]     = useState(0);
  const [docCount, setDocCount]           = useState(0);
  const [jdCount, setJdCount]             = useState(0);
  const [loading, setLoading]             = useState(false);
  const [loadError, setLoadError]         = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    setLoading(true);
    setLoadError(null);
    getSession(sessionId)
      .then((result) => {
        if (result.success) {
          const docs = result.data.documents ?? [];
          const jds  = docs.filter((d) => d.document_type === 'job_description');
          setDocCount(docs.length);
          setJdCount(jds.length);
          setTotalChunks(result.data.total_chunks);
          setSessionStatus(result.data.session.status);
          if (result.data.analyses.length > 0) {
            setRealAnalyses(mapAnalysesArray(result.data.analyses));
          } else {
            // Explicitly mark that we loaded but found no analyses
            setRealAnalyses([]);
          }
        } else {
          setLoadError(result.error.message);
        }
      })
      .catch((e) => setLoadError(String(e)))
      .finally(() => setLoading(false));
  }, [sessionId]);

  // Real mode: only show real analyses — never fall back to mock JDs.
  // Demo mode: always show mock data.
  const hasRealAnalyses   = isRealMode && realAnalyses !== null && realAnalyses.length > 0;
  const displayAnalyses   = hasRealAnalyses ? realAnalyses! : (isRealMode ? [] : jdAnalyses);
  const showEmptyRealState = isRealMode && !loading && realAnalyses !== null && realAnalyses.length === 0;
  const showFullDashboard  = hasRealAnalyses || !isRealMode;

  const { strengths, uniqueGaps, uniqueFlags, questions } = buildConsolidated(
    showFullDashboard ? displayAnalyses : []
  );
  const evidenceChunks = isRealMode ? totalChunks : candidateProfile.evidenceChunks;
  const docsIndexed    = isRealMode ? docCount : 4;

  return (
    <div className="bg-[#F4F1EA] min-h-screen">
      <div className="border-b border-[#DDD8CE] bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <button
            onClick={() => onNavigate('upload')}
            className="flex items-center gap-1.5 text-xs font-mono text-[#9A958F] hover:text-[#111111] transition-colors uppercase tracking-widest mb-4 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#111111] rounded-sm"
            aria-label="Back to workspace"
          >
            <ArrowLeft className="w-3 h-3" aria-hidden="true" />
            workspace
          </button>
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

      {/* Loading banner */}
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

      {/* Load error banner */}
      {loadError && !loading && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="bg-[#FFF8E7] border border-[#FADDAA] rounded-sm px-4 py-2 flex items-center gap-3">
            <AlertCircle className="w-3.5 h-3.5 text-[#92600A] flex-shrink-0" aria-hidden="true" />
            <p className="font-mono text-[10px] text-[#92600A] uppercase tracking-widest">
              Could not load session: {loadError}
            </p>
          </div>
        </div>
      )}

      {/* Real session with no analyses yet */}
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
            <button
              onClick={() => onNavigate('upload')}
              className="flex items-center gap-1.5 bg-[#111111] text-[#F4F1EA] font-mono text-[11px] uppercase tracking-widest px-4 py-2.5 rounded-sm hover:bg-[#222222] transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#F4F1EA] flex-shrink-0"
            >
              Run analysis
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>

          {/* Grounded assistant is available even without full analysis */}
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-[#9A958F] mb-3">
              Grounded assistant · available on indexed documents
            </p>
            <AssistantPanel sessionId={sessionId} />
          </div>
        </div>
      )}

      {/* Full dashboard — real analyses or demo mode */}
      {showFullDashboard && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-[#9A958F] mb-3">01 · Candidate + system</p>
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
              <div className="xl:col-span-2">
                <CandidateSummaryCard candidate={candidateProfile} />
              </div>
              <SystemTracePanel
                documentsIndexed={docsIndexed}
                evidenceChunks={evidenceChunks}
                isRealMode={isRealMode}
                sessionId={sessionId ?? undefined}
                sessionStatus={sessionStatus ?? undefined}
                jdCount={isRealMode ? jdCount : undefined}
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
                  fitTier={jd.fitTier}
                  explainableFitEstimate={jd.explainableFitEstimate}
                  evidenceStrength={jd.evidenceStrength}
                  riskLevel={jd.riskLevel}
                  topMatchedSkills={jd.matchedSkills}
                  topGap={jd.missingSkills[0] ?? '—'}
                  onViewDetail={() => onNavigate('jd-detail', jd.id)}
                />
              ))}
            </div>
          </div>

          {/* Evidence matrix: only meaningful for demo (real version needs per-JD matrix) */}
          {!isRealMode && (
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-[#9A958F] mb-3">03 · Evidence signal matrix</p>
              <RoleFitMatrix skills={roleFitMatrix} />
            </div>
          )}

          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-[#9A958F] mb-3">
              {isRealMode ? '03' : '04'} · Analysis panels
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
              {isRealMode ? '04' : '05'} · JD-specific CV recommendations
            </p>
            <RewriteRecommendationsPanel jdAnalyses={displayAnalyses} />
          </div>

          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-[#9A958F] mb-3">
              {isRealMode ? '05' : '06'} · Grounded assistant
            </p>
            <AssistantPanel sessionId={sessionId} />
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
  );
}
