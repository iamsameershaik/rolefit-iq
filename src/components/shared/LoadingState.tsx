export default function LoadingState({ label = 'Processing...' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      <div className="flex gap-1" aria-label="Loading">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="w-1.5 h-4 bg-[#111111] rounded-sm animate-pulse"
            style={{ animationDelay: `${i * 120}ms` }}
          />
        ))}
      </div>
      <p className="font-mono text-[10px] uppercase tracking-widest text-[#9A958F]">{label}</p>
    </div>
  );
}
