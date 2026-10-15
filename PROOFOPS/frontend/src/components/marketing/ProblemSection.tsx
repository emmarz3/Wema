import { motion } from 'motion/react';
import { useInView } from 'motion/react';
import { useRef } from 'react';

interface Problem {
  id: string;
  title: string;
  body: string;
  diagram: 'screenshot' | 'amount' | 'duplicate' | 'webhook' | 'statuses' | 'timeline' | 'evidence';
}

const PROBLEMS: Problem[] = [
  {
    id: 'screenshots',
    title: 'Unverified screenshots and receipts',
    body: 'A customer sends a payment screenshot. Someone checks it by eye. Nobody can prove, later, what was checked or against what.',
    diagram: 'screenshot',
  },
  {
    id: 'amounts',
    title: 'Mismatched amounts or references',
    body: 'The receipt says one figure, the bank record says another. The difference is found late, during an argument, if at all.',
    diagram: 'amount',
  },
  {
    id: 'duplicates',
    title: 'Missing or duplicate records',
    body: 'A payment never appears at the source, or appears twice. Either way the books drift from reality and the cause is unclear.',
    diagram: 'duplicate',
  },
  {
    id: 'webhooks',
    title: 'Failed or delayed webhooks',
    body: 'The payment succeeded. The notification did not arrive. Downstream systems wait, retry, or quietly mark the order as unpaid.',
    diagram: 'webhook',
  },
  {
    id: 'statuses',
    title: 'Payment status mistaken for notification status',
    body: '“The payment failed” and “we were never told about the payment” are different problems with different fixes — but they are usually logged as one.',
    diagram: 'statuses',
  },
  {
    id: 'investigations',
    title: 'Slow incident investigations',
    body: 'When something breaks, the timeline lives across dashboards, chat threads and provider portals. Reconstructing it takes hours.',
    diagram: 'timeline',
  },
  {
    id: 'evidence',
    title: 'Disconnected evidence and audit records',
    body: 'The decision is recorded somewhere; the reason behind it is somewhere else. Audits ask questions nobody can answer from one place.',
    diagram: 'evidence',
  },
];

/** Small, purposeful diagrams — each illustrates the failure it sits next to. */
function Diagram({ kind }: { kind: Problem['diagram'] }) {
  switch (kind) {
    case 'screenshot':
      return (
        <svg viewBox="0 0 96 48" className="h-12 w-full" role="img" aria-label="A receipt with a question mark, unverified">
          <rect x="8" y="6" width="34" height="36" rx="3" className="fill-surface-muted stroke-line-strong" />
          <line x1="14" y1="16" x2="36" y2="16" className="stroke-line-strong" strokeWidth="2" />
          <line x1="14" y1="23" x2="36" y2="23" className="stroke-line-strong" strokeWidth="2" />
          <line x1="14" y1="30" x2="28" y2="30" className="stroke-line-strong" strokeWidth="2" />
          <circle cx="70" cy="24" r="13" className="fill-warning-soft stroke-warning" />
          <text x="70" y="29" textAnchor="middle" className="fill-warning text-[14px] font-bold">?</text>
        </svg>
      );
    case 'amount':
      return (
        <svg viewBox="0 0 96 48" className="h-12 w-full" role="img" aria-label="Two bars of different length: claimed amount larger than source amount">
          <rect x="8" y="10" width="66" height="10" rx="2" className="fill-brand-soft stroke-brand-line" />
          <rect x="8" y="28" width="33" height="10" rx="2" className="fill-success-soft stroke-success-line" />
          <text x="8" y="46" className="fill-ink-secondary text-[7px]">claim</text>
          <text x="60" y="46" className="fill-ink-secondary text-[7px]">source</text>
        </svg>
      );
    case 'duplicate':
      return (
        <svg viewBox="0 0 96 48" className="h-12 w-full" role="img" aria-label="Two identical records where one is expected">
          <rect x="10" y="8" width="30" height="16" rx="3" className="fill-surface stroke-line-strong" />
          <rect x="14" y="24" width="30" height="16" rx="3" className="fill-surface stroke-danger" strokeDasharray="3 2" />
          <circle cx="72" cy="24" r="12" className="fill-danger-soft stroke-danger-line" />
          <text x="72" y="28" textAnchor="middle" className="fill-danger text-[11px] font-bold">2×</text>
        </svg>
      );
    case 'webhook':
      return (
        <svg viewBox="0 0 96 48" className="h-12 w-full" role="img" aria-label="An event attempting delivery to an endpoint and failing">
          <circle cx="14" cy="24" r="7" className="fill-brand-soft stroke-brand" />
          <path d="M24 24 H50" className="stroke-danger" strokeWidth="2" strokeDasharray="4 3" />
          <rect x="52" y="14" width="34" height="20" rx="3" className="fill-surface stroke-line-strong" />
          <line x1="60" y1="22" x2="78" y2="22" className="stroke-danger" strokeWidth="2" />
          <line x1="69" y1="14" x2="69" y2="34" className="stroke-danger" strokeWidth="2" />
        </svg>
      );
    case 'statuses':
      return (
        <svg viewBox="0 0 96 48" className="h-12 w-full" role="img" aria-label="A successful payment with a failed delivery shown as two separate facts">
          <rect x="6" y="10" width="38" height="12" rx="6" className="fill-success-soft stroke-success-line" />
          <text x="25" y="19" textAnchor="middle" className="fill-success text-[8px] font-semibold">paid</text>
          <rect x="52" y="10" width="38" height="12" rx="6" className="fill-danger-soft stroke-danger-line" />
          <text x="71" y="19" textAnchor="middle" className="fill-danger text-[8px] font-semibold">not notified</text>
          <path d="M25 26 v8 h46 v-8" className="stroke-line-strong" strokeWidth="1.5" fill="none" />
          <text x="48" y="44" textAnchor="middle" className="fill-ink-secondary text-[7px]">one event, two outcomes</text>
        </svg>
      );
    case 'timeline':
      return (
        <svg viewBox="0 0 96 48" className="h-12 w-full" role="img" aria-label="A scattered timeline being gathered into order">
          <line x1="12" y1="12" x2="12" y2="36" className="stroke-line-strong" strokeWidth="2" />
          <line x1="34" y1="16" x2="34" y2="32" className="stroke-line-strong" strokeWidth="2" />
          <line x1="56" y1="10" x2="56" y2="38" className="stroke-line-strong" strokeWidth="2" />
          <line x1="78" y1="18" x2="78" y2="30" className="stroke-line-strong" strokeWidth="2" />
          <path d="M12 24 H84" className="stroke-brand" strokeWidth="1.5" strokeDasharray="4 3" />
        </svg>
      );
    case 'evidence':
      return (
        <svg viewBox="0 0 96 48" className="h-12 w-full" role="img" aria-label="A decision record with its evidence separated by a gap">
          <rect x="8" y="12" width="26" height="24" rx="3" className="fill-surface stroke-line-strong" />
          <rect x="62" y="12" width="26" height="24" rx="3" className="fill-surface stroke-line-strong" />
          <path d="M36 24 H60" className="stroke-danger" strokeWidth="2" strokeDasharray="4 3" />
          <text x="21" y="27" textAnchor="middle" className="fill-ink-secondary text-[7px]">decision</text>
          <text x="75" y="27" textAnchor="middle" className="fill-ink-secondary text-[7px]">evidence</text>
        </svg>
      );
  }
}

/**
 * The problem section. Editorial layout, practical language, one small
 * purposeful diagram per challenge. No fear-based messaging, no
 * unsupported fraud claims.
 */
export function ProblemSection() {
  const ref = useRef<HTMLOListElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section id="problem" className="section-anchor border-b border-line bg-surface py-16 lg:py-20">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.4fr] lg:gap-14">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <p className="text-xs font-semibold tracking-wide text-brand uppercase">The problem</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            Operations teams are asked to prove what they cannot see
          </h2>
          <p className="mt-4 text-[0.9375rem] leading-relaxed text-ink-secondary">
            Payments are recorded in one system, notified through another, and
            argued about in a third. ProofOps keeps the claim, the authoritative
            record and the infrastructure events in one place — so the answer is
            inspectable rather than anecdotal.
          </p>
        </div>

        <ol ref={ref} className="space-y-3">
          {PROBLEMS.map((problem, index) => (
            <motion.li
              key={problem.id}
              initial={{ opacity: 0, y: 10 }}
              animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
              transition={{ duration: 0.25, delay: Math.min(index * 0.05, 0.3) }}
              className="flex gap-4 rounded-panel border border-line bg-canvas p-4"
            >
              <div className="hidden w-24 shrink-0 sm:block">
                <Diagram kind={problem.diagram} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink">
                  <span className="mr-2 font-technical text-ink-secondary">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  {problem.title}
                </p>
                <p className="mt-1 text-[0.8125rem] leading-relaxed text-ink-secondary">
                  {problem.body}
                </p>
              </div>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}
