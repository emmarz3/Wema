import type { LucideIcon } from 'lucide-react';
import { CircleAlert, CircleX, FileQuestion, RefreshCw } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from './Button';
import { Spinner } from './Loading';

/**
 * Shared loading / empty / error states. Every list and detail screen
 * uses these so the vocabulary of "nothing here yet", "this broke", and
 * "fetching" is consistent and accessible.
 */

export function LoadingState({
  label = 'Loading records',
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 px-4 py-12 ${className ?? ''}`}>
      <Spinner label={label} />
    </div>
  );
}

export function EmptyState({
  title,
  description,
  icon: Icon = FileQuestion,
  action,
  className,
}: {
  title: string;
  description?: ReactNode;
  icon?: LucideIcon;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center justify-center gap-2 px-4 py-12 text-center ${className ?? ''}`}>
      <span className="flex size-10 items-center justify-center rounded-panel border border-line bg-surface-muted">
        <Icon aria-hidden className="size-5 text-ink-secondary" />
      </span>
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      {description ? (
        <p className="max-w-sm text-[0.8125rem] text-ink-secondary">{description}</p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  title = 'This did not load',
  description,
  onRetry,
  retrying = false,
  className,
}: {
  title?: string;
  description?: ReactNode;
  onRetry?: () => void;
  retrying?: boolean;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={`flex flex-col items-center justify-center gap-2 px-4 py-12 text-center ${className ?? ''}`}
    >
      <span className="flex size-10 items-center justify-center rounded-panel border border-danger-line bg-danger-soft">
        <CircleAlert aria-hidden className="size-5 text-danger" />
      </span>
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      {description ? (
        <p className="max-w-sm text-[0.8125rem] text-ink-secondary">{description}</p>
      ) : null}
      {onRetry ? (
        <Button
          variant="secondary"
          size="sm"
          className="mt-2"
          onClick={onRetry}
          loading={retrying}
          icon={<RefreshCw aria-hidden className="size-3.5" />}
        >
          Try again
        </Button>
      ) : null}
    </div>
  );
}

/**
 * Honest "not available" state used when a capability has no backing
 * data source (e.g. the configured source does not implement the
 * contract route). It never renders fabricated content.
 */
export function UnavailableState({
  title = 'Not available from the current data source',
  description,
  className,
}: {
  title?: string;
  description?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center justify-center gap-2 px-4 py-12 text-center ${className ?? ''}`}>
      <span className="flex size-10 items-center justify-center rounded-panel border border-line bg-surface-muted">
        <CircleX aria-hidden className="size-5 text-ink-secondary" />
      </span>
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      {description ? (
        <p className="max-w-sm text-[0.8125rem] text-ink-secondary">{description}</p>
      ) : null}
    </div>
  );
}

/** Inline banner used inside panels for warnings/limits. */
export function NoticeBanner({
  tone = 'info',
  title,
  children,
}: {
  tone?: 'info' | 'warning' | 'danger';
  title?: string;
  children: ReactNode;
}) {
  const toneClass =
    tone === 'danger'
      ? 'border-danger-line bg-danger-soft text-danger'
      : tone === 'warning'
        ? 'border-warning-line bg-warning-soft text-warning'
        : 'border-info-line bg-info-soft text-info';
  return (
    <div className={`rounded-control border px-3 py-2 text-[0.8125rem] ${toneClass}`} role="note">
      {title ? <p className="font-semibold">{title}</p> : null}
      <div className={title ? 'mt-0.5 text-ink-secondary' : 'text-ink-secondary'}>{children}</div>
    </div>
  );
}
