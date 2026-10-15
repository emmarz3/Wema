import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { navSections } from './Sidebar';
import { cn } from '../../lib/utils';

export interface Breadcrumb {
  label: string;
  to?: string;
}

/** Page header with breadcrumbs, title, description and actions. */
export function PageHeader({
  title,
  description,
  actions,
  sectionId,
  crumbs,
  notice,
  className,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  /** Root breadcrumb derived from the workspace section. */
  sectionId?: string;
  crumbs?: Breadcrumb[];
  notice?: ReactNode;
  className?: string;
}) {
  const section = navSections.find((item) => item.id === sectionId);
  const trail: Breadcrumb[] = [
    ...(section ? [{ label: section.label, to: section.path }] : []),
    ...(crumbs ?? []),
  ];

  return (
    <div className={cn('mb-5', className)}>
      {trail.length > 1 && (
        <nav aria-label="Breadcrumb" className="mb-2">
          <ol className="flex flex-wrap items-center gap-1 text-xs text-ink-secondary">
            {trail.map((crumb, index) => (
              <li key={`${crumb.label}-${index}`} className="flex items-center gap-1">
                {index > 0 && <ChevronRight aria-hidden className="size-3" />}
                {crumb.to ? (
                  <Link
                    to={crumb.to}
                    className="rounded-control px-0.5 hover:text-ink hover:underline"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span aria-current="page" className="text-ink">
                    {crumb.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-plum sm:text-2xl">
            {title}
          </h1>
          {description && (
            <p className="mt-1 max-w-3xl text-sm text-ink-secondary">{description}</p>
          )}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
      {notice && <div className="mt-3">{notice}</div>}
    </div>
  );
}
