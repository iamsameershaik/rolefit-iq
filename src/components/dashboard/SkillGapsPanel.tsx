import type { SkillGap } from '../../types';
import Badge from '../shared/Badge';

interface Props {
  gaps: SkillGap[];
}

function impactVariant(impact: 'High' | 'Medium' | 'Low') {
  if (impact === 'High') return 'error';
  if (impact === 'Medium') return 'warning';
  return 'muted';
}

export default function SkillGapsPanel({ gaps }: Props) {
  return (
    <div className="bg-white border border-[#DDD8CE] rounded-sm overflow-hidden">
      <div className="border-b border-[#DDD8CE] px-5 py-3">
        <span className="font-mono text-[10px] uppercase tracking-widest text-[#6B6862]">
          Skill gaps · consolidated
        </span>
      </div>
      <div className="p-5 space-y-4">
        {gaps.map((gap, i) => (
          <div key={i} className="border-l-2 border-[#DDD8CE] pl-4 py-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-[#111111]">{gap.skill}</span>
              <Badge variant={impactVariant(gap.impact)}>{gap.impact} impact</Badge>
              {gap.gapType && (
                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-sm border border-[#DDD8CE] text-[#6B6862] bg-[#F4F1EA]">
                  {gap.gapType}
                </span>
              )}
              {gap.relatedJDs.map((jd) => (
                <Badge key={jd} variant="muted">{jd.toUpperCase()}</Badge>
              ))}
            </div>
            <p className="text-xs text-[#6B6862] leading-relaxed mb-1">{gap.currentLevel}</p>
            <p className="text-xs text-[#6B6862] leading-relaxed">{gap.suggestedAction}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
