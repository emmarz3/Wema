import { Badge } from '../ui/Badge';
import { cn } from '../../lib/utils';

/**
 * Persistent environment indicator.
 *
 * The exact product identity the specification requires:
 *   PROOFBANK — SIMULATED BANKING ENVIRONMENT
 * It must be impossible to confuse this environment with a real bank, so
 * the badge is part of the header, not a dismissible banner.
 */
export function EnvironmentIndicator({
  className,
  showIdentityText = true,
}: {
  className?: string;
  showIdentityText?: boolean;
}) {
  const title =
    'All customers, accounts, balances, transactions and events in this application are simulated demonstration data.';
  return (
    <span className={cn('flex items-center gap-2', className)}>
      <span className="flex items-center gap-1.5">
        <span className="text-sm font-semibold tracking-tight text-plum">PROOFBANK</span>
        <span aria-hidden className="text-ink-secondary">
          —
        </span>
        {/* Compact badge on small screens, full identity from sm upward.
            Wrappers carry the responsive display rules: Badge itself always
            renders inline-flex, so its own class list must not fight them. */}
        <span className="sm:hidden">
          <Badge tone="warning" title={title}>
            SIMULATED
          </Badge>
        </span>
        <span className="hidden sm:block">
          <Badge tone="warning" title={title}>
            SIMULATED BANKING ENVIRONMENT
          </Badge>
        </span>
      </span>
      {showIdentityText && (
        <span className="sr-only">
          This is a simulated banking environment. No real payments are processed.
        </span>
      )}
    </span>
  );
}

/** Short badge variant for dense panels (tables, detail pages, exports). */
export function SimulatedNotice({
  className,
  label = 'Simulated data',
}: {
  className?: string;
  label?: string;
}) {
  return (
    <Badge tone="neutral" className={className} title="This data is simulated demonstration data.">
      {label}
    </Badge>
  );
}
