export default function SuggestedPrompts({
  prompts,
  onSelect,
}: {
  prompts: string[];
  onSelect: (prompt: string) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="font-mono text-[9px] uppercase tracking-widest text-[#444] pl-1">
        Suggested questions
      </p>
      {prompts.map((p) => (
        <button
          key={p}
          onClick={() => onSelect(p)}
          className="block w-full text-left text-xs text-[#999] hover:text-[#F4F1EA] border border-[#1a1a1a] hover:border-[#333] bg-[#0B0B0B] hover:bg-[#111] rounded-sm px-3 py-2.5 transition-colors duration-150 font-mono leading-relaxed focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#F4F1EA]"
        >
          {p}
        </button>
      ))}
    </div>
  );
}
