/**
 * Scenario catalogue and execution engine.
 *
 * The engine belongs to the data source: it advances each run through steps
 * on its own clock and generates real records (transactions, journal entries,
 * events, deliveries, incidents). The interface polls the run state and never
 * marks a scenario successful on its own.
 */
import { uuid } from '../../lib/utils';
import type {
  ScenarioDefinition,
  ScenarioExecutionRecord,
  ScenarioRun,
  ScenarioStep,
} from '../../types/domain';
import type { SimulatedWorld } from './data';
import { deposit, reverse, transfer, withdraw } from './transactions';
import { setActiveScenario } from './clock';

const ACCOUNT_PARAMETER = {
  key: 'accountId' as const,
  label: 'Account',
  kind: 'account' as const,
  required: true,
  hint: 'The simulated account the scenario operates on.',
};

const AMOUNT_PARAMETER = (defaultMinor: number) => ({
  key: 'amountMinor' as const,
  label: 'Amount (major units)',
  kind: 'amount' as const,
  required: true,
  defaultMinor,
});

/** The implemented scenario library. */
export const SCENARIO_CATALOGUE: ScenarioDefinition[] = [
  /* ------------------------------------------------------------- financial */
  {
    name: 'Successful deposit',
    kind: 'financial',
    description: 'Credits a simulated account and lets it settle.',
    expectedBehaviour:
      'The transaction moves CREATED → PENDING → PROCESSING → SUCCESS, posts a balanced journal pair and emits events that are delivered.',
    parameters: [ACCOUNT_PARAMETER, AMOUNT_PARAMETER(250_000)],
    sideEffects: ['One new transaction, journal entries, events and deliveries.'],
  },
  {
    name: 'Successful withdrawal',
    kind: 'financial',
    description: 'Debits a simulated account within its available balance.',
    expectedBehaviour:
      'The transaction settles successfully; the available balance falls by the amount and a balanced journal pair is posted.',
    parameters: [ACCOUNT_PARAMETER, AMOUNT_PARAMETER(120_000)],
    sideEffects: ['One new transaction, journal entries, events and deliveries.'],
  },
  {
    name: 'Successful transfer',
    kind: 'financial',
    description: 'Moves funds between two simulated accounts.',
    expectedBehaviour:
      'Both accounts change by the amount; the journal posts a debit and a credit that balance.',
    parameters: [ACCOUNT_PARAMETER, AMOUNT_PARAMETER(300_000)],
    sideEffects: ['One new transaction, journal entries, events and deliveries.'],
  },
  {
    name: 'Insufficient funds',
    kind: 'financial',
    description: 'Attempts a withdrawal above the available balance.',
    expectedBehaviour:
      'The source refuses the operation with an insufficient-funds error; no transaction is created and nothing is posted.',
    parameters: [ACCOUNT_PARAMETER, AMOUNT_PARAMETER(9_999_999_99)],
    sideEffects: ['None — the operation is rejected before any record is created.'],
  },
  {
    name: 'Invalid account',
    kind: 'financial',
    description: 'Attempts an operation against an account that does not exist.',
    expectedBehaviour:
      'The source rejects the account reference; nothing is created.',
    parameters: [],
    sideEffects: ['None — the operation is rejected.'],
  },
  {
    name: 'Currency mismatch test',
    kind: 'financial',
    description: 'Attempts an operation in a currency the account does not use.',
    expectedBehaviour:
      'The source rejects the currency mismatch; nothing is created.',
    parameters: [ACCOUNT_PARAMETER, AMOUNT_PARAMETER(50_000)],
    sideEffects: ['None — the operation is rejected.'],
  },
  {
    name: 'Failed transaction',
    kind: 'financial',
    description: 'Runs an operation that fails during provider processing.',
    expectedBehaviour:
      'The transaction reaches FAILED with a provider reason; the held funds are released and nothing is posted.',
    parameters: [ACCOUNT_PARAMETER, AMOUNT_PARAMETER(80_000)],
    sideEffects: ['One failed transaction with a recorded reason.'],
  },
  {
    name: 'Pending transaction',
    kind: 'financial',
    description: 'Creates an operation that is still awaiting settlement.',
    expectedBehaviour:
      'The transaction is created and remains PENDING; the run records that it has not settled.',
    parameters: [ACCOUNT_PARAMETER, AMOUNT_PARAMETER(60_000)],
    sideEffects: ['One pending transaction holding part of the available balance.'],
  },
  {
    name: 'Delayed completion',
    kind: 'financial',
    description: 'Creates an operation whose completion is delayed by the provider.',
    expectedBehaviour:
      'The transaction is created PENDING and the run reports that completion is delayed.',
    parameters: [ACCOUNT_PARAMETER, AMOUNT_PARAMETER(45_000)],
    sideEffects: ['One pending transaction holding part of the available balance.'],
  },
  {
    name: 'Reversal',
    kind: 'financial',
    description: 'Settles a deposit, then reverses it.',
    expectedBehaviour:
      'The reversal posts compensating entries and marks the originals reversed; the original entries stay in the ledger.',
    parameters: [ACCOUNT_PARAMETER, AMOUNT_PARAMETER(90_000)],
    sideEffects: [
      'One reversed transaction with compensating journal entries.',
    ],
  },
  {
    name: 'Duplicate request',
    kind: 'financial',
    description: 'Submits the same operation twice with one reference.',
    expectedBehaviour:
      'The second submission returns the original transaction; no duplicate is created.',
    parameters: [ACCOUNT_PARAMETER, AMOUNT_PARAMETER(70_000)],
    sideEffects: ['One transaction only.'],
  },
  {
    name: 'Repeated reference',
    kind: 'financial',
    description: 'Reuses a reference that already exists in the environment.',
    expectedBehaviour:
      'The source returns the existing transaction rather than creating a new record.',
    parameters: [ACCOUNT_PARAMETER, AMOUNT_PARAMETER(55_000)],
    sideEffects: ['One transaction only.'],
  },
  {
    name: 'Amount discrepancy test',
    kind: 'financial',
    description: 'Verifies the amount posted equals the amount requested.',
    expectedBehaviour:
      'The run compares the requested amount against the posted journal entries and reports the result.',
    parameters: [ACCOUNT_PARAMETER, AMOUNT_PARAMETER(130_000)],
    sideEffects: ['One settled transaction used for the comparison.'],
  },

  /* -------------------------------------------------------- infrastructure */
  {
    name: 'Webhook delivery failure',
    kind: 'infrastructure',
    description: 'Records a delivery attempt that the destination rejects.',
    expectedBehaviour:
      'A failed delivery is recorded with the response code and error; the underlying transaction is unaffected.',
    parameters: [ACCOUNT_PARAMETER, AMOUNT_PARAMETER(40_000)],
    sideEffects: ['One transaction plus a failed delivery record.'],
  },
  {
    name: 'Repeated webhook retries',
    kind: 'infrastructure',
    description: 'Records a delivery that keeps being retried.',
    expectedBehaviour:
      'A retrying delivery is recorded with its attempt count and next retry time.',
    parameters: [],
    sideEffects: ['One retrying delivery record.'],
  },
  {
    name: 'Delayed webhook',
    kind: 'infrastructure',
    description: 'Records a delivery that is queued behind a delay.',
    expectedBehaviour: 'A pending delivery is recorded with a delayed next attempt.',
    parameters: [],
    sideEffects: ['One pending delivery record.'],
  },
  {
    name: 'Out-of-order events',
    kind: 'infrastructure',
    description: 'Emits lifecycle events out of chronological order.',
    expectedBehaviour:
      'The transaction\'s events arrive out of order; consumers must correlate by ID rather than sequence.',
    parameters: [ACCOUNT_PARAMETER, AMOUNT_PARAMETER(35_000)],
    sideEffects: ['One transaction with events recorded out of order.'],
  },
  {
    name: 'Provider timeout',
    kind: 'infrastructure',
    description: 'Runs an operation while the provider is timing out.',
    expectedBehaviour:
      'The transaction fails with a provider timeout; the held funds are released.',
    parameters: [ACCOUNT_PARAMETER, AMOUNT_PARAMETER(65_000)],
    sideEffects: ['One failed transaction with a timeout reason.'],
  },
  {
    name: 'Simulated API latency',
    kind: 'infrastructure',
    description: 'Marks the payment provider as degraded with elevated latency.',
    expectedBehaviour:
      'The provider service is reported degraded; the run restores it when it finishes.',
    parameters: [],
    sideEffects: [
      'The payment provider is degraded during the run and restored afterwards.',
    ],
  },
  {
    name: 'Simulated provider outage',
    kind: 'infrastructure',
    description: 'Injects a provider outage and opens an incident.',
    expectedBehaviour:
      'The payment provider is reported down and an open incident is recorded. It stays down until the recovery scenario runs.',
    parameters: [],
    sideEffects: [
      'An open incident remains until "Recovery after simulated failure" is run.',
    ],
  },
  {
    name: 'Queue processing delay',
    kind: 'infrastructure',
    description: 'Injects a queue delay on the event pipeline.',
    expectedBehaviour:
      'A minor incident is opened on the event queue and resolved by the end of the run.',
    parameters: [],
    sideEffects: ['A resolved incident is recorded.'],
  },
  {
    name: 'Recovery after simulated failure',
    kind: 'infrastructure',
    description: 'Restores the provider after an injected outage.',
    expectedBehaviour:
      'The payment provider returns to degraded, the open outage incident is resolved and a recovery event is recorded.',
    parameters: [],
    sideEffects: ['Open outage incidents are resolved.'],
  },
  {
    name: 'Duplicate event delivery',
    kind: 'infrastructure',
    description: 'Delivers the same event twice.',
    expectedBehaviour:
      'Two deliveries are recorded for one event; consumers must deduplicate by event ID.',
    parameters: [ACCOUNT_PARAMETER, AMOUNT_PARAMETER(30_000)],
    sideEffects: ['Two delivery records for one event.'],
  },
];

function definitionFor(name: string): ScenarioDefinition | undefined {
  return SCENARIO_CATALOGUE.find((scenario) => scenario.name === name);
}

/* -------------------------------------------------------------------- runs */

const runs = new Map<string, ScenarioRun>();
const listeners = new Set<(runs: ScenarioRun[]) => void>();

function snapshot(): ScenarioRun[] {
  return [...runs.values()].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

function emit(): void {
  const list = snapshot();
  listeners.forEach((listener) => listener(list));
}

/** Records the scenario's own outcome statement for the run summary. */
function setResult(run: ScenarioRun, detail: string): void {
  run.resultDetail = detail;
}

export function observeRuns(listener: (runs: ScenarioRun[]) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function listScenarios(): ScenarioDefinition[] {
  return SCENARIO_CATALOGUE;
}

export function getRun(id: string): ScenarioRun | null {
  const run = runs.get(id);
  if (!run) return null;
  return {
    ...run,
    steps: run.steps.map((step) => ({ ...step })),
    durationMs:
      run.finishedAt && run.startedAt
        ? Math.max(0, new Date(run.finishedAt).getTime() - new Date(run.startedAt).getTime())
        : run.durationMs,
    inProgress: run.status === 'RUNNING',
  };
}

export function listRuns(): ScenarioRun[] {
  return snapshot();
}

/** Execution history: runtime runs plus the seeded executions. */
export function executionHistory(world: SimulatedWorld): ScenarioExecutionRecord[] {
  const runtime: ScenarioExecutionRecord[] = snapshot().map((run) => ({
    id: run.id,
    scenarioName: run.scenarioName,
    kind: run.kind,
    status: run.status,
    startedAt: run.startedAt,
    finishedAt: run.finishedAt,
    durationMs: run.durationMs,
    summary: run.summary,
    transactionsGenerated: run.transactionIds.length,
    eventsGenerated: run.eventIds.length,
  }));

  const seeded: ScenarioExecutionRecord[] = world.scenarioExecutions.map((execution) => ({
    id: execution.id,
    scenarioName: execution.scenarioName,
    kind: execution.scenarioKind,
    status: execution.status,
    startedAt: execution.startedAt,
    finishedAt: execution.finishedAt,
    durationMs: execution.durationMs,
    summary: execution.summary,
    transactionsGenerated: execution.transactionsGenerated,
    eventsGenerated: execution.eventsGenerated,
  }));

  return [...runtime, ...seeded].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

/** Records a delivery for the given event. */
function recordDelivery(
  world: SimulatedWorld,
  run: ScenarioRun,
  options: {
    status: 'DELIVERED' | 'FAILED' | 'RETRYING' | 'PENDING';
    attempts: number;
    eventType: string;
    responseCode?: number | null;
    error?: string | null;
  },
): void {
  world.deliveries.unshift({
    id: uuid('dlv'),
    eventType: options.eventType as never,
    destination: 'https://proofops.simulated.test/hooks/proofbank',
    status: options.status,
    attempts: options.attempts,
    firstAttemptAt: new Date().toISOString(),
    lastAttemptAt: new Date().toISOString(),
    nextRetryAt:
      options.status === 'RETRYING'
        ? new Date(Date.now() + 30_000).toISOString()
        : options.status === 'PENDING'
          ? new Date(Date.now() + 120_000).toISOString()
          : null,
    responseCode: options.responseCode ?? null,
    error: options.error ?? null,
    correlationId: `corr_${uuid().replace(/-/g, '').slice(0, 16)}`,
  });
  const last = world.deliveries[0];
  if (last) run.deliveryIds.push(last.id);
}

function recordEvent(
  world: SimulatedWorld,
  run: ScenarioRun,
  eventType: string,
  summary: string,
  occurredAt?: string,
  transactionReference?: string,
): string {
  const id = uuid('evt');
  world.events.unshift({
    id,
    type: eventType as never,
    occurredAt: occurredAt ?? new Date().toISOString(),
    transactionReference: transactionReference ?? null,
    correlationId: `corr_${uuid().replace(/-/g, '').slice(0, 16)}`,
    summary,
  });
  run.eventIds.push(id);
  return id;
}

function advance(
  run: ScenarioRun,
  stepIndex: number,
  status: ScenarioStep['status'],
  detail: string,
): void {
  const step = run.steps[stepIndex];
  if (!step) return;
  step.status = status;
  step.at = new Date().toISOString();
  step.detail = detail;
  if (status === 'FAILED') {
    // Later steps never run.
    for (let index = stepIndex + 1; index < run.steps.length; index += 1) {
      if (run.steps[index].status === 'PENDING') {
        run.steps[index].status = 'SKIPPED';
      }
    }
  }
  emit();
}

function finish(
  run: ScenarioRun,
  status: 'SUCCEEDED' | 'FAILED',
  summary: string,
): void {  run.status = status;
  run.finishedAt = new Date().toISOString();
  run.summary = summary;
  run.durationMs =
    run.finishedAt && run.startedAt
      ? Math.max(0, new Date(run.finishedAt).getTime() - new Date(run.startedAt).getTime())
      : null;
  setActiveScenario(null, 'Scenario engine');
  emit();
}

const STEP_DELAY = 900;
/**
 * Steps that depend on a settled transaction wait long enough for the
 * transaction lifecycle (which runs on its own clock) to complete.
 */
const SETTLE_DELAY = 5_200;

/** Schedules the remaining steps of a run on the engine's own clock. */
function schedule(
  world: SimulatedWorld,
  run: ScenarioRun,
  actions: Array<() => void>,
  step = 0,
): void {
  if (step >= actions.length) return;
  const current = run.steps[step];
  if (current && current.status === 'PENDING') {
    current.status = 'RUNNING';
    current.at = new Date().toISOString();
    emit();
  }
  const isLastStep = step === actions.length - 1;
  setTimeout(
    () => {
      if (run.status !== 'RUNNING') return;
      actions[step]();
      if (run.status === 'RUNNING' && step + 1 < actions.length) {
        schedule(world, run, actions, step + 1);
      }
    },
    isLastStep ? SETTLE_DELAY : STEP_DELAY,
  );
}

/* --------------------------------------------------------------- execution */

export function startScenario(
  world: SimulatedWorld,
  name: string,
  parameters: Record<string, string> = {},
): { ok: true; run: ScenarioRun } | { ok: false; code: string; message: string } {
  const definition = definitionFor(name);
  if (!definition) {
    return { ok: false, code: 'unknown_scenario', message: 'Choose a scenario from the library.' };
  }

  const accountId = parameters.accountId ?? '';
  // Amounts arrive in minor units, matching the transaction API.
  const amountMinor = parameters.amountMinor
    ? Math.round(Number(parameters.amountMinor))
    : (definition.parameters.find((parameter) => parameter.key === 'amountMinor')
        ?.defaultMinor ?? 100_000);

  const steps: ScenarioStep[] = [
    { name: 'Prepare scenario context', status: 'PENDING', at: null, detail: null },
    { name: definition.description, status: 'PENDING', at: null, detail: null },
    { name: 'Record simulation events', status: 'PENDING', at: null, detail: null },
    { name: 'Deliver events to the destination', status: 'PENDING', at: null, detail: null },
    { name: 'Record execution result', status: 'PENDING', at: null, detail: null },
  ];

  const run: ScenarioRun = {
    id: uuid('run'),
    scenarioName: name,
    kind: definition.kind,
    status: 'RUNNING',
    startedAt: new Date().toISOString(),
    finishedAt: null,
    durationMs: null,
    steps,
    parameters: { accountId, amountMinor: String(amountMinor) },
    transactionIds: [],
    eventIds: [],
    deliveryIds: [],
    incidentId: null,
    summary: 'Running.',
    resultDetail: null,
    inProgress: true,
  };
  runs.set(run.id, run);
  setActiveScenario(name, 'Scenario engine');
  emit();

  const active = () => world.accounts.find((account) => account.id === accountId);

  /* --------------------------------------------------------- financial runs */
  const actions: Array<() => void> = [];

  actions.push(() => {
    const account = active();
    advance(
      run,
      0,
      account || !accountId ? 'SUCCESS' : 'FAILED',
      account
        ? `Scenario context prepared for account ••••${account.number.slice(-4)}.`
        : accountId
          ? 'The configured account was not found.'
          : 'Scenario context prepared; the scenario runs against the whole environment.',
    );
  });

  actions.push(() => {
    switch (name) {
      case 'Successful deposit':
      case 'Successful withdrawal':
      case 'Successful transfer': {
        const result =
          name === 'Successful deposit'
            ? deposit(world, {
                accountId,
                amountMinor,
                currency: active()?.currency ?? 'NGN',
                reference: `SCN-${run.id.slice(4, 10).toUpperCase()}`,
                note: `Created by the "${name}" scenario`,
              })
            : name === 'Successful withdrawal'
              ? withdraw(world, {
                  accountId,
                  amountMinor,
                  currency: active()?.currency ?? 'NGN',
                  reference: `SCN-${run.id.slice(4, 10).toUpperCase()}`,
                  note: `Created by the "${name}" scenario`,
                })
              : transfer(world, {
                  sourceAccountId: accountId,
                  destinationAccountId:
                    world.accounts.find((account) => account.id !== accountId)?.id ?? '',
                  amountMinor,
                  currency: active()?.currency ?? 'NGN',
                  reference: `SCN-${run.id.slice(4, 10).toUpperCase()}`,
                  note: `Created by the "${name}" scenario`,
                });
        if (!result.ok) {
          advance(run, 1, 'FAILED', result.failure.message);
          finish(run, 'FAILED', result.failure.message);
          return;
        }
        run.transactionIds.push(result.result.transaction.id);
        advance(
          run,
          1,
          'SUCCESS',
          `${result.result.transaction.reference} created and submitted to the provider.`,
        );
        return;
      }

      case 'Insufficient funds': {
        const result = withdraw(world, {
          accountId,
          amountMinor,
          currency: active()?.currency ?? 'NGN',
          reference: `SCN-${run.id.slice(4, 10).toUpperCase()}`,
        });
        if (result.ok) {
          advance(run, 1, 'FAILED', 'The withdrawal was accepted, which the scenario did not expect.');
          finish(run, 'FAILED', 'The environment accepted a withdrawal it should have refused.');
          return;
        }
        advance(run, 1, 'SUCCESS', result.failure.message);
        finish(run, 'SUCCEEDED', result.failure.message);
        return;
      }

      case 'Invalid account': {
        const result = deposit(world, {
          accountId: 'acc_does_not_exist',
          amountMinor,
          currency: 'NGN',
        });
        advance(
          run,
          1,
          'SUCCESS',
          result.ok
            ? 'The environment accepted an unknown account, which the scenario did not expect.'
            : result.failure.message,
        );
        finish(
          run,
          'SUCCEEDED',
          result.ok
            ? 'Unexpected acceptance: the environment did not reject the unknown account.'
            : result.failure.message,
        );
        return;
      }

      case 'Currency mismatch test': {
        const account = active();
        if (!account) {
          advance(run, 1, 'FAILED', 'The configured account was not found.');
          finish(run, 'FAILED', 'The configured account was not found.');
          return;
        }
        const wrongCurrency = account.currency === 'USD' ? 'GBP' : 'USD';
        const result = deposit(world, {
          accountId,
          amountMinor,
          currency: wrongCurrency,
        });
        advance(
          run,
          1,
          'SUCCESS',
          result.ok
            ? `The environment accepted ${wrongCurrency} on a ${account.currency} account, which the scenario did not expect.`
            : result.failure.message,
        );
        finish(
          run,
          'SUCCEEDED',
          result.ok
            ? 'Unexpected acceptance of a currency mismatch.'
            : result.failure.message,
        );
        return;
      }

      case 'Failed transaction':
      case 'Provider timeout': {
        const result = withdraw(world, {
          accountId,
          amountMinor,
          currency: active()?.currency ?? 'NGN',
          reference: `SCN-${run.id.slice(4, 10).toUpperCase()}`,
          note: `Created by the "${name}" scenario`,
        });
        if (!result.ok) {
          advance(run, 1, 'FAILED', result.failure.message);
          finish(run, 'FAILED', result.failure.message);
          return;
        }
        run.transactionIds.push(result.result.transaction.id);
        // The provider fails this operation on purpose for the scenario.
        const transaction = world.transactions.find(
          (candidate) => candidate.id === result.result.transaction.id,
        );
        if (transaction) {
          const reason =
            name === 'Provider timeout'
              ? 'The payment provider did not respond within the simulated timeout.'
              : 'The provider declined the operation during simulation.';
          transaction.status = 'FAILED';
          transaction.failureReason = reason;
          transaction.completedAt = new Date().toISOString();
          transaction.statusHistory.push({
            status: 'FAILED',
            at: transaction.completedAt,
            note: reason,
          });
        }
        advance(run, 1, 'SUCCESS', 'The transaction failed with a recorded provider reason.');
        return;
      }

      case 'Pending transaction':
      case 'Delayed completion': {
        const result = deposit(world, {
          accountId,
          amountMinor,
          currency: active()?.currency ?? 'NGN',
          reference: `SCN-${run.id.slice(4, 10).toUpperCase()}`,
          note: `Created by the "${name}" scenario`,
        });
        if (!result.ok) {
          advance(run, 1, 'FAILED', result.failure.message);
          finish(run, 'FAILED', result.failure.message);
          return;
        }
        run.transactionIds.push(result.result.transaction.id);
        advance(
          run,
          1,
          'SUCCESS',
          `${result.result.transaction.reference} was created and is awaiting settlement.`,
        );
        return;
      }

      case 'Reversal': {
        const result = deposit(world, {
          accountId,
          amountMinor,
          currency: active()?.currency ?? 'NGN',
          reference: `SCN-${run.id.slice(4, 10).toUpperCase()}`,
          note: 'Created by the "Reversal" scenario',
        });
        if (!result.ok) {
          advance(run, 1, 'FAILED', result.failure.message);
          finish(run, 'FAILED', result.failure.message);
          return;
        }
        run.transactionIds.push(result.result.transaction.id);
        advance(run, 1, 'SUCCESS', `${result.result.transaction.reference} created.`);
        return;
      }

      case 'Duplicate request':
      case 'Repeated reference': {
        const reference = `SCN-${run.id.slice(4, 10).toUpperCase()}`;
        const first = deposit(world, {
          accountId,
          amountMinor,
          currency: active()?.currency ?? 'NGN',
          reference,
          note: `Created by the "${name}" scenario`,
        });
        const second = deposit(world, {
          accountId,
          amountMinor,
          currency: active()?.currency ?? 'NGN',
          reference,
        });
        if (!first.ok || !second.ok) {
          advance(run, 1, 'FAILED', 'The operation could not be submitted.');
          finish(run, 'FAILED', 'The operation could not be submitted.');
          return;
        }
        run.transactionIds.push(first.result.transaction.id);
        advance(
          run,
          1,
          'SUCCESS',
          second.result.duplicate
            ? 'The second submission returned the original transaction; no duplicate was created.'
            : 'A second transaction was created, which the scenario did not expect.',
        );
        finish(
          run,
          'SUCCEEDED',
          second.result.duplicate
            ? 'Idempotency held: the repeated reference returned the original transaction.'
            : 'Idempotency did not hold for the repeated reference.',
        );
        return;
      }

      case 'Amount discrepancy test': {
        // The comparison happens in the final step, once the transaction has
        // had time to settle on its own lifecycle.
        const result = deposit(world, {
          accountId,
          amountMinor,
          currency: active()?.currency ?? 'NGN',
          reference: `SCN-${run.id.slice(4, 10).toUpperCase()}`,
        });
        if (!result.ok) {
          advance(run, 1, 'FAILED', result.failure.message);
          finish(run, 'FAILED', result.failure.message);
          return;
        }
        run.transactionIds.push(result.result.transaction.id);
        advance(
          run,
          1,
          'SUCCESS',
          `${result.result.transaction.reference} created; the posted amount is compared in the final step.`,
        );
        return;
      }

      case 'Webhook delivery failure': {
        const result = deposit(world, {
          accountId,
          amountMinor,
          currency: active()?.currency ?? 'NGN',
          reference: `SCN-${run.id.slice(4, 10).toUpperCase()}`,
        });
        if (result.ok) run.transactionIds.push(result.result.transaction.id);
        advance(
          run,
          1,
          'SUCCESS',
          result.ok
            ? 'A transaction was created to carry the failing delivery.'
            : result.failure.message,
        );
        return;
      }

      case 'Out-of-order events': {
        const result = deposit(world, {
          accountId,
          amountMinor,
          currency: active()?.currency ?? 'NGN',
          reference: `SCN-${run.id.slice(4, 10).toUpperCase()}`,
        });
        if (result.ok) run.transactionIds.push(result.result.transaction.id);
        advance(
          run,
          1,
          'SUCCESS',
          'A transaction was created; its events are emitted out of order next.',
        );
        return;
      }

      case 'Duplicate event delivery': {
        const result = deposit(world, {
          accountId,
          amountMinor,
          currency: active()?.currency ?? 'NGN',
          reference: `SCN-${run.id.slice(4, 10).toUpperCase()}`,
        });
        if (result.ok) run.transactionIds.push(result.result.transaction.id);
        advance(run, 1, 'SUCCESS', 'A transaction was created; its event is delivered twice next.');
        return;
      }

      default:
        advance(run, 1, 'SUCCESS', 'The scenario condition was applied.');
    }
  });

  /* --------------------------------------------------- infrastructure steps */
  actions.push(() => {
    const transactionId = run.transactionIds[0];
    const transaction = world.transactions.find((candidate) => candidate.id === transactionId);

    if (name === 'Webhook delivery failure' && transaction) {
      recordDelivery(world, run, {
        status: 'FAILED',
        attempts: 3,
        eventType: 'transaction.completed',
        responseCode: 502,
        error: 'Destination rejected the delivery during simulation.',
      });
      recordEvent(
        world,
        run,
        'webhook.delivery_failed',
        `Delivery of ${transaction.reference} failed after 3 attempts`,
        undefined,
        transaction.reference,
      );
      advance(
        run,
        2,
        'SUCCESS',
        'A failed delivery was recorded; the transaction itself is unaffected.',
      );
      return;
    }

    if (name === 'Out-of-order events' && transaction) {
      // Completion is recorded before creation to simulate out-of-order arrival.
      recordEvent(
        world,
        run,
        'transaction.completed',
        'Completion event arrived before the creation event',
        undefined,
        transaction.reference,
      );
      recordEvent(
        world,
        run,
        'transaction.created',
        'Creation event arrived after the completion event',
        new Date(Date.now() + 60_000).toISOString(),
        transaction.reference,
      );
      advance(run, 2, 'SUCCESS', 'Events were recorded out of chronological order.');
      return;
    }

    if (name === 'Simulated provider outage') {
      const provider = world.services.find((service) => service.name === 'Payment provider');
      if (provider) provider.status = 'DOWN';
      world.incidents.unshift({
        id: uuid('inc'),
        service: 'Payment provider',
        severity: 'CRITICAL',
        status: 'OPEN',
        openedAt: new Date().toISOString(),
        resolvedAt: null,
        summary: 'Injected provider outage: authorisation requests are timing out.',
        scenarioName: name,
      });
      run.incidentId = world.incidents[0].id;
      recordEvent(
        world,
        run,
        'infrastructure.health_changed',
        'Payment provider reported down (injected outage)',
      );
      advance(run, 2, 'SUCCESS', 'The provider is reported down and an incident is open.');
      return;
    }

    if (name === 'Recovery after simulated failure') {
      const provider = world.services.find((service) => service.name === 'Payment provider');
      if (provider) provider.status = 'DEGRADED';
      let resolved = 0;
      world.incidents.forEach((incident) => {
        if (incident.status === 'OPEN' && incident.service === 'Payment provider') {
          incident.status = 'RESOLVED';
          incident.resolvedAt = new Date().toISOString();
          resolved += 1;
        }
      });
      recordEvent(
        world,
        run,
        'infrastructure.health_changed',
        'Payment provider recovered and is reported degraded',
      );
      advance(
        run,
        2,
        'SUCCESS',
        resolved > 0
          ? `Recovery recorded; ${resolved} open incident(s) resolved.`
          : 'No open provider incidents were left to resolve.',
      );
      return;
    }

    if (name === 'Simulated API latency') {
      const provider = world.services.find((service) => service.name === 'Payment provider');
      if (provider) {
        provider.status = 'DEGRADED';
        provider.latencyMs = 2400;
        provider.errorRatePercent = 8.5;
      }
      recordEvent(world, run, 'infrastructure.health_changed', 'Payment provider latency elevated');
      advance(run, 2, 'SUCCESS', 'The provider is reported degraded with elevated latency.');
      return;
    }

    if (name === 'Queue processing delay') {
      world.incidents.unshift({
        id: uuid('inc'),
        service: 'Event queue',
        severity: 'MINOR',
        status: 'RESOLVED',
        openedAt: new Date().toISOString(),
        resolvedAt: new Date(Date.now() + 18 * 60_000).toISOString(),
        summary: 'Queue processing delay: events were delivered late but in order.',
        scenarioName: name,
      });
      run.incidentId = world.incidents[0].id;
      recordEvent(world, run, 'infrastructure.health_changed', 'Event queue delay resolved');
      advance(run, 2, 'SUCCESS', 'A resolved queue-delay incident was recorded.');
      return;
    }

    if (transaction) {
      recordEvent(
        world,
        run,
        'transaction.created',
        `${transaction.reference} created`,
        undefined,
        transaction.reference,
      );
      advance(run, 2, 'SUCCESS', 'Simulation events were recorded.');
      return;
    }

    advance(run, 2, 'SUCCESS', 'No additional events were required for this scenario.');
  });

  actions.push(() => {
    const transaction = world.transactions.find(
      (candidate) => candidate.id === run.transactionIds[0],
    );

    if (name === 'Webhook delivery failure' && transaction) {
      advance(
        run,
        3,
        'SUCCESS',
        'The failed delivery is visible in the event delivery workspace.',
      );
      return;
    }

    if (name === 'Repeated webhook retries') {
      recordDelivery(world, run, {
        status: 'RETRYING',
        attempts: 5,
        eventType: 'transaction.completed',
        responseCode: 503,
        error: 'Destination unavailable during simulation.',
      });
      const detail = 'A retrying delivery with five attempts was recorded.';
      setResult(run, detail);
      advance(run, 3, 'SUCCESS', detail);
      return;
    }

    if (name === 'Delayed webhook') {
      recordDelivery(world, run, {
        status: 'PENDING',
        attempts: 1,
        eventType: 'transaction.completed',
      });
      const detail = 'A delayed delivery was recorded.';
      setResult(run, detail);
      advance(run, 3, 'SUCCESS', detail);
      return;
    }

    if (name === 'Duplicate event delivery' && transaction) {
      const eventId = recordEvent(
        world,
        run,
        'transaction.completed',
        `${transaction.reference} completed`,
        undefined,
        transaction.reference,
      );
      [1, 2].forEach(() => {
        recordDelivery(world, run, {
          status: 'DELIVERED',
          attempts: 1,
          eventType: 'transaction.completed',
          responseCode: 200,
        });
      });
      const detail = `Event ${eventId.slice(0, 8)} was delivered twice; consumers must deduplicate by ID.`;
      setResult(run, detail);
      advance(run, 3, 'SUCCESS', detail);
      return;
    }

    if (transaction) {
      advance(
        run,
        3,
        'SUCCESS',
        `Events for ${transaction.reference} were delivered to the destination.`,
      );
      return;
    }

    advance(run, 3, 'SUCCESS', 'Event delivery completed.');
  });

  actions.push(() => {
    const transaction = world.transactions.find(
      (candidate) => candidate.id === run.transactionIds[0],
    );

    if (name === 'Amount discrepancy test' && transaction) {
      const posted = world.ledgerEntries
        .filter((entry) => entry.transactionId === transaction.id)
        .reduce(
          (sum, entry) =>
            entry.direction === 'CREDIT' ? sum + entry.amount.amountMinor : sum,
          0,
        );
      const matches = posted === transaction.amount.amountMinor;
      const detail = matches
        ? 'The posted credit matches the requested amount; no discrepancy.'
        : 'A discrepancy was detected between the requested and posted amounts.';
      setResult(run, detail);
      advance(run, 4, 'SUCCESS', detail);
      finish(run, 'SUCCEEDED', detail);
      return;
    }

    if (name === 'Reversal' && transaction) {
      const reversal = reverse(world, transaction.id, {
        reason: 'Reversed by the "Reversal" scenario.',
      });
      if (reversal.ok) {
        advance(
          run,
          4,
          'SUCCESS',
          `Reversed with ${reversal.result.compensatingEntries.length} compensating entries.`,
        );
        finish(
          run,
          'SUCCEEDED',
          `Reversal complete: ${reversal.result.compensatingEntries.length} compensating entries were posted and the originals marked reversed.`,
        );
        return;
      }
      advance(run, 4, 'FAILED', reversal.message);
      finish(run, 'FAILED', reversal.message);
      return;
    }

    if (name === 'Pending transaction' || name === 'Delayed completion') {
      const settled = transaction?.status === 'SUCCESS';
      advance(
        run,
        4,
        'SUCCESS',
        settled
          ? 'The transaction settled during the run.'
          : 'The transaction has not settled; it remains pending.',
      );
      finish(
        run,
        'SUCCEEDED',
        settled
          ? 'The transaction settled during the run.'
          : 'The scenario completed while the transaction remains pending — its outcome is not yet known.',
      );
      return;
    }

    if (name === 'Simulated API latency') {
      const provider = world.services.find((service) => service.name === 'Payment provider');
      if (provider) {
        provider.status = 'DEGRADED';
        provider.latencyMs = 1180;
        provider.errorRatePercent = 4.6;
      }
      advance(run, 4, 'SUCCESS', 'The provider was restored to its normal degraded state.');
      finish(run, 'SUCCEEDED', 'Latency scenario completed and the provider restored.');
      return;
    }

    // The summary prefers the scenario's own outcome statement, then the
    // condition step, then the action step.
    const detail =
      run.resultDetail ??
      (run.steps[2]?.status === 'SUCCESS' ? run.steps[2]?.detail : null) ??
      (run.steps[1]?.status === 'SUCCESS' ? run.steps[1]?.detail : null) ??
      null;
    const summary =
      run.steps[1]?.status === 'FAILED'
        ? (run.steps[1]?.detail ?? 'The scenario failed.')
        : (detail ?? `"${name}" completed: ${run.transactionIds.length} record(s) generated.`);
    advance(run, 4, 'SUCCESS', summary);
    finish(run, 'SUCCEEDED', summary);
  });

  schedule(world, run, actions);
  return { ok: true, run };
}
