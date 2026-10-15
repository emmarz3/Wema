import { cn } from '../../lib/utils';
import { dashboardRanges, type DashboardRange } from '../../types/domain';

const rangeLabels: Record<DashboardRange, string> = {
  '24h': 'Last 24 hours',
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
};

/** Segmented control for the dashboard activity range. */
export function RangeSelector({
  value,
  onChange,
  className,
}: {
  value: DashboardRange;
  onChange: (range: DashboardRange) => void;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Activity range"
      className={cn(
        'inline-flex items-center gap-0.5 rounded-control border border-line bg-surface p-0.5',
        className,
      )}
    >
      {dashboardRanges.map((range) => {
        const active = range === value;
        return (
          <button
            key={range}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(range)}
            className={cn(
              'rounded-[6px] px-2.5 py-1 text-xs font-medium transition-colors duration-fast ease-standard',
              active
                ? 'bg-brand text-white'
                : 'text-ink-secondary hover:bg-surface-muted hover:text-ink',
            )}
          >
            {range === '24h' ? '24h' : range === '7d' ? '7 days' : '30 days'}
            <span className="sr-only"> — {rangeLabels[range]}</span>
          </button>
        );
      })}
    </div>
  );
}
