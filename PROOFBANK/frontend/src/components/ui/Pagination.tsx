import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';
import { Select } from './Field';
import { cn } from '../../lib/utils';

export interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  className?: string;
}

/** Pagination controls driven by the totals the data source reports. */
export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  className,
}: PaginationProps) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3',
        className,
      )}
    >
      <p className="text-xs text-ink-secondary" data-numeric="true">
        {total === 0
          ? 'No records'
          : `Showing ${from.toLocaleString('en-NG')}–${to.toLocaleString('en-NG')} of ${total.toLocaleString('en-NG')}`}
      </p>

      <div className="flex items-center gap-3">
        {onPageSizeChange && (
          <label className="flex items-center gap-2 text-xs text-ink-secondary">
            <span className="hidden sm:inline">Rows</span>
            <Select
              value={String(pageSize)}
              onChange={(event) => onPageSizeChange(Number(event.target.value))}
              className="h-8 w-20 py-0 text-xs"
              aria-label="Rows per page"
            >
              {[10, 25, 50].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </Select>
          </label>
        )}

        <div className="flex items-center gap-1.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            aria-label="Previous page"
          >
            <ChevronLeft aria-hidden className="size-3.5" />
          </Button>
          <span className="px-1 text-xs tabular-nums text-ink-secondary">
            Page {page} of {pages}
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= pages}
            aria-label="Next page"
          >
            <ChevronRight aria-hidden className="size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
