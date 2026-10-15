import type { ReactNode } from 'react';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { cn } from '../../lib/utils';

export type MetricTone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info';

const valueTone: Record<MetricTone, string> = {
  neutral: 'text-ink',
  brand: 'text-plum',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
  info: 'text-info',
};

export interface MetricTileProps {
  label: string;
  /** Pre-formatted, tabular-aligned value from the data source. */
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  tone?: MetricTone;
  /** Current and previous-period values for a truthful trend delta. */
  comparison?: { current: number; previous: number };
  /** Overrides the delta colour when a rise is not good news. */
  risingTone?: 'danger' | 'warning' | 'neutral';
  loading?: boolean;
}

function deltaPercent(current: number, previous: number): number | null {
  if (!previous) return null;
  return ((current - previous) / previous) * 100;
}

/**
 * Dashboard metric tile. The trend delta is computed from the previous-period
 * values reported by the data source, never estimated.
 */
export function MetricTile({
  label,
  value,
  hint,
  icon,
  tone = 'neutral',
  comparison,
  risingTone,
  loading,
}: MetricTileProps) {
  const percent =
    comparison && !loading ? deltaPercent(comparison.current, comparison.previous) : null;
  const rising = percent !== null && percent > 0.05;
  const falling = percent !== null && percent < -0.05;

  return (
    <div className="rounded-panel border border-line bg-surface p-4 shadow-xs">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium tracking-wide text-ink-secondary uppercase">
          {label}
        </p>
        {icon && <span className="shrink-0 text-ink-secondary">{icon}</span>}
      </div>

      {loading ? (
        <div className="mt-2 h-8 w-24 animate-pulse rounded-control bg-surface-muted" />
      ) : (
        <p className={cn('mt-2 text-2xl font-semibold tabular-nums', valueTone[tone])}>
          {value}
        </p>
      )}

      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-secondary">
        {percent !== null && (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-medium',
              rising && risingTone === 'danger' && 'bg-danger-soft text-danger',
              rising && risingTone === 'warning' && 'bg-warning-soft text-warning',
              rising && !risingTone && 'bg-success-soft text-success',
              falling && 'bg-surface-muted text-ink-secondary',
              !rising && !falling && 'bg-surface-muted text-ink-secondary',
            )}
          >
            {rising ? (
              <ArrowUpRight aria-hidden className="size-3" />
            ) : falling ? (
              <ArrowDownRight aria-hidden className="size-3" />
            ) : (
              <Minus aria-hidden className="size-3" />
            )}
            {percent === null ? '—' : `${percent > 0 ? '+' : ''}${percent.toFixed(0)}%`}
          </span>
        )}
        {hint && <span>{hint}</span>}
      </div>
    </div>
  );
}
