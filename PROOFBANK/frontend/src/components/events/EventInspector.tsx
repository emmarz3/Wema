import { Braces, Radio } from 'lucide-react';
import { useNow } from '../../hooks/useSimulationStatus';
import { StatusBadge } from '../ui/Badge';
import { deliveryStatusMeta, eventTypeLabels } from '../../lib/status';
import { formatDateTime, formatRelativeTime } from '../../lib/format';
import { EmptyState } from '../ui/States';
import { Table, TableScroll, TBody, TD, TH, THead, TR } from '../ui/Table';
import { ProofOpsEventLink } from '../layout/ProofOpsLink';
import type { EventDetail } from '../../types/domain';

/**
 * Raw inspection of a single event: the reconstructed payload the destination
 * would receive, plus the delivery attempts it produced. The payload is the
 * simulated source's view of the event — presented as-is, never fabricated.
 */
export function EventInspector({ detail }: { detail: EventDetail }) {
  const { event, payload, deliveries } = detail;
  const now = useNow(10_000);
  const json = payload ? JSON.stringify(payload, null, 2) : '';
  const transaction = payload?.transaction as
    | { reference?: string; type?: string; amount?: { amountMinor: number; currency: string } }
    | undefined;

  return (
    <div className="flex flex-col gap-4">
      <dl className="grid gap-3 sm:grid-cols-2">
        <Field label="Event type" value={eventTypeLabels[event.type]} />
        <Field
          label="Occurred"
          value={`${formatRelativeTime(event.occurredAt, now)} (${formatDateTime(event.occurredAt)})`}
        />
        <Field label="Correlation id" value={event.correlationId} technical />
        <Field
          label="Transaction reference"
          value={event.transactionReference ?? '—'}
          technical
        />
      </dl>

      <p className="flex items-center gap-2 rounded-control border border-line bg-surface-muted/50 px-3 py-2 text-xs text-ink-secondary">
        <Radio aria-hidden className="size-3.5 text-brand" />
        <span>{event.summary}</span>
      </p>

      {/* Raw payload */}
      <div>
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <h3 className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-ink-secondary uppercase">
            <Braces aria-hidden className="size-3.5" />
            Payload
          </h3>
          <ProofOpsEventLink eventType={event.type} correlationId={event.correlationId} />
        </div>
        <pre className="max-h-64 overflow-auto rounded-control border border-line bg-surface-muted px-3 py-2 font-technical text-[0.6875rem] leading-relaxed text-ink">
          {json}
        </pre>
        <p className="mt-1.5 text-[0.6875rem] leading-relaxed text-ink-secondary">
          The payload the destination would receive in this simulated
          environment, as reported by the data source.
        </p>
      </div>

      {/* Deliveries produced by this event */}
      <div>
        <h3 className="mb-1.5 text-xs font-semibold tracking-wide text-ink-secondary uppercase">
          Delivery attempts ({deliveries.length})
        </h3>
        {deliveries.length === 0 ? (
          <EmptyState
            icon={<Radio aria-hidden className="size-5" />}
            title="No delivery attempts"
            description="This event produced no webhook deliveries."
          />
        ) : (
          <TableScroll>
            <Table caption="Delivery attempts for this event">
              <THead>
                <TR>
                  <TH>Status</TH>
                  <TH numeric>Attempts</TH>
                  <TH numeric>Response</TH>
                  <TH>Detail</TH>
                </TR>
              </THead>
              <TBody>
                {deliveries.map((delivery) => (
                  <TR key={delivery.id}>
                    <TD>
                      <StatusBadge meta={deliveryStatusMeta[delivery.status]} size="sm" />
                    </TD>
                    <TD numeric>{delivery.attempts}</TD>
                    <TD numeric>{delivery.responseCode ?? '—'}</TD>
                    <TD className="text-ink-secondary">
                      {delivery.error ?? 'Acknowledged by the destination'}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </TableScroll>
        )}
      </div>

      {transaction?.reference && (
        <p className="text-[0.6875rem] text-ink-secondary">
          Correlated transaction{' '}
          <span className="font-technical text-ink">{transaction.reference}</span>
          {transaction.type ? ` · ${transaction.type.replace('_', ' ').toLowerCase()}` : ''}
          {transaction.amount
            ? ` · ${transaction.amount.amountMinor / 100} ${transaction.amount.currency}`
            : ''}
        </p>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  technical,
}: {
  label: string;
  value: string;
  technical?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs text-ink-secondary">{label}</dt>
      <dd className={technical ? 'mt-1 font-technical text-ink' : 'mt-1 text-sm text-ink'}>
        {value}
      </dd>
    </div>
  );
}
