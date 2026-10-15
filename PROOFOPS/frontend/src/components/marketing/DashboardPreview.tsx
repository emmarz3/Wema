import { useState } from 'react';
import { motion } from 'motion/react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AlertTriangle, CheckCircle2, Gauge, ListChecks } from 'lucide-react';
import { Panel, PanelHeader } from '../ui/Panel';
import { Badge } from '../ui/Badge';
import { SegmentedControl } from '../ui/Tabs';
import { DataTable, type Column } from '../ui/Table';
import { EmptyState } from '../ui/States';
import { cn } from '../../lib/utils';
import {
  formatDateTime,
  formatMoney,
  formatPercent,
  formatRelativeTime,
  ratio,
} from '../../lib/format';
import { chartAxis, chartPalette, toneHex } from '../../lib/chartPalette';
import {
  PREVIEW_DELIVERY_MIX,
  PREVIEW_DISCREPANCIES,
  PREVIEW_EVENTS,
  PREVIEW_INCIDENTS,
  PREVIEW_LATENCY,
  PREVIEW_PROVIDERS,
  PREVIEW_RESULT_MIX,
  PREVIEW_VERIFICATIONS,
  SAMPLE_LABEL,
  type PreviewVerificationRow,
} from './demoFixtures';
import {
  deliveryStatusLabels,
  deliveryStatusTones,
  discrepancyKindLabels,
  incidentSeverityShortLabels,
  incidentSeverityTones,
  incidentStatusLabels,
  incidentStatusTones,
  providerStatusTones,
  verificationResultLabels,
  verificationResultTones,
  verificationResultIcons,
} from '../../lib/status';
import { pageVariants } from '../../lib/motion';

type Mode = 'overview' | 'verification' | 'infrastructure';

const MODE_OPTIONS: Array<{ value: Mode; label: string }> = [
  { value: 'overview', label: 'Overview' },
  { value: 'verification', label: 'Verification' },
  { value: 'infrastructure', label: 'Infrastructure' },
];

function SampleNotice() {
  return (
    <p className="flex items-center gap-1.5 rounded-control border border-warning-line bg-warning-soft px-3 py-1.5 text-xs font-medium text-warning">
      <AlertTriangle aria-hidden className="size-3.5" />
      {SAMPLE_LABEL} — figures do not represent any real provider or institution.
    </p>
  );
}

function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  hint?: string;
  icon: typeof Gauge;
  tone?: 'neutral' | 'success' | 'warning' | 'danger';
}) {
  return (
    <div className="rounded-panel border border-line bg-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-ink-secondary">{label}</p>
        <Icon
          aria-hidden
          className={cn(
            'size-4',
            tone === 'success' && 'text-success',
            tone === 'warning' && 'text-warning',
            tone === 'danger' && 'text-danger',
            tone === 'neutral' && 'text-ink-secondary',
          )}
        />
      </div>
      <p data-numeric="true" className="mt-1.5 text-2xl font-semibold tracking-tight text-ink">
        {value}
      </p>
      {hint ? <p className="mt-0.5 text-xs text-ink-secondary">{hint}</p> : null}
    </div>
  );
}

function ResultMixChart() {
  const data = PREVIEW_RESULT_MIX.map((entry) => ({
    name: verificationResultLabels[entry.result],
    count: entry.count,
    tone: toneHex[verificationResultTones[entry.result]],
  }));
  return (
    <div className="h-40">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
          <CartesianGrid stroke={chartAxis.grid} vertical={false} />
          <XAxis dataKey="name" tick={chartAxis.tick} axisLine={{ stroke: chartAxis.stroke }} tickLine={false} />
          <YAxis tick={chartAxis.tick} axisLine={false} tickLine={false} width={40} />
          <RTooltip contentStyle={chartAxis.tooltip.contentStyle} />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.tone} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function LatencyChart() {
  return (
    <div className="h-40">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={PREVIEW_LATENCY} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
          <CartesianGrid stroke={chartAxis.grid} vertical={false} />
          <XAxis dataKey="at" tick={chartAxis.tick} axisLine={{ stroke: chartAxis.stroke }} tickLine={false} />
          <YAxis tick={chartAxis.tick} axisLine={false} tickLine={false} width={44} unit=" ms" />
          <RTooltip
            contentStyle={chartAxis.tooltip.contentStyle}
            formatter={(value, name) => [`${value ?? 0} ms`, name === 'p95Ms' ? 'p95 latency' : 'p50 latency']}
          />
          <Line type="monotone" dataKey="p95Ms" name="p95Ms" stroke={chartPalette.brand} strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="p50Ms" name="p50Ms" stroke={chartPalette.info} strokeWidth={1.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function DeliveryMixChart() {
  const data = PREVIEW_DELIVERY_MIX.map((entry) => ({
    name: deliveryStatusLabels[entry.status],
    count: entry.count,
    tone: toneHex[deliveryStatusTones[entry.status]],
  }));
  return (
    <div className="h-40">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
          <CartesianGrid stroke={chartAxis.grid} vertical={false} />
          <XAxis dataKey="name" tick={chartAxis.tick} axisLine={{ stroke: chartAxis.stroke }} tickLine={false} />
          <YAxis tick={chartAxis.tick} axisLine={false} tickLine={false} width={40} />
          <RTooltip contentStyle={chartAxis.tooltip.contentStyle} />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.tone} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function VerificationRows({ rows }: { rows: PreviewVerificationRow[] }) {
  const [sort, setSort] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'at',
    direction: 'desc',
  });
  const columns: Array<Column<PreviewVerificationRow>> = [
    {
      key: 'reference',
      header: 'Reference',
      sortable: true,
      render: (row) => <span className="font-technical">{row.reference}</span>,
    },
    {
      key: 'amount',
      header: 'Amount',
      numeric: true,
      sortable: true,
      render: (row) => formatMoney({ amountMinor: row.amountMinor, currency: row.currency }),
    },
    {
      key: 'result',
      header: 'Result',
      sortable: true,
      render: (row) => {
        const Icon = verificationResultIcons[row.result];
        return (
          <Badge tone={verificationResultTones[row.result]} icon={Icon}>
            {verificationResultLabels[row.result]}
          </Badge>
        );
      },
    },
    {
      key: 'at',
      header: 'Verified',
      hideOnMobile: true,
      sortable: true,
      render: (row) => (
        <span className="text-ink-secondary">{formatRelativeTime(row.at)}</span>
      ),
    },
  ];
  const sorted = [...rows].sort((a, b) => {
    const direction = sort.direction === 'asc' ? 1 : -1;
    if (sort.key === 'amount') return (a.amountMinor - b.amountMinor) * direction;
    if (sort.key === 'result') return a.result.localeCompare(b.result) * direction;
    return a.at.localeCompare(b.at) * direction;
  });
  return (
    <DataTable
      caption="Sample recent verification activity"
      columns={columns}
      rows={sorted}
      getRowKey={(row) => row.reference}
      sort={sort}
      onSortChange={(key) =>
        setSort((current) => ({
          key,
          direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
        }))
      }
      mobileCard={(row) => (
        <div className="flex items-center justify-between gap-2 p-4">
          <div>
            <p className="font-technical text-sm text-ink">{row.reference}</p>
            <p data-numeric="true" className="mt-0.5 text-xs text-ink-secondary">
              {formatMoney({ amountMinor: row.amountMinor, currency: row.currency })}
            </p>
          </div>
          <Badge tone={verificationResultTones[row.result]}>
            {verificationResultLabels[row.result]}
          </Badge>
        </div>
      )}
    />
  );
}

/**
 * Dashboard preview. A responsive preview of the workspace with three
 * modes. Every figure is simulated sample data and labelled as such.
 */
export function DashboardPreview() {
  const [mode, setMode] = useState<Mode>('overview');

  const volume = PREVIEW_RESULT_MIX.reduce((sum, entry) => sum + entry.count, 0);
  const verified = PREVIEW_RESULT_MIX.find((entry) => entry.result === 'verified')?.count ?? 0;
  const openDiscrepancies = PREVIEW_DISCREPANCIES.reduce((sum, entry) => sum + entry.open, 0);
  const openIncidents = PREVIEW_INCIDENTS.filter((incident) => incident.status !== 'resolved').length;

  return (
    <section
      id="dashboard"
      className="section-anchor border-b border-line bg-surface py-16 lg:py-20"
      aria-labelledby="dashboard-heading"
    >
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold tracking-wide text-brand uppercase">
              Workspace preview
            </p>
            <h2 id="dashboard-heading" className="mt-2 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
              The workspace your team works in
            </h2>
            <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-secondary">
              Operational density, honest empty states and metrics that link to
              the records behind them. Switch between the three views below.
            </p>
          </div>
          <SegmentedControl label="Preview mode" value={mode} onChange={setMode} options={MODE_OPTIONS} />
        </header>

        <div className="mt-5">
          <SampleNotice />
        </div>

        <motion.div
          key={mode}
          variants={pageVariants}
          initial="hidden"
          animate="visible"
          className="mt-5 space-y-4"
        >
          {mode === 'overview' ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <StatTile
                  label="Verifications (24h)"
                  value={volume.toLocaleString('en-NG')}
                  hint="across all sources"
                  icon={ListChecks}
                />
                <StatTile
                  label="Verified rate"
                  value={formatPercent(ratio(verified, volume))}
                  hint={`${verified.toLocaleString('en-NG')} of ${volume.toLocaleString('en-NG')}`}
                  icon={CheckCircle2}
                  tone="success"
                />
                <StatTile
                  label="Open discrepancies"
                  value={String(openDiscrepancies)}
                  hint="amount · reference · missing · timing"
                  icon={AlertTriangle}
                  tone="warning"
                />
                <StatTile
                  label="Open incidents"
                  value={String(openIncidents)}
                  hint="highest open: SEV2"
                  icon={Gauge}
                  tone="danger"
                />
              </div>

              <div className="grid min-w-0 gap-4 lg:grid-cols-2">
                <Panel className="min-w-0">
                  <PanelHeader title="Results by outcome" description="Last 24 hours" />
                  <div className="p-4">
                    <ResultMixChart />
                  </div>
                </Panel>
                <Panel>
                  <PanelHeader
                    title="Discrepancies"
                    description="Open by kind"
                    actions={<Badge tone="warning">{openDiscrepancies} open</Badge>}
                  />
                  <ul className="p-4">
                    {PREVIEW_DISCREPANCIES.map((entry) => (
                      <li
                        key={entry.kind}
                        className="flex items-center justify-between gap-2 border-b border-line py-2 text-[0.8125rem] last:border-0"
                      >
                        <span className="text-ink">{discrepancyKindLabels[entry.kind]}</span>
                        <span data-numeric="true" className="font-semibold text-ink">
                          {entry.open}
                        </span>
                      </li>
                    ))}
                  </ul>
                </Panel>
              </div>

              <Panel className="min-w-0">
                <PanelHeader
                  title="Recent verification activity"
                  description="Newest first — the workspace links each row to its evidence"
                />
                <VerificationRows rows={PREVIEW_VERIFICATIONS} />
              </Panel>

              <div className="grid min-w-0 gap-4 lg:grid-cols-2">
                <Panel className="min-w-0">
                  <PanelHeader title="Provider status" description="Current snapshot" />
                  <ul className="p-4">
                    {PREVIEW_PROVIDERS.map((provider) => (
                      <li
                        key={provider.provider}
                        className="flex flex-wrap items-center justify-between gap-2 border-b border-line py-2 text-[0.8125rem] last:border-0"
                      >
                        <span className="text-ink">{provider.provider}</span>
                        <span className="flex items-center gap-2">
                          <span data-numeric="true" className="text-ink-secondary">
                            {formatPercent(provider.availabilityPct, 2)} · p95 {provider.p95Ms} ms
                          </span>
                          <Badge tone={providerStatusTones[provider.status]}>{provider.status}</Badge>
                        </span>
                      </li>
                    ))}
                  </ul>
                </Panel>
                <Panel className="min-w-0">
                  <PanelHeader title="Incident activity" description="Recent incidents" />
                  <ul className="p-4">
                    {PREVIEW_INCIDENTS.map((incident) => (
                      <li
                        key={incident.id}
                        className="border-b border-line py-2 last:border-0"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-technical text-xs text-ink">{incident.id}</span>
                          <span className="flex gap-1.5">
                            <Badge tone={incidentSeverityTones[incident.severity]}>
                              {incidentSeverityShortLabels[incident.severity]}
                            </Badge>
                            <Badge tone={incidentStatusTones[incident.status]}>
                              {incidentStatusLabels[incident.status]}
                            </Badge>
                          </span>
                        </div>
                        <p className="mt-1 text-[0.8125rem] text-ink">{incident.title}</p>
                        <p className="mt-0.5 text-xs text-ink-secondary">
                          {incident.provider} · opened {formatRelativeTime(incident.openedAt)}
                        </p>
                      </li>
                    ))}
                  </ul>
                </Panel>
              </div>
            </>
          ) : null}

          {mode === 'verification' ? (
            <>
              <div className="grid min-w-0 gap-4 lg:grid-cols-[1.2fr_1fr]">
                <Panel className="min-w-0">
                  <PanelHeader title="Results by outcome" description="Last 24 hours — counts stay distinct" />
                  <div className="p-4">
                    <ResultMixChart />
                  </div>
                </Panel>
                <Panel className="min-w-0">
                  <PanelHeader title="What each outcome means" description="Vocabulary, in one place" />
                  <ul className="space-y-2 p-4 text-xs">
                    {PREVIEW_RESULT_MIX.map((entry) => (
                      <li key={entry.result} className="flex items-start justify-between gap-3">
                        <span className="text-ink-secondary">
                          <strong className="font-medium text-ink">
                            {verificationResultLabels[entry.result]}
                          </strong>{' '}
                          — {entry.result === 'verified'
                            ? 'source and claim agree'
                            : entry.result === 'mismatch'
                              ? 'source contradicts the claim'
                              : entry.result === 'unverified'
                                ? 'no comparison completed yet'
                                : entry.result === 'suspicious'
                                  ? 'warrants manual review'
                                  : 'outcome could not be determined'}
                        </span>
                        <span data-numeric="true" className="font-semibold text-ink">
                          {entry.count}
                        </span>
                      </li>
                    ))}
                  </ul>
                </Panel>
              </div>

              <Panel className="min-w-0">
                <PanelHeader
                  title="Recent verification activity"
                  description="Sortable — numeric columns use tabular figures"
                />
                <VerificationRows rows={PREVIEW_VERIFICATIONS} />
              </Panel>

              <Panel className="min-w-0">
                <PanelHeader title="Recent infrastructure events" description="Payment events and provider notices" />
                <ul className="divide-y divide-line">
                  {PREVIEW_EVENTS.map((event) => (
                    <li key={`${event.reference}-${event.at}`} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-xs">
                      <span className="flex items-center gap-2">
                        <span className="font-technical text-ink">{event.eventType}</span>
                        <span className="font-technical text-ink-secondary">{event.reference}</span>
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="text-ink-secondary">{formatDateTime(event.at)}</span>
                        <Badge tone={deliveryStatusTones[event.deliveryStatus]}>
                          {deliveryStatusLabels[event.deliveryStatus]}
                        </Badge>
                      </span>
                    </li>
                  ))}
                </ul>
              </Panel>
            </>
          ) : null}

          {mode === 'infrastructure' ? (
            <>
              <div className="grid min-w-0 gap-4 lg:grid-cols-2">
                <Panel className="min-w-0">
                  <PanelHeader title="Latency percentiles" description="Provider API, last 8 hours" />
                  <div className="p-4">
                    <LatencyChart />
                  </div>
                </Panel>
                <Panel className="min-w-0">
                  <PanelHeader title="Webhook delivery outcomes" description="Attempts by outcome" />
                  <div className="p-4">
                    <DeliveryMixChart />
                  </div>
                </Panel>
              </div>

              <Panel className="min-w-0">
                <PanelHeader title="Provider health" description="Availability, latency and error rate" />
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <caption className="sr-only">Sample provider health</caption>
                    <thead>
                      <tr className="border-b border-line text-left text-xs tracking-wide text-ink-secondary uppercase">
                        <th className="px-4 py-2 font-medium">Provider</th>
                        <th className="px-4 py-2 font-medium">Status</th>
                        <th className="px-4 py-2 text-right font-medium">Availability</th>
                        <th className="px-4 py-2 text-right font-medium">p95</th>
                        <th className="px-4 py-2 text-right font-medium">Errors</th>
                      </tr>
                    </thead>
                    <tbody>
                      {PREVIEW_PROVIDERS.map((provider) => (
                        <tr key={provider.provider} className="border-b border-line last:border-0">
                          <td className="px-4 py-2.5 text-ink">{provider.provider}</td>
                          <td className="px-4 py-2.5">
                            <Badge tone={providerStatusTones[provider.status]}>{provider.status}</Badge>
                          </td>
                          <td data-numeric="true" className="px-4 py-2.5 text-right text-ink">
                            {formatPercent(provider.availabilityPct, 2)}
                          </td>
                          <td data-numeric="true" className="px-4 py-2.5 text-right text-ink">
                            {provider.p95Ms} ms
                          </td>
                          <td data-numeric="true" className="px-4 py-2.5 text-right text-ink">
                            {formatPercent(provider.errorRatePct, 2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Panel>

              <Panel className="min-w-0">
                <PanelHeader title="Incident history" description="Recent service incidents" />
                <ul className="divide-y divide-line">
                  {PREVIEW_INCIDENTS.map((incident) => (
                    <li key={incident.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                      <div className="min-w-0">
                        <p className="text-[0.8125rem] text-ink">{incident.title}</p>
                        <p className="mt-0.5 text-xs text-ink-secondary">
                          <span className="font-technical">{incident.id}</span> · {incident.provider} · opened{' '}
                          {formatRelativeTime(incident.openedAt)}
                        </p>
                      </div>
                      <span className="flex gap-1.5">
                        <Badge tone={incidentSeverityTones[incident.severity]}>
                          {incidentSeverityShortLabels[incident.severity]}
                        </Badge>
                        <Badge tone={incidentStatusTones[incident.status]}>
                          {incidentStatusLabels[incident.status]}
                        </Badge>
                      </span>
                    </li>
                  ))}
                </ul>
              </Panel>

              {/* Charts only where they answer a question; an honest empty panel
                  demonstrates the empty state the workspace uses. */}
              {PREVIEW_LATENCY.length === 0 ? (
                <Panel>
                  <EmptyState
                    title="No latency data in this window"
                    description="The chart renders data only when the source reports it."
                  />
                </Panel>
              ) : null}
            </>
          ) : null}
        </motion.div>

        <p className="mt-5 text-xs text-ink-secondary">
          Preview figures are simulated samples generated for this page. The
          workspace renders the same components against live data — and shows
          honest empty states when no data exists.
        </p>
      </div>
    </section>
  );
}
