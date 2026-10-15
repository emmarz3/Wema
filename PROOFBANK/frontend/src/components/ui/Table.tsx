import { ArrowDown, ArrowUp } from 'lucide-react';
import { cn } from '../../lib/utils';

/* ------------------------------------------------------------- Table parts */

export function TableScroll({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('-mx-px overflow-x-auto', className)}>{children}</div>
  );
}

export function Table({
  children,
  className,
  caption,
}: {
  children: React.ReactNode;
  className?: string;
  /** Screen-reader description of the table's contents. */
  caption?: string;
}) {
  return (
    <table className={cn('w-full min-w-full border-collapse text-sm', className)}>
      {caption && <caption className="sr-only">{caption}</caption>}
      {children}
    </table>
  );
}

export function THead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="border-b border-line bg-surface-muted/60">{children}</thead>
  );
}

export function TBody({ children }: { children: React.ReactNode }) {
  return <tbody>{children}</tbody>;
}

export function TR({
  children,
  className,
  onClick,
  selected,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  selected?: boolean;
}) {
  return (
    <tr
      onClick={onClick}
      className={cn(
        'border-b border-line last:border-b-0',
        onClick && 'cursor-pointer',
        selected ? 'bg-brand-soft' : 'hover:bg-surface-muted/70',
        className,
      )}
    >
      {children}
    </tr>
  );
}

export function TH({
  children,
  className,
  numeric,
  scope = 'col',
}: {
  children: React.ReactNode;
  className?: string;
  numeric?: boolean;
  scope?: 'col' | 'row';
}) {
  return (
    <th
      scope={scope}
      className={cn(
        'px-4 py-2.5 text-left text-xs font-semibold tracking-wide text-ink-secondary uppercase',
        numeric && 'text-right',
        className,
      )}
    >
      {children}
    </th>
  );
}

export function TD({
  children,
  className,
  numeric,
  mono,
  title,
}: {
  children: React.ReactNode;
  className?: string;
  numeric?: boolean;
  mono?: boolean;
  /** Native tooltip for truncated technical values. */
  title?: string;
}) {
  return (
    <td
      title={title}
      className={cn(
        'px-4 py-3 align-middle text-ink',
        numeric && 'text-right tabular-nums',
        mono && 'font-technical text-ink-secondary',
        className,
      )}
    >
      {children}
    </td>
  );
}

/* ------------------------------------------------------------ Sort headers */

export interface SortState<K extends string> {
  key: K;
  direction: 'asc' | 'desc';
}

export function SortableTH<K extends string>({
  label,
  sortKey,
  sort,
  onSort,
  numeric,
}: {
  label: string;
  sortKey: K;
  sort: SortState<K>;
  onSort: (sort: SortState<K>) => void;
  numeric?: boolean;
}) {
  const active = sort.key === sortKey;
  return (
    <th
      scope="col"
      aria-sort={active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
      className={cn('px-4 py-2.5 text-xs font-semibold tracking-wide uppercase', numeric && 'text-right')}
    >
      <button
        type="button"
        onClick={() =>
          onSort({
            key: sortKey,
            direction: active && sort.direction === 'asc' ? 'desc' : 'asc',
          })
        }
        className={cn(
          'inline-flex items-center gap-1 rounded-control px-1 py-0.5 text-ink-secondary',
          'transition-colors duration-fast ease-standard hover:text-ink',
          active && 'text-ink',
          numeric && 'flex-row-reverse',
        )}
      >
        {label}
        {active ? (
          sort.direction === 'asc' ? (
            <ArrowUp aria-hidden className="size-3" />
          ) : (
            <ArrowDown aria-hidden className="size-3" />
          )
        ) : (
          <span aria-hidden className="flex flex-col leading-none text-line-strong">
            <ArrowUp className="size-2.5" />
            <ArrowDown className="-mt-0.5 size-2.5" />
          </span>
        )}
      </button>
    </th>
  );
}
