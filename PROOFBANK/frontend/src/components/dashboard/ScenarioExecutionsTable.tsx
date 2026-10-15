import { Panel } from '../ui/Panel';
import { Badge } from '../ui/Badge';
import { EmptyState, ErrorState } from '../ui/States';
import { LoadingPanel } from '../ui/Loading';
import { Table, TBody, TD, TH, THead, TR, TableScroll } from '../ui/Table';
import { formatRelativeTime } from '../../lib/format';
import type { ScenarioExecution } from '../../types/domain';

const executionStatusMeta: Record<
  ScenarioExecution['status'],
  { label: string; tone: 'success' | 'danger' | 'info'; Icon: 'check' | 'x' | 'loader' }
> = {
  SUCCEEDED: { label: 'Succeeded', tone: 'success', Icon: 'check' },
  FAILED: { label: 'Failed', tone: 'danger', Icon: 'x' },
  RUNNING: { label: 'Running', tone: 'info', Icon: 'loader' },
};

function duration(execution: ScenarioExecution): string {
  if (execution.durationMs === null) return '—';
  if (execution.durationMs < 1000) return `${execution.durationMs} ms`;
  return `${(execution.durationMs / 1000).toFixed(1)} s`;
}

/** Recent scenario executions with their generated record counts. */
export function ScenarioExecutionsTable({
  executions,
  loading,
  error,
  onRetry,
}: {
  executions?: ScenarioExecution[];
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
}) {
  return (
    <Panel
      title="Recent scenario executions"
      description="Scenario runs reported by the simulation."
      bodyClassName="p-0"
    >
      {error ? (
        <div className="p-4">
          <ErrorState error={error} onRetry={onRetry} />
        </div>
      ) : loading ? (
        <div className="p-4">
          <LoadingPanel rows={4} />
        </div>
      ) : !executions || executions.length === 0 ? (
        <div className="p-4">
          <EmptyState
            title="No scenario executions"
            description="Scenario runs appear here once a scenario is started."
          />
        </div>
      ) : (
        <TableScroll>
          <Table caption="Recent scenario executions">
            <THead>
              <TR>
                <TH>Scenario</TH>
                <TH>Status</TH>
                <TH>Duration</TH>
                <TH numeric>Records</TH>
                <TH>Started</TH>
              </TR>
            </THead>
            <TBody>
              {executions.map((execution) => {
                const meta = executionStatusMeta[execution.status];
                return (
                  <TR key={execution.id}>
                    <TD>
                      <span className="text-ink">{execution.scenarioName}</span>
                      <span className="mt-0.5 block">
                        <Badge tone={execution.scenarioKind === 'financial' ? 'brand' : 'info'}>
                          {execution.scenarioKind === 'financial' ? 'Financial' : 'Infrastructure'}
                        </Badge>
                      </span>
                    </TD>
                    <TD>
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                    </TD>
                    <TD className="tabular-nums">{duration(execution)}</TD>
                    <TD numeric>
                      {execution.transactionsGenerated.toLocaleString('en-NG')}
                    </TD>
                    <TD className="whitespace-nowrap text-ink-secondary">
                      {formatRelativeTime(execution.startedAt)}
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        </TableScroll>
      )}
    </Panel>
  );
}

/** Compact execution status pill used on the scenario screens later. */
export function ExecutionStatusPill({ status }: { status: ScenarioExecution['status'] }) {
  const meta = executionStatusMeta[status];
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}
