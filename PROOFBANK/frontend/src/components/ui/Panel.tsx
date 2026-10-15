import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

export interface PanelProps {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}

/** The standard content container: white surface, restrained border. */
export function Panel({
  title,
  description,
  actions,
  footer,
  children,
  className,
  bodyClassName,
}: PanelProps) {
  return (
    <section
      className={cn(
        'flex flex-col overflow-hidden rounded-panel border border-line bg-surface shadow-xs',
        className,
      )}
    >
      {(title || actions) && (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-3">
          <div className="min-w-0">
            {title && (
              <h2 className="text-sm font-semibold text-ink">{title}</h2>
            )}
            {description && (
              <p className="mt-0.5 text-xs text-ink-secondary">{description}</p>
            )}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cn('flex-1 p-4', bodyClassName)}>{children}</div>
      {footer && (
        <footer className="border-t border-line px-4 py-3">{footer}</footer>
      )}
    </section>
  );
}

/** Compact statistic tile used across the interface. */
export function Stat({
  label,
  value,
  hint,
  tone = 'neutral',
  icon,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info';
  icon?: ReactNode;
}) {
  const accents: Record<string, string> = {
    neutral: 'text-ink-secondary',
    brand: 'text-brand',
    success: 'text-success',
    warning: 'text-warning',
    danger: 'text-danger',
    info: 'text-info',
  };
  return (
    <div className="rounded-panel border border-line bg-surface p-4 shadow-xs">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium tracking-wide text-ink-secondary uppercase">
          {label}
        </p>
        {icon && <span className={cn('shrink-0', accents[tone])}>{icon}</span>}
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-ink">{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-secondary">{hint}</p>}
    </div>
  );
}
