import { forwardRef, useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface SearchInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: string;
  onValueChange: (value: string) => void;
  /** Debounce delay before onValueChange fires, in ms. */
  debounceMs?: number;
  label: string;
}

/**
 * Search field with debounced propagation and a clear button.
 *
 * The visible value is held in local state so typing stays responsive and is
 * never reset by an unrelated parent re-render; only the debounced value is
 * propagated upward.
 */
export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  function SearchInput(
    { value, onValueChange, debounceMs = 300, label, className, ...rest },
    ref,
  ) {
    const [display, setDisplay] = useState(value);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastProp = useRef(value);

    // Adopt external changes (e.g. "clear filters" resetting the value).
    useEffect(() => {
      if (value !== lastProp.current) {
        lastProp.current = value;
        setDisplay(value);
      }
    }, [value]);

    useEffect(() => {
      return () => {
        if (timer.current) clearTimeout(timer.current);
      };
    }, []);

    return (
      <div className={cn('relative', className)}>
        <Search
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-secondary"
        />
        <input
          ref={ref}
          type="search"
          aria-label={label}
          value={display}
          onChange={(event) => {
            const next = event.target.value;
            setDisplay(next);
            if (timer.current) clearTimeout(timer.current);
            timer.current = setTimeout(() => {
              lastProp.current = next;
              onValueChange(next);
            }, debounceMs);
          }}
          className={cn(
            'h-10 w-full rounded-control border border-line-strong bg-surface pl-9 pr-8 text-sm text-ink',
            'placeholder:text-ink-secondary/70',
            'transition-colors duration-fast ease-standard',
            'disabled:cursor-not-allowed disabled:bg-surface-muted',
          )}
          {...rest}
        />
        {display && (
          <button
            type="button"
            onClick={() => {
              if (timer.current) clearTimeout(timer.current);
              lastProp.current = '';
              setDisplay('');
              onValueChange('');
            }}
            aria-label="Clear search"
            className="absolute top-1/2 right-2 -translate-y-1/2 rounded-control p-1 text-ink-secondary transition-colors duration-fast ease-standard hover:bg-surface-muted hover:text-ink"
          >
            <X aria-hidden className="size-3.5" />
          </button>
        )}
      </div>
    );
  },
);
