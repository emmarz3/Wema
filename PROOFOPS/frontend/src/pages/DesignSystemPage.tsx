import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/layout/AppShell';
import { Panel, PanelBody, PanelHeader } from '../components/ui/Panel';
import { Button } from '../components/ui/Button';
import { Badge, Chip } from '../components/ui/Badge';
import { Field, Input, Select, Textarea, Checkbox, Switch } from '../components/ui/Field';
import { DataTable, type Column } from '../components/ui/Table';
import { SegmentedControl, Tabs } from '../components/ui/Tabs';
import { Dialog, Drawer } from '../components/ui/Dialog';
import { Pagination } from '../components/ui/Pagination';
import { SearchInput } from '../components/ui/SearchInput';
import { Skeleton, Spinner } from '../components/ui/Loading';
import {
  EmptyState,
  ErrorState,
  LoadingState,
  NoticeBanner,
  UnavailableState,
} from '../components/ui/States';
import { api, isSimulated } from '../api';
import type { ApiError } from '../api/errors';
import { CopyButton } from '../components/ui/CopyButton';
import { CodeBlock } from '../components/ui/CodeBlock';
import { DropdownMenu, MenuItem, MenuLabel, MenuSeparator } from '../components/ui/DropdownMenu';
import { Tooltip } from '../components/ui/Tooltip';
import { useToast } from '../state/toast';
import {
  checkOutcomeLabels,
  checkOutcomes,
  checkOutcomeTones,
  checkOutcomeIcons,
  deliveryStatusLabels,
  deliveryStatuses,
  deliveryStatusTones,
  deliveryStatusIcons,
  incidentSeverityLabels,
  incidentSeverities,
  incidentSeverityTones,
  incidentSeverityIcons,
  verificationResultLabels,
  verificationResults,
  verificationResultTones,
  verificationResultIcons,
  type StatusTone,
} from '../lib/status';
import { formatMoney, formatPercent, formatRelativeTime, formatDateTime } from '../lib/format';
import { CircleCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { pageVariants } from '../lib/motion';

/**
 * Design system catalogue. A real, working reference of every token,
 * component and state in the system — used by the team while building
 * the workspace screens. It is a functional page, not a placeholder.
 */

const TOKENS: Array<{ name: string; value: string; usage: string }> = [
  { name: '--color-brand', value: '#990D81', usage: 'Primary purple — selected nav, primary buttons, links' },
  { name: '--color-accent', value: '#AE328E', usage: 'Secondary purple — accents' },
  { name: '--color-plum', value: '#38203B', usage: 'Deep plum — footers, code surfaces' },
  { name: '--color-canvas', value: '#F5F4F7', usage: 'Page background' },
  { name: '--color-surface', value: '#FFFFFF', usage: 'Cards, panels, tables' },
  { name: '--color-ink', value: '#26212B', usage: 'Main text' },
  { name: '--color-ink-secondary', value: '#6D6673', usage: 'Secondary text' },
  { name: '--color-line', value: '#E4DEE7', usage: 'Borders' },
  { name: '--color-success', value: '#287D61', usage: 'Verified / healthy / delivered' },
  { name: '--color-warning', value: '#A66B16', usage: 'Review / degraded / retrying' },
  { name: '--color-danger', value: '#B42318', usage: 'Mismatch / failed / critical' },
  { name: '--color-info', value: '#315E8A', usage: 'Informational accents' },
];

const TONES: StatusTone[] = ['brand', 'success', 'warning', 'danger', 'info', 'neutral'];

interface SampleRow {
  id: string;
  reference: string;
  amount: number;
  status: string;
}

const SAMPLE_ROWS: SampleRow[] = [
  { id: '1', reference: 'TRX-88412', amount: 25000000, status: 'verified' },
  { id: '2', reference: 'TRX-88413', amount: 50000000, status: 'mismatch' },
  { id: '3', reference: 'TRX-88414', amount: 750000, status: 'unverified' },
];

export function DesignSystemPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [tab, setTab] = useState<'overview' | 'verification' | 'infrastructure'>('overview');
  const [segment, setSegment] = useState<'24h' | '7d' | '30d'>('7d');
  const [page, setPage] = useState(1);
  const [switchOn, setSwitchOn] = useState(true);
  const [checked, setChecked] = useState(false);
  const toast = useToast();

  /* Live source probe: the Error and Success states below are driven by a
     real call through the typed client, so the catalogue demonstrates the
     states a real request produces instead of a mock. */
  const [probe, setProbe] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [probeDetail, setProbeDetail] = useState<string>('');

  const runProbe = async () => {
    setProbe('loading');
    try {
      const result = await api.ping();
      setProbe('ok');
      setProbeDetail(`Source answered: ${JSON.stringify(result)}`);
    } catch (error) {
      setProbe('error');
      const apiError = error as ApiError;
      setProbeDetail(`${apiError.code} (HTTP ${apiError.status}): ${apiError.message}`);
    }
  };

  const columns: Array<Column<SampleRow>> = [
    { key: 'reference', header: 'Reference', render: (row) => <span className="font-technical">{row.reference}</span>, sortable: true },
    {
      key: 'amount',
      header: 'Amount',
      numeric: true,
      sortable: true,
      render: (row) => formatMoney({ amountMinor: row.amount, currency: 'NGN' }),
    },
    {
      key: 'status',
      header: 'Result',
      sortable: true,
      render: (row) => {
        const result = row.status as keyof typeof verificationResultLabels;
        const Icon = verificationResultIcons[result];
        return (
          <Badge tone={verificationResultTones[result]} icon={Icon}>
            {verificationResultLabels[result]}
          </Badge>
        );
      },
    },
  ];

  return (
    <motion.div variants={pageVariants} initial="hidden" animate="visible">
      <PageHeader
        title="Design system"
        description="Every token, component and state the ProofOps interface is built from. This catalogue is the reference implementation workspace screens reuse."
      />

      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6">
        {/* ---------------------------------------------------------- tokens */}
        <Panel>
          <PanelHeader
            title="Colour tokens"
            description="Wema-inspired purple and white. Purple is the brand colour, not the colour of every component — the interface stays predominantly white and neutral."
          />
          <PanelBody className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {TOKENS.map((token) => (
              <div key={token.name} className="flex items-start gap-3 rounded-control border border-line p-3">
                <span
                  aria-hidden
                  className="size-8 shrink-0 rounded-control border border-line"
                  style={{ backgroundColor: token.value }}
                />
                <div className="min-w-0">
                  <p className="font-technical text-ink">{token.name}</p>
                  <p className="font-technical text-ink-secondary">{token.value}</p>
                  <p className="mt-1 text-xs text-ink-secondary">{token.usage}</p>
                </div>
              </div>
            ))}
          </PanelBody>
        </Panel>

        {/* ------------------------------------------------------ typography */}
        <Panel>
          <PanelHeader title="Typography" description="Inter for interface text, JetBrains Mono for identifiers and code. Numeric readouts use tabular figures." />
          <PanelBody className="space-y-4">
            <div>
              <p className="text-xs font-semibold tracking-wide text-ink-secondary uppercase">Inter</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight">Know what happened to every transaction.</p>
              <p className="mt-1 text-sm text-ink-secondary">
                Verify payment records, identify discrepancies, and trace infrastructure events — with evidence you can inspect.
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold tracking-wide text-ink-secondary uppercase">Mono / technical</p>
              <p className="font-technical">TRX-88412 · PRF-2026-1043 · wh_evt_9f21c4</p>
            </div>
            <div className="flex flex-wrap gap-6">
              <p data-numeric="true" className="text-lg font-semibold">
                {formatMoney({ amountMinor: 50000000, currency: 'NGN' })} · {formatPercent(99.42)}
              </p>
              <p className="text-[0.8125rem] text-ink-secondary">
                {formatDateTime('2026-10-13T14:32:07Z')} · {formatRelativeTime('2026-10-13T14:32:07Z')}
              </p>
            </div>
          </PanelBody>
        </Panel>

        {/* --------------------------------------------------------- buttons */}
        <Panel>
          <PanelHeader title="Buttons" description="150–200 ms colour transitions. Loading state disables the control and announces busy." />
          <PanelBody className="flex flex-wrap items-center gap-3">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
            <Button loading>Working…</Button>
            <Button size="sm">Small</Button>
          </PanelBody>
        </Panel>

        {/* ----------------------------------------------------------- forms */}
        <Panel>
          <PanelHeader title="Form controls" description="Labels, hints and errors are wired with aria attributes; validation messages are announced." />
          <PanelBody className="grid gap-4 sm:grid-cols-2">
            <Field label="Transaction reference" htmlFor="ds-reference" hint="As shown on the customer record." required>
              <Input id="ds-reference" placeholder="TRX-000000" />
            </Field>
            <Field label="Provider" htmlFor="ds-provider">
              <Select id="ds-provider" defaultValue="">
                <option value="" disabled>Select a provider</option>
                <option value="bank-a">Bank A (simulated)</option>
                <option value="psp-b">PSP B (simulated)</option>
              </Select>
            </Field>
            <Field label="Amount (NGN)" htmlFor="ds-amount" error="Amount must be greater than zero.">
              <Input id="ds-amount" numeric invalid defaultValue="0.00" />
            </Field>
            <Field label="Investigation note" htmlFor="ds-note" className="sm:col-span-2">
              <Textarea id="ds-note" placeholder="Record what you checked and what you found." />
            </Field>
            <div className="flex items-center gap-6">
              <Checkbox label="Attach receipt" checked={checked} onChange={(event) => setChecked(event.target.checked)} />
              <div className="flex-1">
                <Switch checked={switchOn} onChange={setSwitchOn} label="Notify on mismatch" description="In-app alert when a verification returns a mismatch." />
              </div>
            </div>
            <div className="sm:col-span-2">
              <SearchInput value="" onValueChange={() => {}} placeholder="Debounced search (300 ms)" />
            </div>
          </PanelBody>
        </Panel>

        {/* ---------------------------------------------------------- badges */}
        <Panel>
          <PanelHeader
            title="Status vocabulary"
            description="One badge per status. Colour is never the only signal — every status carries text and an icon."
          />
          <PanelBody className="space-y-4">
            <div>
              <p className="mb-2 text-xs font-semibold tracking-wide text-ink-secondary uppercase">Verification results</p>
              <div className="flex flex-wrap gap-2">
                {verificationResults.map((result) => (
                  <Badge key={result} tone={verificationResultTones[result]} icon={verificationResultIcons[result]}>
                    {verificationResultLabels[result]}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold tracking-wide text-ink-secondary uppercase">Check outcomes</p>
              <div className="flex flex-wrap gap-2">
                {checkOutcomes.map((outcome) => (
                  <Badge key={outcome} tone={checkOutcomeTones[outcome]} icon={checkOutcomeIcons[outcome]}>
                    {checkOutcomeLabels[outcome]}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold tracking-wide text-ink-secondary uppercase">Webhook delivery</p>
              <div className="flex flex-wrap gap-2">
                {deliveryStatuses.map((status) => (
                  <Badge key={status} tone={deliveryStatusTones[status]} icon={deliveryStatusIcons[status]}>
                    {deliveryStatusLabels[status]}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold tracking-wide text-ink-secondary uppercase">Incident severity</p>
              <div className="flex flex-wrap gap-2">
                {incidentSeverities.map((severity) => (
                  <Badge key={severity} tone={incidentSeverityTones[severity]} icon={incidentSeverityIcons[severity]}>
                    {incidentSeverityLabels[severity]}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold tracking-wide text-ink-secondary uppercase">Tones & chips</p>
              <div className="flex flex-wrap gap-2">
                {TONES.map((tone) => (
                  <Badge key={tone} tone={tone}>{tone}</Badge>
                ))}
                <Chip>Metadata chip</Chip>
              </div>
            </div>
          </PanelBody>
        </Panel>

        {/* ----------------------------------------------------------- table */}
        <Panel>
          <PanelHeader
            title="Data table"
            description="Sortable headers announce direction; numeric cells use tabular figures; the container scrolls instead of the page."
          />
          <DataTable
            caption="Sample verification records"
            columns={columns}
            rows={SAMPLE_ROWS}
            getRowKey={(row) => row.id}
            sort={{ key: 'amount', direction: 'desc' }}
            mobileCard={(row) => (
              <div className="p-4">
                <p className="font-technical text-sm text-ink">{row.reference}</p>
                <p data-numeric="true" className="mt-1 text-sm text-ink">
                  {formatMoney({ amountMinor: row.amount, currency: 'NGN' })}
                </p>
              </div>
            )}
          />
          <div className="border-t border-line p-3">
            <Pagination page={page} pageSize={10} total={87} onPageChange={setPage} />
          </div>
        </Panel>

        {/* --------------------------------------------------- tabs & menus */}
        <Panel>
          <PanelHeader title="Tabs, segmented control & menus" description="Keyboard operable with correct roles." />
          <PanelBody className="space-y-4">
            <Tabs
              label="Preview modes"
              value={tab}
              onChange={setTab}
              tabs={[
                { value: 'overview', label: 'Overview' },
                { value: 'verification', label: 'Verification', count: 12 },
                { value: 'infrastructure', label: 'Infrastructure' },
              ]}
            />
            <div className="flex flex-wrap items-center gap-3">
              <SegmentedControl
                label="Time range"
                value={segment}
                onChange={setSegment}
                options={[
                  { value: '24h', label: '24h' },
                  { value: '7d', label: '7d' },
                  { value: '30d', label: '30d' },
                ]}
              />
              <DropdownMenu
                label="Row actions"
                trigger={(props) => (
                  <Button {...props} variant="secondary" size="sm">
                    Actions
                  </Button>
                )}
              >
                {(close) => (
                  <>
                    <MenuLabel>Proof record</MenuLabel>
                    <MenuItem icon={<span aria-hidden>⧉</span>} onClick={close}>Copy Proof ID</MenuItem>
                    <MenuItem onClick={close}>Export report</MenuItem>
                    <MenuSeparator />
                    <MenuItem tone="danger" onClick={close}>Revoke share link</MenuItem>
                  </>
                )}
              </DropdownMenu>
              <Tooltip content="Verification results are produced by the source, never by the interface.">
                <span className="text-[0.8125rem] text-ink-secondary underline decoration-dotted">
                  Hover for guidance
                </span>
              </Tooltip>
            </div>
          </PanelBody>
        </Panel>

        {/* --------------------------------------------------- dialog/drawer */}
        <Panel>
          <PanelHeader title="Dialog & drawer" description="Focus moves in, Escape closes, focus returns to the trigger, background scroll locks." />
          <PanelBody className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => setDialogOpen(true)}>Open dialog</Button>
            <Button variant="secondary" onClick={() => setDrawerOpen(true)}>Open drawer</Button>
          </PanelBody>
        </Panel>

        {/* --------------------------------------------------------- states */}
        <Panel>
          <PanelHeader
            title="States"
            description={`Loading, empty, error and honest-unavailable are shared components so every screen speaks the same language. Configured source: ${
              isSimulated ? 'simulated (labelled)' : 'live ProofOps API'
            }.`}
          />
          <PanelBody className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-control border border-line">
              <div className="border-b border-line px-3 py-2 text-xs font-semibold tracking-wide text-ink-secondary uppercase">Loading</div>
              <div className="space-y-2 p-4">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
                <Spinner label="Loading records" />
              </div>
            </div>
            <div className="rounded-control border border-line">
              <div className="border-b border-line px-3 py-2 text-xs font-semibold tracking-wide text-ink-secondary uppercase">Empty</div>
              <EmptyState
                title="No verifications yet"
                description="Run your first verification and it will appear here with its evidence."
                action={
                  <Link
                    to="/app/verification"
                    className="inline-flex h-8 items-center rounded-control border border-transparent bg-brand px-3 text-[0.8125rem] font-medium text-white transition-colors duration-fast ease-standard hover:bg-brand-hover"
                  >
                    Verify a transaction
                  </Link>
                }
              />
            </div>
            <div className="rounded-control border border-line">
              <div className="flex items-center justify-between border-b border-line px-3 py-2">
                <span className="text-xs font-semibold tracking-wide text-ink-secondary uppercase">Error → success (live probe)</span>
                <Button size="sm" variant="secondary" onClick={runProbe} loading={probe === 'loading'}>
                  Probe the source
                </Button>
              </div>
              {probe === 'loading' ? (
                <LoadingState label="Contacting the configured data source" />
              ) : probe === 'ok' ? (
                <EmptyState
                  title="Source responded"
                  description={probeDetail}
                  icon={CircleCheck}
                />
              ) : (
                <ErrorState
                  description={
                    probeDetail ||
                    'Every request that fails renders here with the reason the source gave — never a fabricated value.'
                  }
                  onRetry={runProbe}
                />
              )}
            </div>
            <div className="rounded-control border border-line">
              <div className="border-b border-line px-3 py-2 text-xs font-semibold tracking-wide text-ink-secondary uppercase">Unavailable (honest)</div>
              <UnavailableState description="This capability is not provided by the configured data source yet." />
            </div>
            <div className="lg:col-span-2">
              <NoticeBanner tone="warning" title="Verification limits">
                A receipt alone is never treated as authoritative proof of payment. Outcomes compare receipt claims against the source record.
              </NoticeBanner>
            </div>
          </PanelBody>
        </Panel>

        {/* -------------------------------------------------------- toasts */}
        <Panel>
          <PanelHeader title="Toasts" description="Raised only after an operation's result is known." />
          <PanelBody className="flex flex-wrap gap-3">
            <Button size="sm" variant="secondary" onClick={() => toast.push({ tone: 'success', title: 'Share link created', description: 'Expires in 72 hours.' })}>
              Success toast
            </Button>
            <Button size="sm" variant="secondary" onClick={() => toast.push({ tone: 'error', title: 'Verification failed', description: 'The source could not be reached. No outcome was recorded.' })}>
              Error toast
            </Button>
            <Button size="sm" variant="secondary" onClick={() => toast.push({ tone: 'info', title: 'Report exported', description: 'The CSV download has started.' })}>
              Info toast
            </Button>
          </PanelBody>
        </Panel>

        {/* ---------------------------------------------------------- code */}
        <Panel>
          <PanelHeader title="Code & clipboard" description="Used by the developer console and integration examples." />
          <PanelBody className="space-y-3">
            <CodeBlock
              language="json"
              code={`{
  "reference": "TRX-88412",
  "result": "mismatch",
  "claimed_amount": { "amount_minor": 50000000, "currency": "NGN" },
  "source_amount": { "amount_minor": 25000000, "currency": "NGN" },
  "checks": [
    { "key": "amount", "outcome": "failed" }
  ]
}`}
            />
            <CodeBlock
              language="shell"
              code={`# Verify a claim against the authoritative source
curl -X POST https://api.proofops.test/v1/verifications \\
  -H "Authorization: Bearer $PROOFOPS_API_KEY" \\
  -H "Idempotency-Key: 9f21c4" \\
  -d '{"reference": "TRX-88412", "provider": "bank-a"}'`}
            />
            <div className="flex flex-wrap gap-2">
              <CopyButton value="PRF-2026-1043" label="Copy Proof ID" />
              <CopyButton value="wh_evt_9f21c4" label="Copy event ID" size="sm" />
            </div>
          </PanelBody>
        </Panel>
      </div>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Revoke share link"
        description="Anyone holding this link will lose access immediately. The proof record itself is unaffected."
        footer={
          <>
            <Button variant="secondary" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button variant="danger" onClick={() => setDialogOpen(false)}>Revoke link</Button>
          </>
        }
      >
        <p className="text-[0.8125rem] text-ink-secondary">
          Destructive actions always state the consequence before the confirmation
          button. The interface never performs an irreversible financial action
          without an explicit confirmation.
        </p>
      </Dialog>

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Evidence drawer"
        description="Detail panels slide over content on narrow viewports."
      >
        <p className="text-[0.8125rem] text-ink-secondary">
          Drawers hold detail content without losing the list behind them. Escape
          and the backdrop close them; focus returns to the invoking control.
        </p>
      </Drawer>
    </motion.div>
  );
}
