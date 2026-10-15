import { Panel } from '../ui/Panel';
import { EmptyState } from '../ui/States';
import { LoadingPanel } from '../ui/Loading';
import { StatusBadge } from '../ui/Badge';
import { transactionStatusMeta } from '../../lib/status';
import { ratio } from '../../lib/format';
import type { StatusSlice } from '../../types/domain';

const toneOrder: Record<StatusSlice['status'], string> = {
  SUCCESS: 'bg-success',
  FAILED: 'bg-danger',
  PENDING: 'bg-warning',
  PROCESSING: 'bg-warning',
  REVERSED: 'bg-info',
  CREATED: 'bg-ink-secondary',
};

/** Status distribution for the selected period, as labelled bars. */
export function StatusBreakdown({
  data,
  loading,
}: {
  data: StatusSlice[];
  loading?: boolean;
}) {
  const total = data.reduce((sum, slice) => sum + slice.count, 0);

  return (
    <Panel title="Status distribution" description="Share of transactions created in the period.">
      {loading ? (
        <LoadingPanel rows={4} />
      ) : total === 0 ? (
        <EmptyState
          title="No transactions in this range"
          description="Status distribution appears once the period contains transactions."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {/* Stacked summary bar */}
          <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-surface-muted">
            {data.map((slice) => (
              <span
                key={slice.status}
                className={toneOrder[slice.status]}
                style={{ width: `${ratio(slice.count, total)}%` }}
                title={`${transactionStatusMeta[slice.status].label}: ${slice.count}`}
              />
            ))}
          </div>

          <ul className="flex flex-col divide-y divide-line">
            {data.map((slice) => {
              const meta = transactionStatusMeta[slice.status];
              return (
                <li key={slice.status} className="flex items-center gap-3 py-2">
                  <span className="flex-1 text-sm text-ink">{meta.label}</span>
                  <span className="w-12 text-right text-sm tabular-nums text-ink">
                    {slice.count.toLocaleString('en-NG')}
                  </span>
                  <span className="w-14 text-right text-xs tabular-nums text-ink-secondary">
                    {slice.share.toFixed(1)}%
                  </span>
                </li>
              );
            })}
          </ul>

          <p className="text-xs text-ink-secondary">
            Status is reported by the data source; pending and processing
            transactions have not settled.
          </p>
        </div>
      )}
    </Panel>
  );
}

/** Small variant used inside transaction detail pages later. */
export function StatusLegend() {
  return (
    <ul className="flex flex-wrap gap-2">
      {(Object.keys(transactionStatusMeta) as Array<keyof typeof transactionStatusMeta>).map(
        (status) => (
          <li key={status}>
            <StatusBadge meta={transactionStatusMeta[status]} size="sm" />
          </li>
        ),
      )}
    </ul>
  );
}
