import { Link } from 'react-router-dom';
import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  FlaskConical,
  Users,
  Webhook,
  Wallet,
  Gauge,
  Lock,
} from 'lucide-react';
import { buttonClass } from '../ui/Button';
import { Panel } from '../ui/Panel';
import { useAuth } from '../../state/auth';
import type { Capability } from '../../lib/permissions';

interface JumpAction {
  id: string;
  label: string;
  description: string;
  to: string;
  icon: typeof Users;
}

interface OperationAction {
  id: 'deposit' | 'withdrawal' | 'transfer';
  label: string;
  description: string;
  icon: typeof Users;
  capability: Capability;
}

const jumpActions: JumpAction[] = [
  {
    id: 'customers',
    label: 'Create a simulated customer',
    description: 'Customers workspace',
    to: '/customers',
    icon: Users,
  },
  {
    id: 'accounts',
    label: 'Create an account',
    description: 'Accounts workspace',
    to: '/accounts',
    icon: Wallet,
  },
  {
    id: 'simulation',
    label: 'Open simulation controls',
    description: 'Start, pause, resume and stop the simulation',
    to: '/simulation',
    icon: Gauge,
  },
  {
    id: 'scenario',
    label: 'Run a scenario',
    description: 'Scenario library and execution',
    to: '/scenarios',
    icon: FlaskConical,
  },
  {
    id: 'events',
    label: 'Inspect event delivery',
    description: 'Webhook attempts and ProofOps visibility',
    to: '/events',
    icon: Webhook,
  },
];

const operationActions: OperationAction[] = [
  {
    id: 'deposit',
    label: 'Initiate a deposit',
    description: 'Credit a simulated account',
    icon: ArrowDownToLine,
    capability: 'execute_transactions',
  },
  {
    id: 'withdrawal',
    label: 'Initiate a withdrawal',
    description: 'Debit a simulated account',
    icon: ArrowUpFromLine,
    capability: 'execute_transactions',
  },
  {
    id: 'transfer',
    label: 'Initiate an internal transfer',
    description: 'Move funds between accounts',
    icon: ArrowLeftRight,
    capability: 'execute_transactions',
  },
];

/**
 * Quick actions. Every control here either routes to a workspace section
 * that exists, or opens a real operation backed by the transaction API —
 * nothing pretends to perform an action the source cannot confirm.
 */
export function QuickActions({ className }: { className?: string }) {
  const { can, role } = useAuth();

  return (
    <Panel
      title="Quick actions"
      description="Common destinations and operations in the workspace."
      className={className}
    >
      <div className="flex flex-col gap-4">
        <ul className="grid gap-2 sm:grid-cols-2">
          {jumpActions.map((action) => (
            <li key={action.id}>
              <Link
                to={action.to}
                className={buttonClass('secondary', 'md', 'w-full !justify-start')}
              >
                <action.icon aria-hidden className="size-4 shrink-0 text-brand" />
                <span className="flex flex-col items-start text-left leading-tight">
                  <span className="text-sm font-medium">{action.label}</span>
                  <span className="text-[0.6875rem] font-normal text-ink-secondary">
                    {action.description}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <div>
          <h3 className="mb-2 text-xs font-semibold tracking-wide text-ink-secondary uppercase">
            Financial operations
          </h3>
          <ul className="grid gap-2 sm:grid-cols-3">
            {operationActions.map((action) => {
              const permitted = can(action.capability);
              if (!permitted) {
                return (
                  <li key={action.id}>
                    <button
                      type="button"
                      disabled
                      title="Your role cannot execute transactions."
                      className={buttonClass(
                        'secondary',
                        'md',
                        'w-full !justify-start opacity-70',
                      )}
                    >
                      <Lock aria-hidden className="size-4 shrink-0 text-ink-secondary" />
                      <span className="flex flex-col items-start text-left leading-tight">
                        <span className="text-sm font-medium">{action.label}</span>
                        <span className="text-[0.6875rem] font-normal text-ink-secondary">
                          Not permitted
                        </span>
                      </span>
                    </button>
                  </li>
                );
              }
              return (
                <li key={action.id}>
                  <Link
                    to={`/transactions?operation=${action.id}`}
                    className={buttonClass('secondary', 'md', 'w-full !justify-start')}
                  >
                    <action.icon aria-hidden className="size-4 shrink-0 text-brand" />
                    <span className="flex flex-col items-start text-left leading-tight">
                      <span className="text-sm font-medium">{action.label}</span>
                      <span className="text-[0.6875rem] font-normal text-ink-secondary">
                        {action.description}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-xs leading-relaxed text-ink-secondary">
            Each operation opens the transaction form with a confirmation
            summary. The simulation confirms the outcome — the interface never
            assumes success. Signed in as{' '}
            <strong className="font-medium text-ink">{role ?? 'unknown role'}</strong>.
          </p>
        </div>
      </div>
    </Panel>
  );
}
