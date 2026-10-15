import { useRef } from 'react';
import { motion, useInView } from 'motion/react';
import { ArrowRight, FileInput, GitCompare, Search, Share2 } from 'lucide-react';

const STEPS = [
  {
    id: 'receive',
    title: 'Receive transaction evidence',
    body: 'A claim arrives — a receipt, a reference, an uploaded file. ProofOps records it exactly as presented, as a claim.',
    icon: FileInput,
    detail: ['Receipt upload and extracted fields', 'Reference and amount captured', 'Claims labelled as claims, not payments'],
  },
  {
    id: 'verify',
    title: 'Verify against an authoritative source',
    body: 'The comparison runs server-side against the provider record. Every check records what was compared and why it passed, failed or could not be determined.',
    icon: GitCompare,
    detail: ['Source lookup on the server', 'Amount, reference, status, duplicates', '“Unknown” is a real answer'],
  },
  {
    id: 'investigate',
    title: 'Investigate discrepancies and infrastructure events',
    body: 'When something does not line up, the related events, webhook attempts and incident timeline are already attached — so the cause is reachable.',
    icon: Search,
    detail: ['Discrepancy with both values attached', 'Webhook attempts and provider responses', 'Incident timelines in one place'],
  },
  {
    id: 'record',
    title: 'Record and share the verification outcome',
    body: 'The outcome is preserved as a proof record with a Proof ID. Share what is authorised, with the recipients you choose, until it expires.',
    icon: Share2,
    detail: ['Proof ID for every outcome', 'Field allow-lists, expiry, revocation', 'Audit trail of every action'],
  },
];

/** Four-step flow. Reveals subtly on scroll; reduced motion shows it at rest. */
export function HowItWorks() {
  const ref = useRef<HTMLOListElement>(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section
      id="how-it-works"
      className="section-anchor border-b border-line bg-canvas py-16 lg:py-20"
      aria-labelledby="how-heading"
    >
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <header className="max-w-2xl">
          <p className="text-xs font-semibold tracking-wide text-brand uppercase">How it works</p>
          <h2 id="how-heading" className="mt-2 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            From claim to preserved proof in four steps
          </h2>
        </header>

        <ol ref={ref} className="relative mt-10 grid gap-4 lg:grid-cols-4">
          {/* Connector line on wide screens */}
          <span
            aria-hidden
            className="absolute top-6 right-8 left-8 hidden h-px bg-line lg:block"
          />
          {STEPS.map((step, index) => (
            <motion.li
              key={step.id}
              initial={{ opacity: 0, y: 16 }}
              animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className="relative rounded-panel border border-line bg-surface p-5"
            >
              <span className="flex size-9 items-center justify-center rounded-control border border-brand-line bg-brand-soft text-brand">
                <step.icon aria-hidden className="size-4.5" />
              </span>
              <p className="mt-3 font-technical text-xs text-ink-secondary">
                Step {index + 1}
              </p>
              <h3 className="mt-1 text-[0.9375rem] font-semibold text-ink">{step.title}</h3>
              <p className="mt-2 text-[0.8125rem] leading-relaxed text-ink-secondary">
                {step.body}
              </p>
              <ul className="mt-3 space-y-1">
                {step.detail.map((item) => (
                  <li key={item} className="flex gap-1.5 text-xs text-ink-secondary">
                    <ArrowRight aria-hidden className="mt-0.5 size-3 shrink-0 text-ink-secondary/70" />
                    {item}
                  </li>
                ))}
              </ul>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}
