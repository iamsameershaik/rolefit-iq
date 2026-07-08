import { ArrowLeft } from 'lucide-react';
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
import {
  candidateProfile,
  jdAnalyses,
  roleFitMatrix,
} from '../data/mockData';
import type { Page, Strength, SkillGap, RiskFlag, InterviewQuestion } from '../types';

interface Props {
  onNavigate: (page: Page, jdId?: string) => void;
}

// Consolidate data across all three JDs
const allStrengths: Strength[] = jdAnalyses.flatMap((jd) =>
  jd.topStrengths.slice(0, 1).map((s) => ({
    title: s,
    explanation: `Evidenced across ${jd.title} analysis.`,
    evidenceStrength: jd.evidenceStrength,
    relatedJDs: [jd.id],
  }))
);

const uniqueGaps: SkillGap[] = [];
const seenGapSkills = new Set<string>();
for (const jd of jdAnalyses) {
  for (const g of jd.skillGaps) {
    if (!seenGapSkills.has(g.skill)) {
      seenGapSkills.add(g.skill);
      uniqueGaps.push(g);
    }
  }
}

const uniqueFlags: RiskFlag[] = [];
const seenFlagTitles = new Set<string>();
for (const jd of jdAnalyses) {
  for (const f of jd.riskFlags) {
    if (!seenFlagTitles.has(f.title)) {
      seenFlagTitles.add(f.title);
      uniqueFlags.push(f);
    }
  }
}

const consolidatedInterview: InterviewQuestion[] = jdAnalyses.flatMap((jd) =>
  jd.interviewQuestions.slice(0, 1)
);

export default function ResultsDashboard({ onNavigate }: Props) {
  return (
    <div className="bg-[#F4F1EA] min-h-screen">
      {/* Page header */}
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
            RFQ-RESULTS-01
          </p>
          <h1 className="text-2xl font-bold text-[#111111] mb-1">Results Dashboard</h1>
          <p className="text-sm text-[#6B6862] max-w-2xl">
            Compare role fit, evidence strength, gaps, risks, and interview readiness across your
            uploaded job descriptions.
          </p>
        </div>
      </div>

      <RetroColorBars height="h-1.5" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* Section 1 — Candidate summary + system trace */}
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-[#9A958F] mb-3">
            01 · Candidate + system
          </p>
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            <div className="xl:col-span-2">
              <CandidateSummaryCard candidate={candidateProfile} />
            </div>
            <SystemTracePanel
              documentsIndexed={4}
              evidenceChunks={candidateProfile.evidenceChunks}
            />
          </div>
        </div>

        {/* Section 2 — JD summary cards */}
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-[#9A958F] mb-3">
            02 · Role fit estimates
          </p>
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {jdAnalyses.map((jd, i) => (
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

        {/* Section 3 — RoleFit Matrix */}
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-[#9A958F] mb-3">
            03 · Evidence signal matrix
          </p>
          <RoleFitMatrix skills={roleFitMatrix} />
        </div>

        {/* Section 4 — Analysis panels */}
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-[#9A958F] mb-3">
            04 · Analysis panels
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <StrengthsPanel strengths={allStrengths} />
            <SkillGapsPanel gaps={uniqueGaps.slice(0, 5)} />
            <RiskFlagsPanel flags={uniqueFlags} />
            <InterviewPrepPanel questions={consolidatedInterview} />
          </div>
        </div>

        {/* Section 5 — CV Recommendations */}
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-[#9A958F] mb-3">
            05 · JD-specific CV recommendations
          </p>
          <RewriteRecommendationsPanel jdAnalyses={jdAnalyses} />
        </div>

        {/* Section 6 — Assistant */}
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-[#9A958F] mb-3">
            06 · Grounded assistant
          </p>
          <AssistantPanel />
        </div>

        {/* Compliance footer */}
        <div className="border-t border-[#DDD8CE] pt-4 flex flex-wrap gap-3">
          {[
            'GDPR-ready architecture',
            'Evidence-grounded recommendations',
            'No hiring guarantees',
            'WCAG-aware interface',
          ].map((note) => (
            <span
              key={note}
              className="font-mono text-[10px] text-[#9A958F] uppercase tracking-widest border border-[#DDD8CE] px-2 py-1 rounded-sm bg-white"
            >
              {note}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
