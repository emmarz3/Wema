import { Panel } from '../ui/Panel';
import { EmptyState, ErrorState } from '../ui/States';
import { LoadingPanel } from '../ui/Loading';
import { StatusBadge } from '../ui/Badge';
import { transactionStatusMeta, transactionTypeMeta } from '../../lib/status';
import { formatMoney, formatRelativeTime } from '../../lib/format';
import { Table, TBody, TD, TH, THead, TR, TableScroll } from '../ui/Table';
import type { Transaction } from '../../types/domain';

/** Recent transactions, exactly as reported by the data source. */
export function RecentTransactionsTable({
  transactions,
  loading,
  error,
  onRetry,
}: {
  transactions?: Transaction[];
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
}) {
  return (
    <Panel
      title="Recent transactions"
      description="The newest records in the simulated environment."
      className="xl:col-span-2"
      bodyClassName="p-0"
    >
      {error ? (
        <div className="p-4">
          <ErrorState error={error} onRetry={onRetry} />
        </div>
      ) : loading ? (
        <div className="p-4">
          <LoadingPanel rows={5} />
        </div>
      ) : !transactions || transactions.length === 0 ? (
        <div className="p-4">
          <EmptyState
            title="No transactions yet"
            description="Transactions appear here as soon as the simulation records them."
          />
        </div>
      ) : (
        <TableScroll>
          <Table caption="Most recent simulated transactions">
            <THead>
              <TR>
                <TH>Reference</TH>
                <TH>Type</TH>
                <TH>Amount</TH>
                <TH>Status</TH>
                <TH>Created</TH>
              </TR>
            </THead>
            <TBody>
              {transactions.map((transaction) => (
                <TR key={transaction.id}>
                  <TD mono>
                    <span title={transaction.reference}>{transaction.reference}</span>
                    {transaction.scenarioName && (
                      <span className="mt-0.5 block text-[0.6875rem] text-ink-secondary">
                        via {transaction.scenarioName}
                      </span>
                    )}
                  </TD>
                  <TD>
                    <span className="text-ink">{transactionTypeMeta[transaction.type].label}</span>
                  </TD>
                  <TD numeric>{formatMoney(transaction.amount)}</TD>
                  <TD>
                    <StatusBadge
                      meta={transactionStatusMeta[transaction.status]}
                      size="sm"
                    />
                  </TD>
                  <TD className="whitespace-nowrap text-ink-secondary">
                    {formatRelativeTime(transaction.createdAt)}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </TableScroll>
      )}
    </Panel>
  );
}
