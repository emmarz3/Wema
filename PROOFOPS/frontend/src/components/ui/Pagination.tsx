import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';

/** Pagination for tables. Reports what the source reports; never invents totals. */
export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  className,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (next: number) => void;
  className?: string;
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <nav
      aria-label="Pagination"
      className={cn(
        'flex flex-wrap items-center justify-between gap-2 text-[0.8125rem] text-ink-secondary',
        className,
      )}
    >
      <p data-numeric="true">
        {total === 0
          ? 'No records'
          : `Showing ${from}–${to} of ${total} record${total === 1 ? '' : 's'}`}
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="inline-flex h-8 items-center gap-1 rounded-control border border-line-strong bg-surface px-2 font-medium text-ink transition-colors duration-fast ease-standard hover:bg-surface-muted disabled:opacity-50"
          aria-label="Previous page"
        >
          <ChevronLeft aria-hidden className="size-3.5" />
          Previous
        </button>
        <span data-numeric="true" className="px-2">
          Page {page} of {pageCount}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pageCount}
          className="inline-flex h-8 items-center gap-1 rounded-control border border-line-strong bg-surface px-2 font-medium text-ink transition-colors duration-fast ease-standard hover:bg-surface-muted disabled:opacity-50"
          aria-label="Next page"
        >
          Next
          <ChevronRight aria-hidden className="size-3.5" />
        </button>
      </div>
    </nav>
  );
}
