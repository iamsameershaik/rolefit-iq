import Badge from '../shared/Badge';
import type { EvidenceStrength } from '../../types';

interface Props {
  title: string;
  explanation: string;
  evidenceStrength: EvidenceStrength;
  relatedJDs: string[];
}

export default function EvidenceSnippet({ title, explanation, evidenceStrength, relatedJDs }: Props) {
  return (
    <div className="border-l-2 border-[#DDD8CE] pl-4 py-1">
      <div className="flex flex-wrap items-center gap-2 mb-1">
        <span className="font-mono text-[10px] text-[#9A958F] uppercase tracking-widest">{title}</span>
        <Badge variant={evidenceStrength === 'Strong' ? 'success' : evidenceStrength === 'Moderate' ? 'info' : 'warning'}>
          {evidenceStrength}
        </Badge>
        {relatedJDs.map((jd) => (
          <Badge key={jd} variant="muted">{jd.toUpperCase()}</Badge>
        ))}
      </div>
      <p className="text-xs text-[#6B6862] leading-relaxed">{explanation}</p>
    </div>
  );
}
