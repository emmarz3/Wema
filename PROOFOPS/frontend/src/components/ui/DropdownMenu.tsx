import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { cn } from '../../lib/utils';

/**
 * Dropdown menu. Click or Enter/Space opens; arrows move focus; Escape
 * closes and returns focus to the trigger. Renders inline (no portal) so
 * it stays inside overflow contexts predictably.
 */
export function DropdownMenu({
  trigger,
  children,
  align = 'right',
  label,
  className,
}: {
  trigger: (props: {
    open: boolean;
    toggle: () => void;
    /** Convenience click handler — spread the whole object onto a button. */
    onClick: () => void;
    'aria-expanded': boolean;
    'aria-haspopup': 'menu';
    id: string;
  }) => ReactNode;  children: (close: () => void) => ReactNode;
  align?: 'left' | 'right';
  label: string;
  className?: string;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const onMenuKeyDown = (event: React.KeyboardEvent) => {
    const items = Array.from(
      containerRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [],
    );
    const index = items.indexOf(document.activeElement as HTMLElement);
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      items[(index + 1) % items.length]?.focus();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      items[(index - 1 + items.length) % items.length]?.focus();
    }
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {trigger({
        open,
        toggle: () => setOpen((value) => !value),
        onClick: () => setOpen((value) => !value),
        'aria-expanded': open,
        'aria-haspopup': 'menu' as const,
        id,
      })}
      {open ? (
        <div
          role="menu"
          aria-label={label}
          id={id}
          onKeyDown={onMenuKeyDown}
          className={cn(
            'absolute top-full z-40 mt-1 min-w-48 rounded-panel border border-line bg-surface p-1 shadow-md',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          {children(close)}
        </div>
      ) : null}
    </div>
  );
}

export function MenuItem({
  children,
  onClick,
  icon,
  tone = 'default',
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  icon?: ReactNode;
  tone?: 'default' | 'danger';
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2 rounded-control px-2.5 py-2 text-left text-[0.8125rem] transition-colors duration-fast ease-standard',
        tone === 'danger'
          ? 'text-danger hover:bg-danger-soft'
          : 'text-ink hover:bg-surface-muted',
        disabled && 'cursor-not-allowed opacity-50',
      )}
    >
      {icon}
      {children}
    </button>
  );
}

export function MenuSeparator() {
  return <div role="separator" className="my-1 h-px bg-line" />;
}

export function MenuLabel({ children }: { children: ReactNode }) {
  return (
    <p className="px-2.5 py-1.5 text-xs font-semibold tracking-wide text-ink-secondary uppercase">
      {children}
    </p>
  );
}
