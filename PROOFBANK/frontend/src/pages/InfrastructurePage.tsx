import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Gauge,
  Server,
  XCircle,
} from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { SimulatedNotice } from '../components/layout/Environment';
import { Panel, Stat } from '../components/ui/Panel';
import { Select } from '../components/ui/Field';
import { SearchInput } from '../components/ui/SearchInput';
import { StatusBadge } from '../components/ui/Badge';
import { EmptyState, ErrorState } from '../components/ui/States';
import { LoadingPanel } from '../components/ui/Loading';
import { Table, TableScroll, TBody, TD, TH, THead, TR } from '../components/ui/Table';
import { useNow } from '../hooks/useSimulationStatus';
import { useInfrastructure } from '../hooks/useEvents';
import {
  incidentSeverityMeta,
  incidentStatusMeta,
  serviceStatusMeta,
} from '../lib/status';
import { formatRelativeTime } from '../lib/format';
import type { IncidentSeverity, ServiceStatus } from '../types/domain';

type ServiceFilter = ServiceStatus | 'all';
type IncidentStatusFilter = 'OPEN' | 'RESOLVED' | 'all';
type SeverityFilter = IncidentSeverity | 'all';

/**
 * Infrastructure workspace: the simulated provider services and the incidents
 * raised against them, with the operational detail the data source reports.
 * Conditions here are observed, not triggered — running the relevant scenarios
 * in the Scenarios workspace is what produces new conditions.
 */
export function InfrastructurePage() {
  const now = useNow(10_000);
  const health = useInfrastructure();

  const [serviceStatus, setServiceStatus] = useState<ServiceFilter>('all');
  const [incidentStatus, setIncidentStatus] = useState<IncidentStatusFilter>('all');
  const [severity, setSeverity] = useState<SeverityFilter>('all');
  const [search, setSearch] = useState('');

  const services = useMemo(() => health.data?.services ?? [], [health.data]);
  const incidents = useMemo(() => health.data?.incidents ?? [], [health.data]);

  const filteredServices = useMemo(() => {
    const term = search.trim().toLowerCase();
    return services.filter((service) => {
      if (serviceStatus !== 'all' && service.status !== serviceStatus) return false;
      if (term && !service.name.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [services, serviceStatus, search]);

  const filteredIncidents = useMemo(() => {
    const term = search.trim().toLowerCase();
    return incidents.filter((incident) => {
      if (incidentStatus !== 'all' && incident.status !== incidentStatus) return false;
      if (severity !== 'all' && incident.severity !== severity) return false;
      if (
        term &&
        !incident.summary.toLowerCase().includes(term) &&
        !incident.service.toLowerCase().includes(term) &&
        !incident.id.toLowerCase().includes(term)
      ) {
        return false;
      }
      return true;
    });
  }, [incidents, incidentStatus, severity, search]);

  const down = services.filter((service) => service.status === 'DOWN').length;
  const degraded = services.filter((service) => service.status === 'DEGRADED').length;
  const openIncidents = incidents.filter((incident) => incident.status === 'OPEN').length;

  return (
    <>
      <PageHeader
        title="Infrastructure"
        sectionId="infrastructure"
        description="Simulated provider services and the incidents raised against them. Conditions are observed from the data source; running the matching scenario is what changes them."
        actions={<SimulatedNotice />}
        notice={
          <div className="flex flex-wrap items-center gap-2 rounded-control border border-line bg-surface px-3 py-2 text-xs text-ink-secondary">
            <Gauge aria-hidden className="size-3.5 text-brand" />
            Degraded or down services are injected conditions of the simulation.
            They affect event delivery, never the interface itself.
          </div>
        }
      />

      {health.error ? (
        <ErrorState error={health.error} onRetry={() => void health.refetch()} />
      ) : (
        <div className="flex flex-col gap-5">
          {/* Headline counts ---------------------------------------------- */}
          {health.isPending || !health.data ? (
            <Panel>
              <LoadingPanel rows={3} />
            </Panel>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Stat
                label="Services"
                value={services.length}
                hint="Monitored provider services"
                icon={<Server aria-hidden className="size-4" />}
              />
              <Stat
                label="Degraded"
                value={degraded}
                hint="Responding with elevated errors"
                tone={degraded ? 'warning' : 'neutral'}
                icon={<AlertTriangle aria-hidden className="size-4" />}
              />
              <Stat
                label="Down"
                value={down}
                hint="Not responding"
                tone={down ? 'danger' : 'neutral'}
                icon={<XCircle aria-hidden className="size-4" />}
              />
              <Stat
                label="Open incidents"
                value={openIncidents}
                hint="Currently active conditions"
                tone={openIncidents ? 'warning' : 'neutral'}
                icon={<Activity aria-hidden className="size-4" />}
              />
            </div>
          )}

          {/* Shared filter bar -------------------------------------------- */}
          <Panel bodyClassName="p-3">
            <div className="flex flex-wrap items-center gap-3">
              <SearchInput
                label="Search services and incidents"
                placeholder="Search by service, incident or summary"
                value={search}
                onValueChange={setSearch}
                className="w-full sm:w-72"
              />
              <label className="flex items-center gap-2 text-xs text-ink-secondary">
                Service
                <Select
                  value={serviceStatus}
                  onChange={(event) => setServiceStatus(event.target.value as ServiceFilter)}
                  className="h-9 w-40 py-0 text-xs"
                  aria-label="Filter by service status"
                >
                  <option value="all">All statuses</option>
                  <option value="OPERATIONAL">Operational</option>
                  <option value="DEGRADED">Degraded</option>
                  <option value="DOWN">Down</option>
                </Select>
              </label>
              <label className="flex items-center gap-2 text-xs text-ink-secondary">
                Incident
                <Select
                  value={incidentStatus}
                  onChange={(event) =>
                    setIncidentStatus(event.target.value as IncidentStatusFilter)
                  }
                  className="h-9 w-32 py-0 text-xs"
                  aria-label="Filter incidents by state"
                >
                  <option value="all">All</option>
                  <option value="OPEN">Open</option>
                  <option value="RESOLVED">Resolved</option>
                </Select>
              </label>
              <label className="flex items-center gap-2 text-xs text-ink-secondary">
                Severity
                <Select
                  value={severity}
                  onChange={(event) => setSeverity(event.target.value as SeverityFilter)}
                  className="h-9 w-32 py-0 text-xs"
                  aria-label="Filter incidents by severity"
                >
                  <option value="all">All</option>
                  <option value="MINOR">Minor</option>
                  <option value="MAJOR">Major</option>
                  <option value="CRITICAL">Critical</option>
                </Select>
              </label>
            </div>
          </Panel>

          {/* Services ------------------------------------------------------ */}
          <Panel
            title="Provider services"
            description="Health reported by the data source at its last check."
            bodyClassName="p-0"
          >
            {health.isPending ? (
              <div className="p-4">
                <LoadingPanel rows={4} />
              </div>
            ) : filteredServices.length === 0 ? (
              <div className="p-4">
                <EmptyState
                  icon={<Server aria-hidden className="size-5" />}
                  title="No services match these filters"
                  description="Adjust the service filter or search."
                />
              </div>
            ) : (
              <TableScroll>
                <Table caption="Simulated provider services">
                  <THead>
                    <TR>
                      <TH>Service</TH>
                      <TH>Status</TH>
                      <TH numeric>Latency</TH>
                      <TH numeric>Error rate</TH>
                      <TH>Last checked</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {filteredServices.map((service) => (
                      <TR key={service.name}>
                        <TD>
                          <span className="font-medium text-ink">{service.name}</span>
                          <span className="mt-0.5 block text-xs text-ink-secondary">
                            {serviceStatusMeta[service.status].description}
                          </span>
                        </TD>
                        <TD>
                          <StatusBadge meta={serviceStatusMeta[service.status]} size="sm" />
                        </TD>
                        <TD numeric>{service.latencyMs} ms</TD>
                        <TD numeric>{service.errorRatePercent.toFixed(1)}%</TD>
                        <TD
                          className="whitespace-nowrap text-ink-secondary"
                          title={service.checkedAt}
                        >
                          {formatRelativeTime(service.checkedAt, now)}
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </TableScroll>
            )}
          </Panel>

          {/* Incidents ---------------------------------------------------- */}
          <Panel
            title="Incidents"
            description="Conditions the simulation has recorded against a service."
            bodyClassName="p-0"
          >
            {health.isPending ? (
              <div className="p-4">
                <LoadingPanel rows={3} />
              </div>
            ) : filteredIncidents.length === 0 ? (
              <div className="p-4">
                <EmptyState
                  icon={<CheckCircle2 aria-hidden className="size-5" />}
                  title="No incidents match these filters"
                  description="A clear incident list means the simulated services have no recorded conditions."
                />
              </div>
            ) : (
              <TableScroll>
                <Table caption="Simulated infrastructure incidents">
                  <THead>
                    <TR>
                      <TH>Incident</TH>
                      <TH>Service</TH>
                      <TH>Severity</TH>
                      <TH>State</TH>
                      <TH>Opened</TH>
                      <TH>Resolved</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {filteredIncidents.map((incident) => (
                      <TR key={incident.id}>
                        <TD>
                          <span className="text-ink">{incident.summary}</span>
                          <span className="mt-0.5 block font-technical text-ink-secondary">
                            {incident.id}
                          </span>
                          {incident.scenarioName && (
                            <Link
                              to="/scenarios"
                              className="mt-1 inline-block text-xs font-medium text-brand hover:underline"
                            >
                              From scenario: {incident.scenarioName}
                            </Link>
                          )}
                        </TD>
                        <TD className="text-ink-secondary">{incident.service}</TD>
                        <TD>
                          <StatusBadge meta={incidentSeverityMeta[incident.severity]} size="sm" />
                        </TD>
                        <TD>
                          <StatusBadge meta={incidentStatusMeta[incident.status]} size="sm" />
                        </TD>
                        <TD
                          className="whitespace-nowrap text-ink-secondary"
                          title={incident.openedAt}
                        >
                          {formatRelativeTime(incident.openedAt, now)}
                        </TD>
                        <TD
                          className="whitespace-nowrap text-ink-secondary"
                          title={incident.resolvedAt ?? undefined}
                        >
                          {incident.resolvedAt
                            ? formatRelativeTime(incident.resolvedAt, now)
                            : '—'}
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </TableScroll>
            )}
            <p className="border-t border-line px-4 py-3 text-xs leading-relaxed text-ink-secondary">
              Degraded and down services are injected conditions of the
              simulation. They influence whether events reach the destination —
              they never affect the workspace itself.
            </p>
          </Panel>
        </div>
      )}
    </>
  );
}
