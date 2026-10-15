import { LockKeyhole, ScrollText, ShieldCheck, Split, TimerReset, Users } from 'lucide-react';

const ITEMS = [
  {
    id: 'server-side',
    icon: ShieldCheck,
    title: 'Server-side verification',
    body: 'Verification decisions are made by the backend against the authoritative source. The interface renders outcomes; it never computes them.',
  },
  {
    id: 'signed-events',
    icon: LockKeyhole,
    title: 'Signed event handling',
    body: 'Outbound webhook events are signed per endpoint. Signatures are verified server-side, and signing secrets are never displayed after creation.',
  },
  {
    id: 'rbac',
    icon: Users,
    title: 'Role-based access',
    body: 'Roles gate screens and actions as a usability layer. The backend re-authorises every request; nothing rests on a client-side check alone.',
  },
  {
    id: 'audit',
    icon: ScrollText,
    title: 'Audit trails',
    body: 'Verifications, share links, note edits, assignments and role changes are recorded with actor and timestamp.',
  },
  {
    id: 'idempotency',
    icon: TimerReset,
    title: 'Idempotency',
    body: 'Creating operations accept an idempotency key, so a retried request cannot create a duplicate financial action.',
  },
  {
    id: 'sharing',
    icon: Split,
    title: 'Controlled proof sharing',
    body: 'Share links expose only allow-listed fields, expire on schedule, and revoke immediately. Uploaded receipts stay private behind short-lived URLs.',
  },
];

const LIMITS = [
  'A receipt is a claim. It is never treated as proof that a payment occurred.',
  'Verification compares what the source reports — if the source is unreachable, the outcome is unknown, not failed.',
  'Webhook delivery status says nothing about payment success, and vice versa.',
  'Simulated data in the sandbox is demonstration data, not a bank confirmation.',
];

/** Security and trust. Only implemented mechanisms are described — no claims beyond them. */
export function SecuritySection() {
  return (
    <section
      id="security"
      className="section-anchor border-b border-line bg-surface py-16 lg:py-20"
      aria-labelledby="security-heading"
    >
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <header className="max-w-2xl">
          <p className="text-xs font-semibold tracking-wide text-brand uppercase">Security &amp; trust</p>
          <h2 id="security-heading" className="mt-2 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            Built so the answer can be defended
          </h2>
          <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-secondary">
            ProofOps is designed around one principle: the authoritative
            decision belongs to the backend, and everything the interface shows
            must be traceable back to it.
          </p>
        </header>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ITEMS.map((item) => (
            <div key={item.id} className="rounded-panel border border-line bg-canvas p-5">
              <span className="inline-flex size-9 items-center justify-center rounded-control border border-brand-line bg-brand-soft text-brand">
                <item.icon aria-hidden className="size-4.5" />
              </span>
              <h3 className="mt-3 text-[0.9375rem] font-semibold text-ink">{item.title}</h3>
              <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-ink-secondary">{item.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-panel border border-line bg-canvas p-5">
          <h3 className="text-[0.9375rem] font-semibold text-ink">
            Verification limits — stated plainly
          </h3>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {LIMITS.map((limit) => (
              <li key={limit} className="flex gap-2 text-[0.8125rem] leading-relaxed text-ink-secondary">
                <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-warning" />
                {limit}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-ink-secondary">
            ProofOps makes no claim of certifications, compliance status, bank
            partnerships or production integrations beyond what is described
            above.
          </p>
        </div>
      </div>
    </section>
  );
}
