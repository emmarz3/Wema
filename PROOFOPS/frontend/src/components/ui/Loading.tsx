import { LoaderCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

/** Inline spinner with an accessible label. */
export function Spinner({
  label = 'Loading',
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <span role="status" className={cn('inline-flex items-center gap-2 text-sm text-ink-secondary', className)}>
      <LoaderCircle aria-hidden className="size-4 animate-spin" />
      {label}
    </span>
  );
}

/** Skeleton placeholder for content that is on its way. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn('animate-pulse rounded-control bg-surface-muted', className)}
    />
  );
}

/** Top progress bar for page/route transitions. */
export function RouteProgress({ active }: { active: boolean }) {
  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none fixed inset-x-0 top-0 z-[110] h-0.5 overflow-hidden transition-opacity duration-fast ease-standard',
        active ? 'opacity-100' : 'opacity-0',
      )}
    >
      <div className="h-full w-1/3 animate-[proofops-slide_1s_ease-in-out_infinite] bg-brand" />
      <style>
        {'@keyframes proofops-slide { 0% { transform: translateX(-100%);} 100% { transform: translateX(400%);} }'}
      </style>
    </div>
  );
}
