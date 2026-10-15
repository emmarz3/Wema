import { Badge } from '../ui/Badge';
import { Panel } from '../ui/Panel';
import { CircleCheck, FileText, Landmark } from 'lucide-react';
import { formatDateTime, formatMoney } from '../../lib/format';
import { verificationResultLabels } from '../../lib/status';
import { SAMPLE_LABEL } from './demoFixtures';

/**
 * The hero preview: a realistic verification record rendered with real
 * interface components. Every value is simulated sample data and is
 * labelled as such on the panel itself.
 */
export function HeroVerificationPreview() {
  const claimed = { amountMinor: 50_000_000, currency: 'NGN' };
  const source = { amountMinor: 50_000_000, currency: 'NGN' };

  const checks = [
    { label: 'Source record located', observed: '1 matching record' },
    { label: 'Amount match', observed: '₦500,000.00 = ₦500,000.00' },
    { label: 'Reference match', observed: 'TRX-88412 = TRX-88412' },
    { label: 'Duplicate check', observed: 'No prior claim' },
  ];

  return (
    <Panel className="overflow-hidden">
      {/* Panel chrome */}
      <div className="flex items-center justify-between gap-2 border-b border-line bg-surface-muted/60 px-4 py-2.5">
        <p className="text-xs font-semibold tracking-wide text-ink-secondary uppercase">
          Verification record
        </p>
        <span className="rounded-full border border-warning-line bg-warning-soft px-2 py-0.5 text-xs font-medium text-warning">
          Sample
        </span>
      </div>

      <div className="space-y-4 p-4">
        {/* Identity */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="font-technical text-ink">PRF-2026-1043</p>
            <p className="mt-0.5 text-xs text-ink-secondary">
              Reference{' '}
              <span className="font-technical text-ink-secondary">TRX-88412</span> ·
              Bank A (simulated)
            </p>
          </div>
          <Badge tone="success" icon={CircleCheck}>
            {verificationResultLabels.verified}
          </Badge>
        </div>

        {/* Side-by-side comparison */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-control border border-line p-3">
            <p className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-secondary">
              <FileText aria-hidden className="size-3.5" />
              Receipt claim
            </p>
            <p data-numeric="true" className="mt-1 text-lg font-semibold text-ink">
              {formatMoney(claimed)}
            </p>
            <p className="mt-1 text-xs text-ink-secondary">
              Claimed {formatDateTime('2026-10-12T16:04:22Z')}
            </p>
          </div>
          <div className="rounded-control border border-success-line bg-success-soft/40 p-3">
            <p className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-secondary">
              <Landmark aria-hidden className="size-3.5" />
              Source record
            </p>
            <p data-numeric="true" className="mt-1 text-lg font-semibold text-ink">
              {formatMoney(source)}
            </p>
            <p className="mt-1 text-xs text-ink-secondary">
              Settled · SRC-9F21C4EE
            </p>
          </div>
        </div>

        {/* Checks */}
        <div>
          <p className="text-xs font-semibold tracking-wide text-ink-secondary uppercase">
            Verification checks
          </p>
          <ul className="mt-2 space-y-1.5">
            {checks.map((check) => (
              <li key={check.label} className="flex items-center justify-between gap-3 text-[0.8125rem]">
                <span className="inline-flex items-center gap-1.5 text-ink">
                  <CircleCheck aria-hidden className="size-3.5 text-success" />
                  {check.label}
                </span>
                <span className="truncate text-ink-secondary">{check.observed}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Outcome strip */}
        <div className="flex items-center justify-between gap-2 rounded-control border border-line bg-surface-muted/60 px-3 py-2">
          <p className="text-[0.8125rem] text-ink-secondary">
            Outcome preserved with evidence
          </p>
          <p className="font-technical text-xs text-ink-secondary">4 checks · 1 proof</p>
        </div>
      </div>

      <p className="border-t border-line px-4 py-2 text-xs text-ink-secondary">
        {SAMPLE_LABEL}.
      </p>
    </Panel>
  );
}
