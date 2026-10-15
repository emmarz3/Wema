import { Radio } from 'lucide-react';
import { Panel } from '../ui/Panel';
import { EmptyState, ErrorState } from '../ui/States';
import { LoadingPanel } from '../ui/Loading';
import { eventTypeLabels } from '../../lib/status';
import { formatRelativeTime } from '../../lib/format';
import type { SimulationEvent } from '../../types/domain';

/** Recent simulation events, newest first, with delivery-free framing. */
export function EventFeed({
  events,
  loading,
  error,
  onRetry,
}: {
  events?: SimulationEvent[];
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
}) {
  return (
    <Panel title="Simulation events" description="Events emitted by the simulated environment.">
      {error ? (
        <ErrorState error={error} onRetry={onRetry} />
      ) : loading ? (
        <LoadingPanel rows={6} />
      ) : !events || events.length === 0 ? (
        <EmptyState
          icon={<Radio aria-hidden className="size-5" />}
          title="No events yet"
          description="The simulation emits events as transactions move through their lifecycle."
        />
      ) : (
        <ol className="flex flex-col divide-y divide-line">
          {events.map((event) => (
            <li key={event.id} className="flex gap-3 py-2.5">
              <span
                aria-hidden
                className="mt-1.5 size-2 shrink-0 rounded-full bg-brand"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-ink">{eventTypeLabels[event.type]}</p>
                <p className="mt-0.5 text-xs text-ink-secondary">{event.summary}</p>
                <p className="mt-1 flex flex-wrap items-center gap-x-2 text-[0.6875rem] text-ink-secondary">
                  <span>{formatRelativeTime(event.occurredAt)}</span>
                  {event.transactionReference && (
                    <span className="font-technical">{event.transactionReference}</span>
                  )}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}
