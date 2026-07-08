interface Props {
  prompts: string[];
  onSelect: (prompt: string) => void;
}

export default function SuggestedPrompts({ prompts, onSelect }: Props) {
  return (
    <div className="space-y-1.5">
      <p className="font-mono text-[9px] uppercase tracking-widest text-[#6B6862] mb-2">
        Suggested prompts
      </p>
      {prompts.map((p, i) => (
        <button
          key={i}
          onClick={() => onSelect(p)}
          className="w-full text-left text-[11px] text-[#9A958F] hover:text-[#F4F1EA] font-mono bg-[#0B0B0B] border border-[#1a1a1a] hover:border-[#333] rounded-sm px-3 py-2 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#F4F1EA]"
        >
          <span className="text-[#444] mr-2">›</span>
          {p}
        </button>
      ))}
    </div>
  );
}
