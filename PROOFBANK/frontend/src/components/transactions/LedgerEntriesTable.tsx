import { Link } from 'react-router-dom';
import { Table, TBody, TD, TH, THead, TR, TableScroll } from '../ui/Table';
import { StatusBadge } from '../ui/Badge';
import { ledgerDirectionMeta } from '../../lib/status';
import { formatDateTime, formatMoney } from '../../lib/format';
import type { LedgerEntry, LedgerEntryStatus } from '../../types/domain';

const entryStatusTone: Record<LedgerEntryStatus, 'success' | 'danger'> = {
  POSTED: 'success',
  REVERSED: 'danger',
};

const entryStatusLabel: Record<LedgerEntryStatus, string> = {
  POSTED: 'Posted',
  REVERSED: 'Reversed',
};

/**
 * Journal entries for a transaction or account. Direction is shown as text
 * and icon, never colour alone, and entries link to their detail view.
 */
export function LedgerEntriesTable({
  entries,
  caption,
  onSelectEntry,
}: {
  entries: LedgerEntry[];
  caption: string;
  onSelectEntry?: (entry: LedgerEntry) => void;
}) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-ink-secondary">
        No journal entries have been posted for this record yet.
      </p>
    );
  }

  return (
    <TableScroll>
      <Table caption={caption}>
        <THead>
          <TR>
            <TH>Entry</TH>
            <TH>Account</TH>
            <TH>Direction</TH>
            <TH numeric>Amount</TH>
            <TH>Posted</TH>
            <TH>Status</TH>
          </TR>
        </THead>
        <TBody>
          {entries.map((entry) => (
            <TR
              key={entry.id}
              onClick={onSelectEntry ? () => onSelectEntry(entry) : undefined}
            >
              <TD mono>
                {onSelectEntry ? (
                  <Link
                    to={`/ledger?entry=${entry.id}`}
                    className="text-brand hover:underline"
                    onClick={(event) => event.stopPropagation()}
                  >
                    {entry.code}
                  </Link>
                ) : (
                  entry.code
                )}
              </TD>
              <TD className="text-ink-secondary">{entry.accountLabel}</TD>
              <TD>
                <StatusBadge meta={ledgerDirectionMeta[entry.direction]} size="sm" />
              </TD>
              <TD numeric>{formatMoney(entry.amount)}</TD>
              <TD
                className="whitespace-nowrap text-ink-secondary"
                title={formatDateTime(entry.postedAt)}
              >
                {formatDateTime(entry.postedAt)}
              </TD>
              <TD>
                <span
                  className={`text-xs font-medium ${
                    entryStatusTone[entry.status] === 'success'
                      ? 'text-success'
                      : 'text-danger'
                  }`}
                >
                  {entryStatusLabel[entry.status]}
                  {entry.compensatesEntryId && ' (compensating)'}
                </span>
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </TableScroll>
  );
}
