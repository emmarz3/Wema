import { forwardRef, useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * Debounced search input used by list screens. The parent owns the query
 * value; this component owns display state, debouncing and clear
 * behaviour. Typing always updates the visible field immediately; the
 * parent is notified only after the quiet period.
 */
export const SearchInput = forwardRef<
  HTMLInputElement,
  Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> & {
    value: string;
    onValueChange: (next: string) => void;
    /** ms quiet period before onValueChange fires (default 300). */
    debounce?: number;
  }
>(function SearchInput(
  { value, onValueChange, debounce = 300, className, placeholder = 'Search', ...rest },
  ref,
) {
  const [draft, setDraft] = useState(value);
  const lastEmitted = useRef(value);

  // Adopt external changes (e.g. "clear all filters" resetting the box).
  useEffect(() => {
    if (value !== lastEmitted.current && value !== draft) {
      setDraft(value);
      lastEmitted.current = value;
    }
  }, [value, draft]);

  useEffect(() => {
    if (draft === lastEmitted.current) return;
    const timer = window.setTimeout(() => {
      lastEmitted.current = draft;
      onValueChange(draft);
    }, debounce);
    return () => window.clearTimeout(timer);
  }, [draft, debounce, onValueChange]);

  return (
    <div className={cn('relative', className)}>
      <Search
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-secondary"
      />
      <input
        ref={ref}
        type="search"
        value={draft}
        placeholder={placeholder}
        onChange={(event) => setDraft(event.target.value)}
        className="h-10 w-full rounded-control border border-line-strong bg-surface pr-9 pl-9 text-sm text-ink transition-colors duration-fast ease-standard placeholder:text-ink-secondary/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        {...rest}
      />
      {draft ? (
        <button
          type="button"
          onClick={() => {
            setDraft('');
            lastEmitted.current = '';
            onValueChange('');
          }}
          aria-label="Clear search"
          className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-control p-1 text-ink-secondary transition-colors duration-fast ease-standard hover:bg-surface-muted hover:text-ink"
        >
          <X aria-hidden className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
});
