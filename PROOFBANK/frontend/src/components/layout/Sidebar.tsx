import { NavLink } from 'react-router-dom';
import {
  ArrowLeftRight,
  BookOpen,
  FlaskConical,
  LayoutDashboard,
  ScrollText,
  Server,
  Settings,
  SlidersHorizontal,
  Users,
  Wallet,
  Webhook,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../state/auth';
import { canSeeSection } from '../../lib/permissions';

export interface NavSection {
  id: string;
  label: string;
  path: string;
  Icon: typeof LayoutDashboard;
  /** Phase that delivers this screen (shown on deferred pages). */
  deliveredInPhase: number;
  description: string;
}

/** The eleven workspace sections, in navigation order. */
export const navSections: NavSection[] = [
  {
    id: 'overview',
    label: 'Overview',
    path: '/overview',
    Icon: LayoutDashboard,
    deliveredInPhase: 2,
    description: 'Operational metrics and activity for the simulated environment.',
  },  {
    id: 'customers',
    label: 'Customers',
    path: '/customers',
    Icon: Users,
    deliveredInPhase: 3,
    description: 'Simulated test customers and their linked accounts.',
  },
  {
    id: 'accounts',
    label: 'Accounts',
    path: '/accounts',
    Icon: Wallet,
    deliveredInPhase: 3,
    description: 'Simulated accounts, balances and account status history.',
  },
  {
    id: 'transactions',
    label: 'Transactions',
    path: '/transactions',
    Icon: ArrowLeftRight,
    deliveredInPhase: 4,
    description: 'Transaction operations, lifecycle detail and status history.',
  },
  {
    id: 'ledger',
    label: 'Ledger',
    path: '/ledger',
    Icon: BookOpen,
    deliveredInPhase: 4,
    description: 'Journal entries posted by simulation activity.',
  },
  {
    id: 'simulation',
    label: 'Simulation Control',
    path: '/simulation',
    Icon: SlidersHorizontal,
    deliveredInPhase: 5,
    description: 'Start, pause, resume and stop the simulation; set cadence.',
  },
  {
    id: 'scenarios',
    label: 'Scenarios',
    path: '/scenarios',
    Icon: FlaskConical,
    deliveredInPhase: 6,
    description: 'Scenario library, execution workflow and run history.',
  },
  {
    id: 'infrastructure',
    label: 'Infrastructure',
    path: '/infrastructure',
    Icon: Server,
    deliveredInPhase: 7,
    description: 'Simulated service conditions, latency and incidents.',
  },
  {
    id: 'events',
    label: 'Event Delivery',
    path: '/events',
    Icon: Webhook,
    deliveredInPhase: 7,
    description: 'Events emitted and delivered toward ProofOps.',
  },
  {
    id: 'audit',
    label: 'Audit Logs',
    path: '/audit',
    Icon: ScrollText,
    deliveredInPhase: 8,
    description: 'Operator, automation and infrastructure audit records.',
  },
  {
    id: 'settings',
    label: 'Settings',
    path: '/settings',
    Icon: Settings,
    deliveredInPhase: 8,
    description: 'Simulation defaults, destinations and access control.',
  },
];

/** Sidebar navigation, filtered by the signed-in user's role. */
export function SidebarNav({
  onNavigate,
  className,
}: {
  onNavigate?: () => void;
  className?: string;
}) {
  const { role } = useAuth();
  const visible = navSections.filter((section) =>
    role ? canSeeSection(role, section.id) : false,
  );

  return (
    <nav aria-label="Workspace sections" className={cn('flex flex-col gap-0.5', className)}>
      {visible.map(({ id, label, path, Icon }) => (
        <NavLink
          key={id}
          to={path}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-2.5 rounded-control px-3 py-2 text-sm font-medium',
              'transition-colors duration-fast ease-standard',
              isActive
                ? 'bg-brand-soft text-plum'
                : 'text-ink-secondary hover:bg-surface-muted hover:text-ink',
            )
          }
        >
          {({ isActive }) => (
            <>
              <Icon
                aria-hidden
                className={cn('size-4 shrink-0', isActive ? 'text-brand' : '')}
              />
              {label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
