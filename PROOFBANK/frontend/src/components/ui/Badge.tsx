import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';
import type { Tone } from '../../lib/status';

/* ----------------------------------------------------------------- Badge */

const toneClasses: Record<Tone, string> = {
  neutral: 'border-line bg-surface-muted text-ink-secondary',
  brand: 'border-brand-line bg-brand-soft text-plum',
  success: 'border-success-line bg-success-soft text-success',
  warning: 'border-warning-line bg-warning-soft text-warning',
  danger: 'border-danger-line bg-danger-soft text-danger',
  info: 'border-info-line bg-info-soft text-info',
};

export interface BadgeProps {
  children: ReactNode;
  tone?: Tone;
  icon?: ReactNode;
  className?: string;
  /** Accessible label when the visible text is abbreviated. */
  title?: string;
}

export function Badge({
  children,
  tone = 'neutral',
  icon,
  className,
  title,
}: BadgeProps) {
  return (
    <span
      title={title}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5',
        'text-xs font-medium whitespace-nowrap',
        toneClasses[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}

/* ---------------------------------------------------------- StatusBadge */

export interface StatusPresentation {
  label: string;
  tone: Tone;
  Icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  description: string;
}

export function StatusBadge({
  meta,
  className,
  size = 'md',
}: {
  meta: StatusPresentation;
  className?: string;
  size?: 'sm' | 'md';
}) {
  const { label, tone, Icon, description } = meta;
  return (
    <Badge
      tone={tone}
      className={className}
      title={description}
      icon={
        <Icon
          aria-hidden
          className={cn(size === 'sm' ? 'size-3' : 'size-3.5')}
        />
      }
    >
      {label}
    </Badge>
  );
}
