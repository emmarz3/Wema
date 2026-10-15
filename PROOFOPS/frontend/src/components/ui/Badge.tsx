import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';
import { toneClasses, type StatusTone } from '../../lib/status';

/**
 * Badge — small status/label chip. Status tones always ship with text;
 * colour is never the only signal.
 */
export function Badge({
  children,
  tone = 'neutral',
  icon: Icon,
  className,
  title,
}: {
  children: React.ReactNode;
  tone?: StatusTone;
  icon?: LucideIcon;
  className?: string;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        toneClasses[tone],
        className,
      )}
    >
      {Icon ? <Icon aria-hidden className="size-3.5" /> : null}
      {children}
    </span>
  );
}

/** Neutral label chip for metadata (not a status). */
export function Chip({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-line bg-surface-muted px-2 py-0.5 text-xs font-medium text-ink-secondary',
        className,
      )}
    >
      {children}
    </span>
  );
}
