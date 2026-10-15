import { AlertOctagon, CheckCircle2, AlertTriangle, ServerCog } from 'lucide-react';
import { Panel } from '../ui/Panel';
import { Badge } from '../ui/Badge';
import { EmptyState, ErrorState } from '../ui/States';
import { LoadingPanel } from '../ui/Loading';
import { formatRelativeTime } from '../../lib/format';
import type { InfrastructureIncident, ProviderService } from '../../types/domain';

const serviceMeta: Record<
  ProviderService['status'],
  { label: string; tone: 'success' | 'warning' | 'danger'; Icon: typeof CheckCircle2 }
> = {
  OPERATIONAL: { label: 'Operational', tone: 'success', Icon: CheckCircle2 },
  DEGRADED: { label: 'Degraded', tone: 'warning', Icon: AlertTriangle },
  DOWN: { label: 'Down', tone: 'danger', Icon: AlertOctagon },
};

const severityTone: Record<InfrastructureIncident['severity'], 'warning' | 'danger'> = {
  MINOR: 'warning',
  MAJOR: 'danger',
  CRITICAL: 'danger',
};

/**
 * Simulated provider health. Everything here is an injected simulation
 * condition — none of it describes a fault of the ProofBank interface itself.
 */
export function ProviderHealthPanel({
  services,
  incidents,
  loading,
  error,
  onRetry,
}: {
  services?: ProviderService[];
  incidents?: InfrastructureIncident[];
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
}) {
  const open = (incidents ?? []).filter((incident) => incident.status === 'OPEN');

  return (
    <Panel
      title="Simulated provider health"
      description="Injected service conditions for the simulation."
      actions={
        open.length > 0 ? (
          <Badge tone={open.some((incident) => incident.severity !== 'MINOR') ? 'danger' : 'warning'}>
            {open.length} open incident{open.length === 1 ? '' : 's'}
          </Badge>
        ) : (
          <Badge tone="success">No open incidents</Badge>
        )
      }
    >
      {error ? (
        <ErrorState error={error} onRetry={onRetry} />
      ) : loading ? (
        <LoadingPanel rows={3} />
      ) : (
        <div className="flex flex-col gap-5">
          <ul className="grid gap-2 sm:grid-cols-2">
            {(services ?? []).map((service) => {
              const meta = serviceMeta[service.status];
              return (
                <li
                  key={service.name}
                  className="flex items-center gap-3 rounded-control border border-line px-3 py-2.5"
                >
                  <meta.Icon
                    aria-hidden
                    className={
                      meta.tone === 'success'
                        ? 'size-4 text-success'
                        : meta.tone === 'warning'
                          ? 'size-4 text-warning'
                          : 'size-4 text-danger'
                    }
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink">{service.name}</p>
                    <p className="text-xs text-ink-secondary">
                      {service.latencyMs} ms · {service.errorRatePercent.toFixed(1)}% errors
                    </p>
                  </div>
                  <Badge tone={meta.tone}>{meta.label}</Badge>
                </li>
              );
            })}
            {(!services || services.length === 0) && (
              <li className="text-sm text-ink-secondary">No services reported.</li>
            )}
          </ul>

          <div>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink">
              <ServerCog aria-hidden className="size-4 text-ink-secondary" />
              Simulated incidents
            </h3>
            {incidents && incidents.length > 0 ? (
              <ul className="flex flex-col gap-2">
                {incidents.map((incident) => (
                  <li
                    key={incident.id}
                    className="rounded-control border border-line px-3 py-2.5"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={severityTone[incident.severity]}>
                        {incident.severity.toLowerCase()}
                      </Badge>
                      <Badge tone={incident.status === 'OPEN' ? 'danger' : 'neutral'}>
                        {incident.status === 'OPEN' ? 'Open' : 'Resolved'}
                      </Badge>
                      <span className="text-sm font-medium text-ink">{incident.service}</span>
                      <span className="text-xs text-ink-secondary">
                        {formatRelativeTime(incident.openedAt)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-ink-secondary">{incident.summary}</p>
                    {incident.scenarioName && (
                      <p className="mt-1 text-[0.6875rem] text-ink-secondary">
                        Injected by scenario: {incident.scenarioName}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                title="No incidents recorded"
                description="Simulated infrastructure incidents will be listed here."
              />
            )}
          </div>

          <p className="text-xs leading-relaxed text-ink-secondary">
            These conditions are simulated injections. A degraded provider here
            is a demonstration scenario, not a fault of the ProofBank
            interface or its data.
          </p>
        </div>
      )}
    </Panel>
  );
}
