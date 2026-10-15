import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Radio, Send, Undo2 } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { SimulatedNotice } from '../components/layout/Environment';
import { Panel, Stat } from '../components/ui/Panel';
import { Button, buttonClass } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/Badge';
import { EmptyState, ErrorState } from '../components/ui/States';
import { LoadingPanel } from '../components/ui/Loading';
import { LifecycleTimeline } from '../components/transactions/LifecycleTimeline';
import { LedgerEntriesTable } from '../components/transactions/LedgerEntriesTable';
import { DeliveryAttemptsTable } from '../components/transactions/DeliveryAttemptsTable';
import { ReverseDialog } from '../components/transactions/ReverseDialog';
import { useAuth } from '../state/auth';
import { useTransactionDetail } from '../hooks/useCustomers';
import { eventTypeLabels, transactionStatusMeta, transactionTypeMeta } from '../lib/status';
import { formatDateTime, formatMoney, formatRelativeTime, truncateMiddle } from '../lib/format';
import type { LedgerEntry, TransactionDetail } from '../types/domain';

/** Full transaction record: summary, lifecycle, ledger, events, deliveries. */
export function TransactionDetailPage() {
  const { transactionId = '' } = useParams();
  const { can } = useAuth();
  const detail = useTransactionDetail(transactionId);
  const [reverseOpen, setReverseOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<LedgerEntry | null>(null);

  if (detail.isPending) {
    return (
      <Panel>
        <LoadingPanel rows={8} />
      </Panel>
    );
  }

  if (detail.error || !detail.data) {
    return (
      <Panel>
        <ErrorState
          error={detail.error ?? new Error('Transaction not found.')}
          onRetry={() => void detail.refetch()}
        />
        <div className="mt-3">
          <Link to="/transactions" className={buttonClass('secondary', 'sm')}>
            Back to transactions
          </Link>
        </div>
      </Panel>
    );
  }

  const { transaction, ledgerEntries, events, deliveries } = detail.data;
  const meta = transactionStatusMeta[transaction.status];
  const reversed = transaction.status === 'REVERSED';

  return (
    <>
      <PageHeader
        title={transaction.reference}
        sectionId="transactions"
        description={`${transactionTypeMeta[transaction.type].label} · created ${formatDateTime(transaction.createdAt)}`}
        actions={
          <>
            <SimulatedNotice />
            {detail.data.inProgress && (
              <span className="flex items-center gap-1.5 text-xs text-info">
                <Loader2 aria-hidden className="size-3.5 animate-spin" />
                Progressing…
              </span>
            )}
            <Button
              variant="danger"
              onClick={() => setReverseOpen(true)}
              disabled={!can('reverse_transactions') || transaction.status !== 'SUCCESS'}
              title={
                transaction.status === 'SUCCESS'
                  ? can('reverse_transactions')
                    ? undefined
                    : 'Your role cannot reverse transactions.'
                  : 'Only successful transactions can be reversed.'
              }
              icon={<Undo2 aria-hidden className="size-4" />}
            >
              Reverse
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Link
          to="/transactions"
          className="inline-flex items-center gap-1.5 text-xs text-ink-secondary hover:text-ink"
        >
          <ArrowLeft aria-hidden className="size-3.5" />
          All transactions
        </Link>
      </div>

      <div className="flex flex-col gap-5">
        {/* Summary ------------------------------------------------------- */}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Amount" value={formatMoney(transaction.amount)} hint={transaction.amount.currency} />
          <Stat
            label="Status"
            value={meta.label}
            hint={meta.description}
          />
          <Stat
            label="Completed"
            value={
              transaction.completedAt
                ? formatRelativeTime(transaction.completedAt)
                : 'Not completed'
            }
            hint={transaction.completedAt ? formatDateTime(transaction.completedAt) : undefined}
          />
          <Stat
            label="Correlation ID"
            value={
              <span className="font-technical text-base" title={transaction.correlationId}>
                {truncateMiddle(transaction.correlationId, 12, 6)}
              </span>
            }
            hint="Ties together transaction, events and deliveries"
          />
        </div>

        {/* Transaction record ------------------------------------------- */}
        <Panel title="Transaction record">
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Detail label="Reference" value={transaction.reference} mono />
            <Detail label="Type" value={transactionTypeMeta[transaction.type].label} />
            <Detail
              label="Status"
              value={<StatusBadge meta={meta} size="sm" />}
            />
            <Detail
              label="Source"
              value={transaction.sourceLabel ?? 'External (simulated settlement)'}
            />
            <Detail
              label="Destination"
              value={transaction.destinationLabel ?? 'External (simulated settlement)'}
            />
            <Detail label="Scenario" value={transaction.scenarioName ?? '—'} />
            <Detail label="Transaction ID" value={transaction.id} mono />
            <Detail label="Correlation ID" value={transaction.correlationId} mono />
            <Detail
              label="Reversal"
              value={
                reversed
                  ? 'Compensating entries posted; original entries marked reversed'
                  : 'Not reversed'
              }
            />
          </dl>
          {transaction.failureReason && (
            <p className="mt-4 rounded-control border border-danger-line bg-danger-soft px-3 py-2.5 text-sm text-danger">
              <strong className="font-medium">Failure reason: </strong>
              {transaction.failureReason}
            </p>
          )}
        </Panel>

        {/* Lifecycle ---------------------------------------------------- */}
        <div className="grid gap-5 xl:grid-cols-3">
          <Panel
            title="Lifecycle"
            description="Every state transition recorded by the source, in order."
            className="xl:col-span-1"
          >
            <LifecycleTimeline
              history={transaction.statusHistory}
              currentStatus={transaction.status}
            />
          </Panel>

          <div className="flex flex-col gap-5 xl:col-span-2">
            <Panel
              title="Ledger journal entries"
              description="Balanced postings for this transaction."
              bodyClassName="p-0"
            >
              {ledgerEntries.length === 0 ? (
                <div className="p-4">
                  <EmptyState
                    title="No journal entries yet"
                    description="Entries are posted when the transaction settles. Pending transactions post nothing."
                  />
                </div>
              ) : (
                <LedgerEntriesTable
                  entries={ledgerEntries}
                  caption="Journal entries posted by this transaction"
                  onSelectEntry={(entry) => setSelectedEntry(entry)}
                />
              )}
            </Panel>

            <Panel title="Associated events" description="Events emitted for this transaction.">
              {events.length === 0 ? (
                <EmptyState
                  icon={<Radio aria-hidden className="size-5" />}
                  title="No events yet"
                />
              ) : (
                <ol className="flex flex-col divide-y divide-line">
                  {events.map((event) => (
                    <li key={event.id} className="flex gap-3 py-2.5">
                      <span aria-hidden className="mt-1.5 size-2 shrink-0 rounded-full bg-brand" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-ink">{eventTypeLabels[event.type]}</p>
                        <p className="mt-0.5 text-xs text-ink-secondary">{event.summary}</p>
                        <p className="mt-1 text-[0.6875rem] text-ink-secondary">
                          {formatDateTime(event.occurredAt)} ·{' '}
                          <span className="font-technical">{event.correlationId}</span>
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </Panel>
          </div>
        </div>

        {/* Deliveries --------------------------------------------------- */}
        <Panel
          title="Webhook delivery attempts"
          description="Events dispatched toward the ProofOps destination."
          footer={
            <p className="text-xs leading-relaxed text-ink-secondary">
              <strong className="font-medium text-ink">Delivery status ≠ transaction outcome.</strong>{' '}
              This transaction is {meta.label.toLowerCase()}; its delivery attempts
              are tracked separately.
            </p>
          }
          bodyClassName="p-0"
        >
          {deliveries.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={<Send aria-hidden className="size-5" />}
                title="No delivery attempts"
                description="Deliveries are attempted as the transaction emits events."
              />
            </div>
          ) : (
            <DeliveryAttemptsTable deliveries={deliveries} />
          )}
        </Panel>
      </div>

      <ReverseDialog
        transaction={transaction}
        open={reverseOpen}
        onClose={() => setReverseOpen(false)}
        onReversed={() => void detail.refetch()}
      />

      {selectedEntry && (
        <EntryHint entry={selectedEntry} onDismiss={() => setSelectedEntry(null)} />
      )}
    </>
  );
}

function Detail({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs text-ink-secondary">{label}</dt>
      <dd className={`mt-1 text-sm break-words text-ink ${mono ? 'font-technical' : ''}`}>
        {value}
      </dd>
    </div>
  );
}

/** Explains where the full journal entry view lives. */
function EntryHint({
  entry,
  onDismiss,
}: {
  entry: LedgerEntry;
  onDismiss: () => void;
}) {
  return (
    <div className="fixed inset-x-0 bottom-4 z-40 mx-auto flex w-[min(92vw,36rem)] items-center gap-3 rounded-panel border border-line bg-surface px-4 py-3 shadow-lg">
      <p className="flex-1 text-xs text-ink-secondary">
        Journal entry <span className="font-technical text-ink">{entry.code}</span> —
        open the Ledger explorer for its full detail view and compensation
        links.
      </p>
      <Link to="/ledger" className={buttonClass('secondary', 'sm')} onClick={onDismiss}>
        Open ledger
      </Link>
      <Button variant="ghost" size="sm" onClick={onDismiss}>
        Dismiss
      </Button>
    </div>
  );
}

export type { TransactionDetail };
