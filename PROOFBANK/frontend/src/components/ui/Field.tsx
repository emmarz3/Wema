import { forwardRef, useId } from 'react';
import { cn } from '../../lib/utils';

/* ---------------------------------------------------------------- Input */

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
  /** Render value with tabular numerals (amounts, references, counts). */
  numeric?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, invalid, numeric, ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        'h-10 w-full rounded-control border bg-surface px-3 text-sm text-ink',
        'placeholder:text-ink-secondary/70',
        'transition-colors duration-fast ease-standard',
        invalid ? 'border-danger' : 'border-line-strong hover:border-line-strong',
        'disabled:cursor-not-allowed disabled:bg-surface-muted',
        numeric && 'text-right tabular-nums',
        className,
      )}
      {...rest}
    />
  );
});

/* ---------------------------------------------------------------- Select */

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, invalid, children, ...rest },
  ref,
) {
  return (
    <select
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        'h-10 w-full appearance-none rounded-control border bg-surface px-3 pr-9 text-sm text-ink',
        "bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%236D6673%22 stroke-width=%222%22><path d=%22M6 9l6 6 6-6%22/></svg>')] bg-[length:16px] bg-[right_0.75rem_center] bg-no-repeat",
        invalid ? 'border-danger' : 'border-line-strong',
        'transition-colors duration-fast ease-standard',
        'disabled:cursor-not-allowed disabled:bg-surface-muted',
        className,
      )}
      {...rest}
    >
      {children}
    </select>
  );
});

/* ----------------------------------------------------------------- Field */

export interface FieldProps {
  label: string;
  /** Renders the control for you and wires ids automatically. */
  children: (props: {
    id: string;
    'aria-invalid'?: true;
    'aria-describedby'?: string;
  }) => React.ReactNode;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
}

export function Field({
  label,
  children,
  hint,
  error,
  required,
  className,
}: FieldProps) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-[0.8125rem] font-medium text-ink">
        {label}
        {required && (
          <span className="ml-1 text-danger" aria-hidden>
            *
          </span>
        )}
      </label>
      {children({
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': describedBy,
      })}
      {error ? (
        <p id={`${id}-error`} className="text-xs text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-ink-secondary">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
