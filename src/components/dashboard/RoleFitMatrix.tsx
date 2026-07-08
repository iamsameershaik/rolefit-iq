import type { MatrixSkill, SkillSignal } from '../../types';

interface Props {
  skills: MatrixSkill[];
}

const DOT_FILLED = '●';
const DOT_EMPTY = '○';

function dots(signal: SkillSignal): { filled: number; total: number; color: string } {
  const map: Record<SkillSignal, { filled: number; color: string }> = {
    strong:  { filled: 4, color: '#1A7A41' },
    moderate:{ filled: 3, color: '#1D4FAA' },
    weak:    { filled: 2, color: '#92600A' },
    missing: { filled: 0, color: '#DDD8CE' },
  };
  return { ...map[signal], total: 4 };
}

function DotIndicator({ signal }: { signal: SkillSignal }) {
  const { filled, total, color } = dots(signal);
  return (
    <span className="font-mono text-[11px] tracking-tight" style={{ color }} aria-label={signal}>
      {Array.from({ length: total }).map((_, i) =>
        i < filled ? DOT_FILLED : <span key={i} style={{ color: '#DDD8CE' }}>{DOT_EMPTY}</span>
      )}
    </span>
  );
}

export default function RoleFitMatrix({ skills }: Props) {
  const cols = [
    { key: 'fde', label: 'FDE' },
    { key: 'aiSolutions', label: 'AI Sol.' },
    { key: 'aiAutomation', label: 'AI Auto.' },
  ] as const;

  return (
    <div className="bg-white border border-[#DDD8CE] rounded-sm overflow-hidden">
      <div className="border-b border-[#DDD8CE] px-5 py-3 flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-widest text-[#6B6862]">
          RoleFit Matrix · evidence signal map
        </span>
        <span className="font-mono text-[10px] text-[#9A958F]">
          ●●●● strong · ●●● mod · ●● weak · ○ missing
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-[#DDD8CE]">
              <th className="font-mono text-[10px] uppercase tracking-widest text-[#9A958F] px-5 py-2.5 font-medium w-48">
                Skill
              </th>
              {cols.map((c) => (
                <th
                  key={c.key}
                  className="font-mono text-[10px] uppercase tracking-widest text-[#9A958F] px-4 py-2.5 font-medium text-center"
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {skills.map((row, i) => (
              <tr
                key={row.skill}
                className={i % 2 === 0 ? 'bg-white' : 'bg-[#FBFAF6]'}
              >
                <td className="px-5 py-2.5 text-xs text-[#111111] font-medium border-b border-[#F4F1EA]">
                  {row.skill}
                </td>
                {cols.map((c) => (
                  <td key={c.key} className="px-4 py-2.5 text-center border-b border-[#F4F1EA]">
                    <DotIndicator signal={row[c.key]} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
