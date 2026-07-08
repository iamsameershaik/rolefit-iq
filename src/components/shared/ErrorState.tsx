import { AlertTriangle } from 'lucide-react';
import Button from './Button';

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

export default function ErrorState({
  title = 'Something went wrong',
  description = 'An unexpected error occurred. Please try again.',
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center gap-3">
      <AlertTriangle className="w-5 h-5 text-[#D42E3A]" aria-hidden="true" />
      <div>
        <p className="font-mono text-xs uppercase tracking-widest text-[#D42E3A] mb-1">{title}</p>
        <p className="text-sm text-[#6B6862] max-w-xs">{description}</p>
      </div>
      {onRetry && (
        <Button variant="ghost" size="sm" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}
