import {
  Activity,
  Bell,
  FileStack,
  Landmark,
  LayoutDashboard,
  ListChecks,
  ScanSearch,
  Settings,
  Siren,
  Terminal,
} from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { canSeeSection, type Role } from '../../lib/permissions';

export interface NavItem {
  section: string;
  label: string;
  to: string;
  icon: typeof LayoutDashboard;
  /** Phase that delivers the screen behind this link. */
  phase: number;
}

/** Workspace navigation in the order defined by the product spec. */
export const WORKSPACE_NAV: NavItem[] = [
  { section: 'overview', label: 'Overview', to: '/app', icon: LayoutDashboard, phase: 4 },
  {
    section: 'verification',
    label: 'Verification',
    to: '/app/verification',
    icon: ListChecks,
    phase: 4,
  },
  {
    section: 'proof',
    label: 'Proof records',
    to: '/app/proof',
    icon: FileStack,
    phase: 5,
  },
  {
    section: 'reconciliation',
    label: 'Reconciliation',
    to: '/app/reconciliation',
    icon: Landmark,
    phase: 6,
  },
  {
    section: 'infrastructure',
    label: 'Infrastructure',
    to: '/app/infrastructure',
    icon: Activity,
    phase: 7,
  },
  {
    section: 'incidents',
    label: 'Incidents',
    to: '/app/incidents',
    icon: Siren,
    phase: 7,
  },
  {
    section: 'investigator',
    label: 'AI Investigator',
    to: '/app/investigator',
    icon: ScanSearch,
    phase: 8,
  },
  {
    section: 'developer',
    label: 'Developer console',
    to: '/app/developer',
    icon: Terminal,
    phase: 8,
  },
  {
    section: 'notifications',
    label: 'Notifications',
    to: '/app/notifications',
    icon: Bell,
    phase: 9,
  },
  {
    section: 'settings',
    label: 'Settings & audit',
    to: '/app/settings',
    icon: Settings,
    phase: 9,
  },
];

export function visibleNav(role: Role | null): NavItem[] {
  // Before a session exists (no role context), the shell shows the full
  // product surface. Once a session exists, the map below hides what the
  // role should not see — the backend remains the real security boundary.
  if (!role) return WORKSPACE_NAV;
  return WORKSPACE_NAV.filter((item) => canSeeSection(role, item.section));
}

export function Sidebar({
  role,
  collapsed,
  onNavigate,
  className,
}: {
  role: Role | null;
  collapsed: boolean;
  onNavigate?: () => void;
  className?: string;
}) {
  const location = useLocation();
  const items = visibleNav(role);

  return (
    <nav
      aria-label="Workspace sections"
      className={cn('flex h-full flex-col gap-1 p-3', className)}
    >
      <ul className="flex flex-col gap-0.5">
        {items.map((item) => {
          const active =
            item.to === '/app'
              ? location.pathname === '/app'
              : location.pathname.startsWith(item.to);
          return (
            <li key={item.section}>
              <NavLink
                to={item.to}
                onClick={onNavigate}
                title={collapsed ? item.label : undefined}
                className={cn(
                  'group relative flex items-center gap-2.5 rounded-control px-2.5 py-2 text-[0.8125rem] font-medium transition-colors duration-fast ease-standard',
                  collapsed && 'justify-center px-0',
                  active
                    ? 'bg-brand-soft text-brand'
                    : 'text-ink-secondary hover:bg-surface-muted hover:text-ink',
                )}
              >
                {active ? (
                  <span
                    aria-hidden
                    className="absolute top-1.5 bottom-1.5 left-0 w-0.5 rounded-full bg-brand"
                  />
                ) : null}
                <item.icon aria-hidden className="size-4.5 shrink-0" />
                {!collapsed ? <span className="truncate">{item.label}</span> : null}
              </NavLink>
            </li>
          );
        })}
      </ul>

      {!collapsed ? (
        <div className="mt-auto rounded-control border border-line bg-surface-muted/60 p-3">
          <p className="text-xs font-semibold text-ink">Data source</p>
          <p className="mt-1 text-xs leading-relaxed text-ink-secondary">
            Screens render only what the configured source reports. Unbuilt
            capabilities say so instead of inventing values.
          </p>
        </div>
      ) : null}
    </nav>
  );
}
