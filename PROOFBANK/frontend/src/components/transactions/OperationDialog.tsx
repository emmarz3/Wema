import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeftRight,
  ArrowDownToLine,
  ArrowUpFromLine,
  CheckCircle2,
  Info,
  Loader2,
} from 'lucide-react';
import { Dialog } from '../ui/Dialog';
import { Button, buttonClass } from '../ui/Button';
import { Field, Input, Select } from '../ui/Field';
import { StatusBadge } from '../ui/Badge';
import { useAccounts } from '../../hooks/useCustomers';
import { api } from '../../api';
import { ApiError } from '../../api/errors';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '../../state/toast';
import { formatMoney } from '../../lib/format';
import type { Account, OperationKind, OperationResult } from '../../types/domain';
import { transactionStatusMeta } from '../../lib/status';

const kindMeta: Record<
  OperationKind,
  {
    title: string;
    description: string;
    referencePrefix: string;
    Icon: typeof ArrowDownToLine;
  }
> = {
  deposit: {
    title: 'Initiate a deposit',
    description: 'Credits a simulated account. The simulation progresses the transaction through its lifecycle.',
    referencePrefix: 'DEP',
    Icon: ArrowDownToLine,
  },
  withdrawal: {
    title: 'Initiate a withdrawal',
    description: 'Debits a simulated account. The simulation checks available balance before settling.',
    referencePrefix: 'WDL',
    Icon: ArrowUpFromLine,
  },
  transfer: {
    title: 'Initiate an internal transfer',
    description: 'Moves funds between two simulated accounts.',
    referencePrefix: 'TRF',
    Icon: ArrowLeftRight,
  },
};

/** Turns a decimal input into minor units, or null when unparseable. */
export function toMinorUnits(amount: string): number | null {
  const trimmed = amount.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;
  return Math.round(Number.parseFloat(trimmed) * 100);
}

function generateReference(prefix: string): string {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 1_000_000)
    .toString()
    .padStart(6, '0');
  return `${prefix}-${today}-${random}`;
}

function accountOptionLabel(account: Account): string {
  return `••••${account.number.slice(-4)} · ${account.customerName} (${formatMoney(account.availableBalance)})`;
}

export interface OperationDialogProps {
  open: boolean;
  kind: OperationKind;
  onClose: () => void;
}

/**
 * Deposit / withdrawal / transfer dialog. The form blocks obviously invalid
 * input, shows a confirmation summary before submission, prevents duplicate
 * submission, and reports what the source actually returned — success is
 * never assumed.
 */
export function OperationDialog({ open, kind, onClose }: OperationDialogProps) {
  const queryClient = useQueryClient();
  const { show } = useToast();
  const meta = kindMeta[kind];

  const accounts = useAccounts({ status: 'ACTIVE', pageSize: 100 });

  const [sourceId, setSourceId] = useState('');
  const [destinationId, setDestinationId] = useState('');
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [step, setStep] = useState<'form' | 'review' | 'result'>('form');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OperationResult | null>(null);

  // Reset whenever the dialog opens or the operation kind changes.
  useEffect(() => {
    if (!open) return;
    setSourceId('');
    setDestinationId('');
    setAmount('');
    setNote('');
    setReference(generateReference(meta.referencePrefix));
    setStep('form');
    setSubmitting(false);
    setError(null);
    setResult(null);
  }, [open, kind, meta.referencePrefix]);

  const accountsList = accounts.data?.items ?? [];
  /** The account the operation acts on: destination for deposits, source
   *  otherwise. Transfers use both. */
  const primaryAccountId = kind === 'deposit' ? destinationId : sourceId;
  const primaryAccount = accountsList.find((account) => account.id === primaryAccountId);
  const currency = primaryAccount?.currency ?? 'NGN';
  const amountMinor = toMinorUnits(amount);

  const validation = useMemo(() => {
    const problems: Record<string, string> = {};
    if (kind === 'transfer' && sourceId && destinationId && sourceId === destinationId) {
      problems.destination = 'Choose two different accounts.';
    }
    if (amount.trim() !== '' && amountMinor === null) {
      problems.amount = 'Enter an amount with at most two decimal places.';
    }
    if (amountMinor !== null && amountMinor <= 0) {
      problems.amount = 'Enter an amount greater than zero.';
    }
    if (primaryAccount && amountMinor !== null && kind !== 'deposit') {
      if (amountMinor > primaryAccount.availableBalance.amountMinor) {
        problems.amount = 'Amount exceeds the available balance on the source account.';
      }
    }
    return problems;
  }, [kind, sourceId, destinationId, amount, amountMinor, primaryAccount]);

  function review(): void {
    setError(null);
    const problems: Record<string, string> = {};
    if (!primaryAccountId) problems.account = 'Choose an account.';
    if (kind === 'transfer' && !destinationId) {
      problems.destination = 'Choose a destination account.';
    }
    if (!amount.trim()) problems.amount = 'Enter an amount.';
    const combined = { ...problems, ...validation };
    if (Object.keys(combined).length > 0) {
      setValidationError(combined);
      return;
    }
    setStep('review');
  }

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  function setValidationError(errors: Record<string, string>): void {
    setValidationErrors(errors);
  }

  async function submit(): Promise<void> {
    if (amountMinor === null) return;
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        amountMinor,
        currency,
        reference: reference.trim() || undefined,
        note: note.trim() || undefined,
      };
      let outcome: OperationResult;
      if (kind === 'deposit') {
        outcome = await api.deposit({ ...payload, accountId: destinationId });
      } else if (kind === 'withdrawal') {
        outcome = await api.withdraw({ ...payload, accountId: sourceId });
      } else {
        outcome = await api.transfer({
          ...payload,
          sourceAccountId: sourceId,
          destinationAccountId: destinationId,
        });
      }
      setResult(outcome);
      setStep('result');
      await queryClient.invalidateQueries({ queryKey: ['transactions'] });
      await queryClient.invalidateQueries({ queryKey: ['accounts'] });
      show({
        tone: outcome.duplicate ? 'warning' : 'success',
        title: outcome.duplicate ? 'Reference reused' : 'Transaction created',
        description: outcome.duplicate
          ? `Reference ${outcome.transaction.reference} already existed — the existing transaction is shown.`
          : `${outcome.transaction.reference} is now ${transactionStatusMeta[outcome.transaction.status].label.toLowerCase()}.`,
      });
    } catch (caught) {
      if (caught instanceof ApiError) {
        setError(`${caught.message} ${caught.userGuidance}`);
      } else {
        setError('The operation could not be completed.');
      }
      setStep('form');
    } finally {
      setSubmitting(false);
    }
  }

  const sourceAccount = accountsList.find((account) => account.id === sourceId);
  const destinationAccount = accountsList.find((account) => account.id === destinationId);
  const targetAccount = kind === 'deposit' ? destinationAccount : sourceAccount;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={meta.title}
      description={meta.description}
      size="lg"
      footer={
        step === 'form' ? (
          <>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={review}>Review operation</Button>
          </>
        ) : step === 'review' ? (
          <>
            <Button variant="ghost" onClick={() => setStep('form')} disabled={submitting}>
              Back
            </Button>
            <Button onClick={submit} loading={submitting}>
              Confirm and submit
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
            <Link
              to={`/transactions/${result?.transaction.id ?? ''}`}
              onClick={onClose}
              className={buttonClass('primary', 'md')}
            >
              Open transaction
            </Link>
          </>
        )
      }
    >
      <div className="flex flex-col gap-4">
        {step === 'form' && (
          <>
            {accounts.isPending && (
              <p className="flex items-center gap-2 text-sm text-ink-secondary">
                <Loader2 aria-hidden className="size-4 animate-spin" />
                Loading accounts…
              </p>
            )}
            {accounts.error && (
              <p role="alert" className="text-sm text-danger">
                Accounts could not be loaded. Close this dialog and try again.
              </p>
            )}

            {(kind === 'deposit' || kind === 'transfer') && (
              <Field
                label={kind === 'deposit' ? 'Destination account' : 'Source account'}
                error={validationErrors.account}
                required
              >
                {(props) => (
                  <Select
                    {...props}
                    value={kind === 'deposit' ? destinationId : sourceId}
                    onChange={(event) =>
                      kind === 'deposit'
                        ? setDestinationId(event.target.value)
                        : setSourceId(event.target.value)
                    }
                  >
                    <option value="">Select an account…</option>
                    {accountsList.map((account) => (
                      <option key={account.id} value={account.id}>
                        {accountOptionLabel(account)}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            )}

            {kind === 'transfer' && (
              <Field label="Destination account" error={validationErrors.destination} required>
                {(props) => (
                  <Select
                    {...props}
                    value={destinationId}
                    onChange={(event) => setDestinationId(event.target.value)}
                  >
                    <option value="">Select an account…</option>
                    {accountsList.map((account) => (
                      <option key={account.id} value={account.id}>
                        {accountOptionLabel(account)}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            )}

            {kind === 'withdrawal' && (
              <Field label="Source account" error={validationErrors.account} required>
                {(props) => (
                  <Select
                    {...props}
                    value={sourceId}
                    onChange={(event) => setSourceId(event.target.value)}
                  >
                    <option value="">Select an account…</option>
                    {accountsList.map((account) => (
                      <option key={account.id} value={account.id}>
                        {accountOptionLabel(account)}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label={`Amount (${currency})`}
                error={validationErrors.amount ?? validation.amount}
                hint={
                  kind === 'deposit'
                    ? 'Entered in major units, e.g. 1500.00.'
                    : `Available: ${primaryAccount ? formatMoney(primaryAccount.availableBalance) : '—'}`
                }
                required
              >
                {(props) => (
                  <Input
                    {...props}
                    inputMode="decimal"
                    placeholder="0.00"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    className="tabular-nums"
                  />
                )}
              </Field>

              <Field
                label="Reference"
                error={validationErrors.reference}
                hint="Idempotency key. Reusing a reference returns the original transaction instead of creating a duplicate."
                required
              >
                {(props) => (
                  <Input
                    {...props}
                    value={reference}
                    onChange={(event) => setReference(event.target.value)}
                    className="font-technical"
                  />
                )}
              </Field>
            </div>

            <Field label="Note (optional)" error={validationErrors.note}>
              {(props) => (
                <Input
                  {...props}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="e.g. scenario walkthrough"
                />
              )}
            </Field>
          </>
        )}

        {step === 'review' && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-ink-secondary">
              Review the operation. The simulation will progress it through its
              lifecycle and confirm the outcome.
            </p>
            <dl className="grid gap-3 sm:grid-cols-2">
              <SummaryRow label="Operation" value={meta.title.replace('Initiate a ', '')} />
              {kind !== 'deposit' && (
                <SummaryRow
                  label="Source"
                  value={sourceAccount ? `••••${sourceAccount.number.slice(-4)}` : '—'}
                />
              )}
              {kind !== 'withdrawal' && (
                <SummaryRow
                  label="Destination"
                  value={destinationAccount ? `••••${destinationAccount.number.slice(-4)}` : '—'}
                />
              )}
              <SummaryRow
                label="Amount"
                value={
                  amountMinor === null
                    ? '—'
                    : formatMoney({ amountMinor, currency })
                }
              />
              <SummaryRow label="Reference" value={reference} mono />
              <SummaryRow
                label="Available after (estimated)"
                value={
                  targetAccount && amountMinor !== null && kind !== 'deposit'
                    ? formatMoney({
                        amountMinor: Math.max(
                          0,
                          targetAccount.availableBalance.amountMinor - amountMinor,
                        ),
                        currency,
                      })
                    : 'The simulation confirms on submission.'
                }
              />
            </dl>
            <p className="flex items-start gap-2 rounded-control border border-warning-line bg-warning-soft px-3 py-2.5 text-xs text-ink-secondary">
              <AlertTriangle aria-hidden className="mt-0.5 size-3.5 shrink-0 text-warning" />
              Submitting again with the same reference will return the existing
              transaction rather than creating a second one.
            </p>
          </div>
        )}

        {step === 'result' && result && (
          <div className="flex flex-col gap-3">
            <div className="flex items-start gap-3 rounded-control border border-success-line bg-success-soft px-3.5 py-3">
              <CheckCircle2 aria-hidden className="mt-0.5 size-5 shrink-0 text-success" />
              <div>
                <p className="text-sm font-semibold text-ink">
                  {result.duplicate
                    ? 'Existing transaction returned'
                    : 'Transaction accepted'}
                </p>
                <p className="mt-0.5 text-sm text-ink-secondary">
                  Reference{' '}
                  <span className="font-technical text-ink">{result.transaction.reference}</span>{' '}
                  is now{' '}
                  <StatusBadge
                    meta={transactionStatusMeta[result.transaction.status]}
                    size="sm"
                  />
                  .
                </p>
                {result.duplicate && (
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-warning">
                    <Info aria-hidden className="size-3.5" />
                    This reference was already used, so no duplicate was created.
                  </p>
                )}
              </div>
            </div>
            <p className="text-xs leading-relaxed text-ink-secondary">
              The transaction is progressing through its lifecycle in the
              simulation. Open it to watch the status, ledger entries, events
              and delivery attempts update as the source reports them.
            </p>
          </div>
        )}

        {error && (
          <p
            role="alert"
            className="rounded-control border border-danger-line bg-danger-soft px-3 py-2.5 text-sm text-danger"
          >
            {error}
          </p>
        )}
      </div>
    </Dialog>
  );
}

function SummaryRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-control border border-line bg-surface-muted/40 p-3">
      <dt className="text-xs text-ink-secondary">{label}</dt>
      <dd className={`mt-1 text-sm text-ink ${mono ? 'font-technical' : ''}`}>{value}</dd>
    </div>
  );
}
