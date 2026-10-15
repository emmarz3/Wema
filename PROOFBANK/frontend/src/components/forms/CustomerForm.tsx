import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Field, Input, Select } from '../ui/Field';
import { Button } from '../ui/Button';
import { ApiError } from '../../api/errors';
import type { Customer } from '../../types/domain';
import { customerStatuses } from '../../types/domain';

const customerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Enter the customer name (at least 2 characters).')
    .max(80, 'Use at most 80 characters.'),
  email: z
    .string()
    .trim()
    .email('Enter a valid email address.'),
  phone: z
    .string()
    .trim()
    .min(7, 'Enter a reachable phone number.')
    .max(24, 'Use at most 24 characters.'),
  status: z.enum(customerStatuses, { message: 'Choose a status.' }),
});

export type CustomerFormValues = z.infer<typeof customerSchema>;

export interface CustomerFormProps {
  mode: 'create' | 'edit';
  customer?: Customer;
  /** Receives validated form values; the caller maps them to the API payload. */
  onSubmit: (values: CustomerFormValues) => Promise<void>;
  onCancel: () => void;
}

/**
 * Customer create/edit form. Front-end validation prevents obviously invalid
 * submissions; the data source remains the authority and its field errors are
 * surfaced back onto the matching inputs.
 */
export function CustomerForm({ mode, customer, onSubmit, onCancel }: CustomerFormProps) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: customer?.name ?? '',
      email: customer?.email ?? '',
      phone: customer?.phone ?? '',
      status: customer?.status ?? 'ACTIVE',
    },
  });

  async function submit(values: CustomerFormValues) {
    try {
      await onSubmit(values);
    } catch (error) {
      if (error instanceof ApiError && error.fields) {
        Object.entries(error.fields).forEach(([field, message]) => {
          if (field in { name: 1, email: 1, phone: 1, status: 1 }) {
            setError(field as keyof CustomerFormValues, { message });
          }
        });
        return;
      }
      setError('root', {
        message:
          error instanceof ApiError
            ? `${error.message} ${error.userGuidance}`
            : 'The customer could not be saved.',
      });
    }
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={handleSubmit(submit)}
      noValidate
      aria-label={mode === 'create' ? 'Create customer' : 'Edit customer'}
    >
      {errors.root && (
        <p role="alert" className="rounded-control border border-danger-line bg-danger-soft px-3 py-2 text-sm text-danger">
          {errors.root.message}
        </p>
      )}

      <Field label="Full name" error={errors.name?.message} required>
        {(props) => (
          <Input
            {...props}
            autoComplete="off"
            placeholder="e.g. Ada Nwosu"
            invalid={Boolean(errors.name)}
            {...register('name')}
          />
        )}
      </Field>

      <Field label="Email address" error={errors.email?.message} required>
        {(props) => (
          <Input
            {...props}
            type="email"
            autoComplete="off"
            placeholder="name@example.test"
            invalid={Boolean(errors.email)}
            {...register('email')}
          />
        )}
      </Field>

      <Field label="Phone number" error={errors.phone?.message} required>
        {(props) => (
          <Input
            {...props}
            autoComplete="off"
            placeholder="+234 800 000 0000"
            invalid={Boolean(errors.phone)}
            {...register('phone')}
          />
        )}
      </Field>

      <Field
        label="Status"
        error={errors.status?.message}
        hint="Suspended customers cannot be operated; the simulation freezes their accounts."
      >
        {(props) => (
          <Select {...props} invalid={Boolean(errors.status)} {...register('status')}>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
          </Select>
        )}
      </Field>

      <div className="mt-1 flex flex-wrap justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {mode === 'create' ? 'Create customer' : 'Save changes'}
        </Button>
      </div>
    </form>
  );
}
