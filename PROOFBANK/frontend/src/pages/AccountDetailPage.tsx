import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, ShieldAlert } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { SimulatedNotice } from '../components/layout/Environment';
import { Panel, Stat } from '../components/ui/Panel';
import { Button, buttonClass } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/Badge';
import { EmptyState, ErrorState } from '../components/ui/States';
import { LoadingPanel } from '../components/ui/Loading';
import { StatusChangeDialog } from '../components/forms/StatusChangeDialog';
import { useToast } from '../state/toast';
import { useAuth } from '../state/auth';
import { useAccountDetail } from '../hooks/useCustomers';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { accountStatusMeta, transactionStatusMeta, transactionTypeMeta } from '../lib/status';
import { formatDate, formatDateTime, formatMoney, formatRelativeTime } from '../lib/format';
import { Table, TBody, TD, TH, THead, TR, TableScroll } from '../components/ui/Table';

/** Account detail: balances, status history and recent transactions. */
export function AccountDetailPage() {
  const { accountId = '' } = useParams();
  const { can } = useAuth();
  const { show } = useToast();
  const queryClient = useQueryClient();

  const detail = useAccountDetail(accountId);
  const [statusOpen, setStatusOpen] = useState(false);

  async function handleStatusChange(
    status: 'ACTIVE' | 'DORMANT' | 'FROZEN',
    reason: string,
  ) {
    const updated = await api.setAccountStatus(accountId, { status, reason });
    await queryClient.invalidateQueries({ queryKey: ['accounts'] });
    show({
      tone: status === 'ACTIVE' ? 'success' : 'warning',
      title: `Account ${accountStatusMeta[status].label.toLowerCase()}`,
      description: `Account ${updated.number} is now ${accountStatusMeta[status].label.toLowerCase()}.`,
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
          error={detail.error ?? new Error('Account not found.')}
          onRetry={() => void detail.refetch()}
        />
        <div className="mt-3">
          <Link to="/accounts" className={buttonClass('secondary', 'sm')}>
            Back to accounts
          </Link>
        </div>
      </Panel>
    );
  }

  const { account, recentTransactions, statusHistory, ledgerEntryCount } = detail.data;
  const holds = Math.max(0, account.ledgerBalance.amountMinor - account.availableBalance.amountMinor);

  return (
    <>
      <PageHeader
        title={`Account ${account.number}`}
        sectionId="accounts"
        description={`${account.customerName} · ${account.type === 'SAVINGS' ? 'Savings' : 'Current'} · ${account.currency}`}
        actions={
          <>
            <SimulatedNotice />
            <Button
              variant="secondary"
              onClick={() => setStatusOpen(true)}
              disabled={!can('manage_accounts')}
              icon={<ShieldAlert aria-hidden className="size-3.5" />}
            >
              Change status
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Link
          to="/accounts"
          className="inline-flex items-center gap-1.5 text-xs text-ink-secondary hover:text-ink"
        >
          <ArrowLeft aria-hidden className="size-3.5" />
          All accounts
        </Link>
        <Link
          to={`/customers/${account.customerId}`}
          className="text-xs text-ink-secondary hover:text-ink"
        >
          View customer
        </Link>
      </div>

      <div className="flex flex-col gap-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat
            label="Available balance"
            value={formatMoney(account.availableBalance)}
            hint="Can be operated now"
          />
          <Stat
            label="Ledger balance"
            value={formatMoney(account.ledgerBalance)}
            hint="Includes pending holds"
          />
          <Stat
            label="Held by pending"
            value={formatMoney({
              amountMinor: holds,
              currency: account.currency,
            })}
            hint="Reserved by unsettled transactions"
          />
          <Stat
            label="Ledger entries"
            value={ledgerEntryCount.toLocaleString('en-NG')}
            hint="Journal entries posted for this account"
            icon={<BookOpen aria-hidden className="size-4" />}
          />
        </div>

        <Panel title="Account details">
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Detail label="Account number" value={account.number} mono />
            <Detail
              label="Customer"
              value={
                <Link
                  to={`/customers/${account.customerId}`}
                  className="text-brand hover:underline"
                >
                  {account.customerName}
                </Link>
              }
            />
            <Detail
              label="Status"
              value={<StatusBadge meta={accountStatusMeta[account.status]} size="sm" />}
            />
            <Detail
              label="Type"
              value={account.type === 'SAVINGS' ? 'Savings' : 'Current'}
            />
            <Detail label="Currency" value={account.currency} />
            <Detail label="Opened" value={formatDate(account.createdAt)} />
          </dl>
          <p className="mt-4 text-xs leading-relaxed text-ink-secondary">
            The ledger explorer, which shows the individual journal entries behind
            these totals, is delivered with the Ledger section. Nothing on this
            screen edits history: reversals create compensating entries.
          </p>
        </Panel>

        <Panel title="Status history" description="Every status change recorded for this account.">
          {statusHistory.length === 0 ? (
            <EmptyState title="No status changes recorded" />
          ) : (
            <ol className="flex flex-col gap-3">
              {statusHistory.map((change, index) => (
                <li key={`${change.at}-${index}`} className="flex items-start gap-3">
                  <StatusBadge meta={accountStatusMeta[change.status]} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-ink">{change.note ?? 'Status changed.'}</p>
                    <p className="mt-0.5 text-xs text-ink-secondary">
                      {formatDateTime(change.at)} · {change.actor}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Panel>

        <Panel title="Recent transactions" bodyClassName="p-0">
          {recentTransactions.length === 0 ? (
            <div className="p-4">
              <EmptyState
                title="No transactions yet"
                description="Transactions involving this account will appear here."
              />
            </div>
          ) : (
            <TableScroll>
              <Table caption="Recent transactions for this account">
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
          )}
        </Panel>
      </div>

      <StatusChangeDialog
        open={statusOpen}
        onClose={() => setStatusOpen(false)}
        title="Change account status"
        description="Update the operational status of this simulated account."
        impact="Changing status affects which operations the simulation will accept against this account. Balances and history are never modified."
        options={[
          { value: 'ACTIVE', label: 'Active', hint: 'Normal operation' },
          { value: 'DORMANT', label: 'Dormant', hint: 'Preserved but inactive' },
          { value: 'FROZEN', label: 'Frozen', hint: 'Operations blocked' },
        ]}
        confirmLabel="Change status"
        destructive
        onConfirm={handleStatusChange}
      />
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
      <dd className={`mt-1 text-sm text-ink ${mono ? 'font-technical' : ''}`}>{value}</dd>
    </div>
  );
}
