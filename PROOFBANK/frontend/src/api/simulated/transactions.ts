/**
 * Simulated transaction operations.
 *
 * The source owns the whole lifecycle: it creates the transaction, progresses
 * it through CREATED → PENDING → PROCESSING → terminal state, posts balanced
 * journal entries on settlement, and emits events with webhook deliveries at
 * every step. The interface only reads this state and polls while a
 * transaction is in progress — it never advances a transaction itself.
 */
import { uuid, pad, createRandom } from '../../lib/utils';
import type {
  DepositInput,
  LedgerDirection,
  LedgerEntry,
  Money,
  OperationResult,
  Page,
  ReverseInput,
  ReverseResult,
  Transaction,
  TransactionDetail,
  TransactionQuery,
  TransactionStatus,
  TransactionStatusChange,
  TransferInput,
  WebhookDelivery,
  WithdrawalInput,
  SimulationEvent,
  EventType,
} from '../../types/domain';
import type { SimulatedWorld } from './data';
import { SETTLEMENT_ACCOUNT_ID, SETTLEMENT_LABEL } from './data';
import { listLedgerForAccount } from './ledger';

const random = createRandom(98_771);

/** Transactions the source is still progressing, keyed by id. */
const progressing = new Set<string>();

export function isInProgress(id: string): boolean {
  return progressing.has(id);
}

/* ------------------------------------------------------------------ helpers */

function accountLabel(world: SimulatedWorld, accountId: string): string {
  if (accountId === SETTLEMENT_ACCOUNT_ID) return SETTLEMENT_LABEL;
  const account = world.accounts.find((candidate) => candidate.id === accountId);
  return account ? `Acct ••••${account.number.slice(-4)}` : `Acct ••••${accountId.slice(-4)}`;
}

function nextReference(world: SimulatedWorld, prefix: string): string {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const sequence = world.transactions.length + 1;
  return `${prefix}-${today}-${pad(sequence, 4)}`;
}

function findReference(world: SimulatedWorld, reference: string): Transaction | undefined {
  return world.transactions.find((transaction) => transaction.reference === reference);
}

function pushStatus(
  transaction: Transaction,
  status: TransactionStatus,
  note: string,
): void {
  const change: TransactionStatusChange = {
    status,
    at: new Date().toISOString(),
    note,
  };
  transaction.statusHistory.push(change);
  transaction.status = status;
  transaction.updatedAt = change.at;
}

function emitEvent(
  world: SimulatedWorld,
  type: EventType,
  transaction: Transaction,
  summary: string,
): SimulationEvent {
  const event: SimulationEvent = {
    id: uuid('evt'),
    type,
    occurredAt: new Date().toISOString(),
    transactionReference: transaction.reference,
    correlationId: transaction.correlationId,
    summary,
  };
  world.events.unshift(event);
  return event;
}

function emitDelivery(
  world: SimulatedWorld,
  event: SimulationEvent,
  delivered: boolean,
): WebhookDelivery {
  const delivery: WebhookDelivery = {
    id: uuid('dlv'),
    eventType: event.type,
    destination: 'https://proofops.simulated.test/hooks/proofbank',
    status: delivered ? 'DELIVERED' : random() < 0.5 ? 'FAILED' : 'RETRYING',
    attempts: delivered ? 1 : 1 + Math.floor(random() * 3),
    firstAttemptAt: event.occurredAt,
    lastAttemptAt: event.occurredAt,
    nextRetryAt: null,
    responseCode: delivered ? 200 : random() < 0.5 ? 502 : 503,
    error: delivered ? null : 'Destination rejected the delivery during simulation.',
    correlationId: event.correlationId,
  };
  world.deliveries.unshift(delivery);
  return delivery;
}

function deliveryFor(
  world: SimulatedWorld,
  event: SimulationEvent,
  deliveryShouldFail: boolean,
): void {
  const ok = !deliveryShouldFail && random() < 0.93;
  emitDelivery(world, event, ok);
}

function journalSequence(world: SimulatedWorld): number {
  return world.ledgerEntries.length + 1;
}

function postEntry(
  world: SimulatedWorld,
  transaction: Transaction,
  accountId: string,
  direction: LedgerDirection,
  postedAt: string,
  status: LedgerEntry['status'] = 'POSTED',
  compensatesEntryId?: string,
): LedgerEntry {
  const entry: LedgerEntry = {
    id: uuid('jrn'),
    code: `JE-${pad(journalSequence(world), 6)}`,
    transactionId: transaction.id,
    reference: transaction.reference,
    accountId,
    accountLabel: accountLabel(world, accountId),
    direction,
    amount: transaction.amount,
    postedAt,
    status,
    correlationId: transaction.correlationId,
    compensatesEntryId,
  };
  world.ledgerEntries.unshift(entry);
  if (accountId !== SETTLEMENT_ACCOUNT_ID) {
    world.ledgerEntryCounts[accountId] =
      (world.ledgerEntryCounts[accountId] ?? 0) + 1;
  }
  return entry;
}

/**
 * Applies a transaction's effect on account balances.
 *
 * `mode` says what just happened: a settlement moves the ledger balance, a
 * hold only reserves available balance, and a reversal undoes the original
 * effect without editing it.
 */
function applySettlement(
  world: SimulatedWorld,
  transaction: Transaction,
  mode: 'settle' | 'hold' | 'undo',
): void {
  const find = (id: string | null) =>
    id ? world.accounts.find((candidate) => candidate.id === id) : undefined;
  const sign = mode === 'undo' ? -1 : 1;
  const amount = sign * transaction.amount.amountMinor;

  const source = find(transaction.sourceAccountId);
  const destination = find(transaction.destinationAccountId);

  if (mode === 'settle' || mode === 'undo') {
    if (transaction.type === 'DEPOSIT' && destination) {
      destination.ledgerBalance.amountMinor += amount;
    } else if (transaction.type === 'WITHDRAWAL' && source) {
      source.ledgerBalance.amountMinor -= amount;
    } else if (transaction.type === 'INTERNAL_TRANSFER' && source && destination) {
      source.ledgerBalance.amountMinor -= amount;
      destination.ledgerBalance.amountMinor += amount;
    }
  }

  // Available balance is the ledger balance minus holds from pending work.
  world.accounts.forEach((account) => {
    const holds = world.transactions
      .filter(
        (candidate) =>
          (candidate.status === 'PENDING' || candidate.status === 'PROCESSING') &&
          candidate.sourceAccountId === account.id,
      )
      .reduce((sum, candidate) => sum + candidate.amount.amountMinor, 0);
    account.availableBalance.amountMinor = Math.max(
      0,
      account.ledgerBalance.amountMinor - holds,
    );
  });
}

function legsFor(
  transaction: Transaction,
): Array<[string, LedgerDirection]> {
  if (transaction.type === 'DEPOSIT') {
    return [
      [SETTLEMENT_ACCOUNT_ID, 'DEBIT'],
      [transaction.destinationAccountId ?? '', 'CREDIT'],
    ];
  }
  if (transaction.type === 'WITHDRAWAL') {
    return [
      [transaction.sourceAccountId ?? '', 'DEBIT'],
      [SETTLEMENT_ACCOUNT_ID, 'CREDIT'],
    ];
  }
  return [
    [transaction.sourceAccountId ?? '', 'DEBIT'],
    [transaction.destinationAccountId ?? '', 'CREDIT'],
  ];
}

function postBalancedEntries(
  world: SimulatedWorld,
  transaction: Transaction,
  reversed: boolean,
): LedgerEntry[] {
  const postedAt = new Date().toISOString();
  const entries = legsFor(transaction)
    .filter(([accountId]) => Boolean(accountId))
    .map(([accountId, direction]) =>
      postEntry(
        world,
        transaction,
        accountId,
        direction,
        postedAt,
        reversed ? 'REVERSED' : 'POSTED',
      ),
    );
  return entries;
}

/**
 * Progresses a transaction through its remaining states. Timing is the
 * source's own clock; the interface reflects whatever state it reads.
 */
function scheduleProgression(
  world: SimulatedWorld,
  transaction: Transaction,
  options: { deliveryFailures: boolean },
): void {
  progressing.add(transaction.id);

  const step = (delay: number, action: () => void) => {
    setTimeout(action, delay);
  };

  step(1_200, () => {
    if (transaction.status !== 'CREATED') return;
    pushStatus(transaction, 'PENDING', 'Awaiting provider response; funds are held but not settled.');
    const event = emitEvent(
      world,
      'transaction.pending',
      transaction,
      'Transaction pending provider response',
    );
    deliveryFor(world, event, options.deliveryFailures);
    applySettlement(world, transaction, 'hold');
  });

  step(2_400, () => {
    if (transaction.status !== 'PENDING') return;
    pushStatus(transaction, 'PROCESSING', 'Submitted to the payment provider.');
    const event = emitEvent(
      world,
      'transaction.created',
      transaction,
      'Transaction submitted for processing',
    );
    deliveryFor(world, event, options.deliveryFailures);
  });

  step(3_600, () => {
    if (transaction.status !== 'PROCESSING') return;
    // The simulated provider is degraded, so a minority of operations fail.
    const fails = random() < 0.22;
    if (fails) {
      const reason =
        random() < 0.5
          ? 'Insufficient funds in the source account.'
          : 'The payment provider did not respond within the simulated timeout.';
      transaction.failureReason = reason;
      pushStatus(transaction, 'FAILED', reason);
      transaction.completedAt = transaction.updatedAt;
      const event = emitEvent(world, 'transaction.failed', transaction, reason);
      deliveryFor(world, event, options.deliveryFailures);
      // Releasing the hold is part of failing: available balance is recomputed.
      applySettlement(world, transaction, 'hold');
    } else {
      pushStatus(transaction, 'SUCCESS', 'Settled successfully; ledger entries posted.');
      transaction.completedAt = transaction.updatedAt;
      postBalancedEntries(world, transaction, false);
      applySettlement(world, transaction, 'settle');
      const event = emitEvent(
        world,
        'transaction.completed',
        transaction,
        'Transaction settled; ledger entries posted',
      );
      deliveryFor(world, event, options.deliveryFailures);
    }
    progressing.delete(transaction.id);
  });
}

/* ------------------------------------------------------------------ listing */

export function listTransactions(
  world: SimulatedWorld,
  query: TransactionQuery,
): Page<Transaction> {
  const search = (query.search ?? '').trim().toLowerCase();
  const status = query.status ?? 'all';
  const type = query.type ?? 'all';
  const sort = query.sort ?? 'createdAt';
  const direction = query.direction ?? 'desc';
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 10));

  const from = query.from ? new Date(query.from).getTime() : null;
  const to = query.to ? new Date(query.to).getTime() : null;

  let items = world.transactions.filter((transaction) => {
    if (status !== 'all' && transaction.status !== status) return false;
    if (type !== 'all' && transaction.type !== type) return false;
    if (query.accountId) {
      const touches =
        transaction.sourceAccountId === query.accountId ||
        transaction.destinationAccountId === query.accountId;
      if (!touches) return false;
    }
    const at = new Date(transaction.createdAt).getTime();
    if (from !== null && at < from) return false;
    if (to !== null && at > to) return false;
    if (query.minAmountMinor !== undefined && transaction.amount.amountMinor < query.minAmountMinor) {
      return false;
    }
    if (query.maxAmountMinor !== undefined && transaction.amount.amountMinor > query.maxAmountMinor) {
      return false;
    }
    if (!search) return true;
    return (
      transaction.reference.toLowerCase().includes(search) ||
      transaction.id.toLowerCase().includes(search) ||
      transaction.correlationId.toLowerCase().includes(search) ||
      (transaction.scenarioName ?? '').toLowerCase().includes(search)
    );
  });

  items = items.slice().sort((a, b) => {
    const factor = direction === 'asc' ? 1 : -1;
    switch (sort) {
      case 'amount':
        return factor * (a.amount.amountMinor - b.amount.amountMinor);
      case 'status':
        return factor * a.status.localeCompare(b.status);
      case 'reference':
        return factor * a.reference.localeCompare(b.reference);
      default:
        return factor * a.createdAt.localeCompare(b.createdAt);
    }
  });

  const start = (page - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    total: items.length,
    page,
    pageSize,
  };
}

export function getTransactionDetail(
  world: SimulatedWorld,
  id: string,
): TransactionDetail | null {
  const transaction = world.transactions.find((candidate) => candidate.id === id);
  if (!transaction) return null;

  return {
    transaction,
    ledgerEntries: world.ledgerEntries
      .filter((entry) => entry.transactionId === transaction.id)
      .sort((a, b) => a.postedAt.localeCompare(b.postedAt)),
    events: world.events
      .filter((event) => event.transactionReference === transaction.reference)
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)),
    deliveries: world.deliveries
      .filter((delivery) => delivery.correlationId === transaction.correlationId)
      .sort((a, b) => (b.lastAttemptAt ?? '').localeCompare(a.lastAttemptAt ?? '')),
    inProgress: progressing.has(transaction.id),
  };
}

/* ---------------------------------------------------------------- mutations */

export type OperationFailure =
  | { code: 'invalid_account'; message: string }
  | { code: 'insufficient_funds'; message: string }
  | { code: 'invalid_amount'; message: string }
  | { code: 'invalid_currency'; message: string }
  | { code: 'duplicate_reference'; message: string }
  | { code: 'frozen_account'; message: string };

function validateOperation(
  world: SimulatedWorld,
  options: {
    accountIds: string[];
    amountMinor: number;
    currency: string;
  },
): OperationFailure | null {
  if (!Number.isFinite(options.amountMinor) || options.amountMinor <= 0) {
    return { code: 'invalid_amount', message: 'Enter an amount greater than zero.' };
  }
  for (const accountId of options.accountIds) {
    const account = world.accounts.find((candidate) => candidate.id === accountId);
    if (!account) {
      return { code: 'invalid_account', message: 'Choose a valid account.' };
    }
    if (account.status !== 'ACTIVE') {
      return {
        code: 'frozen_account',
        message: `Account ••••${account.number.slice(-4)} is ${account.status.toLowerCase()} and cannot be operated.`,
      };
    }
    if (account.currency !== options.currency) {
      return {
        code: 'invalid_currency',
        message: `Account ••••${account.number.slice(-4)} operates in ${account.currency}.`,
      };
    }
  }
  return null;
}

function checkFunds(
  world: SimulatedWorld,
  accountId: string,
  amountMinor: number,
  currency: string,
): OperationFailure | null {
  const account = world.accounts.find((candidate) => candidate.id === accountId);
  if (!account) return { code: 'invalid_account', message: 'Choose a valid account.' };
  if (account.currency !== currency) {
    return {
      code: 'invalid_currency',
      message: `Account ••••${account.number.slice(-4)} operates in ${account.currency}.`,
    };
  }
  if (account.availableBalance.amountMinor < amountMinor) {
    return {
      code: 'insufficient_funds',
      message: 'The source account does not have enough available balance for this operation.',
    };
  }
  return null;
}

function createTransaction(
  world: SimulatedWorld,
  input: {
    type: Transaction['type'];
    sourceAccountId: string | null;
    destinationAccountId: string | null;
    amount: Money;
    reference?: string;
    note?: string;
  },
): Transaction {
  const now = new Date().toISOString();
  const transaction: Transaction = {
    id: uuid('txn'),
    reference: input.reference ?? nextReference(world, input.type.slice(0, 3).toUpperCase()),
    type: input.type,
    status: 'CREATED',
    sourceAccountId: input.sourceAccountId,
    destinationAccountId: input.destinationAccountId,
    sourceLabel: input.sourceAccountId ? accountLabel(world, input.sourceAccountId) : null,
    destinationLabel: input.destinationAccountId
      ? accountLabel(world, input.destinationAccountId)
      : null,
    amount: input.amount,
    createdAt: now,
    updatedAt: now,
    completedAt: null,
    correlationId: `corr_${uuid().replace(/-/g, '').slice(0, 16)}`,
    scenarioName: null,
    failureReason: null,
    statusHistory: [
      { status: 'CREATED', at: now, note: input.note ?? 'Transaction accepted and recorded.' },
    ],
  };
  world.transactions.unshift(transaction);
  const event = emitEvent(
    world,
    'transaction.created',
    transaction,
    `${transaction.type.replace('_', ' ').toLowerCase()} created`,
  );
  deliveryFor(world, event, false);
  return transaction;
}

export function deposit(
  world: SimulatedWorld,
  input: DepositInput,
): { ok: true; result: OperationResult } | { ok: false; failure: OperationFailure } {
  const amountMinor = Math.round(input.amountMinor);
  const failure = validateOperation(world, {
    accountIds: [input.accountId],
    amountMinor,
    currency: input.currency,
  });
  if (failure) return { ok: false, failure };

  // A reused reference is idempotent: the original transaction is returned
  // instead of creating a second one.
  const existing = input.reference ? findReference(world, input.reference) : undefined;
  if (existing) {
    return { ok: true, result: { transaction: existing, duplicate: true } };
  }

  const transaction = createTransaction(world, {
    type: 'DEPOSIT',
    sourceAccountId: null,
    destinationAccountId: input.accountId,
    amount: { amountMinor, currency: input.currency },
    reference: input.reference,
    note: input.note,
  });
  scheduleProgression(world, transaction, { deliveryFailures: random() < 0.1 });
  return { ok: true, result: { transaction, duplicate: false } };
}

export function withdraw(
  world: SimulatedWorld,
  input: WithdrawalInput,
): { ok: true; result: OperationResult } | { ok: false; failure: OperationFailure } {
  const amountMinor = Math.round(input.amountMinor);
  const failure = validateOperation(world, {
    accountIds: [input.accountId],
    amountMinor,
    currency: input.currency,
  });
  if (failure) return { ok: false, failure };

  const funds = checkFunds(world, input.accountId, amountMinor, input.currency);
  if (funds) return { ok: false, failure: funds };

  const existing = input.reference ? findReference(world, input.reference) : undefined;
  if (existing) {
    return { ok: true, result: { transaction: existing, duplicate: true } };
  }

  const transaction = createTransaction(world, {
    type: 'WITHDRAWAL',
    sourceAccountId: input.accountId,
    destinationAccountId: null,
    amount: { amountMinor, currency: input.currency },
    reference: input.reference,
    note: input.note,
  });
  scheduleProgression(world, transaction, { deliveryFailures: random() < 0.1 });
  return { ok: true, result: { transaction, duplicate: false } };
}

export function transfer(
  world: SimulatedWorld,
  input: TransferInput,
): { ok: true; result: OperationResult } | { ok: false; failure: OperationFailure } {
  const amountMinor = Math.round(input.amountMinor);
  const failure = validateOperation(world, {
    accountIds: [input.sourceAccountId, input.destinationAccountId],
    amountMinor,
    currency: input.currency,
  });
  if (failure) return { ok: false, failure };
  if (input.sourceAccountId === input.destinationAccountId) {
    return {
      ok: false,
      failure: {
        code: 'invalid_account',
        message: 'Choose two different accounts for a transfer.',
      },
    };
  }

  const funds = checkFunds(world, input.sourceAccountId, amountMinor, input.currency);
  if (funds) return { ok: false, failure: funds };

  const existing = input.reference ? findReference(world, input.reference) : undefined;
  if (existing) {
    return { ok: true, result: { transaction: existing, duplicate: true } };
  }

  const transaction = createTransaction(world, {
    type: 'INTERNAL_TRANSFER',
    sourceAccountId: input.sourceAccountId,
    destinationAccountId: input.destinationAccountId,
    amount: { amountMinor, currency: input.currency },
    reference: input.reference,
    note: input.note,
  });
  scheduleProgression(world, transaction, { deliveryFailures: random() < 0.1 });
  return { ok: true, result: { transaction, duplicate: false } };
}

/** Reverses a settled transaction by posting compensating entries. */
export function reverse(
  world: SimulatedWorld,
  id: string,
  input: ReverseInput,
): { ok: true; result: ReverseResult } | { ok: false; code: string; message: string } {
  const transaction = world.transactions.find((candidate) => candidate.id === id);
  if (!transaction) {
    return { ok: false, code: 'not_found', message: 'No transaction with that identifier.' };
  }
  if (transaction.status !== 'SUCCESS') {
    return {
      ok: false,
      code: 'invalid_state',
      message: 'Only successful transactions can be reversed.',
    };
  }

  const reversedAt = new Date().toISOString();
  const originals = world.ledgerEntries
    .filter((entry) => entry.transactionId === transaction.id && entry.status === 'POSTED')
    .sort((a, b) => a.postedAt.localeCompare(b.postedAt));

  const compensating = originals.map((entry) =>
    postEntry(
      world,
      transaction,
      entry.accountId,
      entry.direction === 'DEBIT' ? 'CREDIT' : 'DEBIT',
      reversedAt,
      'POSTED',
      entry.id,
    ),
  );
  originals.forEach((entry) => {
    entry.status = 'REVERSED';
  });

  transaction.status = 'REVERSED';
  transaction.completedAt = reversedAt;
  transaction.updatedAt = reversedAt;
  transaction.statusHistory.push({
    status: 'REVERSED',
    at: reversedAt,
    note: `${input.reason || 'Reversed from the workspace.'} Compensating entries were posted.`,
  });

  applySettlement(world, transaction, 'undo');

  const event = emitEvent(
    world,
    'transaction.reversed',
    transaction,
    'Compensating entries posted',
  );
  deliveryFor(world, event, false);

  return { ok: true, result: { transaction, compensatingEntries: compensating } };
}

/** Entries for the ledger explorer. */
export function ledgerEntriesForAccount(world: SimulatedWorld, accountId: string) {
  return listLedgerForAccount(world, accountId);
}
