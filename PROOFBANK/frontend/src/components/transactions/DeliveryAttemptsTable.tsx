import { Table, TBody, TD, TH, THead, TR, TableScroll } from '../ui/Table';
import { StatusBadge } from '../ui/Badge';
import { deliveryStatusMeta, eventTypeLabels } from '../../lib/status';
import { formatDateTime, formatRelativeTime } from '../../lib/format';
import type { WebhookDelivery } from '../../types/domain';

/**
 * Webhook delivery attempts for one transaction. Delivery state is
 * deliberately presented beside — never instead of — the transaction state.
 */
export function DeliveryAttemptsTable({
  deliveries,
}: {
  deliveries: WebhookDelivery[];
}) {
  if (deliveries.length === 0) {
    return (
      <p className="text-sm text-ink-secondary">
        No delivery attempts have been made for this transaction's events yet.
      </p>
    );
  }

  return (
    <TableScroll>
      <Table caption="Webhook delivery attempts for this transaction">
        <THead>
          <TR>
            <TH>Event</TH>
            <TH>Delivery status</TH>
            <TH numeric>Attempts</TH>
            <TH numeric>Response</TH>
            <TH>Last attempt</TH>
            <TH>Correlation</TH>
          </TR>
        </THead>
        <TBody>
          {deliveries.map((delivery) => (
            <TR key={delivery.id}>
              <TD>{eventTypeLabels[delivery.eventType]}</TD>
              <TD>
                <StatusBadge meta={deliveryStatusMeta[delivery.status]} size="sm" />
              </TD>
              <TD numeric>{delivery.attempts}</TD>
              <TD numeric>{delivery.responseCode ?? '—'}</TD>
              <TD
                className="whitespace-nowrap text-ink-secondary"
                title={delivery.lastAttemptAt ? formatDateTime(delivery.lastAttemptAt) : undefined}
              >
                {delivery.lastAttemptAt ? formatRelativeTime(delivery.lastAttemptAt) : '—'}
              </TD>
              <TD mono className="max-w-[10rem] truncate" title={delivery.correlationId}>
                {delivery.correlationId}
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </TableScroll>
  );
}
