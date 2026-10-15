import { Send } from 'lucide-react';
import { Panel } from '../ui/Panel';
import { EmptyState, ErrorState } from '../ui/States';
import { LoadingPanel } from '../ui/Loading';
import { StatusBadge } from '../ui/Badge';
import { deliveryStatusMeta, eventTypeLabels } from '../../lib/status';
import { formatDateTime, formatRelativeTime, truncateMiddle } from '../../lib/format';
import { Table, TBody, TD, TH, THead, TR, TableScroll } from '../ui/Table';
import type { WebhookDelivery } from '../../types/domain';

/**
 * Webhook delivery attempts. Delivery state is deliberately separate from
 * transaction state: a failed delivery here says nothing about whether the
 * underlying transaction succeeded.
 */
export function DeliveryTable({
  deliveries,
  loading,
  error,
  onRetry,
}: {
  deliveries?: WebhookDelivery[];
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
}) {
  return (
    <Panel
      title="Event delivery attempts"
      description="Outbound event delivery toward the ProofOps destination."
      bodyClassName="p-0"
      footer={
        <p className="text-xs leading-relaxed text-ink-secondary">
          <strong className="font-medium text-ink">Delivery status ≠ transaction outcome.</strong>{' '}
          A failed delivery means the event did not reach its destination; the
          underlying transaction may still have succeeded.
        </p>
      }
    >
      {error ? (
        <div className="p-4">
          <ErrorState error={error} onRetry={onRetry} />
        </div>
      ) : loading ? (
        <div className="p-4">
          <LoadingPanel rows={4} />
        </div>
      ) : !deliveries || deliveries.length === 0 ? (
        <div className="p-4">
          <EmptyState
            icon={<Send aria-hidden className="size-5" />}
            title="No delivery attempts"
            description="Deliveries appear when events are dispatched to the configured destination."
          />
        </div>
      ) : (
        <TableScroll>
          <Table caption="Recent webhook delivery attempts">
            <THead>
              <TR>
                <TH>Event</TH>
                <TH>Destination</TH>
                <TH>Delivery status</TH>
                <TH numeric>Attempts</TH>
                <TH numeric>Response</TH>
                <TH>Last attempt</TH>
              </TR>
            </THead>
            <TBody>
              {deliveries.map((delivery) => (
                <TR key={delivery.id}>
                  <TD>{eventTypeLabels[delivery.eventType]}</TD>
                  <TD>
                    <span
                      className="font-technical text-ink-secondary"
                      title={delivery.destination}
                    >
                      {truncateMiddle(delivery.destination, 22, 8)}
                    </span>
                  </TD>
                  <TD>
                    <StatusBadge meta={deliveryStatusMeta[delivery.status]} size="sm" />
                  </TD>
                  <TD numeric>{delivery.attempts}</TD>
                  <TD numeric>{delivery.responseCode ?? '—'}</TD>
                  <TD
                    className="whitespace-nowrap text-ink-secondary"
                    title={
                      delivery.lastAttemptAt
                        ? formatDateTime(delivery.lastAttemptAt)
                        : undefined
                    }
                  >
                    {delivery.lastAttemptAt
                      ? formatRelativeTime(delivery.lastAttemptAt)
                      : '—'}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </TableScroll>
      )}
    </Panel>
  );
}
