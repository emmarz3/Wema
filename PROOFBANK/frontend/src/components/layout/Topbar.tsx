import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, ChevronDown, LogOut, Menu, ShieldAlert } from 'lucide-react';
import { Badge, StatusBadge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Skeleton } from '../ui/Loading';
import { EnvironmentIndicator } from './Environment';
import { EmergencyPause } from './EmergencyPause';
import { useAuth } from '../../state/auth';
import { roleLabels } from '../../lib/permissions';
import { useNow, useSimulationStatus } from '../../hooks/useSimulationStatus';
import { simulationStateMeta, simulationModeMeta } from '../../lib/status';
import { formatRelativeTime } from '../../lib/format';
import { cn } from '../../lib/utils';

export function Topbar({ onOpenNav }: { onOpenNav: () => void }) {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();
  const { data: status, dataUpdatedAt, isPending, isError } = useSimulationStatus();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const now = useNow(10_000);

  // Close the user menu on outside click or Escape.
  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  async function handleSignOut() {
    setMenuOpen(false);
    await signOut();
    navigate('/sign-in', { replace: true });
  }

  return (
    <header
      aria-label="Workspace header"
      className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-surface/95 px-3 backdrop-blur sm:px-4"
    >
      <Button
        variant="ghost"
        size="sm"
        className="lg:hidden"
        onClick={onOpenNav}
        aria-label="Open navigation"
      >
        <Menu aria-hidden className="size-4.5" />
      </Button>

      <EnvironmentIndicator className="min-w-0" showIdentityText={false} />

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        {/* Emergency pause — obvious and non-disruptive, available everywhere. */}
        <EmergencyPause />

        {/* Simulation state — always rendered from the data source. */}
        <div className="hidden items-center gap-2 md:flex">
          {isPending ? (
            <Skeleton className="h-6 w-44" />
          ) : isError || !status ? (
            <Badge
              tone="danger"
              icon={<ShieldAlert aria-hidden className="size-3.5" />}
              title="The simulation status could not be read from the data source."
            >
              Status unavailable
            </Badge>
          ) : (
            <>
              <StatusBadge meta={simulationStateMeta[status.state]} size="sm" />
              <Badge
                tone="info"
                className="font-normal"
                title={simulationModeMeta[status.mode].description}
              >
                {simulationModeMeta[status.mode].label}
              </Badge>
              <span className="flex items-center gap-1 text-xs text-ink-secondary">
                <Activity aria-hidden className="size-3.5" />
                {status.eventIntervalSeconds}s cadence
              </span>
            </>
          )}
        </div>

        {/* Refresh indicator. */}
        <span
          className="hidden text-xs text-ink-secondary sm:inline"
          title={
            dataUpdatedAt
              ? `Data source last answered at ${new Date(dataUpdatedAt).toLocaleTimeString('en-GB')}`
              : undefined
          }
        >
          {dataUpdatedAt ? (
            <>
              Updated {formatRelativeTime(new Date(dataUpdatedAt).toISOString(), now)}
            </>
          ) : (
            'Connecting…'
          )}
        </span>

        {/* User menu */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            className={cn(
              'flex items-center gap-2 rounded-control border border-line bg-surface px-2 py-1.5',
              'transition-colors duration-fast ease-standard hover:bg-surface-muted',
            )}
          >
            <span className="flex size-6 items-center justify-center rounded-full bg-brand-soft text-[0.625rem] font-semibold text-plum">
              {initials(user?.name)}
            </span>
            <span className="hidden text-left leading-tight sm:block">
              <span className="block text-xs font-medium text-ink">{user?.name}</span>
              <span className="block text-[0.625rem] text-ink-secondary">
                {role ? roleLabels[role] : '—'}
              </span>
            </span>
            <ChevronDown aria-hidden className="size-3.5 text-ink-secondary" />
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 mt-1.5 w-64 rounded-panel border border-line bg-surface p-1.5 shadow-lg"
            >
              <div className="border-b border-line px-2.5 pt-1.5 pb-2.5">
                <p className="text-sm font-medium text-ink">{user?.name}</p>
                <p className="text-xs text-ink-secondary">{user?.email}</p>
                <div className="mt-2 flex items-center gap-2">
                  <Badge tone="brand">{role ? roleLabels[role] : 'Unknown role'}</Badge>
                </div>
                <p className="mt-2 text-[0.6875rem] leading-relaxed text-ink-secondary">
                  Demonstration operator. Capabilities follow the signed-in
                  simulation role.
                </p>
              </div>
              <button
                type="button"
                role="menuitem"
                onClick={handleSignOut}
                className="mt-1 flex w-full items-center gap-2 rounded-control px-2.5 py-2 text-sm text-ink transition-colors duration-fast ease-standard hover:bg-surface-muted"
              >
                <LogOut aria-hidden className="size-4 text-ink-secondary" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function initials(name?: string): string {
  if (!name) return '—';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}
