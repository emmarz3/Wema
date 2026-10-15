import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { BookOpen, Download, Scale } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { SimulatedNotice } from '../components/layout/Environment';
import { Panel, Stat } from '../components/ui/Panel';
import { Button } from '../components/ui/Button';
import { SearchInput } from '../components/ui/SearchInput';
import { Select } from '../components/ui/Field';
import { StatusBadge } from '../components/ui/Badge';
import { EmptyState, ErrorState } from '../components/ui/States';
import { LoadingPanel } from '../components/ui/Loading';
import { Pagination } from '../components/ui/Pagination';
import {
  SortableTH,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
  TableScroll,
  type SortState,
} from '../components/ui/Table';
import { LedgerEntryDialog } from '../components/ledger/LedgerEntryDialog';
import { useLedger } from '../hooks/useCustomers';
import { useToast } from '../state/toast';
import { ledgerDirectionMeta } from '../lib/status';
import { formatDateTime, formatMoney, formatRelativeTime } from '../lib/format';
import { toCsv, downloadCsv, type CsvColumn } from '../lib/exportCsv';
import type { LedgerEntry, LedgerQuery } from '../types/domain';

const PAGE_SIZE = 15;

const csvColumns: Array<CsvColumn<LedgerEntry>> = [
  { header: 'Entry', value: (row) => row.code },
  { header: 'Transaction reference', value: (row) => row.reference },
  { header: 'Account', value: (row) => row.accountLabel },
  { header: 'Account ID', value: (row) => row.accountId },
  { header: 'Direction', value: (row) => row.direction },
  { header: 'Amount (minor units)', value: (row) => row.amount.amountMinor },
  { header: 'Currency', value: (row) => row.amount.currency },
  { header: 'Posted', value: (row) => row.postedAt },
  { header: 'Status', value: (row) => row.status },
  { header: 'Correlation ID', value: (row) => row.correlationId },
  { header: 'Compensates', value: (row) => row.compensatesEntryId ?? '' },
];

/**
 * Ledger explorer. Shows journal entries posted by the simulation, with
 * balanced totals for the filtered set, transaction-linked navigation and a
 * read-only entry detail view. Entries are never edited here.
 */
export function LedgerPage() {
  const navigate = useNavigate();
  const { show } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = useState('');
  const [direction, setDirection] = useState<LedgerQuery['direction']>('all');
  const [status, setStatus] = useState<LedgerQuery['status']>('all');
  const [sort, setSort] = useState<SortState<'postedAt' | 'amount' | 'code'>>({
    key: 'postedAt',
    direction: 'desc',
  });
  const [page, setPage] = useState(1);

  const query: LedgerQuery = useMemo(
    () => ({
      search,
      direction,
      status,
      sort: sort.key,
      directionSort: sort.direction,
      page,
      pageSize: PAGE_SIZE,
    }),
    [search, direction, status, sort, page],
  );

  const ledger = useLedger(query);
  const items = ledger.data?.items ?? [];
  const selectedEntryId = searchParams.get('entry');

  function resetPage<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value);
      setPage(1);
    };
  }

  function exportCsv() {
    if (items.length === 0) return;
    const csv = toCsv(items, csvColumns);
    downloadCsv(`proofbank-ledger-${new Date().toISOString().slice(0, 10)}.csv`, csv);
    show({
      tone: 'success',
      title: 'Export ready',
      description: `${items.length} journal entr${items.length === 1 ? 'y' : 'ies'} on this page exported as CSV.`,
    });
  }

  return (
    <>
      <PageHeader
        title="Ledger"
        sectionId="ledger"
        description="Journal entries posted by the simulated environment. Reversals post compensating entries — history is never edited."
        actions={
          <>
            <SimulatedNotice />
            <Button
              variant="secondary"
              onClick={exportCsv}
              disabled={items.length === 0}
              icon={<Download aria-hidden className="size-4" />}
            >
              Export CSV
            </Button>
          </>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Total debits"
          value={
            ledger.data
              ? formatMoney({
                  amountMinor: ledger.data.totals.debitMinor,
                  currency: ledger.data.totals.currency,
                })
              : '—'
          }
          hint="Debit entries in the filtered set"
        />
        <Stat
          label="Total credits"
          value={
            ledger.data
              ? formatMoney({
                  amountMinor: ledger.data.totals.creditMinor,
                  currency: ledger.data.totals.currency,
                })
              : '—'
          }
          hint="Credit entries in the filtered set"
        />
        <Stat
          label="Balance check"
          value={
            ledger.data
              ? ledger.data.totals.balanced
                ? 'Balanced'
                : 'Out of balance'
              : '—'
          }
          hint={
            ledger.data?.totals.balanced
              ? 'Debits equal credits for this filter'
              : 'Filter excludes one side of a posting pair'
          }
          icon={<Scale aria-hidden className="size-4" />}
        />
        <Stat
          label="Entries"
          value={(ledger.data?.total ?? 0).toLocaleString('en-NG')}
          hint="Journal entries matching the current filters"
          icon={<BookOpen aria-hidden className="size-4" />}
        />
      </div>

      <Panel bodyClassName="p-0">
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-3">
          <SearchInput
            label="Search ledger"
            placeholder="Search by entry code, reference, account or correlation ID"
            value={search}
            onValueChange={resetPage(setSearch)}
            className="w-full sm:w-96"
          />
          <label className="flex items-center gap-2 text-xs text-ink-secondary">
            Direction
            <Select
              value={direction}
              onChange={(event) =>
                resetPage(setDirection)(event.target.value as LedgerQuery['direction'])
              }
              className="h-9 w-32 py-0 text-xs"
              aria-label="Filter by direction"
            >
              <option value="all">All</option>
              <option value="DEBIT">Debit</option>
              <option value="CREDIT">Credit</option>
            </Select>
          </label>
          <label className="flex items-center gap-2 text-xs text-ink-secondary">
            Status
            <Select
              value={status}
              onChange={(event) =>
                resetPage(setStatus)(event.target.value as LedgerQuery['status'])
              }
              className="h-9 w-32 py-0 text-xs"
              aria-label="Filter by entry status"
            >
              <option value="all">All</option>
              <option value="POSTED">Posted</option>
              <option value="REVERSED">Reversed</option>
            </Select>
          </label>
        </div>

        {ledger.error ? (
          <div className="p-4">
            <ErrorState error={ledger.error} onRetry={() => void ledger.refetch()} />
          </div>
        ) : ledger.isPending ? (
          <div className="p-4">
            <LoadingPanel rows={8} />
          </div>
        ) : items.length === 0 ? (
          <div className="p-4">
            <EmptyState
              title="No journal entries match these filters"
              description="Entries appear when transactions settle in the simulation."
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setSearch('');
                    setDirection('all');
                    setStatus('all');
                  }}
                >
                  Clear filters
                </Button>
              }
            />
          </div>
        ) : (
          <>
            <TableScroll>
              <Table caption="Simulated ledger journal entries">
                <THead>
                  <TR>
                    <SortableTH label="Entry" sortKey="code" sort={sort} onSort={setSort} />
                    <TH>Transaction</TH>
                    <TH>Account</TH>
                    <TH>Direction</TH>
                    <SortableTH
                      label="Amount"
                      sortKey="amount"
                      sort={sort}
                      onSort={setSort}
                      numeric
                    />
                    <SortableTH
                      label="Posted"
                      sortKey="postedAt"
                      sort={sort}
                      onSort={setSort}
                    />
                    <TH>Status</TH>
                  </TR>
                </THead>
                <TBody>
                  {items.map((entry) => (
                    <TR key={entry.id} onClick={() => navigate(`/ledger?entry=${entry.id}`)}>
                      <TD mono>{entry.code}</TD>
                      <TD mono>
                        <Link
                          to={`/transactions/${entry.transactionId}`}
                          className="text-brand hover:underline"
                          onClick={(event) => event.stopPropagation()}
                        >
                          {entry.reference}
                        </Link>
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
                        {formatRelativeTime(entry.postedAt)}
                      </TD>
                      <TD>
                        <span
                          className={`text-xs font-medium ${
                            entry.status === 'POSTED' ? 'text-success' : 'text-danger'
                          }`}
                        >
                          {entry.status === 'POSTED' ? 'Posted' : 'Reversed'}
                          {entry.compensatesEntryId && ' (compensating)'}
                        </span>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </TableScroll>
            {ledger.data && (
              <Pagination
                page={ledger.data.page}
                pageSize={ledger.data.pageSize}
                total={ledger.data.total}
                onPageChange={setPage}
              />
            )}
          </>
        )}
      </Panel>

      <p className="mt-3 text-xs leading-relaxed text-ink-secondary">
        Balances shown as "Out of balance" mean the current filter excludes one
        half of a posting pair — not that the ledger is unbalanced. The whole
        ledger always balances: every transaction posts equal debits and
        credits.
      </p>

      {selectedEntryId && (
        <LedgerEntryDialog
          entryId={selectedEntryId}
          onClose={() => {
            searchParams.delete('entry');
            setSearchParams(searchParams, { replace: true });
          }}
        />
      )}
    </>
  );
}
