import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Check,
  CircleAlert,
  CircleCheck,
  CircleHelp,
  CircleX,
  FileText,
  Landmark,
  Lock,
  Play,
  RotateCcw,
  StepForward,
} from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Panel, PanelHeader } from '../ui/Panel';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';
import { formatDateTime, formatMoney } from '../../lib/format';
import {
  checkOutcomeIcons,
  checkOutcomeLabels,
  checkOutcomeTones,
  deliveryStatusLabels,
  deliveryStatusTones,
  transactionStatusLabels,
  transactionStatusTones,
  verificationResultLabels,
  verificationResultTones,
  verificationResultIcons,
  labelOf,
} from '../../lib/status';
import { listItemVariants, transition } from '../../lib/motion';
import {
  DEMO_SCENARIOS,
  DEMO_STEPS,
  SAMPLE_LABEL,
  type DemoScenario,
} from './demoFixtures';

const AUTO_STEP_MS = 1000;
const AUTO_CHECK_MS = 420;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Interactive verification demonstration.
 *
 * Three scripted scenarios walk through what the interface does when a
 * claim is verified. The timing is illustrative: this is a walk-through of
 * the product's behaviour, not a bank verification, and no request leaves
 * the browser.
 */
export function VerificationDemo() {
  const [scenarioId, setScenarioId] = useState<DemoScenario['id']>('verified');
  const [cursor, setCursor] = useState(0);
  const [auto, setAuto] = useState(false);

  const scenario = useMemo(
    () => DEMO_SCENARIOS.find((item) => item.id === scenarioId) ?? DEMO_SCENARIOS[0],
    [scenarioId],
  );
  const total = 3 + scenario.checks.length;

  // Autoplay: advance the script on a timer. Manual stepping turns this off.
  useEffect(() => {
    if (!auto) return;
    if (cursor >= total) return;
    const delay = cursor < 2 ? AUTO_STEP_MS : AUTO_CHECK_MS;
    const timer = setTimeout(() => setCursor((value) => value + 1), delay);
    return () => clearTimeout(timer);
  }, [auto, cursor, total]);

  const reset = useCallback((id: DemoScenario['id']) => {
    setScenarioId(id);
    setCursor(0);
    setAuto(false);
  }, []);

  const stepIndex = clamp(cursor - 1, 0, DEMO_STEPS.length - 1);
  const revealedChecks = clamp(cursor - 2, 0, scenario.checks.length);
  const outcomeShown = cursor >= 3 + scenario.checks.length;
  const started = cursor > 0;
  const finished = cursor >= total;
  const announcementRef = useRef<HTMLParagraphElement>(null);

  return (
    <section id="demo" className="section-anchor border-b border-line bg-canvas py-16 lg:py-20">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <header className="max-w-2xl">
          <p className="text-xs font-semibold tracking-wide text-brand uppercase">
            Interactive demonstration
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            See how a verification runs
          </h2>
          <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-secondary">
            Choose a scenario, run it, and inspect the checks and evidence it
            produces. The animation represents the scripted demonstration —
            it is not a real bank verification.
          </p>
        </header>

        {/* Scenario selector */}
        <div
          role="tablist"
          aria-label="Demonstration scenarios"
          className="mt-8 flex flex-wrap gap-2"
        >
          {DEMO_SCENARIOS.map((item) => {
            const active = item.id === scenarioId;
            return (
              <button
                key={item.id}
                role="tab"
                aria-selected={active}
                aria-controls="demo-scenario-panel"
                tabIndex={active ? 0 : -1}
                onClick={() => reset(item.id)}
                className={cn(
                  'inline-flex items-center gap-2 rounded-control border px-3 py-2 text-[0.8125rem] font-medium transition-colors duration-fast ease-standard',
                  active
                    ? 'border-brand bg-brand-soft text-brand'
                    : 'border-line-strong bg-surface text-ink-secondary hover:text-ink',
                )}
              >
                {item.tabLabel}
              </button>
            );
          })}
        </div>

        <div
          id="demo-scenario-panel"
          role="tabpanel"
          aria-label={`${scenario.tabLabel} demonstration`}
          className="mt-4 grid gap-4 lg:grid-cols-[1.15fr_1fr]"
        >
          {/* ------------------------------------------------ run panel */}
          <Panel className="flex min-w-0 flex-col">
            <PanelHeader
              title={scenario.title}
              description={scenario.summary}
              actions={
                <Badge tone="warning" icon={Lock}>
                  Sandbox
                </Badge>
              }
            />

            {/* Progress rail */}
            <ol className="flex flex-wrap gap-x-4 gap-y-2 border-b border-line px-4 py-3">
              {DEMO_STEPS.map((step, index) => {
                const state =
                  !started
                    ? 'pending'
                    : index < stepIndex
                      ? 'done'
                      : index === stepIndex
                        ? 'active'
                        : 'pending';
                return (
                  <li key={step.id} className="flex items-center gap-2">
                    <span
                      aria-hidden
                      className={cn(
                        'flex size-5 items-center justify-center rounded-full border text-xs font-semibold',
                        state === 'done' && 'border-success bg-success text-white',
                        state === 'active' && 'border-brand bg-brand text-white',
                        state === 'pending' && 'border-line-strong bg-surface text-ink-secondary',
                      )}
                    >
                      {state === 'done' ? <Check className="size-3" /> : index + 1}
                    </span>
                    <span
                      className={cn(
                        'text-xs font-medium',
                        state === 'pending' ? 'text-ink-secondary' : 'text-ink',
                      )}
                    >
                      {step.label}
                    </span>
                  </li>
                );
              })}
            </ol>

            {/* Step narrative */}
            <div className="border-b border-line px-4 py-3">
              <p className="text-[0.8125rem] leading-relaxed text-ink-secondary">
                {started ? DEMO_STEPS[stepIndex].detail : 'Press “Run demonstration” to start the walk-through, or step through it at your own pace.'}
              </p>
              <p ref={announcementRef} aria-live="polite" className="sr-only">
                {started
                  ? `Step ${stepIndex + 1} of ${DEMO_STEPS.length}: ${DEMO_STEPS[stepIndex].label}. ${revealedChecks} of ${scenario.checks.length} checks shown.`
                  : ''}
              </p>
            </div>

            {/* Checks as they arrive */}
            <div className="flex-1 px-4 py-3">
              <p className="text-xs font-semibold tracking-wide text-ink-secondary uppercase">
                Verification checks
              </p>
              {revealedChecks === 0 ? (
                <p className="mt-2 text-[0.8125rem] text-ink-secondary">
                  {started
                    ? 'Waiting for the comparison step…'
                    : 'Checks appear here as the demonstration reaches them.'}
                </p>
              ) : (
                <ul className="mt-2 space-y-2">
                  <AnimatePresence initial={false}>
                    {scenario.checks.slice(0, revealedChecks).map((check, index) => {
                      const Icon = checkOutcomeIcons[check.outcome];
                      return (
                        <motion.li
                          key={check.key}
                          variants={listItemVariants}
                          initial="hidden"
                          animate="visible"
                          exit="hidden"
                          transition={{ ...transition.fast, delay: index === revealedChecks - 1 ? 0 : 0 }}
                          className={cn(
                            'rounded-control border p-3',
                            check.outcome === 'failed' && 'border-danger-line bg-danger-soft/40',
                            check.outcome === 'passed' && 'border-line bg-surface',
                          )}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-ink">
                              <Icon
                                aria-hidden
                                className={cn(
                                  'size-3.5',
                                  check.outcome === 'passed' && 'text-success',
                                  check.outcome === 'failed' && 'text-danger',
                                )}
                              />
                              {check.label}
                            </p>
                            <Badge tone={checkOutcomeTones[check.outcome]}>
                              {checkOutcomeLabels[check.outcome]}
                            </Badge>
                          </div>
                          <p className="mt-1 text-xs text-ink-secondary">{check.compared}</p>
                          <dl className="mt-2 grid gap-1 text-xs sm:grid-cols-2">
                            <div>
                              <dt className="text-ink-secondary">Expected</dt>
                              <dd className="font-technical text-ink">{check.expected}</dd>
                            </div>
                            <div>
                              <dt className="text-ink-secondary">Observed</dt>
                              <dd className="font-technical text-ink">{check.observed}</dd>
                            </div>
                          </dl>
                          <p className="mt-2 text-xs leading-relaxed text-ink-secondary">
                            {check.detail}
                          </p>
                        </motion.li>
                      );
                    })}
                  </AnimatePresence>
                </ul>
              )}
            </div>

            {/* Outcome */}
            <AnimatePresence>
              {outcomeShown ? (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={transition.base}
                  className="border-t border-line px-4 py-3"
                >
                  <div
                    className={cn(
                      'rounded-control border p-3',
                      scenario.outcome.result === 'verified' && 'border-success-line bg-success-soft/40',
                      scenario.outcome.result === 'mismatch' && 'border-danger-line bg-danger-soft/40',
                    )}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[0.8125rem] font-semibold text-ink">
                        {scenario.outcome.headline}
                      </p>
                      <Badge
                        tone={verificationResultTones[scenario.outcome.result]}
                        icon={verificationResultIcons[scenario.outcome.result]}
                      >
                        {verificationResultLabels[scenario.outcome.result]}
                      </Badge>
                    </div>
                    <p className="mt-1.5 text-xs leading-relaxed text-ink-secondary">
                      {scenario.outcome.explanation}
                    </p>
                    <p className="mt-2 text-xs text-ink-secondary">
                      Preserved as proof record{' '}
                      <span className="font-technical text-ink">
                        PRF-2026-{1043 + DEMO_SCENARIOS.indexOf(scenario)}
                      </span>{' '}
                      with every check and both sides of the evidence attached.
                    </p>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>

            {/* Controls */}
            <div className="flex flex-wrap items-center gap-2 border-t border-line px-4 py-3">
              {!started ? (
                <>
                  <Button
                    icon={<Play aria-hidden className="size-3.5" />}
                    onClick={() => {
                      setCursor(0);
                      setAuto(true);
                    }}
                  >
                    Run demonstration
                  </Button>
                  <Button
                    variant="secondary"
                    icon={<StepForward aria-hidden className="size-3.5" />}
                    onClick={() => setCursor((value) => value + 1)}
                  >
                    Step through
                  </Button>
                </>
              ) : finished ? (
                <Button
                  icon={<RotateCcw aria-hidden className="size-3.5" />}
                  onClick={() => {
                    setCursor(0);
                    setAuto(true);
                  }}
                >
                  Run again
                </Button>
              ) : (
                <>
                  <Button
                    icon={<StepForward aria-hidden className="size-3.5" />}
                    onClick={() => {
                      setAuto(false);
                      setCursor((value) => value + 1);
                    }}
                  >
                    Step
                  </Button>
                  <Button
                    variant="secondary"
                    icon={<Play aria-hidden className="size-3.5" />}
                    onClick={() => setAuto(true)}
                  >
                    Run to end
                  </Button>
                  <Button
                    variant="ghost"
                    icon={<RotateCcw aria-hidden className="size-3.5" />}
                    onClick={() => {
                      setCursor(0);
                      setAuto(false);
                    }}
                  >
                    Restart
                  </Button>
                </>
              )}
              <p className="ml-auto text-xs text-ink-secondary">
                {Math.min(cursor, total)}/{total} steps
              </p>
            </div>
          </Panel>

          {/* --------------------------------------------- evidence panel */}
          <div className="flex min-w-0 flex-col gap-4">
            <Panel>
              <PanelHeader
                title="Evidence comparison"
                description="What the claim says versus what the source says — shown side by side, never merged."
              />
              <div className="grid gap-3 p-4 sm:grid-cols-2">
                <div className="rounded-control border border-line p-3">
                  <p className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-secondary">
                    <FileText aria-hidden className="size-3.5" />
                    Receipt claim
                  </p>
                  <p data-numeric="true" className="mt-1 text-base font-semibold text-ink">
                    {formatMoney({
                      amountMinor: scenario.receipt.amountMinor,
                      currency: scenario.receipt.currency,
                    })}
                  </p>
                  <dl className="mt-2 space-y-1 text-xs">
                    <div className="flex justify-between gap-2">
                      <dt className="text-ink-secondary">Reference</dt>
                      <dd className="font-technical text-ink">{scenario.receipt.reference}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-ink-secondary">Merchant</dt>
                      <dd className="text-ink">{scenario.receipt.merchant}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-ink-secondary">Method</dt>
                      <dd className="text-ink">{scenario.receipt.method}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-ink-secondary">Claimed</dt>
                      <dd className="text-ink">{formatDateTime(scenario.receipt.claimedAt)}</dd>
                    </div>
                  </dl>
                </div>

                <div className="rounded-control border border-line bg-surface-muted/50 p-3">
                  <p className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-secondary">
                    <Landmark aria-hidden className="size-3.5" />
                    Authoritative source
                  </p>
                  <p data-numeric="true" className="mt-1 text-base font-semibold text-ink">
                    {scenario.source.found
                      ? formatMoney({
                          amountMinor: scenario.source.amountMinor,
                          currency: scenario.source.currency,
                        })
                      : '—'}
                  </p>
                  <dl className="mt-2 space-y-1 text-xs">
                    <div className="flex justify-between gap-2">
                      <dt className="text-ink-secondary">Provider</dt>
                      <dd className="text-ink">{scenario.source.provider}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-ink-secondary">Source ID</dt>
                      <dd className="font-technical text-ink">
                        {scenario.source.sourceTransactionId}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-ink-secondary">Status</dt>
                      <dd>
                        <Badge tone={transactionStatusTones[scenario.source.status]}>
                          {labelOf(transactionStatusLabels, scenario.source.status)}
                        </Badge>
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-ink-secondary">Settled</dt>
                      <dd className="text-ink">{formatDateTime(scenario.source.occurredAt)}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            </Panel>

            {/* Payment vs delivery, kept separate (scenario C) */}
            {scenario.delivery ? (
              <Panel>
                <PanelHeader
                  title="Payment status and notification status are different things"
                  description="ProofOps reports both, independently. A failed notification never reads as a failed payment."
                />
                <div className="space-y-3 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-control border border-success-line bg-success-soft/40 px-3 py-2">
                    <p className="text-[0.8125rem] text-ink">Payment status (at source)</p>
                    <Badge tone="success" icon={CircleCheck}>
                      Successful
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-control border border-danger-line bg-danger-soft/40 px-3 py-2">
                    <p className="text-[0.8125rem] text-ink">Notification delivery</p>
                    <Badge
                      tone={deliveryStatusTones[scenario.delivery.status]}
                      icon={CircleX}
                    >
                      {labelOf(deliveryStatusLabels, scenario.delivery.status)}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs font-semibold tracking-wide text-ink-secondary uppercase">
                      Delivery attempts
                    </p>
                    <ul className="mt-2 divide-y divide-line rounded-control border border-line">
                      {scenario.delivery.attempts.map((attempt) => (
                        <li
                          key={attempt.attemptNumber}
                          className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-xs"
                        >
                          <span className="font-technical text-ink">
                            #{attempt.attemptNumber} · {formatDateTime(attempt.at)}
                          </span>
                          <span className="text-ink-secondary">
                            {attempt.responseStatus ? `HTTP ${attempt.responseStatus} · ` : ''}
                            {attempt.error ?? attempt.outcome}
                          </span>
                          <Badge tone={attempt.outcome === 'succeeded' ? 'success' : 'danger'}>
                            {attempt.outcome === 'succeeded' ? 'Succeeded' : attempt.outcome === 'timeout' ? 'Timed out' : 'Failed'}
                          </Badge>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-2 text-xs leading-relaxed text-ink-secondary">
                      {scenario.delivery.note}
                    </p>
                    <p className="mt-1 truncate text-xs text-ink-secondary">
                      <span className="font-technical">{scenario.delivery.destination}</span>
                    </p>
                  </div>
                </div>
              </Panel>
            ) : (
              <Panel>
                <PanelHeader
                  title="What the proof record keeps"
                  description="The outcome is only half the value. The evidence behind it is what makes it defensible."
                />
                <ul className="space-y-2 p-4 text-[0.8125rem] text-ink-secondary">
                  {[
                    'The claim exactly as presented, including the receipt file reference.',
                    'The source record the comparison was made against, with its ID.',
                    'Every check, its outcome and why it passed, failed or could not be determined.',
                    'Timestamps for the claim, the comparison and the outcome.',
                  ].map((item) => (
                    <li key={item} className="flex gap-2">
                      <CircleCheck aria-hidden className="mt-0.5 size-3.5 shrink-0 text-success" />
                      {item}
                    </li>
                  ))}
                  <li className="flex gap-2">
                    <CircleAlert aria-hidden className="mt-0.5 size-3.5 shrink-0 text-warning" />
                    A receipt alone is never treated as authoritative proof of payment.
                  </li>
                </ul>
              </Panel>
            )}

            <p className="flex items-start gap-1.5 text-xs leading-relaxed text-ink-secondary">
              <CircleHelp aria-hidden className="mt-0.5 size-3.5 shrink-0" />
              {SAMPLE_LABEL}. This demonstration runs entirely in your browser.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
