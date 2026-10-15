import { useEffect, useState, type ReactNode } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { X } from 'lucide-react';
import { Brand } from './Brand';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { cn } from '../../lib/utils';
import type { Role } from '../../lib/permissions';

const COLLAPSE_KEY = 'proofops.sidebar.collapsed';

/**
 * Authenticated workspace shell: collapsible sidebar, compact top bar,
 * breadcrumbs, responsive mobile navigation. Over-animating is
 * deliberately avoided — the shell is a tool, not a slideshow.
 */
export function AppShell({ role }: { role: Role | null }) {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_KEY, String(collapsed));
    } catch {
      /* storage unavailable */
    }
  }, [collapsed]);

  useEffect(() => setMobileOpen(false), [location.pathname]);

  return (
    <div className="shell-height flex bg-canvas">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden shrink-0 border-r border-line bg-surface transition-[width] duration-base ease-standard lg:block',
          collapsed ? 'w-16' : 'w-60',
        )}
      >
        <div
          className={cn(
            'flex h-14 items-center border-b border-line px-3',
            collapsed && 'justify-center px-0',
          )}
        >
          <Brand size="sm" to="/app" showWordmark={!collapsed} />
        </div>
        <Sidebar role={role} collapsed={collapsed} />
      </aside>

      {/* Mobile navigation */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-plum/40"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <div className="relative h-full w-72 max-w-[85%] border-r border-line bg-surface">
            <div className="flex h-14 items-center justify-between border-b border-line px-3">
              <Brand size="sm" to="/app" />
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close navigation"
                className="rounded-control p-1.5 text-ink-secondary hover:bg-surface-muted hover:text-ink"
              >
                <X aria-hidden className="size-4" />
              </button>
            </div>
            <Sidebar role={role} collapsed={false} onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((value) => !value)}
          onOpenMobileNav={() => setMobileOpen(true)}
        />
        <main id="main" className="min-h-0 flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

/** Page header used by every workspace screen. */
export function PageHeader({
  title,
  description,
  actions,
  breadcrumb,
  className,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  breadcrumb?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('border-b border-line bg-surface px-4 py-4 sm:px-6', className)}>
      {breadcrumb}
      <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold tracking-tight text-ink">{title}</h1>
          {description ? (
            <p className="mt-1 max-w-2xl text-[0.8125rem] leading-relaxed text-ink-secondary">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}
