/**
 * Dashboard metric computation — the data source's job, not the UI's.
 *
 * Pure functions over the simulated world so the numbers the Overview shows
 * can be tested independently of rendering.
 */
import type {
  DashboardActivity,
  DashboardMetrics,
  DashboardRange,
  DashboardSummary,
  ScenarioExecution,
  SimulationStatus,
  StatusSlice,
  Transaction,
  VolumePoint,
} from '../../types/domain';

const RANGE_MS: Record<DashboardRange, number> = {
  '24h': 24 * 60 * 60_000,
  '7d': 7 * 24 * 60 * 60_000,
  '30d': 30 * 24 * 60 * 60_000,
};

const BUCKETS: Record<DashboardRange, number> = { '24h': 24, '7d': 7, '30d': 30 };

function bucketDurationMs(range: DashboardRange): number {
  return RANGE_MS[range] / BUCKETS[range];
}

interface Counted {
  total: number;
  successful: number;
  failed: number;
  pending: number;
  reversed: number;
  created: number;
  volumeMinor: number;
}

function countTransactions(transactions: Transaction[]): Counted {
  const counted: Counted = {
    total: transactions.length,
    successful: 0,
    failed: 0,
    pending: 0,
    reversed: 0,
    created: 0,
    volumeMinor: 0,
  };
  transactions.forEach((transaction) => {
    switch (transaction.status) {
      case 'SUCCESS':
        counted.successful += 1;
        counted.volumeMinor += transaction.amount.amountMinor;
        break;
      case 'FAILED':
        counted.failed += 1;
        break;
      case 'PENDING':
      case 'PROCESSING':
        counted.pending += 1;
        break;
      case 'REVERSED':
        counted.reversed += 1;
        break;
      case 'CREATED':
        counted.created += 1;
        break;
    }
  });
  return counted;
}

function inPeriod(transactions: Transaction[], from: number, to: number): Transaction[] {
  return transactions.filter((transaction) => {
    const at = new Date(transaction.createdAt).getTime();
    return at >= from && at < to;
  });
}

/** Volume time series bucketed by creation time. */
export function bucketVolume(
  transactions: Transaction[],
  range: DashboardRange,
  now: number,
): VolumePoint[] {
  const from = now - RANGE_MS[range];
  const bucketMs = bucketDurationMs(range);
  const points: VolumePoint[] = [];

  for (let index = 0; index < BUCKETS[range]; index += 1) {
    const bucketStart = from + index * bucketMs;
    const bucketEnd = bucketStart + bucketMs;
    const inBucket = transactions.filter((transaction) => {
      const at = new Date(transaction.createdAt).getTime();
      return at >= bucketStart && at < bucketEnd;
    });
    const counted = countTransactions(inBucket);
    points.push({
      bucketStart: new Date(bucketStart).toISOString(),
      successful: counted.successful,
      failed: counted.failed,
      pending: counted.pending,
      reversed: counted.reversed,
      total: counted.total,
    });
  }
  return points;
}

/** Status distribution with shares for the selected period. */
export function statusDistribution(transactions: Transaction[]): StatusSlice[] {
  const total = transactions.length;
  const counts = new Map<string, number>();
  transactions.forEach((transaction) => {
    counts.set(transaction.status, (counts.get(transaction.status) ?? 0) + 1);
  });
  return [...counts.entries()]
    .map(([status, count]) => ({
      status: status as StatusSlice['status'],
      count,
      share: total ? (count / total) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count);
}

export interface DashboardInputs {
  customers: { createdAt: string }[];
  accounts: { status: string }[];
  transactions: Transaction[];
  events: { occurredAt: string }[];
  scenarioExecutions: ScenarioExecution[];
  deliveries: { status: string; lastAttemptAt: string | null }[];
  incidents: { status: string }[];
  services: { status: string }[];
  simulation: SimulationStatus;
  currency: string;
}

export function computeSummary(
  world: DashboardInputs,
  range: DashboardRange,
  now: number = Date.now(),
): DashboardSummary {
  const periodMs = RANGE_MS[range];
  const to = now;
  const from = now - periodMs;
  const previousFrom = from - periodMs;

  const current = inPeriod(world.transactions, from, to);
  const previous = inPeriod(world.transactions, previousFrom, from);

  const counted = countTransactions(current);
  const previousCounted = countTransactions(previous);

  const executionsInPeriod = world.scenarioExecutions.filter((execution) => {
    const at = new Date(execution.startedAt).getTime();
    return at >= from && at < to;
  });
  const lastExecution = executionsInPeriod
    .slice()
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0];

  const deliveriesInPeriod = world.deliveries.filter((delivery) => {
    const at = delivery.lastAttemptAt ? new Date(delivery.lastAttemptAt).getTime() : 0;
    return at >= from && at < to;
  });

  const metrics: DashboardMetrics = {
    period: {
      from: new Date(from).toISOString(),
      to: new Date(to).toISOString(),
      range,
    },
    customers: {
      total: world.customers.length,
      newInPeriod: world.customers.filter((customer) => {
        const at = new Date(customer.createdAt).getTime();
        return at >= from && at < to;
      }).length,
    },
    accounts: {
      total: world.accounts.length,
      active: world.accounts.filter((account) => account.status === 'ACTIVE').length,
    },
    transactions: {
      total: counted.total,
      successful: counted.successful,
      failed: counted.failed,
      pending: counted.pending,
      reversed: counted.reversed,
      created: counted.created,
    },
    volumeMinor: counted.volumeMinor,
    currency: world.currency,
    previousPeriod: {
      transactions: previousCounted.total,
      successful: previousCounted.successful,
      failed: previousCounted.failed,
      reversed: previousCounted.reversed,
      volumeMinor: previousCounted.volumeMinor,
    },
    simulation: world.simulation,
    scenarios: {
      executionsInPeriod: executionsInPeriod.length,
      lastExecutionStatus: lastExecution?.status ?? null,
      lastExecutionAt: lastExecution?.startedAt ?? null,
      running: world.scenarioExecutions.filter((execution) => execution.status === 'RUNNING')
        .length,
    },
    events: {
      emittedInPeriod: world.events.filter((event) => {
        const at = new Date(event.occurredAt).getTime();
        return at >= from && at < to;
      }).length,
      delivered: deliveriesInPeriod.filter((delivery) => delivery.status === 'DELIVERED')
        .length,
      failed: deliveriesInPeriod.filter(
        (delivery) => delivery.status === 'FAILED' || delivery.status === 'DEAD_LETTER',
      ).length,
      pending: deliveriesInPeriod.filter((delivery) => delivery.status === 'PENDING')
        .length,
    },
    infrastructure: {
      openIncidents: world.incidents.filter((incident) => incident.status === 'OPEN').length,
      servicesDown: world.services.filter((service) => service.status === 'DOWN').length,
      servicesDegraded: world.services.filter((service) => service.status === 'DEGRADED')
        .length,
    },
  };

  const activity: DashboardActivity = {
    volume: bucketVolume(current, range, now),
    statusDistribution: statusDistribution(current),
  };

  return { metrics, activity };
}
