import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface CardProps {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'article' | 'section';
}

export default function Card({ children, className, as: Tag = 'div' }: CardProps) {
  return (
    <Tag
      className={cn(
        'bg-white border border-[#DDD8CE] rounded-sm',
        className
      )}
    >
      {children}
    </Tag>
  );
}
