export default function DotMatrix({
  rows = 6,
  cols = 16,
  className = '',
}: {
  rows?: number;
  cols?: number;
  className?: string;
}) {
  return (
    <div
      className={`inline-grid gap-[3px] ${className}`}
      style={{ gridTemplateColumns: `repeat(${cols}, 4px)` }}
      aria-hidden="true"
    >
      {Array.from({ length: rows * cols }).map((_, i) => (
        <div
          key={i}
          className="w-[4px] h-[4px] rounded-full bg-[#111111]"
          style={{ opacity: Math.random() > 0.45 ? 0.18 : 0.07 }}
        />
      ))}
    </div>
  );
}
