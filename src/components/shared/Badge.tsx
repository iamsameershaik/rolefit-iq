import { cn } from '../../lib/utils';

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'muted' | 'indexed';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export default function Badge({ children, variant = 'default', className }: BadgeProps) {
  const variants: Record<BadgeVariant, string> = {
    default: 'bg-[#F4F1EA] text-[#6B6862] border border-[#DDD8CE]',
    muted: 'bg-[#F4F1EA] text-[#9A958F] border border-[#DDD8CE]',
    success: 'bg-[#EEFBF3] text-[#1A7A41] border border-[#B3EACC]',
    warning: 'bg-[#FFF8E7] text-[#92600A] border border-[#FADDAA]',
    error: 'bg-[#FEF0EF] text-[#A8281E] border border-[#F8C2BE]',
    info: 'bg-[#EEF4FF] text-[#1D4FAA] border border-[#BFCFF8]',
    indexed: 'bg-[#050505] text-[#F4F1EA] border border-[#333]',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center font-mono text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-sm',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
