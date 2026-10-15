/**
 * Deterministic simulated banking world.
 *
 * This is the bundled, clearly-labelled simulated data source that stands in
 * for a ProofBank backend. Everything it produces is simulated demonstration
 * data: fictional customers, fictional accounts, and generated transaction
 * activity. Balances are computed here, inside the source, exactly as a
 * backend would own them — the interface never calculates balances itself.
 *
 * Generation is seeded, so the same world shape appears on every boot, while
 * timestamps stay relative to boot time so the dashboard always has current
 * activity windows.
 */
import { createRandom, pick, pad, uuid } from '../../lib/utils';
import type {
  Account,
  AccountStatus,
  AccountStatusChange,
  AccountType,
  Customer,
  DeliveryStatus,
  EventType,
  InfrastructureIncident,
  LedgerDirection,
  LedgerEntry,
  Money,
  ProviderService,
  ScenarioExecution,
  SimulationEvent,
  Transaction,
  TransactionStatus,
  TransactionStatusChange,
  TransactionType,
  WebhookDelivery,
} from '../../types/domain';

/** Simulated external settlement account, used to keep every journal balanced. */
export const SETTLEMENT_ACCOUNT_ID = 'acc_settlement';
export const SETTLEMENT_LABEL = 'Settlement (simulated)';

const SEED = 20_261_013;
const NGN = 'NGN';
const PROOFOPS_DESTINATION = 'https://proofops.simulated.test/hooks/proofbank';

const FIRST_NAMES = [
  'Amara', 'Tunde', 'Chidi', 'Ngozi', 'Emeka', 'Aisha', 'Bola', 'Femi',
  'Ifeoma', 'Kunle', 'Zainab', 'Segun', 'Halima', 'Obinna', 'Yemi', 'Sade',
  'Ibrahim', 'Chioma', 'Uche', 'Musa', 'Bisi', 'Damilola', 'Ada', 'Tomi',
  'Kelechi', 'Fatima', 'Wale', 'Nneka',
];

const LAST_NAMES = [
  'Okafor', 'Bello', 'Nwosu', 'Adeyemi', 'Eze', 'Abubakar', 'Ogun', 'Balogun',
  'Okonkwo', 'Danjuma', 'Lawal', 'Obi', 'Yusuf', 'Adeleke', 'Chukwu', 'Sani',
  'Ojo', 'Onyeka', 'Musa', 'Ibrahim',
];

const FINANCIAL_SCENARIOS = [
  'Successful deposit',
  'Successful withdrawal',
  'Successful transfer',
  'Insufficient funds',
  'Failed transaction',
  'Pending transaction',
  'Delayed completion',
  'Reversal',
  'Duplicate reference',
  'Amount discrepancy test',
  'Invalid account',
];

const INFRASTRUCTURE_SCENARIOS = [
  'Webhook delivery failure',
  'Repeated webhook retries',
  'Delayed webhook',
  'Out-of-order events',
  'Provider timeout',
  'Simulated API latency',
  'Simulated provider outage',
  'Queue processing delay',
  'Recovery after simulated failure',
  'Duplicate event delivery',
];

const FAILURE_REASONS: Record<string, string> = {
  'Insufficient funds': 'Insufficient funds in the source account.',
  'Invalid account': 'The destination account is not eligible to receive funds.',
  'Provider timeout':
    'The payment provider did not respond within the simulated timeout.',
  'Amount discrepancy test': 'The submitted amount did not match the authorised amount.',
  'Duplicate reference': 'A transaction with this reference already exists.',
  'Failed transaction': 'The provider declined the operation during simulation.',
};

const SERVICES: Array<Omit<ProviderService, 'checkedAt'>> = [
  { name: 'Core ledger', status: 'OPERATIONAL', latencyMs: 42, errorRatePercent: 0.1 },
  { name: 'Payment provider', status: 'DEGRADED', latencyMs: 1180, errorRatePercent: 4.6 },
  { name: 'Webhook dispatcher', status: 'OPERATIONAL', latencyMs: 96, errorRatePercent: 0.4 },
  { name: 'Event queue', status: 'OPERATIONAL', latencyMs: 31, errorRatePercent: 0.2 },
];

export interface SimulatedWorld {
  customers: Customer[];
  accounts: Account[];
  transactions: Transaction[];
  ledgerEntries: LedgerEntry[];
  events: SimulationEvent[];
  deliveries: WebhookDelivery[];
  scenarioExecutions: ScenarioExecution[];
  incidents: InfrastructureIncident[];
  services: ProviderService[];
  /** Status history per account id. */
  accountStatusHistory: Record<string, AccountStatusChange[]>;
  /** Posted journal entries per account id. */
  ledgerEntryCounts: Record<string, number>;
}

const MS = {
  minute: 60_000,
  hour: 60 * 60_000,
  day: 24 * 60 * 60_000,
};

function iso(ms: number): string {
  return new Date(ms).toISOString();
}

function money(minor: number, currency = NGN): Money {
  return { amountMinor: minor, currency };
}

/** Weighted status pick. Deterministic for a given sequence position. */
function pickStatus(random: () => number): TransactionStatus {
  const roll = random();
  if (roll < 0.74) return 'SUCCESS';
  if (roll < 0.83) return 'FAILED';
  if (roll < 0.9) return 'PENDING';
  if (roll < 0.94) return 'PROCESSING';
  if (roll < 0.97) return 'REVERSED';
  return 'CREATED';
}

function terminal(status: TransactionStatus): boolean {
  return status === 'SUCCESS' || status === 'FAILED' || status === 'REVERSED';
}

function statusNote(status: TransactionStatus, reason: string | null): string {
  switch (status) {
    case 'CREATED':
      return 'Transaction accepted and recorded.';
    case 'PENDING':
      return 'Awaiting provider response; funds are held but not settled.';
    case 'PROCESSING':
      return 'Submitted to the payment provider.';
    case 'SUCCESS':
      return 'Settled successfully; ledger entries posted.';
    case 'FAILED':
      return reason ?? 'The operation failed during simulation.';
    case 'REVERSED':
      return 'Reversed: a compensating entry was posted against this transaction.';
  }
}

/**
 * Builds the world. Called once per page load; generation is cheap and fully
 * deterministic from SEED.
 */
export function buildWorld(now: number = Date.now()): SimulatedWorld {
  const random = createRandom(SEED);

  /* ---------------------------------------------------------- customers */
  const customerCount = 24;
  const customers: Customer[] = Array.from({ length: customerCount }, (_, index) => {
    const id = uuid('cus');
    const first = FIRST_NAMES[(index * 7 + 3) % FIRST_NAMES.length];
    const last = LAST_NAMES[(index * 5 + 11) % LAST_NAMES.length];
    const status: Customer['status'] = index === 6 ? 'SUSPENDED' : 'ACTIVE';
    return {
      id,
      code: `CUS-${pad(index + 1, 5)}`,
      name: `${first} ${last}`,
      email: `${first.toLowerCase()}.${last.toLowerCase()}${index}@example.test`,
      phone: `+234 802 ${pad(100 + index * 13, 3)} ${pad(4000 + index * 37, 4)}`,
      status,
      createdAt: iso(now - Math.floor((200 + random() * 700) * MS.day)),
      accountCount: 0,
    };
  });

  /* ----------------------------------------------------------- accounts */
  const accounts: Account[] = [];
  customers.forEach((customer, customerIndex) => {
    const perCustomer = 1 + Math.floor(random() * 2.2);
    for (let a = 0; a < perCustomer; a += 1) {
      const type: AccountType = random() < 0.55 ? 'SAVINGS' : 'CURRENT';
      const status: AccountStatus =
        customer.status === 'SUSPENDED'
          ? 'FROZEN'
          : a === 0 && customerIndex === 3
            ? 'DORMANT'
            : 'ACTIVE';
      accounts.push({
        id: uuid('acc'),
        number: `01${pad(customerIndex, 2)}${pad(a, 2)}${pad(
          Math.floor(random() * 100000),
          5,
        )}`.slice(0, 10),
        customerId: customer.id,
        customerName: customer.name,
        type,
        currency: NGN,
        status,
        availableBalance: money(0),
        ledgerBalance: money(0),
        createdAt: iso(now - Math.floor((30 + random() * 400) * MS.day)),
      });
      customer.accountCount += 1;
    }
  });

  /* ------------------------------------------------------- transactions */
  const transactionCount = 420;
  const span = 30 * MS.day;
  const transactions: Transaction[] = Array.from(
    { length: transactionCount },
    (_, index) => {
      // Roughly a third of activity lands inside the last 22 hours so the
      // default 24-hour dashboard window is representative; the rest is
      // spread across the full 30-day window.
      const recentBurst = index % 3 === 0;
      const createdAt = recentBurst
        ? now - Math.floor(random() * 22 * MS.hour) - 60_000
        : now -
          span +
          Math.floor((span * (index + random() * 0.6)) / transactionCount);
      const type: TransactionType =
        random() < 0.45 ? 'DEPOSIT' : random() < 0.8 ? 'WITHDRAWAL' : 'INTERNAL_TRANSFER';
      const scenarioName =
        random() < 0.09
          ? pick(
              random() < 0.6 ? FINANCIAL_SCENARIOS : INFRASTRUCTURE_SCENARIOS,
              random,
            )
          : null;

      let status = pickStatus(random);
      // Scenario-driven statuses read correctly for the scenario that caused them.
      if (scenarioName === 'Insufficient funds') status = 'FAILED';
      if (scenarioName === 'Pending transaction' || scenarioName === 'Delayed completion') {
        status = 'PENDING';
      }
      if (scenarioName === 'Reversal') status = 'REVERSED';

      const source =
        type === 'DEPOSIT'
          ? null
          : accounts[Math.floor(random() * accounts.length)];
      const destination =
        type === 'WITHDRAWAL' ? null : accounts[Math.floor(random() * accounts.length)];
      let usableDestination = destination;
      if (
        type === 'INTERNAL_TRANSFER' &&
        usableDestination &&
        source &&
        usableDestination.id === source.id
      ) {
        usableDestination =
          accounts[(accounts.indexOf(usableDestination) + 1) % accounts.length];
      }

      const baseAmount =
        type === 'DEPOSIT'
          ? 50_000 + Math.floor(random() * 4_500_000)
          : type === 'WITHDRAWAL'
            ? 10_000 + Math.floor(random() * 1_900_000)
            : 10_000 + Math.floor(random() * 7_400_000);
      const failureReason =
        status === 'FAILED'
          ? FAILURE_REASONS[scenarioName ?? ''] ??
            (type === 'WITHDRAWAL'
              ? 'Insufficient funds in the source account.'
              : 'The provider declined the operation during simulation.')
          : null;

      const history: TransactionStatusChange[] = [
        { status: 'CREATED', at: iso(createdAt), note: statusNote('CREATED', null) },
      ];
      let cursor = createdAt;
      if (status === 'PENDING' || status === 'PROCESSING' || terminal(status)) {
        cursor += 1_000 + Math.floor(random() * 20_000);
        history.push({
          status: 'PENDING',
          at: iso(cursor),
          note: statusNote('PENDING', null),
        });
      }
      if (status === 'PROCESSING' || terminal(status)) {
        cursor += 500 + Math.floor(random() * 14_000);
        history.push({
          status: 'PROCESSING',
          at: iso(cursor),
          note: statusNote('PROCESSING', null),
        });
      }
      if (terminal(status)) {
        cursor += 200 + Math.floor(random() * 9_000);
        history.push({
          status,
          at: iso(cursor),
          note: statusNote(status, failureReason),
        });
      }

      return {
        id: uuid('txn'),
        reference: `TXN-${new Date(createdAt).toISOString().slice(0, 10).replace(/-/g, '')}-${pad(index + 1, 4)}`,
        type,
        status,
        sourceAccountId: source?.id ?? null,
        destinationAccountId: usableDestination?.id ?? null,
        sourceLabel: source ? `Acct ••••${source.number.slice(-4)}` : null,
        destinationLabel: usableDestination
          ? `Acct ••••${usableDestination.number.slice(-4)}`
          : null,
        amount: money(baseAmount),
        createdAt: iso(createdAt),
        updatedAt: history[history.length - 1].at,
        completedAt: terminal(status) ? iso(cursor) : null,
        correlationId: `corr_${uuid().replace(/-/g, '').slice(0, 16)}`,
        scenarioName,
        failureReason,
        statusHistory: history,
      };
    },
  );

  /* ------------------------------------------------------ balances & history */
  // (populated after transactions exist; see below)

  /* ------------------------------------------------------ account history */
  const accountStatusHistory: Record<string, AccountStatusChange[]> = {};
  const ledgerEntryCounts: Record<string, number> = {};
  accounts.forEach((account, index) => {
    const history: AccountStatusChange[] = [
      {
        status: 'ACTIVE',
        at: account.createdAt,
        note: 'Account opened.',
        actor: 'Simulation',
      },
    ];
    if (account.status === 'DORMANT') {
      history.push({
        status: 'DORMANT',
        at: iso(Math.min(now - 6 * MS.day, new Date(account.createdAt).getTime() + 45 * MS.day)),
        note: 'No activity for the configured dormancy period.',
        actor: 'Simulation',
      });
    }
    if (account.status === 'FROZEN') {
      history.push({
        status: 'FROZEN',
        at: iso(now - Math.floor((1 + random() * 5) * MS.day)),
        note: 'Frozen while the linked customer is suspended.',
        actor: 'Amara Okafor',
      });
    }
    // One deterministic account demonstrates a full freeze-and-restore cycle.
    if (index === 12) {
      history.push(
        {
          status: 'FROZEN',
          at: iso(now - 12 * MS.day),
          note: 'Frozen during a provider outage scenario.',
          actor: 'Simulator administrator',
        },
        {
          status: 'ACTIVE',
          at: iso(now - 11 * MS.day),
          note: 'Restored after the provider recovered.',
          actor: 'Simulator administrator',
        },
      );
    }
    history.sort((a, b) => b.at.localeCompare(a.at));
    accountStatusHistory[account.id] = history;
  });

  /* ------------------------------------------------- posted ledger entries */
  // Every settled transaction posts a balanced pair: the simulated settlement
  // account stands in for the outside world so debits and credits always
  // match. A reversal never edits history: the original entries are marked
  // REVERSED and compensating entries are posted alongside them.
  const ledgerEntries: LedgerEntry[] = [];
  let journalSequence = 0;

  function postEntry(
    transaction: Transaction,
    accountId: string,
    accountLabel: string,
    direction: LedgerDirection,
    postedAt: string,
    status: LedgerEntry['status'],
    compensatesEntryId?: string,
  ): LedgerEntry {
    journalSequence += 1;
    const entry: LedgerEntry = {
      id: uuid('jrn'),
      code: `JE-${pad(journalSequence, 6)}`,
      transactionId: transaction.id,
      reference: transaction.reference,
      accountId,
      accountLabel,
      direction,
      amount: transaction.amount,
      postedAt,
      status,
      correlationId: transaction.correlationId,
      compensatesEntryId,
    };
    ledgerEntries.push(entry);
    return entry;
  }

  transactions
    .slice()
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .forEach((transaction) => {
      const settled = transaction.status === 'SUCCESS' || transaction.status === 'REVERSED';
      if (!settled || !transaction.completedAt) return;
      const completedAt = transaction.completedAt as string;

      const accountLabel = (accountId: string) =>
        accounts.find((account) => account.id === accountId)?.number ??
        `Acct ••••${accountId.slice(-4)}`;

      const legs: Array<[string, LedgerDirection]> =
        transaction.type === 'DEPOSIT'
          ? [[SETTLEMENT_ACCOUNT_ID, 'DEBIT'], [transaction.destinationAccountId ?? '', 'CREDIT']]
          : transaction.type === 'WITHDRAWAL'
            ? [[transaction.sourceAccountId ?? '', 'DEBIT'], [SETTLEMENT_ACCOUNT_ID, 'CREDIT']]
            : [
                [transaction.sourceAccountId ?? '', 'DEBIT'],
                [transaction.destinationAccountId ?? '', 'CREDIT'],
              ];

      const originals = legs
        .filter(([accountId]) => Boolean(accountId))
        .map(([accountId, direction]) =>
          postEntry(
            transaction,
            accountId,
            accountId === SETTLEMENT_ACCOUNT_ID ? SETTLEMENT_LABEL : accountLabel(accountId),
            direction,
            completedAt,
            transaction.status === 'REVERSED' ? 'REVERSED' : 'POSTED',
          ),
        );

      if (transaction.status === 'REVERSED') {
        // Compensating entries mirror the originals in the opposite direction.
        originals.forEach((entry) => {
          postEntry(
            transaction,
            entry.accountId,
            entry.accountLabel,
            entry.direction === 'DEBIT' ? 'CREDIT' : 'DEBIT',
            new Date(new Date(completedAt).getTime() + 2_000).toISOString(),
            'POSTED',
            entry.id,
          );
        });
      }
    });

  // Posted-entry counts per account (settlement excluded from account views).
  ledgerEntries.forEach((entry) => {
    if (entry.accountId === SETTLEMENT_ACCOUNT_ID) return;
    ledgerEntryCounts[entry.accountId] = (ledgerEntryCounts[entry.accountId] ?? 0) + 1;
  });

  /* --------------------------------------------------- ledger-derived balances */
  // The source owns balances. Settled operations move the ledger balance and
  // non-settled debits create holds. Opening balances are derived from the
  // actual drawdown each account needs, so no balance is ever negative and
  // available balance never exceeds ledger balance.
  const runningLedger = new Map<string, number>();
  const drawdown = new Map<string, number>();
  const holds = new Map<string, number>();

  const debit = (
    accountId: string | null,
    amount: number,
    settled: boolean,
    holdsFunds: boolean,
  ) => {
    if (!accountId) return;
    if (settled) {
      const next = (runningLedger.get(accountId) ?? 0) - amount;
      runningLedger.set(accountId, next);
      drawdown.set(accountId, Math.min(drawdown.get(accountId) ?? 0, next));
    } else if (holdsFunds) {
      // Only work in flight holds funds; failed and reversed transactions do not.
      holds.set(accountId, (holds.get(accountId) ?? 0) + amount);
    }
  };
  const credit = (accountId: string | null, amount: number) => {
    if (!accountId) return;
    const next = (runningLedger.get(accountId) ?? 0) + amount;
    runningLedger.set(accountId, next);
    drawdown.set(accountId, Math.min(drawdown.get(accountId) ?? 0, next));
  };

  transactions
    .slice()
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .forEach((transaction) => {
      const settled = transaction.status === 'SUCCESS';
      const holdsFunds =
        transaction.status === 'PENDING' || transaction.status === 'PROCESSING';
      const amount = transaction.amount.amountMinor;
      if (transaction.type === 'DEPOSIT') {
        if (settled) credit(transaction.destinationAccountId, amount);
      } else if (transaction.type === 'WITHDRAWAL') {
        debit(transaction.sourceAccountId, amount, settled, holdsFunds);
      } else {
        debit(transaction.sourceAccountId, amount, settled, holdsFunds);
        if (settled) credit(transaction.destinationAccountId, amount);
      }
    });

  accounts.forEach((account, index) => {
    const opening =
      -(drawdown.get(account.id) ?? 0) + 250_000 + Math.floor(random() * 1_750_000) + index * 977;
    const ledger = opening + (runningLedger.get(account.id) ?? 0);
    const hold = holds.get(account.id) ?? 0;
    account.ledgerBalance = money(Math.max(0, ledger));
    account.availableBalance = money(Math.max(0, ledger - hold));
  });

  /* -------------------------------------------------------------- events */
  const events: SimulationEvent[] = [];
  const pushEvent = (
    type: EventType,
    occurredAt: string,
    transaction: Transaction | null,
    summary: string,
  ) => {
    events.push({
      id: uuid('evt'),
      type,
      occurredAt,
      transactionReference: transaction?.reference ?? null,
      correlationId: transaction?.correlationId ?? `corr_${uuid().replace(/-/g, '').slice(0, 16)}`,
      summary,
    });
  };

  transactions.forEach((transaction) => {
    pushEvent('transaction.created', transaction.createdAt, transaction, `${transaction.type.replace('_', ' ').toLowerCase()} created`);
    if (transaction.completedAt) {
      if (transaction.status === 'SUCCESS') {
        pushEvent(
          'transaction.completed',
          transaction.completedAt,
          transaction,
          'Transaction settled; ledger entries posted',
        );
      } else if (transaction.status === 'FAILED') {
        pushEvent(
          'transaction.failed',
          transaction.completedAt,
          transaction,
          transaction.failureReason ?? 'Transaction failed',
        );
      } else if (transaction.status === 'REVERSED') {
        pushEvent(
          'transaction.reversed',
          transaction.completedAt,
          transaction,
          'Compensating entry posted',
        );
      }
    }
  });

  /* --------------------------------------------------------- deliveries */
  const deliveries: WebhookDelivery[] = [];
  events
    .filter((event) => event.type.startsWith('transaction.'))
    .forEach((event) => {
      const roll = random();
      const status: DeliveryStatus =
        roll < 0.92
          ? 'DELIVERED'
          : roll < 0.96
            ? 'FAILED'
            : roll < 0.98
              ? 'RETRYING'
              : roll < 0.99
                ? 'DEAD_LETTER'
                : 'PENDING';
      const attempts =
        status === 'DELIVERED' ? 1 : status === 'FAILED' ? 1 + Math.floor(random() * 3) : 2 + Math.floor(random() * 3);
      const lastAttemptAt = event.occurredAt;
      deliveries.push({
        id: uuid('dlv'),
        eventType: event.type,
        destination: PROOFOPS_DESTINATION,
        status,
        attempts,
        firstAttemptAt: lastAttemptAt,
        lastAttemptAt,
        nextRetryAt:
          status === 'RETRYING'
            ? iso(new Date(lastAttemptAt).getTime() + 30_000)
            : null,
        responseCode: status === 'DELIVERED' ? 200 : status === 'PENDING' ? null : pick([502, 503, 504], random),
        error:
          status === 'DELIVERED' || status === 'PENDING'
            ? null
            : status === 'DEAD_LETTER'
              ? 'Retries exhausted after 5 attempts; parked for inspection.'
              : 'Destination rejected the delivery during simulation.',
        correlationId: event.correlationId,
      });
    });

  /* --------------------------------------------------- scenario executions */
  const scenarioExecutions: ScenarioExecution[] = [];
  const executionCount = 14;
  Array.from({ length: executionCount }).forEach((_, index) => {
    const infrastructure = random() < 0.45;
    const scenarioName = pick(
      infrastructure ? INFRASTRUCTURE_SCENARIOS : FINANCIAL_SCENARIOS,
      random,
    );
    const startedAt = now - Math.floor(random() * 29 * MS.day);
    const status: ScenarioExecution['status'] =
      index === 0 ? 'RUNNING' : random() < 0.82 ? 'SUCCEEDED' : 'FAILED';
    const durationMs =
      status === 'RUNNING'
        ? null
        : 4_000 + Math.floor(random() * 46_000);
    const generated = transactions.filter((transaction) => transaction.scenarioName === scenarioName).length;
    scenarioExecutions.push({
      id: uuid('exec'),
      scenarioName,
      scenarioKind: infrastructure ? 'infrastructure' : 'financial',
      status,
      startedAt: iso(startedAt),
      finishedAt:
        status === 'RUNNING'
          ? null
          : iso(startedAt + (durationMs ?? 0)),
      durationMs,
      transactionsGenerated: generated,
      eventsGenerated: generated * 2,
      summary:
        status === 'RUNNING'
          ? 'Executing — step progress is reported by the simulation.'
          : status === 'SUCCEEDED'
            ? 'Completed as expected; records were generated for inspection.'
            : 'Execution failed; no further records were generated.',
    });
    pushEvent(
      'simulation.scenario_executed',
      status === 'RUNNING' ? iso(startedAt) : iso(startedAt + (durationMs ?? 0)),
      null,
      `Scenario "${scenarioName}" ${status === 'RUNNING' ? 'started' : status.toLowerCase()}`,
    );
  });

  /* ---------------------------------------------------------- incidents */
  const incidents: InfrastructureIncident[] = [
    {
      id: uuid('inc'),
      service: 'Payment provider',
      severity: 'MAJOR',
      status: 'OPEN',
      openedAt: iso(now - 42 * MS.minute),
      resolvedAt: null,
      summary: 'Injected provider outage: authorisation requests are timing out.',
      scenarioName: 'Simulated provider outage',
    },
    {
      id: uuid('inc'),
      service: 'Event queue',
      severity: 'MINOR',
      status: 'OPEN',
      openedAt: iso(now - 9 * MS.minute),
      resolvedAt: null,
      summary: 'Queue processing delay: events are delivered late but in order.',
      scenarioName: 'Queue processing delay',
    },
    {
      id: uuid('inc'),
      service: 'Webhook dispatcher',
      severity: 'MINOR',
      status: 'RESOLVED',
      openedAt: iso(now - 3 * MS.day),
      resolvedAt: iso(now - 3 * MS.day + 18 * MS.minute),
      summary: 'Repeated delivery retries recovered after the provider accepted traffic.',
      scenarioName: 'Recovery after simulated failure',
    },
  ];

  /* ----------------------------------------------------------- services */
  const services: ProviderService[] = SERVICES.map((service) => ({
    ...service,
    checkedAt: iso(now - Math.floor(random() * 2 * MS.minute)),
  }));

  events.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  deliveries.sort((a, b) => (b.lastAttemptAt ?? '').localeCompare(a.lastAttemptAt ?? ''));
  scenarioExecutions.sort((a, b) => b.startedAt.localeCompare(a.startedAt));

  return {
    customers,
    accounts,
    transactions,
    ledgerEntries,
    events,
    deliveries,
    scenarioExecutions,
    incidents,
    services,
    accountStatusHistory,
    ledgerEntryCounts,
  };
}
