import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Field, Input } from '../ui/Field';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '../../state/toast';
import { api } from '../../api';
import { ApiError } from '../../api/errors';
import type { Transaction } from '../../types/domain';

/**
 * Reversal confirmation. Reversals never edit history: the simulation posts
 * compensating entries and marks the original ones reversed, which the
 * dialog explains before the operator confirms.
 */
export function ReverseDialog({
  transaction,
  open,
  onClose,
  onReversed,
}: {
  transaction: Transaction | null;
  open: boolean;
  onClose: () => void;
  onReversed?: () => void;
}) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { show } = useToast();

  async function confirm(): Promise<void> {
    if (!transaction) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await api.reverseTransaction(transaction.id, {
        reason: reason.trim() || 'Reversed from the workspace.',
      });
      await queryClient.invalidateQueries({ queryKey: ['transactions'] });
      await queryClient.invalidateQueries({ queryKey: ['ledger'] });
      show({
        tone: 'success',
        title: 'Transaction reversed',
        description: `${result.transaction.reference} is reversed. ${result.compensatingEntries.length} compensating entries were posted.`,
      });
      onReversed?.();
      onClose();
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? `${caught.message} ${caught.userGuidance}`
          : 'The reversal could not be completed.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Reverse transaction"
      description="Compensating entries will be posted against this settled transaction."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirm} loading={submitting}>
            Reverse transaction
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="flex items-start gap-2 rounded-control border border-warning-line bg-warning-soft px-3 py-2.5 text-sm text-ink-secondary">
          <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0 text-warning" />
          A reversal creates a compensating financial operation. The original
          ledger entries are marked reversed and remain in the ledger — history
          is never edited. This action cannot be undone from the interface.
        </p>

        {transaction && (
          <dl className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-control border border-line bg-surface-muted/40 p-3">
              <dt className="text-xs text-ink-secondary">Reference</dt>
              <dd className="mt-1 font-technical text-sm text-ink">
                {transaction.reference}
              </dd>
            </div>
            <div className="rounded-control border border-line bg-surface-muted/40 p-3">
              <dt className="text-xs text-ink-secondary">Current status</dt>
              <dd className="mt-1 text-sm text-ink">{transaction.status}</dd>
            </div>
          </dl>
        )}

        <Field
          label="Reason"
          hint="Recorded with the reversal for the demonstration audit trail."
          required
        >
          {(props) => (
            <Input
              {...props}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="e.g. customer requested a refund"
            />
          )}
        </Field>

        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
      </div>
    </Dialog>
  );
}
