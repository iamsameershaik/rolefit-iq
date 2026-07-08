import type { ReactNode, ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'dark';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

export default function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111111] focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

  const variants: Record<Variant, string> = {
    primary:
      'bg-[#111111] text-[#F4F1EA] hover:bg-[#2a2a2a] border border-[#111111]',
    secondary:
      'bg-transparent text-[#111111] border border-[#111111] hover:bg-[#111111] hover:text-[#F4F1EA]',
    ghost:
      'bg-transparent text-[#6B6862] border border-[#DDD8CE] hover:border-[#111111] hover:text-[#111111]',
    dark:
      'bg-[#050505] text-[#F4F1EA] border border-[#333] hover:bg-[#1a1a1a]',
  };

  const sizes: Record<Size, string> = {
    sm: 'text-xs px-3 py-1.5 gap-1.5 tracking-wide',
    md: 'text-sm px-4 py-2 gap-2 tracking-wide',
    lg: 'text-sm px-6 py-3 gap-2.5 tracking-wide',
  };

  return (
    <button className={cn(base, variants[variant], sizes[size], className)} {...props}>
      {children}
    </button>
  );
}
