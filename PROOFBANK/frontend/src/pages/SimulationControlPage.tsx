import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Gauge,
  History,
  Pause,
  Play,
  Radio,
  Settings2,
  Square,
  Timer,
} from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { SimulatedNotice } from '../components/layout/Environment';
import { Panel, Stat } from '../components/ui/Panel';
import { Button, buttonClass } from '../components/ui/Button';
import { Badge, StatusBadge } from '../components/ui/Badge';
import { EmptyState, ErrorState } from '../components/ui/States';
import { LoadingPanel } from '../components/ui/Loading';
import { Dialog } from '../components/ui/Dialog';
import { Field, Input } from '../components/ui/Field';
import { useAuth } from '../state/auth';
import { useToast } from '../state/toast';
import {
  useNow,
  useSimulationErrors,
  useSimulationHistory,
  useSimulationRecentEvents,
  useSimulationStatus,
} from '../hooks/useSimulationStatus';
import { api } from '../api';
import { ApiError } from '../api/errors';
import { useQueryClient } from '@tanstack/react-query';
import { eventTypeLabels, simulationModeMeta, simulationStateMeta } from '../lib/status';
import { formatDateTime, formatRelativeTime } from '../lib/format';
import type {
  SimulationControlEntry,
  SimulationMode,
  SimulationStatus,
} from '../types/domain';

const INTERVAL_MIN = 5;
const INTERVAL_MAX = 300;

const modeExplanations: Record<SimulationMode, string> = {
  live: 'Continuous generated activity on the configured cadence. Transaction lifecycle timing is independent of this heartbeat.',
  scenario: 'Controlled test cases run from the scenario workspace; the simulation reports their progress.',
  replay: 'Recorded activity is reported and nothing new is generated.',
};

/** Simulation control centre: status, modes, controls, history and errors. */
export function SimulationControlPage() {
  const { can } = useAuth();
  const { show } = useToast();
  const queryClient = useQueryClient();
  const now = useNow(5_000);

  const statusQuery = useSimulationStatus();
  const historyQuery = useSimulationHistory();
  const errorsQuery = useSimulationErrors();
  const status = statusQuery.data;

  const [stopOpen, setStopOpen] = useState(false);
  const [intervalOpen, setIntervalOpen] = useState(false);
  const [intervalValue, setIntervalValue] = useState('15');
  const [pending, setPending] = useState<string | null>(null);

  const permitted = can('control_simulation');

  // Sync the field only when the source's cadence actually changes — never
  // on every poll, which would reset what the operator is typing.
  useEffect(() => {
    if (status) setIntervalValue(String(status.eventIntervalSeconds));
  }, [status?.eventIntervalSeconds]); // eslint-disable-line react-hooks/exhaustive-deps

  async function runCommand(
    label: string,
    command: () => Promise<SimulationStatus>,
  ): Promise<void> {
    setPending(label);
    try {
      const next = await command();
      await queryClient.invalidateQueries({ queryKey: ['simulation'] });
      show({
        tone: 'success',
        title: `${label} — done`,
        description: `The simulation is now ${simulationStateMeta[next.state].label.toLowerCase()} in ${simulationModeMeta[next.mode].label.toLowerCase()}.`,
      });
    } catch (error) {
      show({
        tone: 'danger',
        title: `${label} failed`,
        description:
          error instanceof ApiError
            ? `${error.message} ${error.userGuidance}`
            : 'The simulation did not accept the command.',
      });
    } finally {
      setPending(null);
    }
  }

  async function changeMode(mode: SimulationMode): Promise<void> {
    await runCommand('Mode change', () => api.setSimulationMode(mode));
  }

  async function applyInterval(): Promise<void> {
    const seconds = Number(intervalValue);
    if (!Number.isFinite(seconds) || seconds < INTERVAL_MIN || seconds > INTERVAL_MAX) {
      show({
        tone: 'danger',
        title: 'Cadence not applied',
        description: `Choose a cadence between ${INTERVAL_MIN} and ${INTERVAL_MAX} seconds.`,
      });
      return;
    }
    await runCommand('Cadence change', () => api.setSimulationInterval(seconds));
    setIntervalOpen(false);
  }

  const state = status?.state ?? 'stopped';
  const controls: Array<{
    id: string;
    label: string;
    icon: typeof Play;
    enabled: boolean;
    action: () => void;
    variant: 'primary' | 'secondary' | 'danger';
    hint: string;
  }> = [
    {
      id: 'start',
      label: 'Start',
      icon: Play,
      enabled: state === 'stopped' || state === 'paused',
      variant: 'primary',
      hint: 'Begin generating activity on the configured cadence.',
      action: () => void runCommand('Start', () => api.startSimulation()),
    },
    {
      id: 'resume',
      label: 'Resume',
      icon: Play,
      enabled: state === 'paused',
      variant: 'primary',
      hint: 'Continue a paused simulation.',
      action: () => void runCommand('Resume', () => api.resumeSimulation()),
    },
    {
      id: 'pause',
      label: 'Pause',
      icon: Pause,
      enabled: state === 'running',
      variant: 'secondary',
      hint: 'Suspend generated activity while preserving state.',
      action: () => void runCommand('Pause', () => api.pauseSimulation()),
    },
    {
      id: 'stop',
      label: 'Stop',
      icon: Square,
      enabled: state !== 'stopped',
      variant: 'danger',
      hint: 'Halt activity generation entirely.',
      action: () => setStopOpen(true),
    },
  ];

  return (
    <>
      <PageHeader
        title="Simulation Control"
        sectionId="simulation"
        description="Operate the simulated banking environment: start, pause, resume, stop, change mode and configure the activity cadence."
        actions={<SimulatedNotice />}
        notice={
          <div className="flex flex-wrap items-center gap-2 rounded-control border border-line bg-surface px-3 py-2 text-xs text-ink-secondary">
            <Radio aria-hidden className="size-3.5 text-brand" />
            Controls are sent to the data source, which owns the simulation
            clock. The interface never advances activity itself.
          </div>
        }
      />

      <div className="flex flex-col gap-5">
        {/* Status ------------------------------------------------------- */}
        {statusQuery.error ? (
          <ErrorState error={statusQuery.error} onRetry={() => void statusQuery.refetch()} />
        ) : statusQuery.isPending || !status ? (
          <Panel>
            <LoadingPanel rows={5} />
          </Panel>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Stat
              label="Simulation state"
              value={simulationStateMeta[status.state].label}
              hint={simulationStateMeta[status.state].description}
              icon={<Activity aria-hidden className="size-4" />}
            />
            <Stat
              label="Mode"
              value={simulationModeMeta[status.mode].label}
              hint={modeExplanations[status.mode]}
              icon={<Gauge aria-hidden className="size-4" />}
            />
            <Stat
              label="Event cadence"
              value={`${status.eventIntervalSeconds}s`}
              hint="Heartbeat interval — not a transaction duration"
              icon={<Timer aria-hidden className="size-4" />}
            />
            <Stat
              label="Events generated"
              value={status.generatedEventCount.toLocaleString('en-NG')}
              hint={`Since ${status.startedAt ? formatRelativeTime(status.startedAt, now) : 'start'}`}
              icon={<Radio aria-hidden className="size-4" />}
            />
          </div>
        )}

        {status && (
          <Panel
            title="Simulation status"
            description="Reported by the data source."
            actions={
              <span className="flex items-center gap-2">
                <StatusBadge meta={simulationStateMeta[status.state]} />
                <Badge tone="info">{simulationModeMeta[status.mode].label}</Badge>
              </span>
            }
          >
            <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Detail
                label="Last heartbeat"
                value={
                  status.state === 'running'
                    ? `${formatRelativeTime(status.heartbeatAt, now)} (${formatDateTime(status.heartbeatAt)})`
                    : 'Paused — no heartbeat while suspended'
                }
              />
              <Detail
                label="Last activity"
                value={`${formatRelativeTime(status.lastActivityAt, now)} (${formatDateTime(status.lastActivityAt)})`}
              />
              <Detail
                label="Next expected activity"
                value={
                  status.nextActivityAt
                    ? `${formatRelativeTime(status.nextActivityAt, now)} (${formatDateTime(status.nextActivityAt)})`
                    : 'Not available — the simulation is not running'
                }
              />
              <Detail
                label="Active scenario"
                value={status.activeScenarioName ?? 'None selected'}
              />
              <Detail label="Started" value={status.startedAt ? formatDateTime(status.startedAt) : '—'} />
              <Detail
                label="Stopped"
                value={status.stoppedAt ? formatDateTime(status.stoppedAt) : 'Not stopped'}
              />
            </dl>
            <p className="mt-4 text-xs leading-relaxed text-ink-secondary">
              The simulation generates activity on its{' '}
              {status.eventIntervalSeconds}-second heartbeat. Individual
              transactions complete on their own lifecycle, independent of this
              cadence — the heartbeat is not a transaction duration.
            </p>
          </Panel>
        )}

        {/* Controls ------------------------------------------------------ */}
        <Panel
          title="Controls"
          description={
            permitted
              ? 'Actions are only enabled in the states where the source accepts them.'
              : 'Your role has read-only access to the simulation.'
          }
        >
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center gap-2">
              {controls.map((control) => (
                <Button
                  key={control.id}
                  variant={control.variant}
                  onClick={control.action}
                  disabled={!permitted || !control.enabled || pending !== null}
                  title={
                    permitted
                      ? control.enabled
                        ? control.hint
                        : 'Not available in the current state.'
                      : 'Your role cannot control the simulation.'
                  }
                  loading={pending === control.label}
                  icon={<control.icon aria-hidden className="size-4" />}
                >
                  {control.label}
                </Button>
              ))}
              <Button
                variant="ghost"
                onClick={() => setIntervalOpen(true)}
                disabled={!permitted || pending !== null}
                title={permitted ? 'Change the heartbeat interval.' : undefined}
                icon={<Settings2 aria-hidden className="size-4" />}
              >
                Cadence: {status?.eventIntervalSeconds ?? 15}s
              </Button>
            </div>

            {/* Modes */}
            <div>
              <h3 className="mb-2 text-xs font-semibold tracking-wide text-ink-secondary uppercase">
                Simulation mode
              </h3>
              <div className="grid gap-2 lg:grid-cols-3">
                {(['live', 'scenario', 'replay'] as SimulationMode[]).map((mode) => {
                  const active = status?.mode === mode;
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => void changeMode(mode)}
                      disabled={!permitted || active || pending !== null}
                      aria-pressed={active}
                      className={`flex flex-col items-start gap-1 rounded-panel border p-3 text-left transition-colors duration-fast ease-standard ${
                        active
                          ? 'border-brand-line bg-brand-soft'
                          : 'border-line bg-surface hover:bg-surface-muted'
                      } ${!permitted || active ? 'cursor-default' : ''} disabled:opacity-70`}
                    >
                      <span className="flex w-full items-center justify-between gap-2">
                        <span className="text-sm font-medium text-ink">
                          {simulationModeMeta[mode].label}
                        </span>
                        {active && <Badge tone="brand">Active</Badge>}
                      </span>
                      <span className="text-xs leading-relaxed text-ink-secondary">
                        {modeExplanations[mode]}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-xs leading-relaxed text-ink-secondary">
                Scenario execution itself lives in the Scenarios workspace, which
                reports the runs it starts. Replay mode reports recorded
                activity and generates nothing new.
              </p>
            </div>

            {!permitted && (
              <p className="rounded-control border border-warning-line bg-warning-soft px-3 py-2.5 text-xs text-ink-secondary">
                Signed in without the simulation-control capability, so every
                control here is disabled. Status, history and errors remain
                visible.
              </p>
            )}
          </div>
        </Panel>

        {/* History + errors ---------------------------------------------- */}
        <div className="grid gap-5 xl:grid-cols-2">
          <Panel
            title="Control history"
            description="Every control action recorded by the simulation."
          >
            {historyQuery.error ? (
              <ErrorState error={historyQuery.error} onRetry={() => void historyQuery.refetch()} />
            ) : historyQuery.isPending ? (
              <LoadingPanel rows={4} />
            ) : (historyQuery.data ?? []).length === 0 ? (
              <EmptyState title="No control actions recorded yet" />
            ) : (
              <ol className="flex flex-col divide-y divide-line">
                {(historyQuery.data ?? []).slice(0, 8).map((entry) => (
                  <HistoryRow key={entry.id} entry={entry} />
                ))}
              </ol>
            )}
            <div className="mt-3">
              <Link to="/events" className={buttonClass('ghost', 'sm')}>
                <Radio aria-hidden className="size-3.5" />
                Inspect generated events
              </Link>
            </div>
          </Panel>

          <Panel
            title="Recent simulation errors"
            description="Errors recorded while the simulation runs."
          >
            {errorsQuery.error ? (
              <ErrorState error={errorsQuery.error} onRetry={() => void errorsQuery.refetch()} />
            ) : errorsQuery.isPending ? (
              <LoadingPanel rows={4} />
            ) : (errorsQuery.data ?? []).length === 0 ? (
              <EmptyState
                icon={<CheckCircle2 aria-hidden className="size-5" />}
                title="No errors recorded"
                description="The simulation has not recorded any errors recently."
              />
            ) : (
              <ul className="flex flex-col divide-y divide-line">
                {(errorsQuery.data ?? []).map((error) => (
                  <li key={error.id} className="flex gap-3 py-2.5">
                    <AlertTriangle
                      aria-hidden
                      className="mt-0.5 size-4 shrink-0 text-danger"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-ink">{error.message}</p>
                      <p className="mt-1 flex flex-wrap items-center gap-x-2 text-[0.6875rem] text-ink-secondary">
                        <span className="font-technical">{error.code}</span>
                        <span title={formatDateTime(error.at)}>
                          {formatRelativeTime(error.at, now)}
                        </span>
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-xs leading-relaxed text-ink-secondary">
              These are errors recorded by the simulated environment — they
              describe injected conditions, not faults in this interface.
            </p>
          </Panel>
        </div>

        {/* Recent generated events -------------------------------------- */}
        <RecentHeartbeatEvents />
      </div>

      {/* Stop confirmation --------------------------------------------- */}
      <Dialog
        open={stopOpen}
        onClose={() => setStopOpen(false)}
        title="Stop the simulation"
        description="Halts all activity generation in the simulated environment."
        footer={
          <>
            <Button variant="ghost" onClick={() => setStopOpen(false)} disabled={pending !== null}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={pending === 'Stop'}
              onClick={() => {
                setStopOpen(false);
                void runCommand('Stop', () => api.stopSimulation());
              }}
            >
              Stop simulation
            </Button>
          </>
        }
      >
        <p className="flex items-start gap-2 rounded-control border border-warning-line bg-warning-soft px-3 py-2.5 text-sm text-ink-secondary">
          <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0 text-warning" />
          Stopping halts activity generation. Existing customers, accounts,
          transactions, ledger entries and events are preserved, and any
          in-progress transaction continues on its own lifecycle. You can start
          the simulation again at any time.
        </p>
      </Dialog>

      {/* Cadence configuration ----------------------------------------- */}
      <Dialog
        open={intervalOpen}
        onClose={() => setIntervalOpen(false)}
        title="Configure the event cadence"
        description="Sets how often the simulation heartbeat runs."
        footer={
          <>
            <Button variant="ghost" onClick={() => setIntervalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={applyInterval} loading={pending === 'Cadence change'}>
              Apply cadence
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Field
            label="Event interval (seconds)"
            hint={`Between ${INTERVAL_MIN} and ${INTERVAL_MAX} seconds. This is the heartbeat cadence, not a transaction duration.`}
          >
            {(props) => (
              <Input
                {...props}
                type="number"
                min={INTERVAL_MIN}
                max={INTERVAL_MAX}
                value={intervalValue}
                onChange={(event) => setIntervalValue(event.target.value)}
                className="tabular-nums"
              />
            )}
          </Field>
          <p className="text-xs leading-relaxed text-ink-secondary">
            Changing the cadence takes effect on the next heartbeat. Transactions
            in progress are unaffected — their lifecycle timing is independent
            of the heartbeat.
          </p>
        </div>
      </Dialog>
    </>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-ink-secondary">{label}</dt>
      <dd className="mt-1 text-sm text-ink">{value}</dd>
    </div>
  );
}

function HistoryRow({ entry }: { entry: SimulationControlEntry }) {
  return (
    <li className="flex gap-3 py-2.5">
      <History aria-hidden className="mt-0.5 size-4 shrink-0 text-ink-secondary" />
      <div className="min-w-0 flex-1">
        <p className="text-sm text-ink">{entry.detail}</p>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 text-[0.6875rem] text-ink-secondary">
          <span className="font-medium">{entry.actor}</span>
          <span title={formatDateTime(entry.at)}>{formatRelativeTime(entry.at)}</span>
        </p>
      </div>
    </li>
  );
}

/** Most recent simulation events, as reported by the source. */
function RecentHeartbeatEvents() {
  const now = useNow(10_000);
  const { data } = useSimulationRecentEvents();
  return (
    <Panel
      title="Recent simulation events"
      description="The newest events emitted by the simulation."
      actions={
        <Link to="/events" className={buttonClass('secondary', 'sm')}>
          Event delivery workspace
        </Link>
      }
    >
      {(data ?? []).length === 0 ? (
        <EmptyState
          icon={<Radio aria-hidden className="size-5" />}
          title="No events yet"
          description="Events appear once the simulation runs a heartbeat."
        />
      ) : (
        <ol className="flex flex-col divide-y divide-line">
          {(data ?? []).slice(0, 6).map((event) => (
            <li key={event.id} className="flex gap-3 py-2.5">
              <span aria-hidden className="mt-1.5 size-2 shrink-0 rounded-full bg-brand" />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-ink">{eventTypeLabels[event.type]}</p>
                <p className="mt-0.5 text-xs text-ink-secondary">{event.summary}</p>
                <p className="mt-1 text-[0.6875rem] text-ink-secondary">
                  {formatRelativeTime(event.occurredAt, now)}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}
