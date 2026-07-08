import type { Strength } from '../../types';
import EvidenceSnippet from './EvidenceSnippet';

interface Props {
  strengths: Strength[];
}

export default function StrengthsPanel({ strengths }: Props) {
  return (
    <div className="bg-white border border-[#DDD8CE] rounded-sm overflow-hidden">
      <div className="border-b border-[#DDD8CE] px-5 py-3">
        <span className="font-mono text-[10px] uppercase tracking-widest text-[#6B6862]">
          Top strengths · consolidated
        </span>
      </div>
      <div className="p-5 space-y-4">
        {strengths.map((s, i) => (
          <EvidenceSnippet
            key={i}
            title={s.title}
            explanation={s.explanation}
            evidenceStrength={s.evidenceStrength}
            relatedJDs={s.relatedJDs}
          />
        ))}
      </div>
    </div>
  );
}
