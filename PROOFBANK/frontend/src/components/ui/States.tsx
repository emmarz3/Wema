import type { ReactNode } from 'react';
import { AlertTriangle, RefreshCw, SearchX } from 'lucide-react';
import { Button } from './Button';
import { ApiError } from '../../api/errors';

/* --------------------------------------------------------- Empty state */

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="flex flex-col items-center justify-center rounded-panel border border-dashed border-line bg-surface-muted/40 px-6 py-12 text-center">
        <span className="mb-3 flex size-10 items-center justify-center rounded-full bg-surface text-ink-secondary shadow-xs">
          {icon ?? <SearchX aria-hidden className="size-5" />}
        </span>
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        {description && (
          <p className="mt-1 max-w-md text-sm text-ink-secondary">{description}</p>
        )}
        {action && <div className="mt-4">{action}</div>}
      </div>
    </div>
  );
}

/* --------------------------------------------------------- Error state */

export function ErrorState({
  error,
  onRetry,
  className,
}: {
  error: unknown;
  onRetry?: () => void;
  className?: string;
}) {
  const message =
    error instanceof ApiError
      ? `${error.message} ${error.userGuidance}`
      : 'Something went wrong while loading this data.';
  return (
    <div
      className={className}
      role="alert"
    >
      <div className="flex flex-col items-start gap-3 rounded-panel border border-danger-line bg-danger-soft px-4 py-4 sm:flex-row sm:items-center">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface text-danger shadow-xs">
          <AlertTriangle aria-hidden className="size-5" />
        </span>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-danger">
            {error instanceof ApiError ? 'Request failed' : 'Unexpected error'}
          </h3>
          <p className="mt-0.5 text-sm text-ink-secondary">{message}</p>
        </div>
        {onRetry && (
          <Button
            variant="secondary"
            size="sm"
            onClick={onRetry}
            icon={<RefreshCw aria-hidden className="size-3.5" />}
          >
            Try again
          </Button>
        )}
      </div>
    </div>
  );
}
