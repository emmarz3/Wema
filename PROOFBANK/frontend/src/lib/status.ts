/**
 * Centralised status vocabulary.
 *
 * Every status in the interface is rendered with a colour AND a text label
 * AND an icon, so state is never communicated by colour alone.
 */
import {
  AlertTriangle,
  ArrowLeftRight,
  Ban,
  CheckCircle2,
  Clock,
  FileClock,
  Info,
  Loader2,
  Lock,
  Moon,
  Pause,
  Play,
  RotateCcw,
  ShieldAlert,
  Snowflake,
  Square,
  Undo2,
  XCircle,
} from 'lucide-react';
import type {
  DeliveryStatus,
  EventType,
  SimulationMode,
  SimulationState,
  TransactionStatus,
  TransactionType,
  LedgerDirection,
  IncidentSeverity,
  ServiceStatus,
} from '../types/domain';
import type { AccountStatus, CustomerStatus } from '../types/domain';

export type Tone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info';

interface StatusPresentation {
  label: string;
  tone: Tone;
  Icon: typeof CheckCircle2;
  /** Plain-language explanation shown alongside the label in detail views. */
  description: string;
}

export const transactionStatusMeta: Record<TransactionStatus, StatusPresentation> =
  {
    CREATED: {
      label: 'Created',
      tone: 'neutral',
      Icon: FileClock,
      description:
        'The transaction has been recorded but has not been submitted for processing yet.',
    },
    PENDING: {
      label: 'Pending',
      tone: 'warning',
      Icon: Clock,
      description:
        'The transaction is awaiting completion. Funds have not settled.',
    },
    PROCESSING: {
      label: 'Processing',
      tone: 'info',
      Icon: Loader2,
      description:
        'The transaction is being executed by the simulation. Its outcome is not yet known.',
    },
    SUCCESS: {
      label: 'Successful',
      tone: 'success',
      Icon: CheckCircle2,
      description:
        'The transaction completed successfully and its ledger entries have been posted.',
    },
    FAILED: {
      label: 'Failed',
      tone: 'danger',
      Icon: XCircle,
      description:
        'The transaction failed. No funds moved and no ledger entries were posted.',
    },
    REVERSED: {
      label: 'Reversed',
      tone: 'danger',
      Icon: Undo2,
      description:
        'A compensating operation was posted against this transaction. The original entry is preserved.',
    },
  };

export const transactionTypeMeta: Record<TransactionType, StatusPresentation> = {
  DEPOSIT: {
    label: 'Deposit',
    tone: 'success',
    Icon: CheckCircle2,
    description: 'Funds added to an account.',
  },
  WITHDRAWAL: {
    label: 'Withdrawal',
    tone: 'brand',
    Icon: ArrowLeftRight,
    description: 'Funds taken out of an account.',
  },
  INTERNAL_TRANSFER: {
    label: 'Internal transfer',
    tone: 'info',
    Icon: ArrowLeftRight,
    description: 'Funds moved between two accounts in the environment.',
  },
};

export const simulationStateMeta: Record<SimulationState, StatusPresentation> = {
  running: {
    label: 'Running',
    tone: 'success',
    Icon: Play,
    description: 'The simulation is generating activity on its configured cadence.',
  },
  paused: {
    label: 'Paused',
    tone: 'warning',
    Icon: Pause,
    description:
      'The simulation is paused. Activity stops but state is preserved.',
  },
  stopped: {
    label: 'Stopped',
    tone: 'neutral',
    Icon: Square,
    description: 'The simulation is stopped. No activity is generated.',
  },
};

export const simulationModeMeta: Record<SimulationMode, StatusPresentation> = {
  live: {
    label: 'Live simulation',
    tone: 'brand',
    Icon: Play,
    description:
      'Continuous generated activity at the configured event interval.',
  },
  scenario: {
    label: 'Scenario mode',
    tone: 'info',
    Icon: RotateCcw,
    description: 'Executing a controlled test scenario.',
  },
  replay: {
    label: 'Replay mode',
    tone: 'neutral',
    Icon: RotateCcw,
    description: 'Replaying recorded activity deterministically.',
  },
};

export const deliveryStatusMeta: Record<DeliveryStatus, StatusPresentation> = {
  PENDING: {
    label: 'Pending',
    tone: 'neutral',
    Icon: Clock,
    description: 'Queued for delivery, not yet attempted.',
  },
  DELIVERED: {
    label: 'Delivered',
    tone: 'success',
    Icon: CheckCircle2,
    description: 'The destination acknowledged the event.',
  },
  FAILED: {
    label: 'Failed',
    tone: 'danger',
    Icon: XCircle,
    description:
      'Delivery failed. This says nothing about whether the underlying transaction succeeded.',
  },
  RETRYING: {
    label: 'Retrying',
    tone: 'warning',
    Icon: RotateCcw,
    description: 'A previous attempt failed and delivery is being retried.',
  },
  DEAD_LETTER: {
    label: 'Dead-lettered',
    tone: 'danger',
    Icon: Ban,
    description:
      'Retries were exhausted; the event is parked for manual inspection.',
  },
};

export const eventTypeLabels: Record<EventType, string> = {
  'transaction.created': 'Transaction created',
  'transaction.pending': 'Transaction pending',
  'transaction.completed': 'Transaction completed',
  'transaction.failed': 'Transaction failed',
  'transaction.reversed': 'Transaction reversed',
  'account.status_changed': 'Account status changed',
  'webhook.delivery_failed': 'Webhook delivery failed',
  'webhook.delivery_succeeded': 'Webhook delivery succeeded',
  'infrastructure.health_changed': 'Infrastructure health changed',
  'simulation.scenario_executed': 'Scenario executed',
  'simulation.heartbeat': 'Simulation heartbeat',
};

export const ledgerDirectionMeta: Record<LedgerDirection, StatusPresentation> = {
  DEBIT: {
    label: 'Debit',
    tone: 'warning',
    Icon: AlertTriangle,
    description: 'Debits an account.',
  },
  CREDIT: {
    label: 'Credit',
    tone: 'info',
    Icon: Info,
    description: 'Credits an account.',
  },
};

export const accountStatusMeta: Record<AccountStatus, StatusPresentation> = {
  ACTIVE: {
    label: 'Active',
    tone: 'success',
    Icon: CheckCircle2,
    description: 'The account is open and can be operated.',
  },
  DORMANT: {
    label: 'Dormant',
    tone: 'warning',
    Icon: Moon,
    description: 'No activity for the configured dormancy period.',
  },
  FROZEN: {
    label: 'Frozen',
    tone: 'danger',
    Icon: Snowflake,
    description: 'New operations are not permitted. Existing balances are preserved.',
  },
};

export const customerStatusMeta: Record<CustomerStatus, StatusPresentation> = {
  ACTIVE: {
    label: 'Active',
    tone: 'success',
    Icon: CheckCircle2,
    description: 'The customer can operate normally.',
  },
  SUSPENDED: {
    label: 'Suspended',
    tone: 'danger',
    Icon: Lock,
    description:
      'Suspended customers cannot be operated. The simulation freezes their accounts.',
  },
};

/** Provider service health as reported by the simulated source. */
export const serviceStatusMeta: Record<ServiceStatus, StatusPresentation> = {
  OPERATIONAL: {
    label: 'Operational',
    tone: 'success',
    Icon: CheckCircle2,
    description: 'The service is responding normally.',
  },
  DEGRADED: {
    label: 'Degraded',
    tone: 'warning',
    Icon: AlertTriangle,
    description:
      'The service is responding but with elevated latency or errors.',
  },
  DOWN: {
    label: 'Down',
    tone: 'danger',
    Icon: XCircle,
    description: 'The service is not responding.',
  },
};

export const incidentSeverityMeta: Record<IncidentSeverity, StatusPresentation> = {
  MINOR: {
    label: 'Minor',
    tone: 'info',
    Icon: Info,
    description: 'A minor degradation with limited impact.',
  },
  MAJOR: {
    label: 'Major',
    tone: 'warning',
    Icon: AlertTriangle,
    description: 'A significant condition affecting the service.',
  },
  CRITICAL: {
    label: 'Critical',
    tone: 'danger',
    Icon: ShieldAlert,
    description: 'A service-affecting condition requiring attention.',
  },
};

export const incidentStatusMeta: Record<'OPEN' | 'RESOLVED', StatusPresentation> = {
    OPEN: {
      label: 'Open',
      tone: 'warning',
      Icon: AlertTriangle,
      description: 'The incident is currently active.',
    },
    RESOLVED: {
      label: 'Resolved',
      tone: 'success',
      Icon: CheckCircle2,
      description: 'The incident has been resolved by the simulation.',
    },
  };
