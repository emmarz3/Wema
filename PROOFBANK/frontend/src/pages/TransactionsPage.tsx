import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, Download, Filter, Plus, Undo2, X } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { SimulatedNotice } from '../components/layout/Environment';
import { Panel } from '../components/ui/Panel';
import { Button } from '../components/ui/Button';
import { SearchInput } from '../components/ui/SearchInput';
import { Select } from '../components/ui/Field';
import { StatusBadge } from '../components/ui/Badge';
import { EmptyState, ErrorState } from '../components/ui/States';
import { LoadingPanel } from '../components/ui/Loading';
import {
  Pagination,
} from '../components/ui/Pagination';
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
import { useAuth } from '../state/auth';
import { useToast } from '../state/toast';
import { useTransactions } from '../hooks/useCustomers';
import { transactionStatusMeta, transactionTypeMeta } from '../lib/status';
import { formatMoney, formatRelativeTime, formatDateTime } from '../lib/format';
import { toCsv, downloadCsv, type CsvColumn } from '../lib/exportCsv';
import {
  transactionStatuses,
  transactionTypes,
  type OperationKind,
  type Transaction,
  type TransactionQuery,
  type TransactionStatus,
  type TransactionType,
} from '../types/domain';
import { OperationDialog } from '../components/transactions/OperationDialog';
import { useSearchParams } from 'react-router-dom';

const PAGE_SIZE = 15;

const csvColumns: Array<CsvColumn<Transaction>> = [
  { header: 'Reference', value: (row) => row.reference },
  { header: 'Type', value: (row) => row.type },
  { header: 'Status', value: (row) => row.status },
  { header: 'Source', value: (row) => row.sourceLabel ?? '' },
  { header: 'Destination', value: (row) => row.destinationLabel ?? '' },
  { header: 'Amount (minor units)', value: (row) => row.amount.amountMinor },
  { header: 'Currency', value: (row) => row.amount.currency },
  { header: 'Created', value: (row) => row.createdAt },
  { header: 'Completed', value: (row) => row.completedAt ?? '' },
  { header: 'Correlation ID', value: (row) => row.correlationId },
  { header: 'Scenario', value: (row) => row.scenarioName ?? '' },
];

/**
 * Transactions workspace: search, filter, sort, paginate, export and operate
 * on simulated transactions.
 */
export function TransactionsPage() {
  const navigate = useNavigate();
  const { can } = useAuth();
  const { show } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<TransactionStatus | 'all'>('all');
  const [type, setType] = useState<TransactionType | 'all'>('all');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [sort, setSort] = useState<SortState<'createdAt' | 'amount' | 'status' | 'reference'>>({
    key: 'createdAt',
    direction: 'desc',
  });
  const [page, setPage] = useState(1);
  const [operation, setOperation] = useState<OperationKind | null>(
    (searchParams.get('operation') as OperationKind | null) ?? null,
  );

  const query: TransactionQuery = useMemo(
    () => ({
      search,
      status,
      type,
      minAmountMinor: minAmount ? Math.round(Number(minAmount) * 100) : undefined,
      maxAmountMinor: maxAmount ? Math.round(Number(maxAmount) * 100) : undefined,
      from: from ? new Date(from).toISOString() : undefined,
      to: to ? new Date(`${to}T23:59:59`).toISOString() : undefined,
      sort: sort.key,
      direction: sort.direction,
      page,
      pageSize: PAGE_SIZE,
    }),
    [search, status, type, minAmount, maxAmount, from, to, sort, page],
  );

  const transactions = useTransactions(query);
  const items = transactions.data?.items ?? [];

  function resetPage<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value);
      setPage(1);
    };
  }

  function exportCsv() {
    if (items.length === 0) return;
    const csv = toCsv(items, csvColumns);
    downloadCsv(`proofbank-transactions-${new Date().toISOString().slice(0, 10)}.csv`, csv);
    show({
      tone: 'success',
      title: 'Export ready',
      description: `${items.length} transaction${items.length === 1 ? '' : 's'} on this page exported as CSV.`,
    });
  }

  return (
    <>
      <PageHeader
        title="Transactions"
        sectionId="transactions"
        description="Transaction operations, lifecycle detail and status history for the simulated environment."
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
            <Button
              onClick={() => setOperation('deposit')}
              disabled={!can('execute_transactions')}
              title={can('execute_transactions') ? undefined : 'Your role cannot execute transactions.'}
              icon={<Plus aria-hidden className="size-4" />}
            >
              New transaction
            </Button>
          </>
        }
      />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        {(
          [
            ['deposit', 'Deposit'],
            ['withdrawal', 'Withdrawal'],
            ['transfer', 'Transfer'],
          ] as Array<[OperationKind, string]>
        ).map(([kind, label]) => (
          <Button
            key={kind}
            variant="secondary"
            size="sm"
            onClick={() => setOperation(kind)}
            disabled={!can('execute_transactions')}
            title={
              can('execute_transactions') ? undefined : 'Your role cannot execute transactions.'
            }
            icon={
              kind === 'deposit' ? (
                <Plus aria-hidden className="size-3.5" />
              ) : kind === 'withdrawal' ? (
                <X aria-hidden className="size-3.5" />
              ) : (
                <Undo2 aria-hidden className="size-3.5" />
              )
            }
          >
            {label}
          </Button>
        ))}
      </div>

      <Panel bodyClassName="p-0">
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-3">
          <SearchInput
            label="Search transactions"
            placeholder="Search by reference, ID or correlation ID"
            value={search}
            onValueChange={resetPage(setSearch)}
            className="w-full sm:w-96"
          />
          <label className="flex items-center gap-2 text-xs text-ink-secondary">
            Status
            <Select
              value={status}
              onChange={(event) =>
                resetPage(setStatus)(event.target.value as TransactionStatus | 'all')
              }
              className="h-9 w-36 py-0 text-xs"
              aria-label="Filter by status"
            >
              <option value="all">All statuses</option>
              {transactionStatuses.map((value) => (
                <option key={value} value={value}>
                  {transactionStatusMeta[value].label}
                </option>
              ))}
            </Select>
          </label>
          <label className="flex items-center gap-2 text-xs text-ink-secondary">
            Type
            <Select
              value={type}
              onChange={(event) =>
                resetPage(setType)(event.target.value as TransactionType | 'all')
              }
              className="h-9 w-40 py-0 text-xs"
              aria-label="Filter by type"
            >
              <option value="all">All types</option>
              {transactionTypes.map((value) => (
                <option key={value} value={value}>
                  {transactionTypeMeta[value].label}
                </option>
              ))}
            </Select>
          </label>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAdvanced((open) => !open)}
            aria-expanded={showAdvanced}
            icon={<Filter aria-hidden className="size-3.5" />}
          >
            Amount & date
            <ChevronDown
              aria-hidden
              className={`size-3.5 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
            />
          </Button>
          <span className="ml-auto text-xs text-ink-secondary" data-numeric="true">
            {transactions.data ? `${transactions.data.total} transactions` : 'Loading…'}
          </span>
        </div>

        {showAdvanced && (
          <div className="grid gap-3 border-b border-line bg-surface-muted/40 p-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="flex flex-col gap-1 text-xs text-ink-secondary">
              Minimum amount
              <input
                type="number"
                min="0"
                step="0.01"
                value={minAmount}
                onChange={(event) => resetPage(setMinAmount)(event.target.value)}
                placeholder="0.00"
                className="h-9 rounded-control border border-line-strong bg-surface px-2 text-sm text-ink tabular-nums"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-ink-secondary">
              Maximum amount
              <input
                type="number"
                min="0"
                step="0.01"
                value={maxAmount}
                onChange={(event) => resetPage(setMaxAmount)(event.target.value)}
                placeholder="No limit"
                className="h-9 rounded-control border border-line-strong bg-surface px-2 text-sm text-ink tabular-nums"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-ink-secondary">
              Created from
              <input
                type="date"
                value={from}
                onChange={(event) => resetPage(setFrom)(event.target.value)}
                className="h-9 rounded-control border border-line-strong bg-surface px-2 text-sm text-ink"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-ink-secondary">
              Created to
              <input
                type="date"
                value={to}
                onChange={(event) => resetPage(setTo)(event.target.value)}
                className="h-9 rounded-control border border-line-strong bg-surface px-2 text-sm text-ink"
              />
            </label>
          </div>
        )}

        {transactions.error ? (
          <div className="p-4">
            <ErrorState error={transactions.error} onRetry={() => void transactions.refetch()} />
          </div>
        ) : transactions.isPending ? (
          <div className="p-4">
            <LoadingPanel rows={8} />
          </div>
        ) : items.length === 0 ? (
          <div className="p-4">
            <EmptyState
              title="No transactions match these filters"
              description="Adjust the filters, or create a new simulated transaction."
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setSearch('');
                    setStatus('all');
                    setType('all');
                    setMinAmount('');
                    setMaxAmount('');
                    setFrom('');
                    setTo('');
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
              <Table caption="Simulated transactions">
                <THead>
                  <TR>
                    <SortableTH
                      label="Reference"
                      sortKey="reference"
                      sort={sort}
                      onSort={setSort}
                    />
                    <TH>Type</TH>
                    <TH>Accounts</TH>
                    <SortableTH
                      label="Amount"
                      sortKey="amount"
                      sort={sort}
                      onSort={setSort}
                      numeric
                    />
                    <SortableTH label="Status" sortKey="status" sort={sort} onSort={setSort} />
                    <SortableTH
                      label="Created"
                      sortKey="createdAt"
                      sort={sort}
                      onSort={setSort}
                    />
                  </TR>
                </THead>
                <TBody>
                  {items.map((transaction) => (
                    <TR
                      key={transaction.id}
                      onClick={() => navigate(`/transactions/${transaction.id}`)}
                    >
                      <TD mono>
                        <span title={transaction.reference}>{transaction.reference}</span>
                        {transaction.scenarioName && (
                          <span className="mt-0.5 block text-[0.6875rem] text-ink-secondary">
                            via {transaction.scenarioName}
                          </span>
                        )}
                      </TD>
                      <TD>{transactionTypeMeta[transaction.type].label}</TD>
                      <TD className="text-ink-secondary">
                        {transaction.sourceLabel ?? 'External'}
                        {transaction.destinationLabel && (
                          <>
                            {' → '}
                            {transaction.destinationLabel}
                          </>
                        )}
                      </TD>
                      <TD numeric>{formatMoney(transaction.amount)}</TD>
                      <TD>
                        <StatusBadge meta={transactionStatusMeta[transaction.status]} size="sm" />
                      </TD>
                      <TD
                        className="whitespace-nowrap text-ink-secondary"
                        title={formatDateTime(transaction.createdAt)}
                      >
                        {formatRelativeTime(transaction.createdAt)}
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </TableScroll>
            {transactions.data && (
              <Pagination
                page={transactions.data.page}
                pageSize={transactions.data.pageSize}
                total={transactions.data.total}
                onPageChange={setPage}
              />
            )}
          </>
        )}
      </Panel>

      <OperationDialog
        open={operation !== null}
        kind={operation ?? 'deposit'}
        onClose={() => {
          setOperation(null);
          if (searchParams.has('operation')) {
            searchParams.delete('operation');
            setSearchParams(searchParams, { replace: true });
          }
        }}
      />
    </>
  );
}
