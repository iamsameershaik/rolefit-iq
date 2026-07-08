import type { ReactNode } from 'react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}

export default function EmptyState({ title, description, action, icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {icon && <div className="mb-4 text-[#DDD8CE]">{icon}</div>}
      {title && (
        <p className="font-mono text-xs uppercase tracking-widest text-[#9A958F] mb-1">{title}</p>
      )}
      {description && <p className="text-sm text-[#6B6862] max-w-xs">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
