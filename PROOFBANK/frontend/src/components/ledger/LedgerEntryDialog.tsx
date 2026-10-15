import { Link } from 'react-router-dom';
import { ArrowLeftRight, BookOpen } from 'lucide-react';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { StatusBadge } from '../ui/Badge';
import { EmptyState, ErrorState } from '../ui/States';
import { LoadingPanel } from '../ui/Loading';
import { useLedgerEntry } from '../../hooks/useCustomers';
import { ledgerDirectionMeta, transactionStatusMeta, transactionTypeMeta } from '../../lib/status';
import { formatDateTime, formatMoney } from '../../lib/format';
import { LedgerEntriesTable } from '../transactions/LedgerEntriesTable';

/**
 * Read-only journal entry detail. Shows the entry, the posting pair it
 * belongs to, and any compensation links — nothing here can edit the ledger.
 */
export function LedgerEntryDialog({
  entryId,
  onClose,
}: {
  entryId: string;
  onClose: () => void;
}) {
  const detail = useLedgerEntry(entryId);

  return (
    <Dialog
      open
      onClose={onClose}
      title={detail.data?.entry.code ?? 'Journal entry'}
      description="Read-only view of a posted journal entry."
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          {detail.data?.transaction && (
            <Link
              to={`/transactions/${detail.data.transaction.id}`}
              onClick={onClose}
              className="inline-flex h-10 items-center gap-2 rounded-control bg-brand px-4 text-sm font-medium text-white"
            >
              <ArrowLeftRight aria-hidden className="size-4" />
              Open transaction
            </Link>
          )}
        </>
      }
    >
      {detail.isPending ? (
        <LoadingPanel rows={4} />
      ) : detail.error || !detail.data ? (
        <ErrorState
          error={detail.error ?? new Error('Journal entry not found.')}
          onRetry={() => void detail.refetch()}
        />
      ) : (
        <div className="flex flex-col gap-5">
          <dl className="grid gap-3 sm:grid-cols-2">
            <Fact label="Entry" value={detail.data.entry.code} mono />
            <Fact
              label="Direction"
              value={
                <StatusBadge meta={ledgerDirectionMeta[detail.data.entry.direction]} size="sm" />
              }
            />
            <Fact label="Amount" value={formatMoney(detail.data.entry.amount)} />
            <Fact label="Account" value={detail.data.entry.accountLabel} />
            <Fact
              label="Status"
              value={detail.data.entry.status === 'POSTED' ? 'Posted' : 'Reversed'}
            />
            <Fact label="Posted" value={formatDateTime(detail.data.entry.postedAt)} />
            <Fact label="Transaction reference" value={detail.data.entry.reference} mono />
            <Fact label="Correlation ID" value={detail.data.entry.correlationId} mono />
          </dl>

          {detail.data.transaction && (
            <div className="rounded-control border border-line bg-surface-muted/40 p-3">
              <p className="text-xs font-semibold tracking-wide text-ink-secondary uppercase">
                Source transaction
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-ink">
                <span>{transactionTypeMeta[detail.data.transaction.type].label}</span>
                <StatusBadge
                  meta={transactionStatusMeta[detail.data.transaction.status]}
                  size="sm"
                />
                <span className="tabular-nums">
                  {formatMoney(detail.data.transaction.amount)}
                </span>
                {detail.data.transaction.scenarioName && (
                  <span className="text-xs text-ink-secondary">
                    via {detail.data.transaction.scenarioName}
                  </span>
                )}
              </div>
            </div>
          )}

          {(detail.data.compensatingFor.length > 0 ||
            detail.data.compensatedBy.length > 0) && (
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-ink">
                <BookOpen aria-hidden className="size-4 text-ink-secondary" />
                Compensation links
              </p>
              <ul className="flex flex-col gap-1 text-xs text-ink-secondary">
                {detail.data.compensatingFor.map((entry) => (
                  <li key={entry.id}>
                    Compensates <span className="font-technical text-ink">{entry.code}</span>{' '}
                    (reversed by this entry)
                  </li>
                ))}
                {detail.data.compensatedBy.map((entry) => (
                  <li key={entry.id}>
                    Compensated by <span className="font-technical text-ink">{entry.code}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <p className="mb-2 text-sm font-medium text-ink">
              Posting pair ({detail.data.related.length} entr
              {detail.data.related.length === 1 ? 'y' : 'ies'} from this transaction)
            </p>
            <LedgerEntriesTable
              entries={detail.data.related}
              caption="All journal entries posted by this transaction"
            />
          </div>

          {detail.data.related.length === 0 && (
            <EmptyState
              title="No related entries"
              description="This entry is not part of a posting pair."
            />
          )}
        </div>
      )}
    </Dialog>
  );
}

function Fact({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="rounded-control border border-line bg-surface-muted/40 p-3">
      <dt className="text-xs text-ink-secondary">{label}</dt>
      <dd className={`mt-1 text-sm break-words text-ink ${mono ? 'font-technical' : ''}`}>
        {value}
      </dd>
    </div>
  );
}
