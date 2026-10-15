import { describe, expect, it, vi, afterEach } from 'vitest';
import { buildWorld } from '../api/simulated/data';
import {
  SCENARIO_CATALOGUE,
  executionHistory,
  getRun,
  listRuns,
  listScenarios,
  startScenario,
} from '../api/simulated/scenarios';
import { simulationStatus } from '../api/simulated/clock';
import { createClientForTests } from './apiTestClient';

function freshWorld() {
  return buildWorld(Date.UTC(2026, 9, 13, 12, 0, 0));
}

/** Resolves whichever scenario a run needs: an active account id. */
function activeAccount(world: ReturnType<typeof freshWorld>): string {
  return world.accounts.find((account) => account.status === 'ACTIVE')!.id;
}

describe('scenario catalogue', () => {
  it('implements financial and infrastructure scenarios', () => {
    const catalogue = listScenarios();
    expect(catalogue).toHaveLength(SCENARIO_CATALOGUE.length);
    expect(catalogue.every((scenario) => scenario.description.length > 0)).toBe(true);
    expect(
      catalogue.every((scenario) => scenario.expectedBehaviour.length > 0),
    ).toBe(true);
    expect(catalogue.some((scenario) => scenario.kind === 'financial')).toBe(true);
    expect(catalogue.some((scenario) => scenario.kind === 'infrastructure')).toBe(true);
  });

  it('declares only known parameter kinds', () => {
    for (const scenario of SCENARIO_CATALOGUE) {
      for (const parameter of scenario.parameters) {
        expect(['accountId', 'amountMinor', 'reason']).toContain(parameter.key);
      }
    }
  });
});

describe('scenario execution', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('refuses unknown scenarios', () => {
    const world = freshWorld();
    const result = startScenario(world, 'No such scenario', {});
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('unknown_scenario');
  });

  it('runs a deposit scenario through every step and records a result', async () => {
    vi.useFakeTimers();
    const world = freshWorld();
    const accountId = activeAccount(world);

    const started = startScenario(world, 'Successful deposit', {
      accountId,
      amountMinor: '250000',
    });
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    const runId = started.run.id;

    const initial = getRun(runId)!;
    expect(initial.status).toBe('RUNNING');
    expect(initial.steps).toHaveLength(5);
    expect(initial.inProgress).toBe(true);
    // The simulation engine now reports the active scenario.
    expect(simulationStatus().activeScenarioName).toBe('Successful deposit');

    // Advance through all steps.
    await vi.advanceTimersByTimeAsync(12_000);

    const finished = getRun(runId)!;
    expect(finished.status).toBe('SUCCEEDED');
    expect(finished.inProgress).toBe(false);
    expect(finished.finishedAt).not.toBeNull();
    expect(finished.steps.every((step) => step.status !== 'PENDING')).toBe(true);
    expect(finished.steps.every((step) => step.status !== 'SKIPPED')).toBe(true);
    // A real transaction was generated.
    expect(finished.transactionIds.length).toBe(1);
    const transaction = world.transactions.find(
      (candidate) => candidate.id === finished.transactionIds[0],
    );
    expect(transaction).toBeDefined();
    expect(transaction!.scenarioName).toBeNull(); // scenario attribution is on the run
    // Events were recorded.
    expect(finished.eventIds.length).toBeGreaterThan(0);
    // The active scenario is cleared when the run ends.
    expect(simulationStatus().activeScenarioName).toBeNull();
  });

  it('refuses an insufficient-funds withdrawal without creating a record', async () => {
    vi.useFakeTimers();
    const world = freshWorld();
    const accountId = activeAccount(world);
    const before = world.transactions.length;

    const started = startScenario(world, 'Insufficient funds', {
      accountId,
      amountMinor: '99999999',
    });
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    await vi.advanceTimersByTimeAsync(12_000);

    const finished = getRun(started.run.id)!;
    expect(finished.status).toBe('SUCCEEDED');
    expect(finished.transactionIds).toHaveLength(0);
    expect(finished.summary).toMatch(/available balance/i);
    expect(world.transactions.length).toBe(before);
  });

  it('proves idempotency with the duplicate reference scenario', async () => {
    vi.useFakeTimers();
    const world = freshWorld();
    const accountId = activeAccount(world);

    const started = startScenario(world, 'Repeated reference', {
      accountId,
      amountMinor: '50000',
    });
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    await vi.advanceTimersByTimeAsync(12_000);

    const finished = getRun(started.run.id)!;
    expect(finished.transactionIds).toHaveLength(1);
    expect(finished.summary).toMatch(/idempot/i);
  });

  it('reverses a settled transaction with compensating entries', async () => {
    vi.useFakeTimers();
    const world = freshWorld();
    const accountId = activeAccount(world);

    const started = startScenario(world, 'Reversal', {
      accountId,
      amountMinor: '90000',
    });
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    await vi.advanceTimersByTimeAsync(12_000);

    const finished = getRun(started.run.id)!;
    expect(finished.status).toBe('SUCCEEDED');
    const transaction = world.transactions.find(
      (candidate) => candidate.id === finished.transactionIds[0],
    );
    expect(transaction?.status).toBe('REVERSED');
    const compensating = world.ledgerEntries.filter(
      (entry) =>
        entry.transactionId === transaction!.id && entry.compensatesEntryId,
    );
    expect(compensating.length).toBeGreaterThanOrEqual(2);
    // The original entries are marked reversed, not removed.
    const originals = world.ledgerEntries.filter(
      (entry) =>
        entry.transactionId === transaction!.id &&
        !entry.compensatesEntryId &&
        entry.status === 'REVERSED',
    );
    expect(originals.length).toBeGreaterThanOrEqual(2);
  });

  it('injects a provider outage with an open incident', async () => {
    vi.useFakeTimers();
    const world = freshWorld();
    const started = startScenario(world, 'Simulated provider outage', {});
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    await vi.advanceTimersByTimeAsync(12_000);

    const finished = getRun(started.run.id)!;
    expect(finished.status).toBe('SUCCEEDED');
    expect(finished.incidentId).not.toBeNull();
    const incident = world.incidents.find((entry) => entry.id === finished.incidentId);
    expect(incident?.status).toBe('OPEN');
    expect(incident?.severity).toBe('CRITICAL');
    const provider = world.services.find((service) => service.name === 'Payment provider');
    expect(provider?.status).toBe('DOWN');
  });

  it('recovers the provider and resolves the outage', async () => {
    vi.useFakeTimers();
    const world = freshWorld();
    const outage = startScenario(world, 'Simulated provider outage', {});
    expect(outage.ok).toBe(true);
    await vi.advanceTimersByTimeAsync(12_000);

    const recovery = startScenario(world, 'Recovery after simulated failure', {});
    expect(recovery.ok).toBe(true);
    if (!recovery.ok) return;
    await vi.advanceTimersByTimeAsync(12_000);

    const finished = getRun(recovery.run.id)!;
    expect(finished.status).toBe('SUCCEEDED');
    expect(finished.summary).toMatch(/resolved/i);
    const provider = world.services.find((service) => service.name === 'Payment provider');
    expect(provider?.status).toBe('DEGRADED');
    expect(
      world.incidents.filter((incident) => incident.status === 'OPEN').length,
    ).toBeLessThan(3);
  });

  it('records retrying and delayed deliveries', async () => {
    vi.useFakeTimers();
    const world = freshWorld();

    const retries = startScenario(world, 'Repeated webhook retries', {});
    expect(retries.ok).toBe(true);
    await vi.advanceTimersByTimeAsync(12_000);
    const retryRun = getRun((retries as { run: { id: string } }).run.id)!;
    expect(retryRun.status).toBe('SUCCEEDED');
    const retryDelivery = world.deliveries.find(
      (delivery) => delivery.id === retryRun.deliveryIds[0],
    );
    expect(retryDelivery?.status).toBe('RETRYING');
    expect(retryDelivery?.attempts).toBe(5);
    expect(retryDelivery?.nextRetryAt).not.toBeNull();

    const delayed = startScenario(world, 'Delayed webhook', {});
    expect(delayed.ok).toBe(true);
    await vi.advanceTimersByTimeAsync(12_000);
    const delayedRun = getRun((delayed as { run: { id: string } }).run.id)!;
    const delayedDelivery = world.deliveries.find(
      (delivery) => delivery.id === delayedRun.deliveryIds[0],
    );
    expect(delayedDelivery?.status).toBe('PENDING');
  });

  it('delivers one event twice for the duplicate delivery scenario', async () => {
    vi.useFakeTimers();
    const world = freshWorld();
    const started = startScenario(world, 'Duplicate event delivery', {
      accountId: activeAccount(world),
      amountMinor: '30000',
    });
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    await vi.advanceTimersByTimeAsync(12_000);

    const finished = getRun(started.run.id)!;
    expect(finished.status).toBe('SUCCEEDED');
    expect(finished.deliveryIds).toHaveLength(2);
    expect(finished.summary).toMatch(/deduplicat/i);
  });

  it('emits out-of-order events for the ordering scenario', async () => {
    vi.useFakeTimers();
    const world = freshWorld();
    const started = startScenario(world, 'Out-of-order events', {
      accountId: activeAccount(world),
      amountMinor: '35000',
    });
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    await vi.advanceTimersByTimeAsync(12_000);

    const finished = getRun(started.run.id)!;
    const events = world.events.filter((event) => finished.eventIds.includes(event.id));
    expect(events).toHaveLength(2);
    // The completion event precedes the creation event.
    const completed = events.find((event) => event.type === 'transaction.completed')!;
    const created = events.find((event) => event.type === 'transaction.created')!;
    expect(completed.occurredAt < created.occurredAt).toBe(true);
  });

  it('reports a failed provider transaction with a reason', async () => {
    vi.useFakeTimers();
    const world = freshWorld();
    const started = startScenario(world, 'Provider timeout', {
      accountId: activeAccount(world),
      amountMinor: '65000',
    });
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    await vi.advanceTimersByTimeAsync(12_000);

    const finished = getRun(started.run.id)!;
    expect(finished.status).toBe('SUCCEEDED');
    const transaction = world.transactions.find(
      (candidate) => candidate.id === finished.transactionIds[0],
    )!;
    expect(transaction.status).toBe('FAILED');
    expect(transaction.failureReason).toMatch(/timeout/i);
    // Nothing was posted for a failed transaction.
    expect(
      world.ledgerEntries.filter((entry) => entry.transactionId === transaction.id),
    ).toHaveLength(0);
  });

  it('verifies the posted amount matches the requested amount', async () => {
    vi.useFakeTimers();
    const world = freshWorld();
    const started = startScenario(world, 'Amount discrepancy test', {
      accountId: activeAccount(world),
      amountMinor: '130000',
    });
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    await vi.advanceTimersByTimeAsync(12_000);

    const finished = getRun(started.run.id)!;
    expect(finished.status).toBe('SUCCEEDED');
    expect(finished.summary).toMatch(/matches the requested amount/i);
  });

  it('keeps a pending transaction unresolved and says so', async () => {
    vi.useFakeTimers();
    const world = freshWorld();
    const started = startScenario(world, 'Pending transaction', {
      accountId: activeAccount(world),
      amountMinor: '60000',
    });
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    await vi.advanceTimersByTimeAsync(12_000);

    const finished = getRun(started.run.id)!;
    expect(finished.status).toBe('SUCCEEDED');
    expect(finished.summary).toMatch(/remains pending/i);
  });

  it('lists runs and merges history with recorded executions', () => {
    const world = freshWorld();
    vi.useFakeTimers();
    const before = listRuns().length;
    startScenario(world, 'Delayed webhook', {});
    vi.useRealTimers();

    const runs = listRuns();
    expect(runs.length).toBe(before + 1);
    expect(runs[0].scenarioName).toBe('Delayed webhook');

    const history = executionHistory(world);
    expect(history.length).toBe(world.scenarioExecutions.length + runs.length);
    // Newest first.
    expect(history[0].id).toBe(runs[0].id);
  });
});

describe('scenario endpoints over the API client', () => {
  async function signedIn() {
    const client = createClientForTests();
    await client.signIn({
      email: 'amara.okafor@proofbank.test',
      password: 'demonstration1',
      role: 'super_admin',
    });
    return client;
  }

  it('serves the catalogue and history', async () => {
    const client = await signedIn();
    const catalogue = await client.scenarioCatalogue();
    expect(catalogue.length).toBeGreaterThan(10);
    const history = await client.scenarioHistory();
    expect(history.length).toBeGreaterThan(0);
    expect(history[0]).toHaveProperty('scenarioName');
  });

  it('runs a scenario through the API', async () => {
    const client = await signedIn();
    const accounts = await client.accountsList({ status: 'ACTIVE', pageSize: 5 });
    const run = await client.executeScenario('Successful deposit', {
      accountId: accounts.items[0].id,
      amountMinor: '150000',
    });
    expect(run.status).toBe('RUNNING');
    expect(run.steps.length).toBe(5);

    const detail = await client.scenarioRunDetail(run.id);
    expect(detail.id).toBe(run.id);
  });

  it('rejects an unknown scenario', async () => {
    const client = await signedIn();
    await expect(client.executeScenario('Nope', {})).rejects.toMatchObject({
      status: 404,
    });
  });
});
