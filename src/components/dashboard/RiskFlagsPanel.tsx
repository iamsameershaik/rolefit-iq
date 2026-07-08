import type { RiskFlag } from '../../types';
import Badge from '../shared/Badge';

interface Props {
  flags: RiskFlag[];
}

function severityVariant(s: 'Low' | 'Medium' | 'High') {
  if (s === 'High') return 'error';
  if (s === 'Medium') return 'warning';
  return 'muted';
}

const severityBorder: Record<string, string> = {
  High: 'border-[#D42E3A]',
  Medium: 'border-[#F5C518]',
  Low: 'border-[#DDD8CE]',
};

export default function RiskFlagsPanel({ flags }: Props) {
  return (
    <div className="bg-white border border-[#DDD8CE] rounded-sm overflow-hidden">
      <div className="border-b border-[#DDD8CE] px-5 py-3">
        <span className="font-mono text-[10px] uppercase tracking-widest text-[#6B6862]">
          Risk flags · consolidated
        </span>
      </div>
      <div className="p-5 space-y-4">
        {flags.map((flag, i) => (
          <div
            key={i}
            className={`border-l-2 pl-4 py-1 ${severityBorder[flag.severity]}`}
          >
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-[#111111]">{flag.title}</span>
              <Badge variant={severityVariant(flag.severity)}>{flag.severity}</Badge>
              {flag.relatedJDs.map((jd) => (
                <Badge key={jd} variant="muted">{jd.toUpperCase()}</Badge>
              ))}
            </div>
            <p className="text-xs text-[#6B6862] leading-relaxed">{flag.explanation}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
