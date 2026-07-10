import { X, TrendingUp, TrendingDown, Layers, Lightbulb } from 'lucide-react';
import Badge from '../shared/Badge';
import type { JDAnalysis, EvidenceType } from '../../types';

interface Props {
  analysis: JDAnalysis;
  onClose: () => void;
}

function fitColor(score: number) {
  if (score >= 80) return '#1A7A41';
  if (score >= 70) return '#1D4FAA';
  return '#92600A';
}

function evidenceTypeBadge(et: EvidenceType | string) {
  if (et === 'Direct')       return <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-sm bg-[#EEFBF3] text-[#1A7A41] border border-[#B3EACC]">Direct</span>;
  if (et === 'Adjacent')     return <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-sm bg-[#EEF4FF] text-[#1D4FAA] border border-[#BFCFF8]">Adjacent</span>;
  if (et === 'Transferable') return <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-sm bg-[#FFF8E7] text-[#92600A] border border-[#FADDAA]">Transferable</span>;
  return <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-sm bg-[#FEF0EF] text-[#D42E3A] border border-[#F8C2BE]">Missing</span>;
}

function coverageLabel(et: EvidenceType | string): { text: string; color: string } {
  if (et === 'Direct')       return { text: 'Direct match', color: '#1A7A41' };
  if (et === 'Adjacent')     return { text: 'Adjacent evidence', color: '#1D4FAA' };
  if (et === 'Transferable') return { text: 'Transferable', color: '#92600A' };
  return { text: 'Missing', color: '#D42E3A' };
}

export default function ScoreExplanationDrawer({ analysis, onClose }: Props) {
  const color = fitColor(analysis.explainableFitEstimate);

  // Derive positive factors from strengths
  const positiveFactors = (analysis.experienceAlignment ?? [])
    .filter((ea) => ea.evidenceType !== 'Missing')
    .slice(0, 6);

  const directStrengths = analysis.matchedSkills.slice(0, 4);

  // Derive deductions from skill gaps + risk flags
  const deductions = analysis.skillGaps
    .filter((g) => g.impact === 'High' || g.impact === 'Medium')
    .slice(0, 4);

  const realRisks = analysis.riskFlags.filter((r) => r.isRealGap !== false).slice(0, 3);

  // Requirement coverage from experienceAlignment
  const coverage = (analysis.experienceAlignment ?? []).slice(0, 8);

  // Improvement actions from rewrite recommendations
  const improvements = [
    ...(analysis.rewriteRecommendation.bulletImprovements ?? []).slice(0, 3),
    ...(analysis.rewriteRecommendation.preparationGaps ?? []).slice(0, 2),
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end" role="dialog" aria-modal="true" aria-label="Why this score?">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[#111111]/40 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div className="relative w-full max-w-lg h-full bg-[#F4F1EA] border-l border-[#DDD8CE] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="border-b border-[#DDD8CE] bg-white px-5 py-4 flex-shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-[#9A958F] mb-1">
                Score explanation
              </p>
              <h2 className="text-base font-bold text-[#111111] mb-0.5">Why this score?</h2>
              <p className="text-xs text-[#6B6862]">{analysis.title}</p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-[#9A958F] hover:text-[#111111] transition-colors rounded-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#111111] flex-shrink-0"
              aria-label="Close explanation"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* Score summary */}
          <div className="bg-white border border-[#DDD8CE] rounded-sm p-4">
            <p className="font-mono text-[10px] uppercase tracking-widest text-[#9A958F] mb-3">
              Score summary
            </p>
            <div className="flex items-center gap-4 mb-3">
              <div className="flex-shrink-0">
                <p className="font-mono text-4xl font-bold leading-none" style={{ color }}>
                  {analysis.explainableFitEstimate}
                </p>
                <p className="font-mono text-[10px] text-[#9A958F] mt-1">out of 100</p>
              </div>
              <div className="flex-1">
                <div className="h-2 bg-[#F4F1EA] rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${analysis.explainableFitEstimate}%`, backgroundColor: color }}
                  />
                </div>
                <p className="text-xs text-[#6B6862] leading-relaxed">{analysis.fitSummary}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Fit tier',   value: analysis.fitTier },
                { label: 'Evidence',   value: analysis.evidenceStrength },
                { label: 'Risk level', value: analysis.riskLevel },
                { label: 'Prep priority', value: analysis.preparationPriority },
              ].map((item) => (
                <div key={item.label} className="bg-[#F4F1EA] rounded-sm px-3 py-2">
                  <p className="font-mono text-[10px] text-[#9A958F] uppercase tracking-widest mb-0.5">{item.label}</p>
                  <p className="text-xs font-semibold text-[#111111]">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* AI-generated score explanation */}
          {analysis.scoreExplanation && (
            <div className="bg-white border border-[#DDD8CE] rounded-sm overflow-hidden">
              <div className="border-b border-[#DDD8CE] px-4 py-3">
                <p className="font-mono text-[10px] uppercase tracking-widest text-[#6B6862]">
                  AI score reasoning
                </p>
              </div>
              <div className="p-4 space-y-3">
                {analysis.scoreExplanation.keyFactors.length > 0 && (
                  <div>
                    <p className="font-mono text-[10px] text-[#9A958F] uppercase tracking-widest mb-1.5">
                      Key factors
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {analysis.scoreExplanation.keyFactors.map((f, i) => (
                        <span key={i} className="font-mono text-[10px] bg-[#F4F1EA] border border-[#DDD8CE] text-[#6B6862] px-2 py-0.5 rounded-sm">
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {analysis.scoreExplanation.whatHelped && (
                  <div>
                    <p className="font-mono text-[10px] text-[#1A7A41] uppercase tracking-widest mb-1">
                      What helped
                    </p>
                    <p className="text-xs text-[#6B6862] leading-relaxed">{analysis.scoreExplanation.whatHelped}</p>
                  </div>
                )}
                {analysis.scoreExplanation.whatHurt && (
                  <div>
                    <p className="font-mono text-[10px] text-[#D42E3A] uppercase tracking-widest mb-1">
                      What hurt
                    </p>
                    <p className="text-xs text-[#6B6862] leading-relaxed">{analysis.scoreExplanation.whatHurt}</p>
                  </div>
                )}
                {analysis.scoreExplanation.howCalculated && (
                  <div>
                    <p className="font-mono text-[10px] text-[#9A958F] uppercase tracking-widest mb-1">
                      How calculated
                    </p>
                    <p className="text-xs text-[#6B6862] leading-relaxed">{analysis.scoreExplanation.howCalculated}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Positive evidence */}
          <div className="bg-white border border-[#DDD8CE] rounded-sm overflow-hidden">
            <div className="border-b border-[#DDD8CE] px-4 py-3 flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5 text-[#1A7A41]" aria-hidden="true" />
              <p className="font-mono text-[10px] uppercase tracking-widest text-[#1A7A41]">
                Positive evidence
              </p>
            </div>
            <div className="p-4 space-y-3">
              {directStrengths.length > 0 && (
                <div>
                  <p className="font-mono text-[10px] text-[#9A958F] uppercase tracking-widest mb-1.5">
                    Matched skills
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {directStrengths.map((s) => (
                      <span key={s} className="font-mono text-[10px] bg-[#EEFBF3] border border-[#B3EACC] text-[#1A7A41] px-2 py-0.5 rounded-sm">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {positiveFactors.length > 0 && (
                <ul className="space-y-2">
                  {positiveFactors.map((ea, i) => (
                    <li key={i} className="flex items-start gap-2">
                      {evidenceTypeBadge(ea.evidenceType)}
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-[#111111] leading-snug">{ea.requirement}</p>
                        <p className="text-xs text-[#6B6862] leading-relaxed">{ea.alignment}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {positiveFactors.length === 0 && directStrengths.length === 0 && (
                <p className="text-xs text-[#9A958F]">No direct match data available — run analysis for full breakdown.</p>
              )}
            </div>
          </div>

          {/* Deductions / Risks */}
          {(deductions.length > 0 || realRisks.length > 0) && (
            <div className="bg-white border border-[#DDD8CE] rounded-sm overflow-hidden">
              <div className="border-b border-[#DDD8CE] px-4 py-3 flex items-center gap-2">
                <TrendingDown className="w-3.5 h-3.5 text-[#D42E3A]" aria-hidden="true" />
                <p className="font-mono text-[10px] uppercase tracking-widest text-[#D42E3A]">
                  Deductions &amp; gaps
                </p>
              </div>
              <div className="p-4 space-y-3">
                {deductions.map((g, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <Badge variant={g.impact === 'High' ? 'error' : 'warning'}>{g.impact}</Badge>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-[#111111]">{g.skill}</p>
                      {g.gapType && (
                        <p className="font-mono text-[10px] text-[#9A958F]">{g.gapType}</p>
                      )}
                      <p className="text-xs text-[#6B6862]">{g.currentLevel}</p>
                    </div>
                  </div>
                ))}
                {realRisks.map((r, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <Badge variant={r.severity === 'High' ? 'error' : r.severity === 'Medium' ? 'warning' : 'muted'}>
                      {r.severity} risk
                    </Badge>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-[#111111]">{r.title}</p>
                      <p className="text-xs text-[#6B6862] leading-relaxed">{r.explanation}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Requirement coverage */}
          {coverage.length > 0 && (
            <div className="bg-white border border-[#DDD8CE] rounded-sm overflow-hidden">
              <div className="border-b border-[#DDD8CE] px-4 py-3 flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-[#6B6862]" aria-hidden="true" />
                <p className="font-mono text-[10px] uppercase tracking-widest text-[#6B6862]">
                  Requirement coverage
                </p>
              </div>
              <div className="divide-y divide-[#DDD8CE]">
                {coverage.map((ea, i) => {
                  const { text, color: cColor } = coverageLabel(ea.evidenceType);
                  return (
                    <div key={i} className="px-4 py-3 flex items-start gap-3">
                      <div className="w-20 flex-shrink-0">
                        <p className="font-mono text-[10px]" style={{ color: cColor }}>{text}</p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-[#111111] mb-0.5">{ea.requirement}</p>
                        {ea.alignment && (
                          <p className="text-xs text-[#6B6862] leading-relaxed">{ea.alignment}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* How to improve */}
          {improvements.length > 0 && (
            <div className="bg-white border border-[#DDD8CE] rounded-sm overflow-hidden">
              <div className="border-b border-[#DDD8CE] px-4 py-3 flex items-center gap-2">
                <Lightbulb className="w-3.5 h-3.5 text-[#92600A]" aria-hidden="true" />
                <p className="font-mono text-[10px] uppercase tracking-widest text-[#92600A]">
                  How to improve this score
                </p>
              </div>
              <ul className="divide-y divide-[#DDD8CE]">
                {improvements.map((action, i) => (
                  <li key={i} className="px-4 py-3 text-xs text-[#6B6862] leading-relaxed flex gap-2">
                    <span className="text-[#92600A] flex-shrink-0">→</span>
                    {action}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Guardrail note */}
          <div className="bg-[#F4F1EA] border border-[#DDD8CE] rounded-sm px-4 py-3">
            <p className="font-mono text-[10px] text-[#9A958F] leading-relaxed">
              This estimate is explainable guidance derived from evidence strength, requirement coverage, gaps, and risk signals. It is not an ATS score or a hiring probability.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
