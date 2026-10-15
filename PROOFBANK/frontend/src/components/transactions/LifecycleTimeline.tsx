import {
  CheckCircle2,
  Clock,
  FileClock,
  Loader2,
  Undo2,
  XCircle,
} from 'lucide-react';
import { formatDateTime } from '../../lib/format';
import { transactionStatusMeta } from '../../lib/status';
import type { Transaction, TransactionStatusChange } from '../../types/domain';

const timelineIcons: Record<string, typeof CheckCircle2> = {
  CREATED: FileClock,
  PENDING: Clock,
  PROCESSING: Loader2,
  SUCCESS: CheckCircle2,
  FAILED: XCircle,
  REVERSED: Undo2,
};

/**
 * Chronological transaction lifecycle. Each state is shown with the note the
 * source recorded for the transition, so an operator can see why a
 * transaction reached its current state.
 */
export function LifecycleTimeline({
  history,
  currentStatus,
}: {
  history: TransactionStatusChange[];
  currentStatus: Transaction['status'];
}) {
  const steps = [...history].sort((a, b) => a.at.localeCompare(b.at));
  const lastIndex = steps.length - 1;

  return (
    <ol className="relative flex flex-col gap-0">
      {steps.map((step, index) => {
        const meta = transactionStatusMeta[step.status];
        const Icon = timelineIcons[step.status] ?? FileClock;
        const isCurrent = index === lastIndex;
        return (
          <li key={`${step.status}-${step.at}-${index}`} className="relative flex gap-3 pb-6 last:pb-0">
            {index < lastIndex && (
              <span
                aria-hidden
                className="absolute top-8 bottom-0 left-[13px] w-px bg-line"
              />
            )}
            <span
              className={`relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full border ${
                isCurrent
                  ? 'border-brand bg-brand-soft text-brand'
                  : 'border-line bg-surface text-ink-secondary'
              }`}
            >
              <Icon aria-hidden className={`size-3.5 ${step.status === 'PROCESSING' ? 'animate-spin' : ''}`} />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-ink">{meta.label}</span>
                {isCurrent && (
                  <span className="rounded-full bg-brand-soft px-1.5 py-0.5 text-[0.625rem] font-medium text-plum">
                    Current state
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-ink-secondary">
                {step.note ?? meta.description}
              </p>
              <p className="mt-1 text-[0.6875rem] text-ink-secondary" title={formatDateTime(step.at)}>
                {formatDateTime(step.at)}
              </p>
            </div>
          </li>
        );
      })}
      <li className="flex gap-3">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-dashed border-line text-[0.625rem] text-ink-secondary">
          •
        </span>
        <p className="pt-1 text-[0.6875rem] text-ink-secondary">
          Current status: {transactionStatusMeta[currentStatus].label}. Terminal
          states end the lifecycle; nothing further will be recorded.
        </p>
      </li>
    </ol>
  );
}
