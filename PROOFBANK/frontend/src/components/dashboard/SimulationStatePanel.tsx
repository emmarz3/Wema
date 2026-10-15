import { Link } from 'react-router-dom';
import { Activity, Gauge, Radio } from 'lucide-react';
import { Panel, Stat } from '../ui/Panel';
import { StatusBadge } from '../ui/Badge';
import { buttonClass } from '../ui/Button';
import { Skeleton } from '../ui/Loading';
import { simulationModeMeta, simulationStateMeta } from '../../lib/status';
import { formatDateTime, formatRelativeTime } from '../../lib/format';
import { useNow } from '../../hooks/useSimulationStatus';
import type { SimulationStatus } from '../../types/domain';

/**
 * Live simulation state, rendered exactly as the data source reports it.
 * The heartbeat, cadence and mode are read-only here — the controls live in
 * the Simulation Control section.
 */
export function SimulationStatePanel({ status }: { status?: SimulationStatus }) {
  const now = useNow(5_000);

  if (!status) {
    return (
      <Panel title="Simulation state">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-40" />
        </div>
      </Panel>
    );
  }

  return (
    <Panel
      title="Simulation state"
      description="Reported by the data source; this panel never advances the clock."
      actions={
        <Link to="/simulation" className={buttonClass('secondary', 'sm')}>
          <Gauge aria-hidden className="size-3.5" />
          Control centre
        </Link>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge meta={simulationStateMeta[status.state]} />
          <span className="text-sm text-ink-secondary">
            {simulationModeMeta[status.mode].label}
          </span>
          <span className="text-xs text-ink-secondary">
            · {status.eventIntervalSeconds}s cadence
          </span>
        </div>

        <dl className="grid grid-cols-2 gap-3">
          <div>
            <dt className="text-xs text-ink-secondary">Heartbeat</dt>
            <dd
              className="text-sm text-ink"
              title={formatDateTime(status.heartbeatAt)}
            >
              {status.state === 'running'
                ? `${formatRelativeTime(status.heartbeatAt, now)}`
                : 'Paused'}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-ink-secondary">Last activity</dt>
            <dd className="text-sm text-ink" title={formatDateTime(status.lastActivityAt)}>
              {formatRelativeTime(status.lastActivityAt, now)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-ink-secondary">Events generated</dt>
            <dd className="text-sm tabular-nums text-ink">
              {status.generatedEventCount.toLocaleString('en-NG')}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-ink-secondary">Active scenario</dt>
            <dd className="text-sm text-ink">{status.activeScenarioName ?? 'None'}</dd>
          </div>
        </dl>

        <p className="flex items-start gap-2 text-xs leading-relaxed text-ink-secondary">
          <Radio aria-hidden className="mt-0.5 size-3.5 shrink-0" />
          The simulation generates activity on its{' '}
          {status.eventIntervalSeconds}-second heartbeat. Individual transactions
          complete on their own lifecycle, independent of this cadence.
        </p>

        <p className="flex items-center gap-2 text-xs text-ink-secondary">
          <Activity aria-hidden className="size-3.5" />
          Environment: {status.environmentName} — simulated.
        </p>
      </div>
    </Panel>
  );
}

/** Compact summary used on other screens. */
export function SimulationSummaryStat({ status }: { status: SimulationStatus }) {
  return (
    <Stat
      label="Simulation"
      value={simulationStateMeta[status.state].label}
      hint={`${simulationModeMeta[status.mode].label} · ${status.eventIntervalSeconds}s cadence`}
      icon={<Gauge aria-hidden className="size-4" />}
    />
  );
}
