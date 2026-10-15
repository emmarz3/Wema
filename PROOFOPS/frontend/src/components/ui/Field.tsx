import { forwardRef, useId } from 'react';
import { cn } from '../../lib/utils';

/**
 * Form field primitives. Labels, hints and errors are wired with aria
 * attributes so validation messages are announced, not just coloured.
 */

const controlClass =
  'w-full rounded-control border bg-surface text-sm text-ink placeholder:text-ink-secondary/70 ' +
  'transition-colors duration-fast ease-standard ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ' +
  'disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-ink-secondary';

export interface FieldProps {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  className,
  children,
}: FieldProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label
        htmlFor={htmlFor}
        className="text-[0.8125rem] font-medium text-ink"
      >
        {label}
        {required ? (
          <span className="ml-0.5 text-danger" aria-hidden>
            *
          </span>
        ) : null}
      </label>
      {hint ? <p className="text-xs text-ink-secondary">{hint}</p> : null}
      {children}
      {error ? (
        <p className="text-xs font-medium text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
  /** Renders with tabular figures — for amounts and numeric inputs. */
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
      data-numeric={numeric || undefined}
      className={cn(
        controlClass,
        'h-10 px-3',
        invalid ? 'border-danger' : 'border-line-strong hover:border-line-strong',
        className,
      )}
      {...rest}
    />
  );
});

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ className, invalid, ...rest }, ref) {
    return (
      <textarea
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          controlClass,
          'min-h-20 px-3 py-2',
          invalid ? 'border-danger' : 'border-line-strong',
          className,
        )}
        {...rest}
      />
    );
  },
);

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
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
        controlClass,
        'h-10 cursor-pointer appearance-none bg-[url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2712%27 height=%2712%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%236D6673%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3E%3Cpath d=%27m6 9 6 6 6-6%27/%3E%3C/svg%3E")] bg-[length:12px] bg-[right_0.75rem_center] bg-no-repeat pr-9',
        invalid ? 'border-danger' : 'border-line-strong',
        className,
      )}
      {...rest}
    >
      {children}
    </select>
  );
});

export interface CheckboxProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label:React.ReactNode;
}

export function Checkbox({ label, className, id, ...rest }: CheckboxProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <input
        id={inputId}
        type="checkbox"
        className="size-4 shrink-0 cursor-pointer rounded-[4px] border border-line-strong accent-brand"
        {...rest}
      />
      <label htmlFor={inputId} className="cursor-pointer text-[0.8125rem] text-ink">
        {label}
      </label>
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled,
  id,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
  id?: string;
}) {
  const generatedId = useId();
  const switchId = id ?? generatedId;
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <label htmlFor={switchId} className="text-[0.8125rem] font-medium text-ink">
          {label}
        </label>
        {description ? (
          <p className="mt-0.5 text-xs text-ink-secondary">{description}</p>
        ) : null}
      </div>
      <button
        id={switchId}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative h-6 w-10 shrink-0 rounded-full border transition-colors duration-fast ease-standard disabled:opacity-55',
          checked ? 'border-brand bg-brand' : 'border-line-strong bg-surface-muted',
        )}
      >
        <span
          aria-hidden
          className={cn(
            'absolute top-0.5 size-4.5 rounded-full bg-white shadow-xs transition-all duration-fast ease-standard',
            checked ? 'left-[1.125rem]' : 'left-0.5',
          )}
        />
      </button>
    </div>
  );
}
