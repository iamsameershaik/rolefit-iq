import { useState } from 'react';
import type { RewriteRecommendation, JDAnalysis } from '../../types';

interface Props {
  jdAnalyses: JDAnalysis[];
}

export default function RewriteRecommendationsPanel({ jdAnalyses }: Props) {
  const [selectedId, setSelectedId] = useState(jdAnalyses[0]?.id ?? '');
  const selected = jdAnalyses.find((j) => j.id === selectedId);
  const rec: RewriteRecommendation | undefined = selected?.rewriteRecommendation;

  return (
    <div className="bg-white border border-[#DDD8CE] rounded-sm overflow-hidden">
      <div className="border-b border-[#DDD8CE] px-5 py-3 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <span className="font-mono text-[10px] uppercase tracking-widest text-[#6B6862]">
          JD-specific CV recommendations
        </span>
        <div className="flex gap-1">
          {jdAnalyses.map((jd) => (
            <button
              key={jd.id}
              onClick={() => setSelectedId(jd.id)}
              className={[
                'font-mono text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-sm border transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#111111]',
                jd.id === selectedId
                  ? 'bg-[#111111] text-[#F4F1EA] border-[#111111]'
                  : 'bg-transparent text-[#6B6862] border-[#DDD8CE] hover:border-[#111111]',
              ].join(' ')}
              aria-pressed={jd.id === selectedId}
            >
              {jd.id.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {rec && (
        <div className="p-5 space-y-5">
          <div className="bg-[#FBFAF6] border border-[#DDD8CE] rounded-sm p-3">
            <p className="font-mono text-[10px] uppercase tracking-widest text-[#9A958F] mb-2">
              Rewritten professional summary
            </p>
            <p className="text-sm text-[#111111] leading-relaxed">{rec.professionalSummary}</p>
          </div>

          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-[#9A958F] mb-2">
              Bullet improvements
            </p>
            <ul className="space-y-2">
              {rec.bulletImprovements.map((b, i) => (
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
              {rec.keywordSuggestions.map((k) => (
                <span
                  key={k}
                  className="font-mono text-[10px] bg-[#F4F1EA] border border-[#DDD8CE] text-[#111111] px-2 py-0.5 rounded-sm"
                >
                  {k}
                </span>
              ))}
            </div>
          </div>

          <div className="bg-[#FEF0EF] border border-[#F8C2BE] rounded-sm p-3">
            <p className="font-mono text-[10px] uppercase tracking-widest text-[#D42E3A] mb-2">
              Do not claim
            </p>
            <ul className="space-y-1.5">
              {rec.doNotClaim.map((w, i) => (
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
  );
}
