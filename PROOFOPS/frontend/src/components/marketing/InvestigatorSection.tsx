import { ScanSearch } from 'lucide-react';
import { Panel, PanelHeader } from '../ui/Panel';
import { Badge } from '../ui/Badge';
import { SAMPLE_LABEL } from './demoFixtures';

/**
 * AI Investigator section. Deliberately an evidence panel, not a chat
 * hero: confirmed facts and AI-generated hypotheses are visually and
 * semantically separated.
 */
export function InvestigatorSection() {
  return (
    <section
      id="investigator"
      className="section-anchor border-b border-line bg-surface py-16 lg:py-20"
      aria-labelledby="investigator-heading"
    >
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:gap-12">
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-wide text-brand uppercase">AI Investigator</p>
          <h2 id="investigator-heading" className="mt-2 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            Investigate with evidence
          </h2>
          <p className="mt-4 text-[0.9375rem] leading-relaxed text-ink-secondary">
            When a mismatch or a failed delivery needs explaining, the
            Investigator assembles what the records show into a readable
            structure: what is confirmed, what is hypothesised, what to check
            next, and where each statement came from.
          </p>
          <ul className="mt-5 space-y-2 text-[0.8125rem] text-ink-secondary">
            {[
              'It reads the record. It never becomes the verifier.',
              'Hypotheses are labelled and never presented as outcomes.',
              'It cannot modify records or change verification results.',
              'When it is unavailable, the rest of ProofOps is unaffected.',
            ].map((item) => (
              <li key={item} className="flex gap-2">
                <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <Panel className="overflow-hidden">
          <PanelHeader
            title={
              <span className="inline-flex items-center gap-2">
                <ScanSearch aria-hidden className="size-4 text-brand" />
                Investigation — TRX-88437
              </span>
            }
            description="A mismatch under review, structured as evidence"
            actions={<Badge tone="neutral">Sample</Badge>}
          />
          <div className="grid gap-4 p-4 lg:grid-cols-2">
            <section>
              <h3 className="text-xs font-semibold tracking-wide text-success uppercase">
                Confirmed facts
              </h3>
              <ul className="mt-2 space-y-1.5 text-[0.8125rem] text-ink">
                {[
                  'Source settled ₦250,000.00 at 18:40:58 (SRC-3AB90D12).',
                  'Receipt claims ₦500,000.00 for reference TRX-88437.',
                  'The claim exceeds the source amount by ₦250,000.00.',
                  'No second payment from this payer exists in the window.',
                ].map((fact) => (
                  <li key={fact} className="flex gap-2">
                    <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-success" />
                    {fact}
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h3 className="text-xs font-semibold tracking-wide text-warning uppercase">
                Possible causes
                <span className="ml-1 font-normal normal-case text-ink-secondary">(hypotheses)</span>
              </h3>
              <ul className="mt-2 space-y-1.5 text-[0.8125rem] text-ink-secondary">
                {[
                  'A second payment was made and never presented.',
                  'The receipt was altered before submission.',
                  'A partial refund reduced the settled amount after the receipt was issued.',
                ].map((cause) => (
                  <li key={cause} className="flex gap-2">
                    <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-warning" />
                    {cause}
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h3 className="text-xs font-semibold tracking-wide text-info uppercase">
                Relevant events
              </h3>
              <ul className="mt-2 space-y-1.5 text-[0.8125rem] text-ink-secondary">
                <li className="font-technical">18:40:58 · payment.settled</li>
                <li className="font-technical">18:41:03 · receipt.submitted</li>
                <li className="font-technical">18:41:05 · verification.completed</li>
                <li className="font-technical">20:12:42 · delivery.failed (502)</li>
              </ul>
            </section>

            <section>
              <h3 className="text-xs font-semibold tracking-wide text-info uppercase">
                Recommended next checks
              </h3>
              <ol className="mt-2 space-y-1.5 text-[0.8125rem] text-ink-secondary">
                {[
                  'Ask the payer to confirm the amount debited.',
                  'Check the source for refunds after the receipt time.',
                  'Review the merchant endpoint logs for the failed event.',
                ].map((check, index) => (
                  <li key={check} className="flex gap-2">
                    <span className="font-technical text-ink">{index + 1}.</span>
                    {check}
                  </li>
                ))}
              </ol>
            </section>

            <section className="lg:col-span-2">
              <h3 className="text-xs font-semibold tracking-wide text-ink-secondary uppercase">
                Source references
              </h3>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {['vrf_88437', 'SRC-3AB90D12', 'evt_9f21c4ee', 'INC-2043'].map((ref) => (
                  <li key={ref}>
                    <span className="font-technical rounded-full border border-line bg-surface-muted px-2 py-0.5 text-xs text-ink-secondary">
                      {ref}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
          <p className="border-t border-line px-4 py-2 text-xs text-ink-secondary">
            {SAMPLE_LABEL} — illustrative investigation output. Hypotheses are labelled
            and never treated as verification results.
          </p>
        </Panel>
      </div>
    </section>
  );
}
