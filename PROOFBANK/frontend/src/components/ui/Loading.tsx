import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

export function Spinner({
  className,
  label = 'Loading',
}: {
  className?: string;
  label?: string;
}) {
  return (
    <span role="status" className={cn('inline-flex items-center gap-2 text-ink-secondary', className)}>
      <Loader2 aria-hidden className="size-4 animate-spin" />
      <span className="sr-only">{label}</span>
    </span>
  );
}

export function InlineSpinner({ label = 'Working' }: { label?: string }) {
  return (
    <span role="status" className="inline-flex items-center gap-2 text-xs text-ink-secondary">
      <Loader2 aria-hidden className="size-3.5 animate-spin" />
      {label}
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn('animate-pulse rounded-control bg-surface-muted', className)}
    />
  );
}

export function LoadingPanel({ rows = 3 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3" role="status" aria-label="Loading data">
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="h-10 w-full" />
      ))}
      <span className="sr-only">Loading data</span>
    </div>
  );
}
