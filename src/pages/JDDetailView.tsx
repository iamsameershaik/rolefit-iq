import { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import RetroColorBars from '../components/brand/RetroColorBars';
import JDSelector from '../components/detail/JDSelector';
import JDDetailHeader from '../components/detail/JDDetailHeader';
import JDDetailTabs from '../components/detail/JDDetailTabs';
import Badge from '../components/shared/Badge';
import type { Page, JDAnalysis } from '../types';
import { jdAnalyses } from '../data/mockData';
import { getSession } from '../lib/apiClient';
import { mapAnalysesArray } from '../lib/analysisMapper';

type Tab = 'overview' | 'evidence' | 'gaps' | 'interview' | 'rewrite';

interface Props {
  onNavigate: (page: Page, jdId?: string) => void;
  initialJdId?: string;
  sessionId?: string | null;
}

export default function JDDetailView({ onNavigate, initialJdId, sessionId }: Props) {
  const isRealMode = !!sessionId;

  const [realAnalyses, setRealAnalyses] = useState<JDAnalysis[] | null>(null);
  const [loading, setLoading]           = useState(false);
  const [loadError, setLoadError]       = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    setLoading(true);
    setLoadError(null);
    getSession(sessionId)
      .then((result) => {
        if (result.success && result.data.analyses.length > 0) {
          setRealAnalyses(mapAnalysesArray(result.data.analyses));
        } else if (result.success) {
          setRealAnalyses([]);
        } else {
          setLoadError(result.error.message);
        }
      })
      .catch((e) => setLoadError(String(e)))
      .finally(() => setLoading(false));
  }, [sessionId]);

  // Real mode: only show real analyses — no mock fallback.
  // Demo mode: always show mock data.
  const displayAnalyses = isRealMode
    ? (realAnalyses ?? [])
    : jdAnalyses;

  const hasAnalyses  = displayAnalyses.length > 0;
  const fallbackId   = displayAnalyses[0]?.id ?? 'jd-1';
  const [selectedId, setSelectedId] = useState(initialJdId ?? fallbackId);
  const [activeTab, setActiveTab]   = useState<Tab>('overview');

  // When real analyses load, ensure selectedId stays valid
  useEffect(() => {
    if (realAnalyses && !realAnalyses.find((j) => j.id === selectedId)) {
      setSelectedId(realAnalyses[0]?.id ?? 'jd-1');
    }
  }, [realAnalyses, selectedId]);

  const analysis = displayAnalyses.find((j) => j.id === selectedId) ?? displayAnalyses[0];

  return (
    <div className="bg-[#F4F1EA] min-h-screen">
      <div className="border-b border-[#DDD8CE] bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <button
            onClick={() => onNavigate('results')}
            className="flex items-center gap-1.5 text-xs font-mono text-[#9A958F] hover:text-[#111111] transition-colors uppercase tracking-widest mb-4 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#111111] rounded-sm"
            aria-label="Back to results dashboard"
          >
            <ArrowLeft className="w-3 h-3" aria-hidden="true" />
            results dashboard
          </button>
          <p className="font-mono text-[10px] uppercase tracking-widest text-[#6B6862] mb-1">
            {isRealMode ? (
              <span>
                RFQ-JD-DETAIL ·{' '}
                <span className="text-[#1A7A41]">{sessionId!.slice(0, 8)}</span>
                {realAnalyses && realAnalyses.length > 0 ? ' · live data' : loading ? ' · loading…' : ' · real session'}
              </span>
            ) : (
              'RFQ-JD-DETAIL · demo data'
            )}
          </p>
          <h1 className="text-2xl font-bold text-[#111111]">Role Intelligence Detail</h1>
        </div>
      </div>

      <RetroColorBars height="h-1.5" />

      {loading && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="bg-white border border-[#DDD8CE] rounded-sm px-4 py-2 flex items-center gap-3">
            <Loader2 className="w-3.5 h-3.5 text-[#6B6862] animate-spin flex-shrink-0" aria-hidden="true" />
            <p className="font-mono text-[10px] text-[#6B6862] uppercase tracking-widest">Loading analysis…</p>
          </div>
        </div>
      )}

      {loadError && !loading && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="bg-[#FFF8E7] border border-[#FADDAA] rounded-sm px-4 py-2">
            <p className="font-mono text-[10px] text-[#92600A] uppercase tracking-widest">
              Could not load session: {loadError}
            </p>
          </div>
        </div>
      )}

      {/* Real mode with no analyses: clear empty state, not mock data */}
      {isRealMode && !loading && !loadError && !hasAnalyses && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <div className="bg-white border border-[#DDD8CE] rounded-sm p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-[#9A958F] mb-1.5">
                Real session · {sessionId!.slice(0, 8)}
              </p>
              <p className="text-sm font-semibold text-[#111111] mb-1">No role detail available yet</p>
              <p className="text-xs text-[#6B6862] leading-relaxed">
                Run the analysis from the workspace first to see per-role breakdowns here.
              </p>
            </div>
            <button
              onClick={() => onNavigate('upload')}
              className="flex items-center gap-1.5 bg-[#111111] text-[#F4F1EA] font-mono text-[11px] uppercase tracking-widest px-4 py-2.5 rounded-sm hover:bg-[#222222] transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#F4F1EA] flex-shrink-0"
            >
              Run analysis
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {/* Main content — only when analyses exist */}
      {hasAnalyses && (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid lg:grid-cols-[220px_1fr] gap-6">

          <aside>
            <JDSelector
              analyses={displayAnalyses}
              selectedId={selectedId}
              onSelect={(id) => {
                setSelectedId(id);
                setActiveTab('overview');
              }}
            />
          </aside>

          <div className="min-w-0 space-y-4">
            <JDDetailHeader analysis={analysis} />

            <div className="bg-white border border-[#DDD8CE] rounded-sm overflow-hidden">
              <JDDetailTabs
                activeTab={activeTab}
                onChange={setActiveTab as (t: Tab) => void}
              />

              <div className="p-5">
                {activeTab === 'overview' && (
                  <div
                    id="tab-panel-overview"
                    role="tabpanel"
                    aria-labelledby="tab-overview"
                    className="space-y-5"
                  >
                    <div className="bg-[#FBFAF6] border border-[#DDD8CE] rounded-sm p-4">
                      <p className="font-mono text-[10px] uppercase tracking-widest text-[#9A958F] mb-2">
                        Fit summary
                      </p>
                      <p className="text-sm text-[#111111] leading-relaxed">{analysis.fitSummary}</p>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-widest text-[#1A7A41] mb-2">
                          Strongest alignment
                        </p>
                        <ul className="space-y-1.5">
                          {analysis.strongestAlignment.map((s, i) => (
                            <li key={i} className="flex gap-2 text-xs text-[#111111]">
                              <span className="text-[#1A7A41] flex-shrink-0 font-mono">+</span>
                              {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-widest text-[#D42E3A] mb-2">
                          Weakest alignment
                        </p>
                        <ul className="space-y-1.5">
                          {analysis.weakestAlignment.map((s, i) => (
                            <li key={i} className="flex gap-2 text-xs text-[#111111]">
                              <span className="text-[#D42E3A] flex-shrink-0 font-mono">−</span>
                              {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="border-t border-[#DDD8CE] pt-4">
                      <p className="font-mono text-[10px] uppercase tracking-widest text-[#9A958F] mb-2">
                        Recommended candidate narrative
                      </p>
                      <p className="text-sm text-[#6B6862] leading-relaxed">{analysis.candidateNarrative}</p>
                    </div>
                  </div>
                )}

                {activeTab === 'evidence' && (
                  <div
                    id="tab-panel-evidence"
                    role="tabpanel"
                    aria-labelledby="tab-evidence"
                    className="space-y-4"
                  >
                    <p className="font-mono text-[10px] text-[#9A958F]">
                      Retrieved evidence · {analysis.evidenceSnippets.length} chunks indexed
                    </p>
                    {analysis.evidenceSnippets.map((snippet) => (
                      <div key={snippet.id} className="border border-[#DDD8CE] rounded-sm p-4">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <Badge variant="muted">{snippet.id}</Badge>
                          <span
                            className={[
                              'font-mono text-[10px] px-2 py-0.5 rounded-sm border',
                              snippet.sourceType === 'cv'
                                ? 'bg-[#EEFBF3] text-[#1A7A41] border-[#B3EACC]'
                                : 'bg-[#EEF4FF] text-[#1D4FAA] border-[#BFCFF8]',
                            ].join(' ')}
                          >
                            {snippet.sourceType.toUpperCase()}
                          </span>
                          <span className="font-mono text-[10px] text-[#6B6862]">{snippet.source}</span>
                        </div>
                        <blockquote className="border-l-2 border-[#DDD8CE] pl-3 mb-2">
                          <p className="text-xs text-[#111111] italic leading-relaxed">"{snippet.text}"</p>
                        </blockquote>
                        <p className="text-xs text-[#6B6862] leading-relaxed">
                          <span className="font-mono text-[10px] text-[#9A958F] uppercase tracking-widest mr-1">
                            Why it matters:
                          </span>
                          {snippet.relevance}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'gaps' && (
                  <div
                    id="tab-panel-gaps"
                    role="tabpanel"
                    aria-labelledby="tab-gaps"
                    className="space-y-4"
                  >
                    {analysis.skillGaps.map((gap, i) => (
                      <div key={i} className="border border-[#DDD8CE] rounded-sm p-4">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="text-sm font-semibold text-[#111111]">{gap.skill}</span>
                          <Badge variant={gap.impact === 'High' ? 'error' : gap.impact === 'Medium' ? 'warning' : 'muted'}>
                            {gap.impact} impact
                          </Badge>
                        </div>
                        <p className="text-xs text-[#9A958F] font-mono mb-2">
                          Current level: {gap.currentLevel}
                        </p>
                        <div>
                          <p className="font-mono text-[10px] uppercase tracking-widest text-[#9A958F] mb-1">
                            Suggested action
                          </p>
                          <p className="text-xs text-[#6B6862] leading-relaxed">{gap.suggestedAction}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'interview' && (
                  <div
                    id="tab-panel-interview"
                    role="tabpanel"
                    aria-labelledby="tab-interview"
                    className="space-y-4"
                  >
                    {analysis.interviewQuestions.map((q, i) => (
                      <div key={i} className="border border-[#DDD8CE] rounded-sm p-4">
                        <div className="flex items-start gap-3 mb-3">
                          <span className="font-mono text-[10px] text-[#9A958F] flex-shrink-0 mt-0.5">
                            Q{String(i + 1).padStart(2, '0')}
                          </span>
                          <p className="text-sm font-semibold text-[#111111]">{q.question}</p>
                        </div>
                        <div className="space-y-3 pl-7">
                          <div>
                            <p className="font-mono text-[10px] uppercase tracking-widest text-[#9A958F] mb-1">
                              Answer angle
                            </p>
                            <p className="text-xs text-[#6B6862] leading-relaxed">{q.answerAngle}</p>
                          </div>
                          <div>
                            <p className="font-mono text-[10px] uppercase tracking-widest text-[#9A958F] mb-1">
                              Evidence to mention
                            </p>
                            <Badge variant="muted">{q.evidenceToMention}</Badge>
                          </div>
                          <div>
                            <p className="font-mono text-[10px] uppercase tracking-widest text-[#D42E3A] mb-1">
                              Risk to avoid
                            </p>
                            <p className="text-xs text-[#6B6862] leading-relaxed">{q.riskToAvoid}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'rewrite' && (
                  <div
                    id="tab-panel-rewrite"
                    role="tabpanel"
                    aria-labelledby="tab-rewrite"
                    className="space-y-5"
                  >
                    <div className="bg-[#FBFAF6] border border-[#DDD8CE] rounded-sm p-4">
                      <p className="font-mono text-[10px] uppercase tracking-widest text-[#9A958F] mb-2">
                        Rewritten professional summary
                      </p>
                      <p className="text-sm text-[#111111] leading-relaxed">
                        {analysis.rewriteRecommendation.professionalSummary}
                      </p>
                    </div>

                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-widest text-[#9A958F] mb-2">
                        Bullet improvements
                      </p>
                      <ul className="space-y-2">
                        {analysis.rewriteRecommendation.bulletImprovements.map((b, i) => (
                          <li key={i} className="text-xs text-[#6B6862] leading-relaxed border-l-2 border-[#DDD8CE] pl-3">
                            {b}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-widest text-[#9A958F] mb-2">
                        Keyword suggestions
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {analysis.rewriteRecommendation.keywordSuggestions.map((k) => (
                          <span
                            key={k}
                            className="font-mono text-[10px] bg-[#F4F1EA] border border-[#DDD8CE] text-[#111111] px-2 py-0.5 rounded-sm"
                          >
                            {k}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="bg-[#FEF0EF] border border-[#F8C2BE] rounded-sm p-4">
                      <p className="font-mono text-[10px] uppercase tracking-widest text-[#D42E3A] mb-2">
                        Do not claim
                      </p>
                      <ul className="space-y-1.5">
                        {analysis.rewriteRecommendation.doNotClaim.map((w, i) => (
                          <li key={i} className="text-xs text-[#6B6862] leading-relaxed flex gap-2">
                            <span className="text-[#D42E3A] flex-shrink-0">—</span>
                            {w}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <p className="font-mono text-[10px] text-[#9A958F] border-t border-[#DDD8CE] pt-3">
                      These recommendations should only strengthen evidence already present in the CV. They should not invent experience.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
