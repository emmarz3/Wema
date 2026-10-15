import { cn } from '../../lib/utils';

/**
 * Segmented control — a compact radiogroup used for view switches
 * (e.g. the dashboard preview modes). Fully keyboard operable.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  size = 'md',
  className,
}: {
  options: Array<{ value: T; label: string; icon?: React.ReactNode }>;
  value: T;
  onChange: (next: T) => void;
  label: string;
  size?: 'sm' | 'md';
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        'inline-flex items-center gap-1 rounded-control border border-line bg-surface-muted p-1',
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-[6px] font-medium transition-colors duration-fast ease-standard',
              size === 'sm' ? 'h-7 px-2.5 text-xs' : 'h-8 px-3 text-[0.8125rem]',
              active
                ? 'bg-surface text-ink shadow-xs'
                : 'text-ink-secondary hover:text-ink',
            )}
          >
            {option.icon}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Tabs — underline tab bar for page-level sections, with proper roles and
 * arrow-key navigation.
 */
export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  label,
  className,
}: {
  tabs: Array<{ value: T; label: string; count?: number }>;
  value: T;
  onChange: (next: T) => void;
  label: string;
  className?: string;
}) {
  const move = (direction: 1 | -1) => {
    const index = tabs.findIndex((tab) => tab.value === value);
    const next = tabs[(index + direction + tabs.length) % tabs.length];
    onChange(next.value);
  };

  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn('flex items-center gap-1 border-b border-line', className)}
      onKeyDown={(event) => {
        if (event.key === 'ArrowRight') {
          event.preventDefault();
          move(1);
        }
        if (event.key === 'ArrowLeft') {
          event.preventDefault();
          move(-1);
        }
      }}
    >
      {tabs.map((tab) => {
        const active = tab.value === value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(tab.value)}
            className={cn(
              '-mb-px inline-flex items-center gap-2 border-b-2 px-3 py-2 text-[0.8125rem] font-medium transition-colors duration-fast ease-standard',
              active
                ? 'border-brand text-brand'
                : 'border-transparent text-ink-secondary hover:border-line-strong hover:text-ink',
            )}
          >
            {tab.label}
            {typeof tab.count === 'number' ? (
              <span className="rounded-full bg-surface-muted px-1.5 py-0.5 text-xs text-ink-secondary">
                {tab.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
