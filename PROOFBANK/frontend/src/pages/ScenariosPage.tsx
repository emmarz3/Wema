import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  FlaskConical,
  History,
  Loader2,
  Play,
  Radio,
  ServerCog,
  XCircle,
} from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { SimulatedNotice } from '../components/layout/Environment';
import { Panel } from '../components/ui/Panel';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Field, Input, Select } from '../components/ui/Field';
import { EmptyState, ErrorState } from '../components/ui/States';
import { LoadingPanel } from '../components/ui/Loading';
import { Dialog } from '../components/ui/Dialog';
import { useAuth } from '../state/auth';
import { useToast } from '../state/toast';
import {
  useScenarioCatalogue,
  useScenarioHistory,
  useScenarioRun,
} from '../hooks/useScenarios';
import { api } from '../api';
import { ApiError } from '../api/errors';
import { useQueryClient } from '@tanstack/react-query';
import { useAccounts } from '../hooks/useCustomers';
import { useNow } from '../hooks/useSimulationStatus';
import { formatDateTime, formatMoney, formatRelativeTime } from '../lib/format';
import type {
  ScenarioDefinition,
  ScenarioExecutionRecord,
  ScenarioStep,
} from '../types/domain';

const stepIcons = {
  PENDING: ChevronRight,
  RUNNING: Loader2,
  SUCCESS: CheckCircle2,
  FAILED: XCircle,
  SKIPPED: ChevronRight,
} as const;

const stepTone = {
  PENDING: 'text-ink-secondary',
  RUNNING: 'text-info',
  SUCCESS: 'text-success',
  FAILED: 'text-danger',
  SKIPPED: 'text-ink-secondary',
} as const;

/** Scenario library, execution workflow and run history. */
export function ScenariosPage() {
  const { can } = useAuth();
  const { show } = useToast();
  const queryClient = useQueryClient();
  const now = useNow(5_000);

  const catalogue = useScenarioCatalogue();
  const history = useScenarioHistory();

  const [selected, setSelected] = useState<ScenarioDefinition | null>(null);
  const [openRunId, setOpenRunId] = useState<string | null>(null);

  const financial = (catalogue.data ?? []).filter(
    (scenario) => scenario.kind === 'financial',
  );
  const infrastructure = (catalogue.data ?? []).filter(
    (scenario) => scenario.kind === 'infrastructure',
  );

  const running = (history.data ?? []).filter((record) => record.status === 'RUNNING');
  const completed = (history.data ?? []).filter((record) => record.status !== 'RUNNING');

  async function startRun(
    definition: ScenarioDefinition,
    parameters: Record<string, string>,
  ): Promise<void> {
    try {
      const run = await api.executeScenario(definition.name, parameters);
      await queryClient.invalidateQueries({ queryKey: ['scenarios'] });
      setOpenRunId(run.id);
      show({
        tone: 'info',
        title: 'Scenario started',
        description: `"${definition.name}" is running. Progress is reported by the simulation.`,
      });
    } catch (error) {
      show({
        tone: 'danger',
        title: 'Scenario could not start',
        description:
          error instanceof ApiError ? `${error.message} ${error.userGuidance}` : 'Unknown error.',
      });
    }
  }

  return (
    <>
      <PageHeader
        title="Scenarios"
        sectionId="scenarios"
        description="Scenario library and execution workflow for testing the interaction between ProofBank and ProofOps."
        actions={<SimulatedNotice />}
        notice={
          <div className="flex flex-wrap items-center gap-2 rounded-control border border-line bg-surface px-3 py-2 text-xs text-ink-secondary">
            <FlaskConical aria-hidden className="size-3.5 text-brand" />
            Each run is progressed by the data source: steps, generated records
            and the result are read from it, never assumed.
          </div>
        }
      />

      <div className="flex flex-col gap-5">
        {running.length > 0 && (
          <Panel
            title="Running now"
            description="Scenario runs the simulation is still progressing."
          >
            <ul className="flex flex-col gap-2">
              {running.map((record) => (
                <li
                  key={record.id}
                  className="flex flex-wrap items-center gap-2 rounded-control border border-info-line bg-info-soft px-3 py-2.5"
                >
                  <Loader2 aria-hidden className="size-4 animate-spin text-info" />
                  <span className="text-sm font-medium text-ink">
                    {record.scenarioName}
                  </span>
                  <span className="text-xs text-ink-secondary">
                    started {formatRelativeTime(record.startedAt, now)}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto"
                    onClick={() => setOpenRunId(record.id)}
                    disabled={!record.id.startsWith('run_')}
                    title={
                      record.id.startsWith('run_')
                        ? undefined
                        : 'This run was recorded before step-level detail was available.'
                    }
                  >
                    View progress
                  </Button>
                </li>
              ))}
            </ul>
          </Panel>
        )}

        {/* Catalogue ---------------------------------------------------- */}
        {catalogue.error ? (
          <ErrorState error={catalogue.error} onRetry={() => void catalogue.refetch()} />
        ) : catalogue.isPending ? (
          <Panel>
            <LoadingPanel rows={6} />
          </Panel>
        ) : (
          <div className="grid gap-5 xl:grid-cols-2">
            <ScenarioGroup
              title="Financial scenarios"
              icon={<FlaskConical aria-hidden className="size-4 text-brand" />}
              scenarios={financial}
              canRun={can('run_scenarios')}
              onSelect={setSelected}
            />
            <ScenarioGroup
              title="Infrastructure scenarios"
              icon={<ServerCog aria-hidden className="size-4 text-info" />}
              scenarios={infrastructure}
              canRun={can('run_scenarios')}
              onSelect={setSelected}
            />
          </div>
        )}

        {/* History ------------------------------------------------------ */}
        <Panel
          title="Execution history"
          description="Every recorded run, newest first."
          bodyClassName="p-0"
        >
          {history.error ? (
            <div className="p-4">
              <ErrorState error={history.error} onRetry={() => void history.refetch()} />
            </div>
          ) : history.isPending ? (
            <div className="p-4">
              <LoadingPanel rows={5} />
            </div>
          ) : completed.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={<History aria-hidden className="size-5" />}
                title="No completed runs yet"
                description="Run a scenario from the library to see its result here."
              />
            </div>
          ) : (
            <div className="-mx-px overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <caption className="sr-only">Scenario execution history</caption>
                <thead className="border-b border-line bg-surface-muted/60">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold tracking-wide text-ink-secondary uppercase">
                      Scenario
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold tracking-wide text-ink-secondary uppercase">
                      Result
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold tracking-wide text-ink-secondary uppercase">
                      Duration
                    </th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold tracking-wide text-ink-secondary uppercase">
                      Records
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold tracking-wide text-ink-secondary uppercase">
                      Started
                    </th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold tracking-wide text-ink-secondary uppercase">
                      Run
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {completed.map((record) => (
                    <HistoryRow
                      key={record.id}
                      record={record}
                      onOpen={() => setOpenRunId(record.id)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>

      {selected && (
        <ScenarioRunDialog
          definition={selected}
          onClose={() => setSelected(null)}
          onStart={(parameters) => startRun(selected, parameters)}
        />
      )}

      {openRunId && (
        <ScenarioRunDetailDialog runId={openRunId} onClose={() => setOpenRunId(null)} />
      )}
    </>
  );
}

/* ----------------------------------------------------------------- catalogue */

function ScenarioGroup({
  title,
  icon,
  scenarios,
  canRun,
  onSelect,
}: {
  title: string;
  icon: React.ReactNode;
  scenarios: ScenarioDefinition[];
  canRun: boolean;
  onSelect: (scenario: ScenarioDefinition) => void;
}) {
  return (
    <Panel title={<span className="flex items-center gap-2">{icon}{title}</span>}>
      <ul className="flex flex-col divide-y divide-line">
        {scenarios.map((scenario) => (
          <li key={scenario.name} className="flex flex-wrap items-center gap-3 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-ink">{scenario.name}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-ink-secondary">
                {scenario.description}
              </p>
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onSelect(scenario)}
              disabled={!canRun}
              title={canRun ? undefined : 'Your role cannot run scenarios.'}
              icon={<Play aria-hidden className="size-3.5" />}
            >
              Run
            </Button>
          </li>
        ))}
      </ul>
      {!canRun && (
        <p className="mt-2 text-xs text-ink-secondary">
          Your role has read-only access to the scenario library.
        </p>
      )}
    </Panel>
  );
}

/* --------------------------------------------------------------- run dialog */

function ScenarioRunDialog({
  definition,
  onClose,
  onStart,
}: {
  definition: ScenarioDefinition;
  onClose: () => void;
  onStart: (parameters: Record<string, string>) => Promise<void>;
}) {
  const accounts = useAccounts({ status: 'ACTIVE', pageSize: 100 });
  const [accountId, setAccountId] = useState('');
  const [amount, setAmount] = useState(() => {
    const parameter = definition.parameters.find((entry) => entry.key === 'amountMinor');
    return parameter?.defaultMinor ? (parameter.defaultMinor / 100).toString() : '1000';
  });
  const [reason, setReason] = useState('');
  const [stage, setStage] = useState<'configure' | 'review'>('configure');
  const [submitting, setSubmitting] = useState(false);

  const accountsList = accounts.data?.items ?? [];
  const amountParameter = definition.parameters.find((entry) => entry.key === 'amountMinor');
  const accountParameter = definition.parameters.find((entry) => entry.key === 'accountId');

  const amountMinor = Math.round((Number(amount) || 0) * 100);
  const valid =
    (!accountParameter || Boolean(accountId)) &&
    (!amountParameter || amountMinor > 0) &&
    (!definition.parameters.some((entry) => entry.key === 'reason') || reason.trim().length > 0);

  async function start(): Promise<void> {
    setSubmitting(true);
    const parameters: Record<string, string> = {};
    if (accountId) parameters.accountId = accountId;
    if (amountParameter) parameters.amountMinor = String(amountMinor);
    if (reason.trim()) parameters.reason = reason.trim();
    // Close the configure dialog before the run detail opens so only one
    // dialog with this scenario's name is mounted at a time.
    onClose();
    await onStart(parameters);
    setSubmitting(false);
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={definition.name}
      description={definition.description}
      size="lg"
      footer={
        stage === 'configure' ? (
          <>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={() => setStage('review')} disabled={!valid}>
              Review impact
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={() => setStage('configure')} disabled={submitting}>
              Back
            </Button>
            <Button onClick={start} loading={submitting} icon={<Play aria-hidden className="size-4" />}>
              Start scenario
            </Button>
          </>
        )
      }
    >
      <div className="flex flex-col gap-4">
        <div className="rounded-control border border-line bg-surface-muted/40 p-3">
          <p className="text-xs font-semibold tracking-wide text-ink-secondary uppercase">
            Expected behaviour
          </p>
          <p className="mt-1 text-sm leading-relaxed text-ink-secondary">
            {definition.expectedBehaviour}
          </p>
        </div>

        {stage === 'configure' ? (
          <>
            {definition.parameters.length === 0 ? (
              <p className="text-sm text-ink-secondary">
                This scenario is fully deterministic and needs no parameters.
              </p>
            ) : (
              <>
                {accountParameter && (
                  <Field label={accountParameter.label} hint={accountParameter.hint} required>
                    {(props) => (
                      <Select
                        {...props}
                        value={accountId}
                        onChange={(event) => setAccountId(event.target.value)}
                      >
                        <option value="">Select an account…</option>
                        {accountsList.map((account) => (
                          <option key={account.id} value={account.id}>
                            ••••{account.number.slice(-4)} · {account.customerName} (
                            {formatMoney(account.availableBalance)})
                          </option>
                        ))}
                      </Select>
                    )}
                  </Field>
                )}
                {amountParameter && (
                  <Field
                    label={amountParameter.label}
                    hint="Entered in major units, e.g. 2500.00."
                    required
                  >
                    {(props) => (
                      <Input
                        {...props}
                        inputMode="decimal"
                        value={amount}
                        onChange={(event) => setAmount(event.target.value)}
                        className="tabular-nums"
                      />
                    )}
                  </Field>
                )}
                {definition.parameters.some((entry) => entry.key === 'reason') && (
                  <Field label="Reason" required>
                    {(props) => (
                      <Input
                        {...props}
                        value={reason}
                        onChange={(event) => setReason(event.target.value)}
                      />
                    )}
                  </Field>
                )}
                {accounts.isPending && accountParameter && (
                  <p className="flex items-center gap-2 text-xs text-ink-secondary">
                    <Loader2 aria-hidden className="size-3.5 animate-spin" />
                    Loading accounts…
                  </p>
                )}
              </>
            )}
          </>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-ink-secondary">
              Review what the simulation will do. Progress and results come from
              the source while the scenario runs.
            </p>
            <dl className="grid gap-3 sm:grid-cols-2">
              <Fact
                label="Scenario"
                value={`${definition.kind === 'financial' ? 'Financial' : 'Infrastructure'} · ${definition.name}`}
              />
              {accountParameter && (
                <Fact
                  label="Account"
                  value={
                    accountsList.find((account) => account.id === accountId)
                      ? `••••${accountsList.find((account) => account.id === accountId)!.number.slice(-4)}`
                      : 'Whole environment'
                  }
                />
              )}
              {amountParameter && (
                <Fact
                  label="Amount"
                  value={formatMoney({ amountMinor, currency: 'NGN' })}
                  mono
                />
              )}
            </dl>
            <div>
              <p className="text-xs font-semibold tracking-wide text-ink-secondary uppercase">
                Impact on the simulation
              </p>
              <ul className="mt-1 flex flex-col gap-1">
                {definition.sideEffects.map((effect) => (
                  <li key={effect} className="flex items-start gap-2 text-sm text-ink-secondary">
                    <ChevronRight aria-hidden className="mt-0.5 size-3.5 shrink-0 text-ink-secondary" />
                    {effect}
                  </li>
                ))}
              </ul>
            </div>
            {definition.sideEffects.some((effect) => /remains until|during the run/.test(effect)) && (
              <p className="flex items-start gap-2 rounded-control border border-warning-line bg-warning-soft px-3 py-2.5 text-xs text-ink-secondary">
                <AlertTriangle aria-hidden className="mt-0.5 size-3.5 shrink-0 text-warning" />
                This scenario changes environment conditions. Review the side
                effects before starting.
              </p>
            )}
          </div>
        )}
      </div>
    </Dialog>
  );
}

/* ---------------------------------------------------------- run detail view */

function ScenarioRunDetailDialog({
  runId,
  onClose,
}: {
  runId: string;
  onClose: () => void;
}) {
  const run = useScenarioRun(runId);

  if (run.error) {
    return (
      <Dialog open onClose={onClose} title="Scenario run" size="lg">
        <ErrorState error={run.error} onRetry={() => void run.refetch()} />
      </Dialog>
    );
  }

  const data = run.data;

  return (
    <Dialog
      open
      onClose={onClose}
      title={data?.scenarioName ?? 'Scenario run'}
      description={
        data
          ? `Started ${formatDateTime(data.startedAt)} · ${data.status === 'RUNNING' ? 'running' : data.status.toLowerCase()}`
          : 'Loading run…'
      }
      size="lg"
    >
      {!data ? (
        <LoadingPanel rows={5} />
      ) : (
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-2">
            {data.status === 'RUNNING' ? (
              <Badge tone="info" icon={<Loader2 aria-hidden className="size-3.5 animate-spin" />}>
                Running
              </Badge>
            ) : data.status === 'SUCCEEDED' ? (
              <Badge tone="success">Succeeded</Badge>
            ) : (
              <Badge tone="danger">Failed</Badge>
            )}
            {data.durationMs !== null && (
              <span className="text-xs text-ink-secondary" data-numeric="true">
                {(data.durationMs / 1000).toFixed(1)}s
              </span>
            )}
            {data.transactionIds.length > 0 && (
              <span className="text-xs text-ink-secondary" data-numeric="true">
                {data.transactionIds.length} transaction(s)
              </span>
            )}
          </div>

          <p className="text-sm text-ink-secondary">{data.summary}</p>

          {/* Steps */}
          <div>
            <p className="mb-2 text-xs font-semibold tracking-wide text-ink-secondary uppercase">
              Progress
            </p>
            <ol className="flex flex-col gap-2">
              {data.steps.map((step, index) => (
                <StepRow key={`${step.name}-${index}`} step={step} />
              ))}
            </ol>
          </div>

          {/* Generated records */}
          {data.transactionIds.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold tracking-wide text-ink-secondary uppercase">
                Generated transactions
              </p>
              <ul className="flex flex-col gap-1">
                {data.transactionIds.map((id) => (
                  <li key={id}>
                    <Link
                      to={`/transactions/${id}`}
                      onClick={onClose}
                      className="inline-flex items-center gap-1.5 text-sm text-brand hover:underline"
                    >
                      <ChevronRight aria-hidden className="size-3.5" />
                      {id}
                    </Link>
                  </li>
                ))}
              </ul>
              <p className="mt-1 text-xs text-ink-secondary">
                Open a transaction to inspect its lifecycle, ledger entries,
                events and delivery attempts.
              </p>
            </div>
          )}

          {data.eventIds.length > 0 && (
            <p className="flex items-center gap-2 text-xs text-ink-secondary">
              <Radio aria-hidden className="size-3.5" />
              {data.eventIds.length} event(s) recorded · inspect deliveries in the
              Event Delivery workspace.
            </p>
          )}

          {data.incidentId && (
            <p className="flex items-center gap-2 text-xs text-warning">
              <ServerCog aria-hidden className="size-3.5" />
              An infrastructure incident was recorded by this scenario.
            </p>
          )}

          <p className="rounded-control border border-line bg-surface-muted/40 px-3 py-2.5 text-xs leading-relaxed text-ink-secondary">
            ProofOps is a separate product. When an authorised integration link
            is configured, generated records can be opened there; this
            environment does not claim one, so the events above are inspected in
            the Event Delivery workspace instead.
          </p>
        </div>
      )}
    </Dialog>
  );
}

function StepRow({ step }: { step: ScenarioStep }) {
  const Icon = stepIcons[step.status];
  return (
    <li className="flex items-start gap-2.5">
      <Icon
        aria-hidden
        className={`mt-0.5 size-4 shrink-0 ${stepTone[step.status]} ${step.status === 'RUNNING' ? 'animate-spin' : ''}`}
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm text-ink">{step.name}</p>
        {step.detail && (
          <p className="mt-0.5 text-xs leading-relaxed text-ink-secondary">{step.detail}</p>
        )}
      </div>
    </li>
  );
}

/* -------------------------------------------------------------------- history */

function HistoryRow({
  record,
  onOpen,
}: {
  record: ScenarioExecutionRecord;
  onOpen: () => void;
}) {
  const isRuntime = record.id.startsWith('run_');
  return (
    <tr>
      <td className="px-4 py-3 text-ink">
        {record.scenarioName}
        <span className="mt-0.5 block">
          <Badge tone={record.kind === 'financial' ? 'brand' : 'info'}>
            {record.kind === 'financial' ? 'Financial' : 'Infrastructure'}
          </Badge>
        </span>
      </td>
      <td className="px-4 py-3">
        {record.status === 'SUCCEEDED' ? (
          <Badge tone="success">Succeeded</Badge>
        ) : record.status === 'FAILED' ? (
          <Badge tone="danger">Failed</Badge>
        ) : (
          <Badge tone="info">Running</Badge>
        )}
      </td>
      <td className="px-4 py-3 tabular-nums text-ink-secondary">
        {record.durationMs !== null ? `${(record.durationMs / 1000).toFixed(1)}s` : '—'}
      </td>
      <td className="px-4 py-3 text-right tabular-nums text-ink-secondary">
        {record.transactionsGenerated}
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-ink-secondary">
        {formatRelativeTime(record.startedAt)}
      </td>
      <td className="px-4 py-3 text-right">
        <Button
          variant="ghost"
          size="sm"
          onClick={onOpen}
          disabled={!isRuntime}
          title={isRuntime ? 'View the run detail' : 'Recorded before run detail was available'}
        >
          View
        </Button>
      </td>
    </tr>
  );
}

/* ------------------------------------------------------------------ helpers */

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
      <dd className={`mt-1 text-sm text-ink ${mono ? 'font-technical' : ''}`}>{value}</dd>
    </div>
  );
}
