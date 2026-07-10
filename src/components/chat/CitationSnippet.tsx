import type { EvidenceSnippetType } from '../../types';

export default function CitationSnippet({ snippet }: { snippet: EvidenceSnippetType }) {
  const isCV = snippet.sourceType === 'cv';
  const label = isCV ? 'CV' : (snippet.source ?? 'JD');

  return (
    <div className="bg-[#0B0B0B] border border-[#1a1a1a] rounded-sm px-3 py-2">
      <div className="flex items-center gap-2 mb-1">
        <span
          className={[
            'font-mono text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded-sm border',
            isCV
              ? 'text-[#4CAF70] border-[#1A7A41]/30 bg-[#0a1f0a]'
              : 'text-[#5B9BD5] border-[#1D4FAA]/30 bg-[#0a1525]',
          ].join(' ')}
        >
          {label}
        </span>
        {snippet.relevance && (
          <span className="font-mono text-[9px] text-[#555] truncate">
            {snippet.relevance}
          </span>
        )}
      </div>
      <p className="text-xs text-[#777] italic leading-relaxed">
        "{snippet.text}"
      </p>
    </div>
  );
}
