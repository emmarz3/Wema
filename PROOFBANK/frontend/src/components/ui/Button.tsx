import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md';

export function buttonClass(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  className?: string,
): string {
  return cn(
    'inline-flex items-center justify-center rounded-control border font-medium',
    'transition-colors duration-fast ease-standard select-none',
    'disabled:cursor-not-allowed disabled:opacity-55',
    size === 'sm' ? 'h-8 gap-1.5 px-3 text-[0.8125rem]' : 'h-10 gap-2 px-4 text-sm',
    variant === 'primary' &&
      'border-transparent bg-brand text-white shadow-xs hover:bg-brand-hover active:bg-brand-active',
    variant === 'secondary' &&
      'border-line-strong bg-surface text-ink hover:bg-surface-muted active:bg-surface-sunken',
    variant === 'ghost' &&
      'border-transparent bg-transparent text-ink-secondary hover:bg-surface-muted hover:text-ink',
    variant === 'danger' &&
      'border-transparent bg-danger text-white hover:brightness-95 active:brightness-90',
    className,
  );
}

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { variant = 'primary', size = 'md', loading, icon, className, children, disabled, ...rest },
    ref,
  ) {
    return (
      <button
        ref={ref}
        className={buttonClass(variant, size, className)}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...rest}
      >
        {loading ? (
          <Loader2 aria-hidden className="size-4 animate-spin" />
        ) : (
          icon
        )}
        {children}
      </button>
    );
  },
);
