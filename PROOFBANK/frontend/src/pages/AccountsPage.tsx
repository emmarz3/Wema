import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Wallet } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { SimulatedNotice } from '../components/layout/Environment';
import { Panel } from '../components/ui/Panel';
import { Button } from '../components/ui/Button';
import { SearchInput } from '../components/ui/SearchInput';
import { Pagination } from '../components/ui/Pagination';
import { Select } from '../components/ui/Field';
import { StatusBadge } from '../components/ui/Badge';
import { EmptyState, ErrorState } from '../components/ui/States';
import { LoadingPanel } from '../components/ui/Loading';
import { Dialog } from '../components/ui/Dialog';
import { AccountForm } from '../components/forms/AccountForm';
import { useToast } from '../state/toast';
import { useAuth } from '../state/auth';
import { useAccounts, useCustomers } from '../hooks/useCustomers';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { accountStatusMeta } from '../lib/status';
import { formatMoney, formatRelativeTime } from '../lib/format';
import {
  SortableTH,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
  type SortState,
} from '../components/ui/Table';
import type { AccountQuery, AccountStatus, AccountType } from '../types/domain';

const PAGE_SIZE = 10;

/**
 * Accounts workspace: search, filter, sort and paginate simulated accounts,
 * showing available and ledger balances exactly as the source reports them.
 */
export function AccountsPage() {
  const navigate = useNavigate();
  const { can } = useAuth();
  const { show } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [type, setType] = useState<AccountType | 'all'>('all');
  const [status, setStatus] = useState<AccountStatus | 'all'>('all');
  const [sort, setSort] = useState<
    SortState<'number' | 'createdAt' | 'availableBalance' | 'customerName'>
  >({ key: 'number', direction: 'asc' });
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);

  const query: AccountQuery = {
    search,
    type,
    status,
    sort: sort.key,
    direction: sort.direction,
    page,
    pageSize: PAGE_SIZE,
  };
  const accounts = useAccounts(query);
  const customerOptions = useCustomers({ pageSize: 100 });

  async function handleCreate(values: Parameters<typeof api.createAccount>[0]) {
    const created = await api.createAccount(values);
    await queryClient.invalidateQueries({ queryKey: ['accounts'] });
    await queryClient.invalidateQueries({ queryKey: ['customers'] });
    setCreateOpen(false);
    show({
      tone: 'success',
      title: 'Simulated account created',
      description: `Account ${created.number} opened at ${formatMoney(created.availableBalance)}.`,
    });
  }

  const items = accounts.data?.items ?? [];

  return (
    <>
      <PageHeader
        title="Accounts"
        sectionId="accounts"
        description="Simulated accounts with available and ledger balances reported by the data source."
        actions={
          <>
            <SimulatedNotice />
            <Button
              onClick={() => setCreateOpen(true)}
              disabled={!can('manage_accounts')}
              title={
                can('manage_accounts')
                  ? undefined
                  : 'Your role cannot create accounts.'
              }
              icon={<Plus aria-hidden className="size-4" />}
            >
              New account
            </Button>
          </>
        }
      />

      <Panel bodyClassName="p-0">
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-3">
          <SearchInput
            label="Search accounts"
            placeholder="Search by account number or customer"
            value={search}
            onValueChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            className="w-full sm:w-80"
          />
          <label className="flex items-center gap-2 text-xs text-ink-secondary">
            Type
            <Select
              value={type}
              onChange={(event) => {
                setType(event.target.value as AccountType | 'all');
                setPage(1);
              }}
              className="h-9 w-32 py-0 text-xs"
              aria-label="Filter by account type"
            >
              <option value="all">All types</option>
              <option value="SAVINGS">Savings</option>
              <option value="CURRENT">Current</option>
            </Select>
          </label>
          <label className="flex items-center gap-2 text-xs text-ink-secondary">
            Status
            <Select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as AccountStatus | 'all');
                setPage(1);
              }}
              className="h-9 w-32 py-0 text-xs"
              aria-label="Filter by account status"
            >
              <option value="all">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="DORMANT">Dormant</option>
              <option value="FROZEN">Frozen</option>
            </Select>
          </label>
          <span className="ml-auto text-xs text-ink-secondary" data-numeric="true">
            {accounts.data ? `${accounts.data.total} accounts` : 'Loading…'}
          </span>
        </div>

        {accounts.error ? (
          <div className="p-4">
            <ErrorState error={accounts.error} onRetry={() => void accounts.refetch()} />
          </div>
        ) : accounts.isPending ? (
          <div className="p-4">
            <LoadingPanel rows={6} />
          </div>
        ) : items.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={<Wallet aria-hidden className="size-5" />}
              title="No accounts match these filters"
              description="Adjust the search or filters, or create a new simulated account."
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setSearch('');
                    setType('all');
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
            <div className="-mx-px overflow-x-auto">
              <Table caption="Simulated accounts">
                <THead>
                  <TR>
                    <SortableTH label="Account" sortKey="number" sort={sort} onSort={setSort} />
                    <SortableTH
                      label="Customer"
                      sortKey="customerName"
                      sort={sort}
                      onSort={setSort}
                    />
                    <TH>Type</TH>
                    <TH>Status</TH>
                    <SortableTH
                      label="Available"
                      sortKey="availableBalance"
                      sort={sort}
                      onSort={setSort}
                      numeric
                    />
                    <TH numeric>Ledger</TH>
                    <SortableTH
                      label="Opened"
                      sortKey="createdAt"
                      sort={sort}
                      onSort={setSort}
                    />
                  </TR>
                </THead>
                <TBody>
                  {items.map((account) => (
                    <TR
                      key={account.id}
                      onClick={() => navigate(`/accounts/${account.id}`)}
                    >
                      <TD mono>{account.number}</TD>
                      <TD>{account.customerName}</TD>
                      <TD>{account.type === 'SAVINGS' ? 'Savings' : 'Current'}</TD>
                      <TD>
                        <StatusBadge meta={accountStatusMeta[account.status]} size="sm" />
                      </TD>
                      <TD numeric>{formatMoney(account.availableBalance)}</TD>
                      <TD numeric className="text-ink-secondary">
                        {formatMoney(account.ledgerBalance)}
                      </TD>
                      <TD
                        className="whitespace-nowrap text-ink-secondary"
                        title={formatRelativeTime(account.createdAt)}
                      >
                        {formatRelativeTime(account.createdAt)}
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>
            {accounts.data && (
              <Pagination
                page={accounts.data.page}
                pageSize={accounts.data.pageSize}
                total={accounts.data.total}
                onPageChange={setPage}
                onPageSizeChange={() => setPage(1)}
              />
            )}
          </>
        )}
      </Panel>

      <p className="mt-3 text-xs leading-relaxed text-ink-secondary">
        <strong className="font-medium text-ink">Available</strong> is the balance
        that can be operated now; <strong className="font-medium text-ink">Ledger</strong>{' '}
        includes amounts held by pending transactions. Both are reported by the
        data source — the interface never calculates them.
      </p>

      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create simulated account"
        description="Opens a new account for an existing simulated customer, starting at a zero balance."
      >
        <AccountForm
          customers={(customerOptions.data?.items ?? []).map((customer) => ({
            id: customer.id,
            label: `${customer.name} (${customer.code})`,
          }))}
          onSubmit={handleCreate}
          onCancel={() => setCreateOpen(false)}
        />
      </Dialog>
    </>
  );
}
