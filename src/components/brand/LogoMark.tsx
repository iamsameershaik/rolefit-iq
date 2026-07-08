export default function LogoMark({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = {
    sm: { text: 'text-sm', symbol: 'text-xs' },
    md: { text: 'text-base', symbol: 'text-sm' },
    lg: { text: 'text-2xl', symbol: 'text-lg' },
  };
  const s = sizes[size];

  return (
    <span className={`font-mono font-bold tracking-tight text-[#111111] select-none ${s.text}`}>
      ROLEFIT IQ{' '}
      <span className={`text-[#111111] opacity-70 ${s.symbol}`}>▦</span>
    </span>
  );
}
