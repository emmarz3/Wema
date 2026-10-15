import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronRight, LogOut, PanelLeftClose, PanelLeftOpen, User } from 'lucide-react';
import { WORKSPACE_NAV } from './Sidebar';
import { cn } from '../../lib/utils';
import { appEnvironment, isSimulated } from '../../api';
import { useAuth } from '../../state/auth';
import { roleLabels } from '../../lib/permissions';
import { DropdownMenu, MenuItem, MenuLabel, MenuSeparator } from '../ui/DropdownMenu';

/** Breadcrumbs derived from the current workspace route. */
export function Breadcrumbs() {
  const location = useLocation();
  const trail = useMemo(() => {
    const segments = location.pathname.replace(/^\/app\/?/, '').split('/').filter(Boolean);
    const root = { label: 'Workspace', to: '/app' };
    const crumbs = [root];
    let accumulated = '/app';
    segments.forEach((segment) => {
      accumulated += `/${segment}`;
      const match = WORKSPACE_NAV.find((item) => item.to === accumulated);
      crumbs.push({
        label: match
          ? match.label
          : segment.replace(/-/g, ' ').replace(/^\w/, (c) => c.toUpperCase()),
        to: accumulated,
      });
    });
    return crumbs;
  }, [location.pathname]);

  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex items-center gap-1 text-[0.8125rem] text-ink-secondary">
        {trail.map((crumb, index) => {
          const last = index === trail.length - 1;
          return (
            <li key={crumb.to} className="flex items-center gap-1">
              {index > 0 ? (
                <ChevronRight aria-hidden className="size-3.5 text-ink-secondary/60" />
              ) : null}
              {last ? (
                <span aria-current="page" className="font-medium text-ink">
                  {crumb.label}
                </span>
              ) : (
                <Link
                  to={crumb.to}
                  className="rounded transition-colors duration-fast ease-standard hover:text-ink"
                >
                  {crumb.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** Initials for the session user's avatar. */
function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function UserMenu() {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);
  if (!user || !role) return null;

  const onSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <DropdownMenu
      label="Account menu"
      align="right"
      trigger={(props) => (
        <button
          type="button"
          {...props}
          className={cn(
            'inline-flex h-9 items-center gap-2 rounded-control border border-line-strong bg-surface pr-2 pl-1.5 text-left transition-colors duration-fast ease-standard hover:bg-surface-muted',
            props.open && 'bg-surface-muted',
          )}
        >
          <span
            aria-hidden
            className="flex size-6 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand"
          >
            {initials(user.name)}
          </span>
          <span className="hidden min-w-0 sm:block">
            <span className="block truncate text-[0.8125rem] font-medium text-ink">
              {user.name}
            </span>
            <span className="block truncate text-xs text-ink-secondary">
              {roleLabels[role]}
            </span>
          </span>
          <ChevronDown aria-hidden className="size-3.5 shrink-0 text-ink-secondary" />
        </button>
      )}
    >
      {(close) => (
        <>
          <MenuLabel>
            {user.organisation.name}
            <span className="ml-1 font-normal normal-case">· {user.email}</span>
          </MenuLabel>
          <MenuItem
            icon={<User aria-hidden className="size-3.5" />}
            onClick={() => {
              close();
              navigate('/app/settings');
            }}
          >
            Profile &amp; settings
          </MenuItem>
          <MenuSeparator />
          <MenuItem
            icon={<LogOut aria-hidden className="size-3.5" />}
            onClick={async () => {
              close();
              await onSignOut();
            }}
            disabled={signingOut}
            tone="danger"
          >
            {signingOut ? 'Signing out…' : 'Sign out'}
          </MenuItem>
        </>
      )}
    </DropdownMenu>
  );
}

export function Topbar({
  collapsed,
  onToggleCollapse,
  onOpenMobileNav,
}: {
  collapsed: boolean;
  onToggleCollapse: () => void;
  onOpenMobileNav: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-surface/95 px-4 backdrop-blur">
      <button
        type="button"
        onClick={onOpenMobileNav}
        className="inline-flex size-9 items-center justify-center rounded-control border border-line-strong bg-surface text-ink lg:hidden"
        aria-label="Open workspace navigation"
      >
        <PanelLeftOpen aria-hidden className="size-4" />
      </button>

      <button
        type="button"
        onClick={onToggleCollapse}
        className="hidden size-9 items-center justify-center rounded-control border border-line-strong bg-surface text-ink transition-colors duration-fast ease-standard hover:bg-surface-muted lg:inline-flex"
        aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
        aria-pressed={collapsed}
      >
        {collapsed ? (
          <PanelLeftOpen aria-hidden className="size-4" />
        ) : (
          <PanelLeftClose aria-hidden className="size-4" />
        )}
      </button>

      <Breadcrumbs />

      <div className="ml-auto flex items-center gap-2">
        <span
          className={cn(
            'hidden rounded-full border px-2 py-0.5 text-xs font-medium sm:inline-flex',
            isSimulated
              ? 'border-warning-line bg-warning-soft text-warning'
              : 'border-success-line bg-success-soft text-success',
          )}
          title={
            isSimulated
              ? 'Values shown come from the labelled simulated data source.'
              : 'Values shown come from the live ProofOps source.'
          }
        >
          {appEnvironment} · {isSimulated ? 'Simulated source' : 'Live source'}
        </span>
        <UserMenu />
      </div>
    </header>
  );
}
