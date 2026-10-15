import { useMemo } from 'react';
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * Reusable data table.
 *
 * Built for operational density: thin dividers, tabular figures, sortable
 * headers with accessible button semantics, and horizontal scroll confined
 * to the table container so pages never overflow sideways. On small
 * screens callers can pass `mobileCard` to render record cards instead of
 * squeezing the table.
 */

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  /** Cell renderer. */
  render: (row: T) => React.ReactNode;
  /** Marks the column sortable; the key is passed to onSortChange. */
  sortable?: boolean;
  /** Numeric cells get tabular figures and right alignment by default. */
  numeric?: boolean;
  align?: 'left' | 'right' | 'center';
  className?: string;
  headerClassName?: string;
  /** Hide below the sm breakpoint (used for optional columns). */
  hideOnMobile?: boolean;
}

export type SortDirection = 'asc' | 'desc';

export interface SortState {
  key: string;
  direction: SortDirection;
}

export function SortHeader({
  label,
  active,
  direction,
  onClick,
  numeric,
  className,
}: {
  label: React.ReactNode;
  active: boolean;
  direction: SortDirection;
  onClick: () => void;
  numeric?: boolean;
  className?: string;
}) {
  const Icon = !active ? ChevronsUpDown : direction === 'asc' ? ArrowUp : ArrowDown;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group inline-flex items-center gap-1 rounded-control text-xs font-semibold tracking-wide uppercase transition-colors duration-fast ease-standard hover:text-ink',
        active ? 'text-brand' : 'text-ink-secondary',
        numeric && 'flex-row-reverse',
        className,
      )}
      aria-sort={active ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      {label}
      <Icon aria-hidden className="size-3.5 opacity-60 group-hover:opacity-100" />
    </button>
  );
}

export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  sort,
  onSortChange,
  loading = false,
  caption,
  empty,
  footer,
  onRowClick,
  rowClassName,
  mobileCard,
  className,
}: {
  columns: Array<Column<T>>;
  rows: readonly T[];
  getRowKey: (row: T) => string;
  sort?: SortState;
  onSortChange?: (key: string) => void;
  loading?: boolean;
  /** Screen-reader caption describing the table. */
  caption: string;
  empty?: React.ReactNode;
  footer?: React.ReactNode;
  onRowClick?: (row: T) => void;
  rowClassName?: (row: T) => string | undefined;
  /** Compact record card layout for narrow viewports. */
  mobileCard?: (row: T) => React.ReactNode;
  className?: string;
}) {
  const visibleColumns = useMemo(() => columns, [columns]);

  if (!loading && rows.length === 0 && empty) {
    return <>{empty}</>;
  }

  const table = (
    <table className={cn('w-full min-w-full border-collapse text-sm', className)}>
      <caption className="sr-only">{caption}</caption>
      <thead>
        <tr className="border-b border-line">
          {visibleColumns.map((column) => (
            <th
              key={column.key}
              scope="col"
              className={cn(
                'bg-surface-muted/60 px-3 py-2 text-left',
                column.align === 'right' && 'text-right',
                column.align === 'center' && 'text-center',
                column.hideOnMobile && 'hidden sm:table-cell',
                column.headerClassName,
              )}
            >
              {column.sortable && onSortChange ? (
                <SortHeader
                  label={column.header}
                  numeric={column.numeric}
                  active={sort?.key === column.key}
                  direction={sort?.direction ?? 'asc'}
                  onClick={() => onSortChange(column.key)}
                />
              ) : (
                <span
                  className={cn(
                    'text-xs font-semibold tracking-wide text-ink-secondary uppercase',
                    column.align === 'right' && 'block text-right',
                    column.align === 'center' && 'block text-center',
                  )}
                >
                  {column.header}
                </span>
              )}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {loading
          ? Array.from({ length: 5 }).map((_, index) => (
              <tr key={`skeleton-${index}`} className="border-b border-line">
                {visibleColumns.map((column) => (
                  <td key={column.key} className="px-3 py-2.5">
                    <div className="h-4 w-full max-w-40 animate-pulse rounded bg-surface-muted" />
                  </td>
                ))}
              </tr>
            ))
          : rows.map((row) => (
              <tr
                key={getRowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  'border-b border-line last:border-b-0',
                  onRowClick && 'cursor-pointer',
                  rowClassName?.(row),
                )}
              >
                {visibleColumns.map((column) => (
                  <td
                    key={column.key}
                    data-numeric={column.numeric ? 'true' : undefined}
                    className={cn(
                      'px-3 py-2.5 align-middle text-ink',
                      column.numeric && 'text-right',
                      column.align === 'right' && 'text-right',
                      column.align === 'center' && 'text-center',
                      column.hideOnMobile && 'hidden sm:table-cell',
                      column.className,
                    )}
                  >
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
      </tbody>
      {footer ? (
        <tfoot>
          <tr className="border-t border-line bg-surface-muted/60">{footer}</tr>
        </tfoot>
      ) : null}
    </table>
  );

  const hasMobileCards = Boolean(mobileCard);

  return (
    <div className="relative">
      {/* One table in the DOM. On narrow viewports it either scrolls inside
          its own container or is swapped for record cards via CSS. */}
      <div className={cn(hasMobileCards && 'hidden sm:block')}>
        <div className="overflow-x-auto">{table}</div>
      </div>
      {hasMobileCards ? (
        <div className="divide-y divide-line sm:hidden">
          {loading
            ? Array.from({ length: 4 }).map((_, index) => (
                <div key={`card-skeleton-${index}`} className="p-4">
                  <div className="h-4 w-2/3 animate-pulse rounded bg-surface-muted" />
                  <div className="mt-2 h-3 w-1/3 animate-pulse rounded bg-surface-muted" />
                </div>
              ))
            : rows.map((row) => (
                <div key={getRowKey(row)}>{mobileCard?.(row)}</div>
              ))}
        </div>
      ) : null}
    </div>
  );
}
