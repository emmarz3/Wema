import { describe, expect, it } from 'vitest';
import { buildWorld } from '../api/simulated/data';
import {
  bucketVolume,
  computeSummary,
  statusDistribution,
} from '../api/simulated/metrics';
import { createClientForTests } from './apiTestClient';
import type { Role } from '../lib/permissions';

/**
 * These tests exercise the data source itself: the numbers the Overview
 * dashboard displays are computed here, so the invariants they must satisfy
 * are asserted here rather than trusted.
 */
describe('simulated world generation', () => {
  const world = buildWorld(Date.UTC(2026, 9, 13, 12, 0, 0));

  it('is deterministic for a given seed', () => {
    const again = buildWorld(Date.UTC(2026, 9, 13, 12, 0, 0));
    expect(again.customers.map((c) => c.code)).toEqual(
      world.customers.map((c) => c.code),
    );
    expect(again.transactions.length).toBe(world.transactions.length);
    expect(again.transactions[10].reference).toBe(world.transactions[10].reference);
    expect(again.transactions[10].status).toBe(world.transactions[10].status);
  });

  it('produces a populated but plausible environment', () => {
    expect(world.customers.length).toBeGreaterThan(10);
    expect(world.accounts.length).toBeGreaterThanOrEqual(world.customers.length);
    expect(world.transactions.length).toBeGreaterThan(200);
    expect(world.events.length).toBeGreaterThan(world.transactions.length);
    expect(world.services.length).toBeGreaterThan(2);
  });

  it('keeps every account balance non-negative, with available ≤ ledger', () => {
    for (const account of world.accounts) {
      expect(account.ledgerBalance.amountMinor).toBeGreaterThanOrEqual(0);
      expect(account.availableBalance.amountMinor).toBeGreaterThanOrEqual(0);
      expect(account.availableBalance.amountMinor).toBeLessThanOrEqual(
        account.ledgerBalance.amountMinor,
      );
    }
  });

  it('gives every account exactly one customer', () => {
    const customerIds = new Set(world.customers.map((customer) => customer.id));
    for (const account of world.accounts) {
      expect(customerIds.has(account.customerId)).toBe(true);
    }
  });

  it('gives every transaction a coherent lifecycle', () => {
    for (const transaction of world.transactions) {
      expect(transaction.statusHistory.length).toBeGreaterThan(0);
      expect(transaction.statusHistory[0].status).toBe('CREATED');
      expect(transaction.correlationId).toMatch(/^corr_[0-9a-f]{16}$/);
      expect(transaction.reference).toMatch(/^TXN-\d{8}-\d{4}$/);
      // Terminal states must have a completion timestamp.
      const terminalStatuses = ['SUCCESS', 'FAILED', 'REVERSED'];
      if (terminalStatuses.includes(transaction.status)) {
        expect(transaction.completedAt).not.toBeNull();
      } else {
        expect(transaction.completedAt).toBeNull();
      }
      // Status history is chronological.
      const times = transaction.statusHistory.map((change) =>
        new Date(change.at).getTime(),
      );
      for (let index = 1; index < times.length; index += 1) {
        expect(times[index]).toBeGreaterThanOrEqual(times[index - 1]);
      }
      // A failed transaction must explain itself.
      if (transaction.status === 'FAILED') {
        expect(transaction.failureReason).toBeTruthy();
      }
    }
  });

  it('gives a deposit a destination and a withdrawal a source', () => {
    for (const transaction of world.transactions) {
      if (transaction.type === 'DEPOSIT') {
        expect(transaction.destinationAccountId).toBeTruthy();
      }
      if (transaction.type === 'WITHDRAWAL') {
        expect(transaction.sourceAccountId).toBeTruthy();
      }
    }
  });
});

describe('dashboard metric computation', () => {
  const world = buildWorld(Date.UTC(2026, 9, 13, 12, 0, 0));
  const summary = computeSummary(
    {
      customers: world.customers,
      accounts: world.accounts,
      transactions: world.transactions,
      events: world.events,
      scenarioExecutions: world.scenarioExecutions,
      deliveries: world.deliveries,
      incidents: world.incidents,
      services: world.services,
      simulation: {
        state: 'running',
        mode: 'live',
        eventIntervalSeconds: 15,
        heartbeatAt: new Date().toISOString(),
        lastActivityAt: new Date().toISOString(),
        startedAt: new Date().toISOString(),
        stoppedAt: null,
        activeScenarioName: null,
        generatedEventCount: 0,
        nextActivityAt: null,
        environmentName: 'Test',
      },
      currency: 'NGN',
    },
    '24h',
    Date.UTC(2026, 9, 13, 12, 0, 0),
  );

  it('counts every status exactly once', () => {
    const { transactions } = summary.metrics;
    expect(
      transactions.successful +
        transactions.failed +
        transactions.pending +
        transactions.reversed +
        transactions.created,
    ).toBe(transactions.total);
  });

  it('settles volume from successful transactions only', () => {
    const successfulMinor = world.transactions
      .filter(
        (transaction) =>
          transaction.status === 'SUCCESS' &&
          new Date(transaction.createdAt).getTime() >=
            Date.UTC(2026, 9, 12, 12, 0, 0),
      )
      .reduce((sum, transaction) => sum + transaction.amount.amountMinor, 0);
    expect(summary.metrics.volumeMinor).toBe(successfulMinor);
  });

  it('buckets the range into the right number of intervals', () => {
    expect(summary.activity.volume).toHaveLength(24);
    const bucketed = summary.activity.volume.reduce(
      (sum, point) => sum + point.total,
      0,
    );
    expect(bucketed).toBe(summary.metrics.transactions.total);
  });

  it('reports status shares that add up to the whole', () => {
    const shares = summary.activity.statusDistribution.reduce(
      (sum, slice) => sum + slice.share,
      0,
    );
    expect(shares).toBeGreaterThan(99.9);
    expect(shares).toBeLessThan(100.1);
    expect(
      summary.activity.statusDistribution.reduce((sum, slice) => sum + slice.count, 0),
    ).toBe(summary.metrics.transactions.total);
  });

  it('summarises scenario and delivery state from the source records', () => {
    expect(summary.metrics.scenarios.running).toBe(
      world.scenarioExecutions.filter((execution) => execution.status === 'RUNNING').length,
    );
    expect(summary.metrics.infrastructure.openIncidents).toBe(
      world.incidents.filter((incident) => incident.status === 'OPEN').length,
    );
    expect(summary.metrics.events.emittedInPeriod).toBeGreaterThanOrEqual(0);
  });

  it('compares against the immediately preceding period', () => {
    expect(summary.metrics.previousPeriod.transactions).toBeGreaterThanOrEqual(0);
    expect(summary.metrics.period.range).toBe('24h');
  });

  it('supports 7-day and 30-day ranges', () => {
    const week = computeSummary(
      {
        customers: world.customers,
        accounts: world.accounts,
        transactions: world.transactions,
        events: world.events,
        scenarioExecutions: world.scenarioExecutions,
        deliveries: world.deliveries,
        incidents: world.incidents,
        services: world.services,
        simulation: summary.metrics.simulation,
        currency: 'NGN',
      },
      '7d',
      Date.UTC(2026, 9, 13, 12, 0, 0),
    );
    expect(week.activity.volume).toHaveLength(7);
    expect(week.metrics.transactions.total).toBeGreaterThan(
      summary.metrics.transactions.total,
    );
  });
});

describe('pure helpers', () => {
  it('bucketVolume returns one point per interval', () => {
    expect(bucketVolume([], '7d', Date.UTC(2026, 9, 13, 12))).toHaveLength(7);
    expect(bucketVolume([], '30d', Date.UTC(2026, 9, 13, 12))).toHaveLength(30);
  });

  it('statusDistribution sorts by count and is empty for no data', () => {
    expect(statusDistribution([])).toEqual([]);
  });
});

describe('api client', () => {
  /** Signs a test client in through the simulated source. */
  async function signedInClient(email: string, role: Role) {
    const client = createClientForTests();
    await client.signIn({ email, password: 'demonstration1', role });
    return client;
  }

  it('rejects an unsupported range instead of inventing one', async () => {
    const client = await signedInClient('amara.okafor@proofbank.test', 'super_admin');
    await expect(
      client.dashboardSummary('nope' as unknown as '24h'),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('returns a summary with matching metrics and activity', async () => {
    const client = await signedInClient('amara.okafor@proofbank.test', 'super_admin');
    const summary = await client.dashboardSummary('7d');
    expect(summary.metrics.transactions.total).toBe(
      summary.activity.volume.reduce((sum, point) => sum + point.total, 0),
    );
  });

  it('returns the requested number of recent records', async () => {
    const client = await signedInClient('tunde.bello@proofbank.test', 'simulator_admin');
    const recent = await client.recentTransactions(3);
    expect(recent).toHaveLength(3);
    const events = await client.recentEvents(5);
    expect(events.length).toBeLessThanOrEqual(5);
  });

  it('exposes infrastructure health with services and incidents', async () => {
    const client = await signedInClient('amara.okafor@proofbank.test', 'super_admin');
    const health = await client.infrastructureHealth();
    expect(health.services.length).toBeGreaterThan(0);
    expect(Array.isArray(health.incidents)).toBe(true);
  });
});
