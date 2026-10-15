import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Field, Input, Select } from '../ui/Field';
import { Button } from '../ui/Button';
import { ApiError } from '../../api/errors';
import type { CreateAccountInput } from '../../types/domain';

const accountSchema = z.object({
  customerId: z.string().min(1, 'Choose an existing customer.'),
  type: z.enum(['SAVINGS', 'CURRENT'], { message: 'Choose an account type.' }),
  currency: z.enum(['NGN', 'USD', 'GBP', 'EUR'], { message: 'Choose a currency.' }),
  openingNote: z.string().max(120).optional(),
});

export type AccountFormValues = z.infer<typeof accountSchema>;

export interface AccountFormProps {
  customers: Array<{ id: string; label: string }>;
  defaultCustomerId?: string;
  onSubmit: (values: CreateAccountInput) => Promise<void>;
  onCancel: () => void;
}

/**
 * Account creation form. Accounts open at a zero balance in the simulation;
 * balances only change through transactions.
 */
export function AccountForm({
  customers,
  defaultCustomerId,
  onSubmit,
  onCancel,
}: AccountFormProps) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<AccountFormValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      customerId: defaultCustomerId ?? '',
      type: 'SAVINGS',
      currency: 'NGN',
      openingNote: '',
    },
  });

  async function submit(values: AccountFormValues) {
    try {
      await onSubmit({
        customerId: values.customerId,
        type: values.type,
        currency: values.currency,
      });
    } catch (error) {
      if (error instanceof ApiError && error.code === 'invalid_customer') {
        setError('customerId', { message: 'Choose an existing customer.' });
        return;
      }
      if (error instanceof ApiError && error.code === 'invalid_currency') {
        setError('currency', { message: 'Choose a supported currency.' });
        return;
      }
      setError('root', {
        message:
          error instanceof ApiError
            ? `${error.message} ${error.userGuidance}`
            : 'The account could not be created.',
      });
    }
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit(submit)} noValidate>
      {errors.root && (
        <p role="alert" className="rounded-control border border-danger-line bg-danger-soft px-3 py-2 text-sm text-danger">
          {errors.root.message}
        </p>
      )}

      <Field label="Customer" error={errors.customerId?.message} required>
        {(props) => (
          <Select
            {...props}
            invalid={Boolean(errors.customerId)}
            {...register('customerId')}
          >
            <option value="">Select a customer…</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.label}
              </option>
            ))}
          </Select>
        )}
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Account type" error={errors.type?.message} required>
          {(props) => (
            <Select {...props} invalid={Boolean(errors.type)} {...register('type')}>
              <option value="SAVINGS">Savings</option>
              <option value="CURRENT">Current</option>
            </Select>
          )}
        </Field>

        <Field
          label="Currency"
          error={errors.currency?.message}
          hint="Accounts open at a zero balance."
          required
        >
          {(props) => (
            <Select {...props} invalid={Boolean(errors.currency)} {...register('currency')}>
              <option value="NGN">NGN — Nigerian Naira</option>
              <option value="USD">USD — US Dollar</option>
              <option value="GBP">GBP — Pound Sterling</option>
              <option value="EUR">EUR — Euro</option>
            </Select>
          )}
        </Field>
      </div>

      <Field
        label="Internal note (optional)"
        error={errors.openingNote?.message}
        hint="Recorded for the demonstration only."
      >
        {(props) => (
          <Input
            {...props}
            placeholder="e.g. opened for the transfer scenario"
            invalid={Boolean(errors.openingNote)}
            {...register('openingNote')}
          />
        )}
      </Field>

      <div className="mt-1 flex flex-wrap justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={isSubmitting}>
          Create account
        </Button>
      </div>
    </form>
  );
}
