import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Field, Input, Select } from '../ui/Field';

export interface StatusOption<T extends string> {
  value: T;
  label: string;
  hint?: string;
}

export interface StatusChangeDialogProps<T extends string> {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  /** What the change will do, stated plainly before confirmation. */
  impact: string;
  options: Array<StatusOption<T>>;
  confirmLabel: string;
  onConfirm: (value: T, reason: string) => Promise<void>;
  destructive?: boolean;
}

/**
 * Controlled status change with an explicit impact statement and a required
 * place for the reason. Financial state changes never happen silently.
 */
export function StatusChangeDialog<T extends string>({
  open,
  onClose,
  title,
  description,
  impact,
  options,
  confirmLabel,
  onConfirm,
  destructive,
}: StatusChangeDialogProps<T>) {
  const [value, setValue] = useState<T>(options[0]?.value as T);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setValue(options[0]?.value as T);
      setReason('');
      setError(null);
      setSubmitting(false);
    }
  }, [open, options]);

  async function confirm() {
    setSubmitting(true);
    setError(null);
    try {
      await onConfirm(value, reason.trim());
      onClose();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'The status change could not be completed.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant={destructive ? 'danger' : 'primary'}
            onClick={confirm}
            loading={submitting}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="flex items-start gap-2 rounded-control border border-warning-line bg-warning-soft px-3 py-2.5 text-sm text-ink-secondary">
          <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0 text-warning" />
          {impact}
        </p>

        <Field label="New status">
          {(props) => (
            <Select
              {...props}
              value={value}
              onChange={(event) => setValue(event.target.value as T)}
            >
              {options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <Field
          label="Reason (optional)"
          hint="Recorded with the status history for this demonstration."
        >
          {(props) => (
            <Input
              {...props}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="e.g. customer requested a temporary hold"
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
