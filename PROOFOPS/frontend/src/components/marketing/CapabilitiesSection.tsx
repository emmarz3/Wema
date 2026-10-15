import { useRef } from 'react';
import { motion, useInView } from 'motion/react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Activity,
  BadgeCheck,
  Bell,
  FileSearch,
  FileStack,
  Landmark,
  Link2,
  ScanSearch,
  Terminal,
  Webhook,
} from 'lucide-react';
import { Panel, PanelHeader } from '../ui/Panel';
import { Badge } from '../ui/Badge';
import { CodeBlock } from '../ui/CodeBlock';
import { formatDateTime, formatMoney, formatPercent } from '../../lib/format';
import { chartAxis, chartPalette } from '../../lib/chartPalette';
import { PREVIEW_LATENCY, PREVIEW_PROVIDERS } from './demoFixtures';
import { SAMPLE_LABEL } from './demoFixtures';

interface Capability {
  id: string;
  nav: string;
  title: string;
  body: string;
  points: string[];
  preview: React.ReactNode;
}

/* ------------------------------------------------------------- previews */

function VerificationPreview() {
  return (
    <Panel className="mx-auto w-full max-w-md">
      <PanelHeader
        title="Verification detail"
        description="Every field the comparison used, with its outcome"
      />
      <div className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="font-technical text-ink">TRX-88437</span>
          <Badge tone="danger" icon={BadgeCheck}>
            Mismatch
          </Badge>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-control border border-line p-2.5">
            <p className="text-xs text-ink-secondary">Receipt claim</p>
            <p data-numeric="true" className="text-sm font-semibold text-ink">
              {formatMoney({ amountMinor: 50_000_000, currency: 'NGN' })}
            </p>
          </div>
          <div className="rounded-control border border-line bg-surface-muted/50 p-2.5">
            <p className="text-xs text-ink-secondary">Source record</p>
            <p data-numeric="true" className="text-sm font-semibold text-ink">
              {formatMoney({ amountMinor: 25_000_000, currency: 'NGN' })}
            </p>
          </div>
        </div>
        <ul className="space-y-1.5 text-xs">
          {[
            ['Amount match', 'Failed', 'danger'],
            ['Reference match', 'Passed', 'success'],
            ['Transaction status', 'Passed', 'success'],
            ['Duplicate check', 'Passed', 'success'],
          ].map(([label, state, tone]) => (
            <li key={label} className="flex items-center justify-between gap-2">
              <span className="text-ink">{label}</span>
              <Badge tone={tone as 'danger' | 'success'}>{state}</Badge>
            </li>
          ))}
        </ul>
      </div>
      <p className="border-t border-line px-4 py-2 text-xs text-ink-secondary">{SAMPLE_LABEL}.</p>
    </Panel>
  );
}

function ReceiptPreview() {
  return (
    <Panel className="mx-auto w-full max-w-md">
      <PanelHeader
        title="Extracted receipt fields"
        description="OCR output is treated as claims, never as settled fact"
      />
      <div className="p-4">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-line text-left text-ink-secondary">
              <th className="pb-1.5 font-medium">Field</th>
              <th className="pb-1.5 font-medium">Extracted</th>
              <th className="pb-1.5 text-right font-medium">Confidence</th>
            </tr>
          </thead>
          <tbody className="font-technical">
            {[
              ['amount', '₦500,000.00', 0.98],
              ['reference', 'TRX-88437', 0.91],
              ['paid_at', '12 Oct 2026, 18:41', 0.74],
              ['merchant', 'Northwind Trading', 0.62],
            ].map(([field, value, confidence]) => (
              <tr key={field} className="border-b border-line last:border-0">
                <td className="py-1.5 text-ink">{field}</td>
                <td className="py-1.5 text-ink">{value}</td>
                <td className="py-1.5 text-right">
                  <Badge
                    tone={(confidence as number) >= 0.9 ? 'success' : 'warning'}
                  >
                    {formatPercent((confidence as number) * 100, 0)}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-xs leading-relaxed text-ink-secondary">
          Low-confidence fields are flagged for manual review before any
          comparison runs. Reviewer decisions are recorded.
        </p>
      </div>
      <p className="border-t border-line px-4 py-2 text-xs text-ink-secondary">{SAMPLE_LABEL}.</p>
    </Panel>
  );
}

function ProofPreview() {
  return (
    <Panel className="mx-auto w-full max-w-md">
      <PanelHeader title="Proof record" description="One identifier for a preserved outcome" />
      <div className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="font-technical text-ink">PRF-2026-1043</span>
          <Badge tone="success">Verified</Badge>
        </div>
        <dl className="space-y-1 text-xs">
          <div className="flex justify-between gap-2">
            <dt className="text-ink-secondary">Reference</dt>
            <dd className="font-technical text-ink">TRX-88412</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-ink-secondary">Created</dt>
            <dd className="text-ink">{formatDateTime('2026-10-12T16:05:02Z')}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-ink-secondary">Current transaction status</dt>
            <dd>
              <Badge tone="success">Successful</Badge>
            </dd>
          </div>
        </dl>
        <div className="rounded-control border border-line p-2.5">
          <p className="text-xs font-medium text-ink">Share link</p>
          <p className="mt-1 truncate font-technical text-xs text-ink-secondary">
            proofops.test/p/prf-2026-1043?expires=72h
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge tone="info" icon={Link2}>
              Fields allow-listed
            </Badge>
            <Badge tone="neutral">Expires in 72h</Badge>
            <Badge tone="neutral">Revocable</Badge>
          </div>
        </div>
        <p className="text-xs leading-relaxed text-ink-secondary">
          The historical verification result stays visible even if the
          transaction later reverses — a later change never rewrites the proof.
        </p>
      </div>
      <p className="border-t border-line px-4 py-2 text-xs text-ink-secondary">{SAMPLE_LABEL}.</p>
    </Panel>
  );
}

function ReconciliationPreview() {
  const rows = [
    ['TRX-88102', 'matched', '₦120,000.00', ''],
    ['TRX-88117', 'matched', '₦64,500.00', ''],
    ['TRX-88129', 'duplicate', '₦310,000.00', 'seen twice in file'],
    ['TRX-88134', 'unmatched', '₦88,250.00', 'no source record'],
    ['TRX-88140', 'matched', '₦500,000.00', 'amount differs by ₦1.50'],
  ];
  const tone = (outcome: string) =>
    outcome === 'matched' ? 'success' : outcome === 'duplicate' ? 'warning' : 'danger';
  return (
    <Panel className="mx-auto w-full max-w-md">
      <PanelHeader
        title="Reconciliation results"
        description="Uploaded file compared against source records"
        actions={
          <div className="flex gap-1.5">
            <Badge tone="success">412 matched</Badge>
            <Badge tone="warning">9 duplicate</Badge>
            <Badge tone="danger">17 unmatched</Badge>
          </div>
        }
      />
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-line text-left text-ink-secondary">
              <th className="px-4 py-2 font-medium">Reference</th>
              <th className="px-4 py-2 font-medium">Outcome</th>
              <th className="px-4 py-2 text-right font-medium">Amount</th>
              <th className="px-4 py-2 font-medium">Note</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([reference, outcome, amount, note]) => (
              <tr key={reference} className="border-b border-line last:border-0">
                <td className="px-4 py-2 font-technical text-ink">{reference}</td>
                <td className="px-4 py-2">
                  <Badge tone={tone(outcome)}>{outcome}</Badge>
                </td>
                <td data-numeric="true" className="px-4 py-2 text-right text-ink">
                  {amount}
                </td>
                <td className="px-4 py-2 text-ink-secondary">{note || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="border-t border-line px-4 py-2.5">
        <p className="text-xs leading-relaxed text-ink-secondary">
          Suggested matches are proposed, never confirmed, until an authorised
          user accepts them.
        </p>
      </div>
      <p className="border-t border-line px-4 py-2 text-xs text-ink-secondary">{SAMPLE_LABEL}.</p>
    </Panel>
  );
}

function InfrastructurePreview() {
  return (
    <Panel className="mx-auto w-full max-w-md">
      <PanelHeader title="Provider health" description="Latency and error rate over the window" />
      <div className="p-4">
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={PREVIEW_LATENCY} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
              <CartesianGrid stroke={chartAxis.grid} vertical={false} />
              <XAxis dataKey="at" tick={chartAxis.tick} axisLine={{ stroke: chartAxis.stroke }} tickLine={false} />
              <YAxis tick={chartAxis.tick} axisLine={false} tickLine={false} width={44} unit=" ms" />
          <RTooltip
            contentStyle={chartAxis.tooltip.contentStyle}
            formatter={(value, name) => [`${value ?? 0} ms`, name === 'p95Ms' ? 'p95' : 'p50']}
          />
              <Line type="monotone" dataKey="p95Ms" stroke={chartPalette.brand} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="p50Ms" stroke={chartPalette.info} strokeWidth={1.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <ul className="mt-3 space-y-2">
          {PREVIEW_PROVIDERS.map((provider) => (
            <li key={provider.provider} className="flex items-center justify-between gap-2 text-xs">
              <span className="text-ink">{provider.provider}</span>
              <span className="flex items-center gap-2">
                <span data-numeric="true" className="text-ink-secondary">
                  p95 {provider.p95Ms} ms · {formatPercent(provider.errorRatePct, 2)}
                </span>
                <Badge
                  tone={
                    provider.status === 'healthy'
                      ? 'success'
                      : provider.status === 'degraded'
                        ? 'warning'
                        : 'danger'
                  }
                >
                  {provider.status}
                </Badge>
              </span>
            </li>
          ))}
        </ul>
      </div>
      <p className="border-t border-line px-4 py-2 text-xs text-ink-secondary">
        {SAMPLE_LABEL} — simulated provider health.
      </p>
    </Panel>
  );
}

function WebhookPreview() {
  return (
    <Panel className="mx-auto w-full max-w-md">
      <PanelHeader
        title="Delivery attempts"
        description="Every attempt, response and retry for one event"
      />
      <div className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-technical text-ink">evt_9f21c4ee</span>
          <Badge tone="danger">Failed</Badge>
        </div>
        <ul className="mt-3 divide-y divide-line rounded-control border border-line">
          {[
            ['#1', '20:12:42', 'timeout', '—', 'No response within 10s'],
            ['#2', '20:17:42', 'failed', '502', 'Bad gateway'],
            ['#3', '20:27:42', 'failed', '503', 'Service unavailable'],
          ].map(([attempt, at, outcome, status, error]) => (
            <li key={attempt} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-xs">
              <span className="font-technical text-ink">
                {attempt} · {at}
              </span>
              <span className="text-ink-secondary">
                {status !== '—' ? `HTTP ${status} · ` : ''}
                {error}
              </span>
              <Badge tone={outcome === 'timeout' ? 'warning' : 'danger'}>
                {outcome === 'timeout' ? 'Timed out' : 'Failed'}
              </Badge>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs leading-relaxed text-ink-secondary">
          Retries, backoff and dead-lettering are visible per event — a failed
          delivery never changes the payment it reported.
        </p>
      </div>
      <p className="border-t border-line px-4 py-2 text-xs text-ink-secondary">{SAMPLE_LABEL}.</p>
    </Panel>
  );
}

function IncidentPreview() {
  const timeline = [
    ['20:12:41', 'Payment settled at source', 'event'],
    ['20:12:42', 'Event emitted to merchant endpoint', 'event'],
    ['20:12:52', 'Delivery attempt 1 timed out', 'delivery'],
    ['20:17:42', 'Delivery attempt 2 returned 502', 'delivery'],
    ['20:31:10', 'Incident INC-2043 opened (SEV2)', 'status_change'],
    ['20:44:03', 'Endpoint owner notified; investigation started', 'note'],
  ];
  return (
    <Panel className="mx-auto w-full max-w-md">
      <PanelHeader title="Incident timeline" description="One chronological record across sources" />
      <div className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-technical text-ink">INC-2043</span>
          <div className="flex gap-1.5">
            <Badge tone="warning">SEV2</Badge>
            <Badge tone="danger">Investigating</Badge>
          </div>
        </div>
        <ol className="mt-3 space-y-0">
          {timeline.map(([at, label, kind], index) => (
            <li key={at} className="relative flex gap-3 pb-3 last:pb-0">
              <span aria-hidden className="flex flex-col items-center">
                <span
                  className={
                    kind === 'status_change'
                      ? 'size-2 rounded-full bg-warning'
                      : kind === 'note'
                        ? 'size-2 rounded-full bg-info'
                        : 'size-2 rounded-full bg-brand'
                  }
                />
                {index < timeline.length - 1 ? <span className="w-px flex-1 bg-line" /> : null}
              </span>
              <span className="min-w-0">
                <span className="font-technical text-xs text-ink-secondary">{at}</span>
                <span className="block text-xs text-ink">{label}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
      <p className="border-t border-line px-4 py-2 text-xs text-ink-secondary">{SAMPLE_LABEL}.</p>
    </Panel>
  );
}

function DeveloperPreview() {
  return (
    <div className="mx-auto w-full max-w-md space-y-3">
      <CodeBlock
        language="shell"
        code={`# Verify a claim against the authoritative source
curl -X POST https://api.proofops.test/v1/verifications \\
  -H "Authorization: Bearer $PROOFOPS_API_KEY" \\
  -H "Idempotency-Key: 9f21c4ee" \\
  -d '{"reference": "TRX-88437", "provider": "bank-a"}'`}
      />
      <CodeBlock
        language="json"
        code={`{
  "id": "vrf_88437",
  "reference": "TRX-88437",
  "result": "mismatch",
  "claimed_amount": { "amount_minor": 50000000, "currency": "NGN" },
  "source_amount": { "amount_minor": 25000000, "currency": "NGN" },
  "status": "complete",
  "proof_id": "PRF-2026-1044"
}`}
      />
    </div>
  );
}

function InvestigatorPreview() {
  return (
    <Panel className="mx-auto w-full max-w-md">
      <PanelHeader
        title="Investigation"
        description="Structured sections — confirmed facts stay separate from hypotheses"
      />
      <div className="space-y-3 p-4">
        <div>
          <p className="text-xs font-semibold tracking-wide text-success uppercase">Confirmed facts</p>
          <ul className="mt-1 space-y-1 text-xs text-ink">
            <li>Source settled ₦250,000.00 at 18:40:58.</li>
            <li>Receipt claims ₦500,000.00 — ₦250,000.00 above source.</li>
            <li>Two delivery attempts failed with 502/503.</li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold tracking-wide text-warning uppercase">Possible causes</p>
          <ul className="mt-1 space-y-1 text-xs text-ink-secondary">
            <li>Two separate payments made; only one receipt presented.</li>
            <li>Receipt edited after payment.</li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold tracking-wide text-info uppercase">Recommended next checks</p>
          <ul className="mt-1 space-y-1 text-xs text-ink-secondary">
            <li>Search the source for a second payment from the same payer.</li>
            <li>Check the merchant endpoint logs for the failed event.</li>
          </ul>
        </div>
        <p className="rounded-control border border-line bg-surface-muted/60 p-2 text-xs text-ink-secondary">
          Hypotheses are labelled and never treated as verification outcomes.
          The AI investigator does not decide — the source does.
        </p>
      </div>
      <p className="border-t border-line px-4 py-2 text-xs text-ink-secondary">
        {SAMPLE_LABEL} — illustrative investigation.
      </p>
    </Panel>
  );
}

/* ------------------------------------------------------------ section */

const CAPABILITIES: Capability[] = [
  {
    id: 'verification',
    nav: 'Transaction verification',
    title: 'Transaction verification against the authoritative source',
    body: 'Submit a claim and the comparison runs server-side. The interface shows what was compared, what came back, and why each check passed, failed, or could not be determined.',
    points: [
      'Source lookup happens on the server — never in the browser',
      'Unknown is a real outcome, shown when the source cannot answer',
      'Provider outages never render as a failed payment',
    ],
    preview: <VerificationPreview />,
  },
  {
    id: 'receipts',
    nav: 'Receipt evidence comparison',
    title: 'Receipt evidence, compared field by field',
    body: 'Upload a receipt and its extracted fields are treated as claims. Low-confidence fields are flagged for review before anything is compared — a screenshot alone never proves a payment.',
    points: [
      'Private previews through short-lived source-issued URLs',
      'Extraction confidence where the source provides it',
      'Reviewer decisions are recorded with the record',
    ],
    preview: <ReceiptPreview />,
  },
  {
    id: 'proof',
    nav: 'Proof IDs and shareable proof records',
    title: 'Proof IDs you can share, within limits you control',
    body: 'Every outcome is preserved as a proof record with a stable identifier. Share links expose only authorised fields, expire on schedule, and revoke instantly.',
    points: [
      'Field allow-lists decide what a recipient can see',
      'Expiry and revocation are first-class',
      'Later reversals never rewrite a recorded proof',
    ],
    preview: <ProofPreview />,
  },
  {
    id: 'reconciliation',
    nav: 'Financial reconciliation',
    title: 'Reconciliation that separates the four outcomes',
    body: 'Upload a dataset, map its columns, and let the run report matched, unmatched, duplicate and differing records. Nothing is confirmed until an authorised user confirms it.',
    points: [
      'Invalid rows are reported before a run starts',
      'Amount, currency, reversal and timing differences are kept distinct',
      'Suggested matches require an explicit accept or reject',
    ],
    preview: <ReconciliationPreview />,
  },
  {
    id: 'infrastructure',
    nav: 'Infrastructure monitoring',
    title: 'Infrastructure monitoring with units and time ranges',
    body: 'Provider availability, latency percentiles, error rates and recent health changes — charted only where they answer an operational question, always with an explicit source.',
    points: [
      'Simulated provider health is labelled as simulated',
      'Latency percentiles, not vague “fast/slow”',
      'Empty periods render as empty, never as invented lines',
    ],
    preview: <InfrastructurePreview />,
  },
  {
    id: 'webhooks',
    nav: 'Webhook delivery tracking',
    title: 'Webhook delivery tracking, attempt by attempt',
    body: 'See every delivery attempt with its response, duration and error. Retries and dead-lettering stay visible, and delivery status never masquerades as payment status.',
    points: [
      'Per-attempt history with status codes',
      'Delivery failures kept separate from transaction outcomes',
      'Filters by status, event type and provider',
    ],
    preview: <WebhookPreview />,
  },
  {
    id: 'incidents',
    nav: 'Incident investigation',
    title: 'Incidents with a timeline you can replay',
    body: 'Open an incident and follow the chronological trail: the payment, the event, the failed attempt, the alert, the note. Related transactions and webhook attempts sit next to it.',
    points: [
      'Confirmed facts kept apart from hypotheses',
      'Evidence, notes and resolution recorded together',
      'Assignment and status changes are audited',
    ],
    preview: <IncidentPreview />,
  },
  {
    id: 'developer',
    nav: 'Developer API integration',
    title: 'A developer surface that mirrors the contract',
    body: 'The same endpoints the interface uses, documented with request and response examples, signature verification and idempotency guidance. Keys are shown once and scoped.',
    points: [
      'Idempotency keys prevent duplicate operations',
      'Webhook signatures verified server-side',
      'Secrets are never retrievable after creation',
    ],
    preview: <DeveloperPreview />,
  },
  {
    id: 'investigator',
    nav: 'AI-assisted investigation',
    title: 'AI-assisted investigation, structured and labelled',
    body: 'The investigator summarises what the records show, proposes hypotheses, and suggests the next checks — presented as evidence panels, not a chat toy. It never verifies or mutates records.',
    points: [
      'Confirmed facts separated from possible causes',
      'Source references attached wherever available',
      'Unavailable states are explicit — the rest of ProofOps keeps working',
    ],
    preview: <InvestigatorPreview />,
  },
];

const ICONS: Record<string, typeof Landmark> = {
  verification: FileSearch,
  receipts: FileStack,
  proof: BadgeCheck,
  reconciliation: Landmark,
  infrastructure: Activity,
  webhooks: Webhook,
  incidents: Bell,
  developer: Terminal,
  investigator: ScanSearch,
};

/** Core capabilities. Each block pairs a concise explanation with a real preview. */
export function CapabilitiesSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <section
      id="platform"
      className="section-anchor border-b border-line bg-canvas py-16 lg:py-20"
      aria-labelledby="platform-heading"
    >
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <header className="max-w-2xl">
          <p className="text-xs font-semibold tracking-wide text-brand uppercase">Platform</p>
          <h2 id="platform-heading" className="mt-2 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            Two layers, one record of what happened
          </h2>
          <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-secondary">
            Financial verification explains whether a claim matches the
            authoritative record. Infrastructure intelligence explains why the
            systems around it behaved the way they did.
          </p>
        </header>

        <div ref={ref} className="mt-10 space-y-4">
          {CAPABILITIES.map((capability, index) => {
            const Icon = ICONS[capability.id] ?? Landmark;
            const reversed = index % 2 === 1;
            return (
              <motion.article
                key={capability.id}
                id={`platform-${capability.id}`}
                initial={{ opacity: 0, y: 14 }}
                animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
                transition={{ duration: 0.3, delay: Math.min(index * 0.04, 0.24) }}
                className="grid gap-6 rounded-panel border border-line bg-surface p-5 lg:grid-cols-2 lg:items-center lg:gap-10 lg:p-8"
              >
                <div className={reversed ? 'min-w-0 lg:order-2' : 'min-w-0'}>
                  <span className="inline-flex size-9 items-center justify-center rounded-control border border-brand-line bg-brand-soft text-brand">
                    <Icon aria-hidden className="size-4.5" />
                  </span>
                  <h3 className="mt-3 text-lg font-semibold tracking-tight text-ink">
                    {capability.title}
                  </h3>
                  <p className="mt-2 text-[0.875rem] leading-relaxed text-ink-secondary">
                    {capability.body}
                  </p>
                  <ul className="mt-3 space-y-1.5">
                    {capability.points.map((point) => (
                      <li key={point} className="flex gap-2 text-[0.8125rem] text-ink-secondary">
                        <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand" />
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className={reversed ? 'min-w-0 lg:order-1' : 'min-w-0'}>{capability.preview}</div>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
