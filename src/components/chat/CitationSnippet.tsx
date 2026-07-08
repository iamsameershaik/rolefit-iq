import type { EvidenceSnippetType } from '../../types';

interface Props {
  citation: EvidenceSnippetType;
}

export default function CitationSnippet({ citation }: Props) {
  return (
    <div className="bg-[#0B0B0B] border border-[#1a1a1a] rounded-sm px-3 py-2">
      <div className="flex items-center gap-2 mb-1">
        <span
          className={[
            'font-mono text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded-sm',
            citation.sourceType === 'cv'
              ? 'bg-[#1A7A41]/20 text-[#4CAF70]'
              : 'bg-[#1D4FAA]/20 text-[#6B9EF8]',
          ].join(' ')}
        >
          {citation.sourceType === 'cv' ? 'CV' : 'JD'}
        </span>
        <span className="font-mono text-[10px] text-[#6B6862]">{citation.source}</span>
      </div>
      <p className="text-[11px] text-[#9A958F] leading-relaxed italic">"{citation.text}"</p>
    </div>
  );
}
