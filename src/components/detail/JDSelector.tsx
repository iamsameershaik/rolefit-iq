import type { JDAnalysis } from '../../types';

interface Props {
  analyses: JDAnalysis[];
  selectedId: string;
  onSelect: (id: string) => void;
}

export default function JDSelector({ analyses, selectedId, onSelect }: Props) {
  return (
    <div className="bg-white border border-[#DDD8CE] rounded-sm overflow-hidden">
      <div className="border-b border-[#DDD8CE] px-4 py-3">
        <span className="font-mono text-[10px] uppercase tracking-widest text-[#6B6862]">
          Job descriptions
        </span>
      </div>
      <div className="divide-y divide-[#DDD8CE]">
        {analyses.map((jd, i) => {
          const isSelected = jd.id === selectedId;
          const fitColor =
            jd.explainableFitEstimate >= 80
              ? '#1A7A41'
              : jd.explainableFitEstimate >= 70
              ? '#1D4FAA'
              : '#92600A';
          return (
            <button
              key={jd.id}
              onClick={() => onSelect(jd.id)}
              className={[
                'w-full text-left px-4 py-3 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[#111111]',
                isSelected ? 'bg-[#F4F1EA]' : 'hover:bg-[#FBFAF6]',
              ].join(' ')}
              aria-pressed={isSelected}
            >
              <div className="flex items-center justify-between mb-0.5">
                <span className="font-mono text-[9px] text-[#9A958F] uppercase tracking-widest">
                  JD {i + 1}
                </span>
                <span className="font-mono text-xs font-bold" style={{ color: fitColor }}>
                  {jd.explainableFitEstimate}
                </span>
              </div>
              <p className="text-xs font-semibold text-[#111111] leading-tight">{jd.title}</p>
              <p className="text-[10px] text-[#9A958F] mt-0.5">{jd.company}</p>
              {isSelected && (
                <div className="w-1 h-full bg-[#111111] absolute left-0 top-0" aria-hidden="true" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
