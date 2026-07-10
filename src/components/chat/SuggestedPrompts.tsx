export default function SuggestedPrompts({
  prompts,
  onSelect,
}: {
  prompts: string[];
  onSelect: (prompt: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <p className="font-mono text-[9px] uppercase tracking-widest text-[#444]">
        Suggested questions
      </p>
      {prompts.map((p) => (
        <button
          key={p}
          onClick={() => onSelect(p)}
          className="block w-full text-left text-xs text-[#888] hover:text-[#E8E5E0] border border-[#1a1a1a] hover:border-[#333] bg-[#0B0B0B] hover:bg-[#111] rounded-sm px-3 py-2 transition-colors duration-150 font-mono leading-relaxed focus-visible:outline-none"
        >
          {p}
        </button>
      ))}
    </div>
  );
}
