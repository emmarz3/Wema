import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, UserPlus } from 'lucide-react';
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
import { CustomerForm } from '../components/forms/CustomerForm';
import { useToast } from '../state/toast';
import { useAuth } from '../state/auth';
import { useCustomers } from '../hooks/useCustomers';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { customerStatusMeta } from '../lib/status';
import { formatDate, formatRelativeTime } from '../lib/format';
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
import type {
  Customer,
  CustomerQuery,
  CustomerStatus,
} from '../types/domain';

const PAGE_SIZE = 10;

/**
 * Customers workspace: search, filter, sort and paginate the simulated
 * customer population, and create new simulated customers.
 */
export function CustomersPage() {
  const navigate = useNavigate();
  const { can } = useAuth();
  const { show } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<CustomerStatus | 'all'>('all');
  const [sort, setSort] = useState<SortState<'name' | 'createdAt' | 'accountCount'>>({
    key: 'name',
    direction: 'asc',
  });
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);

  const query: CustomerQuery = {
    search,
    status,
    sort: sort.key,
    direction: sort.direction,
    page,
    pageSize: PAGE_SIZE,
  };
  const customers = useCustomers(query);

  function resetToFirstPage<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value);
      setPage(1);
    };
  }

  async function handleCreate(values: Parameters<typeof api.createCustomer>[0]) {
    const created: Customer = await api.createCustomer(values);
    await queryClient.invalidateQueries({ queryKey: ['customers'] });
    setCreateOpen(false);
    show({
      tone: 'success',
      title: 'Simulated customer created',
      description: `${created.name} (${created.code}) has been added to the simulation.`,
    });
  }

  const items = customers.data?.items ?? [];

  return (
    <>
      <PageHeader
        title="Customers"
        sectionId="customers"
        description="Simulated test customers and their linked accounts. All records are fictional demonstration data."
        actions={
          <>
            <SimulatedNotice />
            <Button
              onClick={() => setCreateOpen(true)}
              disabled={!can('manage_customers')}
              title={
                can('manage_customers')
                  ? undefined
                  : 'Your role cannot create customers.'
              }
              icon={<Plus aria-hidden className="size-4" />}
            >
              New customer
            </Button>
          </>
        }
      />

      <Panel bodyClassName="p-0">
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-3">
          <SearchInput
            label="Search customers"
            placeholder="Search by name, email or customer code"
            value={search}
            onValueChange={resetToFirstPage(setSearch)}
            className="w-full sm:w-80"
          />
          <label className="flex items-center gap-2 text-xs text-ink-secondary">
            Status
            <Select
              value={status}
              onChange={(event) =>
                resetToFirstPage(setStatus)(event.target.value as CustomerStatus | 'all')
              }
              className="h-9 w-36 py-0 text-xs"
              aria-label="Filter by status"
            >
              <option value="all">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
            </Select>
          </label>
          <span className="ml-auto text-xs text-ink-secondary" data-numeric="true">
            {customers.data ? `${customers.data.total} customers` : 'Loading…'}
          </span>
        </div>

        {customers.error ? (
          <div className="p-4">
            <ErrorState error={customers.error} onRetry={() => void customers.refetch()} />
          </div>
        ) : customers.isPending ? (
          <div className="p-4">
            <LoadingPanel rows={6} />
          </div>
        ) : items.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={<UserPlus aria-hidden className="size-5" />}
              title="No customers match these filters"
              description="Adjust the search or status filter, or create a new simulated customer."
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setSearch('');
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
              <Table caption="Simulated customers">
                <THead>
                  <TR>
                    <SortableTH
                      label="Customer"
                      sortKey="name"
                      sort={sort}
                      onSort={setSort}
                    />
                    <TH>Contact</TH>
                    <SortableTH
                      label="Accounts"
                      sortKey="accountCount"
                      sort={sort}
                      onSort={setSort}
                      numeric
                    />
                    <TH>Status</TH>
                    <SortableTH
                      label="Created"
                      sortKey="createdAt"
                      sort={sort}
                      onSort={setSort}
                    />
                  </TR>
                </THead>
                <TBody>
                  {items.map((customer) => (
                    <TR
                      key={customer.id}
                      onClick={() => navigate(`/customers/${customer.id}`)}
                    >
                      <TD>
                        <span className="font-medium text-ink">{customer.name}</span>
                        <span className="mt-0.5 block font-technical text-ink-secondary">
                          {customer.code}
                        </span>
                      </TD>
                      <TD>
                        <span className="block text-ink-secondary">{customer.email}</span>
                        <span className="block text-ink-secondary">{customer.phone}</span>
                      </TD>
                      <TD numeric>{customer.accountCount}</TD>
                      <TD>
                        <StatusBadge meta={customerStatusMeta[customer.status]} size="sm" />
                      </TD>
                      <TD
                        className="whitespace-nowrap text-ink-secondary"
                        title={formatDate(customer.createdAt)}
                      >
                        {formatRelativeTime(customer.createdAt)}
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>
            {customers.data && (
              <Pagination
                page={customers.data.page}
                pageSize={customers.data.pageSize}
                total={customers.data.total}
                onPageChange={setPage}
                onPageSizeChange={() => setPage(1)}
              />
            )}
          </>
        )}
      </Panel>

      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create simulated customer"
        description="Adds a fictional customer to the simulation. No real personal data is used."
      >
        <CustomerForm
          mode="create"
          onSubmit={handleCreate}
          onCancel={() => setCreateOpen(false)}
        />
      </Dialog>
    </>
  );
}
