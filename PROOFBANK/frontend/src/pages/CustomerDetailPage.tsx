import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil, Radio, ShieldAlert, Wallet } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { SimulatedNotice } from '../components/layout/Environment';
import { Panel, Stat } from '../components/ui/Panel';
import { Button, buttonClass } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/Badge';
import { EmptyState, ErrorState } from '../components/ui/States';
import { LoadingPanel } from '../components/ui/Loading';
import { Dialog } from '../components/ui/Dialog';
import { CustomerForm } from '../components/forms/CustomerForm';
import { StatusChangeDialog } from '../components/forms/StatusChangeDialog';
import { useToast } from '../state/toast';
import { useAuth } from '../state/auth';
import { useCustomerDetail } from '../hooks/useCustomers';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { customerStatusMeta, eventTypeLabels } from '../lib/status';
import { formatDate, formatDateTime, formatMoney, formatRelativeTime } from '../lib/format';
import { accountStatusMeta, transactionStatusMeta, transactionTypeMeta } from '../lib/status';
import { Table, TBody, TD, TH, THead, TR, TableScroll } from '../components/ui/Table';

/** Customer detail: profile, linked accounts, recent activity and events. */
export function CustomerDetailPage() {
  const { customerId = '' } = useParams();
  const navigate = useNavigate();
  const { can } = useAuth();
  const { show } = useToast();
  const queryClient = useQueryClient();

  const detail = useCustomerDetail(customerId);
  const [editOpen, setEditOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);

  async function handleUpdate(values: Parameters<typeof api.updateCustomer>[1]) {
    const updated = await api.updateCustomer(customerId, values);
    await queryClient.invalidateQueries({ queryKey: ['customers'] });
    setEditOpen(false);
    show({
      tone: 'success',
      title: 'Customer updated',
      description: `${updated.name} (${updated.code}) has been updated.`,
    });
  }

  async function handleStatusChange(
    status: 'ACTIVE' | 'SUSPENDED',
    reason: string,
  ) {
    const result = await api.setCustomerStatus(customerId, { status, reason });
    await queryClient.invalidateQueries({ queryKey: ['customers'] });
    show({
      tone: status === 'SUSPENDED' ? 'warning' : 'success',
      title:
        status === 'SUSPENDED'
          ? 'Customer suspended'
          : 'Customer reactivated',
      description:
        status === 'SUSPENDED'
          ? `${result.customer.name} is suspended and ${result.accountsFrozen} linked account(s) have been frozen.`
          : `${result.customer.name} is active again and linked accounts are restored.`,
    });
  }

  if (detail.isPending) {
    return (
      <Panel>
        <LoadingPanel rows={6} />
      </Panel>
    );
  }

  if (detail.error || !detail.data) {
    return (
      <Panel>
        <ErrorState
          error={detail.error ?? new Error('Customer not found.')}
          onRetry={() => void detail.refetch()}
        />
        <div className="mt-3">
          <Link to="/customers" className={buttonClass('secondary', 'sm')}>
            Back to customers
          </Link>
        </div>
      </Panel>
    );
  }

  const { customer, accounts, recentTransactions, events } = detail.data;
  const suspended = customer.status === 'SUSPENDED';

  return (
    <>
      <PageHeader
        title={customer.name}
        sectionId="customers"
        crumbs={[{ label: customer.code }]}
        description={`${customer.email} · ${customer.phone}`}
        actions={
          <>
            <SimulatedNotice />
            <Button
              variant="secondary"
              onClick={() => setEditOpen(true)}
              disabled={!can('manage_customers')}
              icon={<Pencil aria-hidden className="size-3.5" />}
            >
              Edit
            </Button>
            <Button
              variant={suspended ? 'primary' : 'danger'}
              onClick={() => setStatusOpen(true)}
              disabled={!can('manage_customers')}
              icon={<ShieldAlert aria-hidden className="size-3.5" />}
            >
              {suspended ? 'Reactivate' : 'Suspend'}
            </Button>
          </>
        }
      />

      <div className="mb-4">
        <Link
          to="/customers"
          className="inline-flex items-center gap-1.5 text-xs text-ink-secondary hover:text-ink"
        >
          <ArrowLeft aria-hidden className="size-3.5" />
          All customers
        </Link>
      </div>

      <div className="flex flex-col gap-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat
            label="Customer code"
            value={customer.code}
            hint={`Created ${formatDate(customer.createdAt)}`}
          />
          <Stat
            label="Status"
            value={customerStatusMeta[customer.status].label}
            hint={
              suspended
                ? 'Linked accounts are frozen while suspended'
                : 'Can operate normally'
            }
          />
          <Stat
            label="Accounts"
            value={accounts.length}
            hint={`${accounts.filter((account) => account.status === 'ACTIVE').length} active`}
            icon={<Wallet aria-hidden className="size-4" />}
          />
          <Stat
            label="Available funds"
            value={formatMoney({
              amountMinor: accounts.reduce(
                (sum, account) => sum + account.availableBalance.amountMinor,
                0,
              ),
              currency: accounts[0]?.currency ?? 'NGN',
            })}
            hint="Across all linked accounts"
          />
        </div>

        <Panel
          title="Linked accounts"
          description="Accounts owned by this simulated customer."
          bodyClassName="p-0"
        >
          {accounts.length === 0 ? (
            <div className="p-4">
              <EmptyState
                title="No accounts yet"
                description="Create an account from the Accounts workspace to link one to this customer."
              />
            </div>
          ) : (
            <TableScroll>
              <Table caption="Accounts linked to this customer">
                <THead>
                  <TR>
                    <TH>Account</TH>
                    <TH>Type</TH>
                    <TH>Status</TH>
                    <TH numeric>Available</TH>
                    <TH numeric>Ledger</TH>
                    <TH>Opened</TH>
                  </TR>
                </THead>
                <TBody>
                  {accounts.map((account) => (
                    <TR
                      key={account.id}
                      onClick={() => navigate(`/accounts/${account.id}`)}
                    >
                      <TD mono>{account.number}</TD>
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
                        title={formatDate(account.createdAt)}
                      >
                        {formatRelativeTime(account.createdAt)}
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </TableScroll>
          )}
        </Panel>

        <Panel title="Recent transactions" bodyClassName="p-0">
          {recentTransactions.length === 0 ? (
            <div className="p-4">
              <EmptyState
                title="No transactions yet"
                description="Transactions involving this customer's accounts will appear here."
              />
            </div>
          ) : (
            <TableScroll>
              <Table caption="Recent transactions for this customer">
                <THead>
                  <TR>
                    <TH>Reference</TH>
                    <TH>Type</TH>
                    <TH numeric>Amount</TH>
                    <TH>Status</TH>
                    <TH>Created</TH>
                  </TR>
                </THead>
                <TBody>
                  {recentTransactions.map((transaction) => (
                    <TR key={transaction.id}>
                      <TD mono>{transaction.reference}</TD>
                      <TD>{transactionTypeMeta[transaction.type].label}</TD>
                      <TD numeric>{formatMoney(transaction.amount)}</TD>
                      <TD>
                        <StatusBadge
                          meta={transactionStatusMeta[transaction.status]}
                          size="sm"
                        />
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
          )}
        </Panel>

        <Panel
          title="Event history"
          description="Simulation events involving this customer's transactions."
        >
          {events.length === 0 ? (
            <EmptyState
              icon={<Radio aria-hidden className="size-5" />}
              title="No events yet"
              description="Events are emitted as this customer's transactions progress."
            />
          ) : (
            <ol className="flex flex-col divide-y divide-line">
              {events.map((event) => (
                <li key={event.id} className="flex gap-3 py-2.5">
                  <span aria-hidden className="mt-1.5 size-2 shrink-0 rounded-full bg-brand" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-ink">{eventTypeLabels[event.type]}</p>
                    <p className="mt-0.5 text-xs text-ink-secondary">{event.summary}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-2 text-[0.6875rem] text-ink-secondary">
                      <span>{formatRelativeTime(event.occurredAt)}</span>
                      {event.transactionReference && (
                        <span className="font-technical">{event.transactionReference}</span>
                      )}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Panel>
      </div>

      <Dialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit customer"
        description="Update the simulated customer's details."
      >
        <CustomerForm
          mode="edit"
          customer={customer}
          onSubmit={handleUpdate}
          onCancel={() => setEditOpen(false)}
        />
      </Dialog>

      <StatusChangeDialog
        open={statusOpen}
        onClose={() => setStatusOpen(false)}
        title={suspended ? 'Reactivate customer' : 'Suspend customer'}
        description={
          suspended
            ? 'Restores the customer to normal operation.'
            : 'Prevents operations on the customer and their accounts.'
        }
        impact={
          suspended
            ? 'Linked accounts return to active status. Balances are unchanged.'
            : 'This will freeze every linked account. Balances are preserved, but no new transactions can be created against them.'
        }
        options={
          suspended
            ? [{ value: 'ACTIVE' as const, label: 'Active', hint: 'Normal operation' }]
            : [{ value: 'SUSPENDED' as const, label: 'Suspended', hint: 'Blocks all operations' }]
        }
        confirmLabel={suspended ? 'Reactivate customer' : 'Suspend customer'}
        destructive={!suspended}
        onConfirm={handleStatusChange}
      />
    </>
  );
}
