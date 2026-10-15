import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { buildWorld } from '../api/simulated/data';
import {
  deposit,
  getTransactionDetail,
  listTransactions,
  reverse,
  transfer,
  withdraw,
} from '../api/simulated/transactions';
import { getLedgerEntry, listLedger } from '../api/simulated/ledger';
import { createClientForTests } from './apiTestClient';
import { toCsv } from '../lib/exportCsv';

function freshWorld() {
  return buildWorld(Date.UTC(2026, 9, 13, 12, 0, 0));
}

describe('transaction listing', () => {
  const world = freshWorld();

  it('paginates the transaction population', () => {
    const first = listTransactions(world, { page: 1, pageSize: 10 });
    expect(first.items).toHaveLength(10);
    expect(first.total).toBe(world.transactions.length);
    const second = listTransactions(world, { page: 2, pageSize: 10 });
    expect(second.items[0].id).not.toBe(first.items[0].id);
  });

  it('searches by reference and correlation id', () => {
    const target = world.transactions[7];
    const byReference = listTransactions(world, { search: target.reference, pageSize: 5 });
    expect(byReference.items.map((t) => t.id)).toContain(target.id);
    const byCorrelation = listTransactions(world, {
      search: target.correlationId,
      pageSize: 5,
    });
    expect(byCorrelation.items.map((t) => t.id)).toContain(target.id);
  });

  it('filters by status and type', () => {
    const failed = listTransactions(world, { status: 'FAILED', pageSize: 100 });
    expect(failed.items.every((t) => t.status === 'FAILED')).toBe(true);
    const deposits = listTransactions(world, { type: 'DEPOSIT', pageSize: 100 });
    expect(deposits.items.every((t) => t.type === 'DEPOSIT')).toBe(true);
    expect(deposits.total).toBeGreaterThan(0);
  });

  it('filters by amount range', () => {
    const all = listTransactions(world, { pageSize: 1000 });
    const amounts = all.items.map((t) => t.amount.amountMinor).sort((a, b) => a - b);
    const median = amounts[Math.floor(amounts.length / 2)];
    const filtered = listTransactions(world, {
      minAmountMinor: median,
      maxAmountMinor: median,
      pageSize: 1000,
    });
    expect(
      filtered.items.every((t) => t.amount.amountMinor === median),
    ).toBe(true);
  });

  it('sorts by amount', () => {
    const asc = listTransactions(world, {
      sort: 'amount',
      direction: 'asc',
      pageSize: 50,
    });
    for (let index = 1; index < asc.items.length; index += 1) {
      expect(asc.items[index].amount.amountMinor).toBeGreaterThanOrEqual(
        asc.items[index - 1].amount.amountMinor,
      );
    }
  });

  it('assembles the detail payload with ledger, events and deliveries', () => {
    const target = world.transactions.find((transaction) => transaction.status === 'SUCCESS')!;
    const detail = getTransactionDetail(world, target.id)!;
    expect(detail.transaction.id).toBe(target.id);
    expect(detail.ledgerEntries.length).toBeGreaterThanOrEqual(2);
    expect(detail.events.length).toBeGreaterThan(0);
    expect(
      detail.deliveries.every((delivery) => delivery.correlationId === target.correlationId),
    ).toBe(true);
    expect(detail.inProgress).toBe(false);
  });
});

describe('journal entries', () => {
  const world = freshWorld();

  it('posts balanced entries for every settled transaction', () => {
    const settled = world.transactions.filter(
      (transaction) => transaction.status === 'SUCCESS' || transaction.status === 'REVERSED',
    );
    for (const transaction of settled) {
      const entries = world.ledgerEntries.filter(
        (entry) => entry.transactionId === transaction.id,
      );
      const debits = entries
        .filter((entry) => entry.direction === 'DEBIT')
        .reduce((sum, entry) => sum + entry.amount.amountMinor, 0);
      const credits = entries
        .filter((entry) => entry.direction === 'CREDIT')
        .reduce((sum, entry) => sum + entry.amount.amountMinor, 0);
      expect(debits).toBe(credits);
      expect(entries.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('totals debits and credits equally for the whole ledger', () => {
    const page = listLedger(world, { page: 1, pageSize: 1000 });
    expect(page.totals.balanced).toBe(true);
    expect(page.totals.debitMinor).toBe(page.totals.creditMinor);
  });

  it('reports out-of-balance when the filter excludes one side of a pair', () => {
    const page = listLedger(world, {
      direction: 'DEBIT',
      page: 1,
      pageSize: 1000,
    });
    expect(page.totals.balanced).toBe(false);
    expect(page.totals.creditMinor).toBe(0);
    expect(page.totals.debitMinor).toBeGreaterThan(0);
  });

  it('paginates and filters the explorer', () => {
    const first = listLedger(world, { page: 1, pageSize: 10 });
    expect(first.items).toHaveLength(10);
    const reversedOnly = listLedger(world, { status: 'REVERSED', pageSize: 1000 });
    expect(reversedOnly.items.every((entry) => entry.status === 'REVERSED')).toBe(true);
  });

  it('returns entry detail with compensation links', () => {
    const compensating = world.ledgerEntries.find(
      (entry) => entry.compensatesEntryId,
    )!;
    const detail = getLedgerEntry(world, compensating.id)!;
    expect(detail.entry.id).toBe(compensating.id);
    expect(detail.compensatingFor.length).toBe(1);
    expect(detail.compensatingFor[0].status).toBe('REVERSED');
    expect(detail.related.length).toBeGreaterThanOrEqual(2);
    expect(detail.transaction).not.toBeNull();

    const original = getLedgerEntry(world, compensating.compensatesEntryId!)!;
    expect(original.compensatedBy.map((entry) => entry.id)).toContain(compensating.id);
  });

  it('returns null for unknown entries', () => {
    expect(getLedgerEntry(world, 'jrn_missing')).toBeNull();
  });
});

describe('financial operations', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('creates a deposit that progresses to a settled state', async () => {
    const world = freshWorld();
    const account = world.accounts.find((candidate) => candidate.status === 'ACTIVE')!;
    const opening = account.availableBalance.amountMinor;

    const created = deposit(world, {
      accountId: account.id,
      amountMinor: 250_000_00,
      currency: account.currency,
      reference: 'DEP-TEST-0001',
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(created.result.transaction.status).toBe('CREATED');
    expect(created.result.duplicate).toBe(false);
    expect(created.result.transaction.reference).toBe('DEP-TEST-0001');
    // Journal entries are not posted before settlement.
    expect(
      world.ledgerEntries.filter(
        (entry) => entry.transactionId === created.result.transaction.id,
      ),
    ).toHaveLength(0);

    await vi.advanceTimersByTimeAsync(1_300);
    const pending = getTransactionDetail(world, created.result.transaction.id)!;
    expect(pending.transaction.status).toBe('PENDING');
    // The destination is held, not settled.
    expect(
      world.accounts.find((candidate) => candidate.id === account.id)!.availableBalance
        .amountMinor,
    ).toBeLessThanOrEqual(opening);

    await vi.advanceTimersByTimeAsync(5_000);
    const detail = getTransactionDetail(world, created.result.transaction.id)!;
    // Either outcome is legitimate; the ledger must match the status.
    if (detail.transaction.status === 'SUCCESS') {
      expect(detail.ledgerEntries.length).toBeGreaterThanOrEqual(2);
      expect(
        world.accounts.find((candidate) => candidate.id === account.id)!.ledgerBalance
          .amountMinor,
      ).toBeGreaterThan(opening);
    } else {
      expect(detail.transaction.status).toBe('FAILED');
      expect(detail.transaction.failureReason).toBeTruthy();
      expect(detail.ledgerEntries).toHaveLength(0);
    }
    expect(detail.inProgress).toBe(false);
  });

  it('rejects a withdrawal that exceeds the available balance', () => {
    const world = freshWorld();
    const account = world.accounts
      .filter((candidate) => candidate.status === 'ACTIVE')
      .sort(
        (a, b) => a.availableBalance.amountMinor - b.availableBalance.amountMinor,
      )[0];
    const result = withdraw(world, {
      accountId: account.id,
      amountMinor: account.availableBalance.amountMinor + 100,
      currency: account.currency,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.code).toBe('insufficient_funds');
  });

  it('rejects operations on frozen accounts and unknown accounts', () => {
    const world = freshWorld();
    const frozen = world.accounts.find((candidate) => candidate.status === 'FROZEN')!;
    const onFrozen = deposit(world, {
      accountId: frozen.id,
      amountMinor: 1_000_00,
      currency: frozen.currency,
    });
    expect(onFrozen.ok).toBe(false);
    if (onFrozen.ok) return;
    expect(onFrozen.failure.code).toBe('frozen_account');

    const unknown = deposit(world, {
      accountId: 'acc_missing',
      amountMinor: 1_000_00,
      currency: 'NGN',
    });
    expect(unknown.ok).toBe(false);
    if (unknown.ok) return;
    expect(unknown.failure.code).toBe('invalid_account');
  });

  it('rejects a transfer between the same account', () => {
    const world = freshWorld();
    const account = world.accounts.find((candidate) => candidate.status === 'ACTIVE')!;
    const result = transfer(world, {
      sourceAccountId: account.id,
      destinationAccountId: account.id,
      amountMinor: 500_00,
      currency: account.currency,
    });
    expect(result.ok).toBe(false);
  });

  it('rejects invalid amounts', () => {
    const world = freshWorld();
    const account = world.accounts.find((candidate) => candidate.status === 'ACTIVE')!;
    for (const amountMinor of [0, -100, Number.NaN]) {
      const result = deposit(world, {
        accountId: account.id,
        amountMinor,
        currency: account.currency,
      });
      expect(result.ok).toBe(false);
      if (result.ok) continue;
      expect(result.failure.code).toBe('invalid_amount');
    }
  });

  it('treats a reused reference as the same transaction, not a duplicate', () => {
    const world = freshWorld();
    const account = world.accounts.find((candidate) => candidate.status === 'ACTIVE')!;
    const input = {
      accountId: account.id,
      amountMinor: 750_00,
      currency: account.currency,
      reference: 'DEP-DUPLICATE-1',
    };
    const first = deposit(world, input);
    const second = deposit(world, input);
    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(second.result.duplicate).toBe(true);
    expect(second.result.transaction.id).toBe(first.result.transaction.id);
    expect(
      world.transactions.filter((transaction) => transaction.reference === 'DEP-DUPLICATE-1'),
    ).toHaveLength(1);
  });

  it('reuses a reference across operation types instead of duplicating', () => {
    const world = freshWorld();
    const account = world.accounts.find((candidate) => candidate.status === 'ACTIVE')!;
    const first = deposit(world, {
      accountId: account.id,
      amountMinor: 100_00,
      currency: account.currency,
      reference: 'SHARED-REF-1',
    });
    expect(first.ok).toBe(true);
    // A withdrawal reusing the same reference returns the original deposit.
    const second = withdraw(world, {
      accountId: account.id,
      amountMinor: 100_00,
      currency: account.currency,
      reference: 'SHARED-REF-1',
    });
    expect(second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(second.result.duplicate).toBe(true);
    expect(second.result.transaction.id).toBe(first.result.transaction.id);
    expect(second.result.transaction.type).toBe('DEPOSIT');
  });
});

describe('reversal', () => {
  it('posts compensating entries and never edits history', () => {
    const world = freshWorld();
    const target = world.transactions.find((transaction) => transaction.status === 'SUCCESS')!;
    const originalEntries = world.ledgerEntries
      .filter((entry) => entry.transactionId === target.id && entry.status === 'POSTED')
      .map((entry) => ({ ...entry }));

    const result = reverse(world, target.id, { reason: 'Customer requested a refund' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.result.transaction.status).toBe('REVERSED');
    expect(result.result.compensatingEntries.length).toBe(originalEntries.length);

    // Original entries are still present, marked reversed, with the same ids.
    originalEntries.forEach((original) => {
      const now = world.ledgerEntries.find((entry) => entry.id === original.id)!;
      expect(now.status).toBe('REVERSED');
      expect(now.direction).toBe(original.direction);
      expect(now.amount.amountMinor).toBe(original.amount.amountMinor);
    });

    // Each compensating entry mirrors its original in the opposite direction.
    result.result.compensatingEntries.forEach((entry) => {
      const original = originalEntries.find((candidate) => candidate.id === entry.compensatesEntryId)!;
      expect(entry.direction).not.toBe(original.direction);
      expect(entry.amount.amountMinor).toBe(original.amount.amountMinor);
      expect(entry.status).toBe('POSTED');
    });

    // The ledger still balances for the reversed transaction.
    const entries = world.ledgerEntries.filter((entry) => entry.transactionId === target.id);
    const debits = entries
      .filter((entry) => entry.direction === 'DEBIT')
      .reduce((sum, entry) => sum + entry.amount.amountMinor, 0);
    const credits = entries
      .filter((entry) => entry.direction === 'CREDIT')
      .reduce((sum, entry) => sum + entry.amount.amountMinor, 0);
    expect(debits).toBe(credits);
  });

  it('refuses to reverse anything but a successful transaction', () => {
    const world = freshWorld();
    const failed = world.transactions.find((transaction) => transaction.status === 'FAILED')!;
    const result = reverse(world, failed.id, { reason: 'nope' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('invalid_state');
  });

  it('reports unknown transactions', () => {
    const world = freshWorld();
    expect(reverse(world, 'txn_missing', { reason: 'nope' })).toEqual({
      ok: false,
      code: 'not_found',
      message: 'No transaction with that identifier.',
    });
  });
});

describe('transaction endpoints over the API client', () => {
  async function signedIn() {
    const client = createClientForTests();
    await client.signIn({
      email: 'amara.okafor@proofbank.test',
      password: 'demonstration1',
      role: 'super_admin',
    });
    return client;
  }

  it('lists and reads transactions', async () => {
    const client = await signedIn();
    const page = await client.transactionsList({ page: 1, pageSize: 5 });
    expect(page.items).toHaveLength(5);
    const detail = await client.transactionDetail(page.items[0].id);
    expect(detail.transaction.id).toBe(page.items[0].id);
  });

  it('creates a deposit through the API', async () => {
    const client = await signedIn();
    const accounts = await client.accountsList({ status: 'ACTIVE', pageSize: 5 });
    const result = await client.deposit({
      accountId: accounts.items[0].id,
      amountMinor: 125_000_00,
      currency: accounts.items[0].currency,
      reference: `DEP-API-${Date.now()}`,
    });
    expect(result.transaction.status).toBe('CREATED');
    expect(result.duplicate).toBe(false);
  });

  it('rejects an over-balance withdrawal with a clear code', async () => {
    const client = await signedIn();
    const accounts = await client.accountsList({ status: 'ACTIVE', pageSize: 50 });
    const smallest = accounts.items.sort(
      (a, b) => a.availableBalance.amountMinor - b.availableBalance.amountMinor,
    )[0];
    await expect(
      client.withdraw({
        accountId: smallest.id,
        amountMinor: smallest.availableBalance.amountMinor + 10_000,
        currency: smallest.currency,
      }),
    ).rejects.toMatchObject({ status: 422, code: 'insufficient_funds' });
  });

  it('reverses a successful transaction through the API', async () => {
    const client = await signedIn();
    const page = await client.transactionsList({ status: 'SUCCESS', pageSize: 1 });
    const result = await client.reverseTransaction(page.items[0].id, {
      reason: 'Demonstration reversal',
    });
    expect(result.transaction.status).toBe('REVERSED');
    expect(result.compensatingEntries.length).toBeGreaterThanOrEqual(2);
  });

  it('serves the ledger explorer with balanced totals', async () => {
    const client = await signedIn();
    const page = await client.ledgerList({ page: 1, pageSize: 10 });
    expect(page.items).toHaveLength(10);
    expect(page.totals.balanced).toBe(true);
    const detail = await client.ledgerEntryDetail(page.items[0].id);
    expect(detail.entry.code).toBe(page.items[0].code);
  });

  it('returns 404 for unknown transactions and entries', async () => {
    const client = await signedIn();
    await expect(client.transactionDetail('txn_missing')).rejects.toMatchObject({
      status: 404,
    });
    await expect(client.ledgerEntryDetail('jrn_missing')).rejects.toMatchObject({
      status: 404,
    });
  });
});

describe('CSV export', () => {
  it('escapes cells containing separators and quotes', () => {
    const csv = toCsv(
      [{ reference: 'TXN,1', note: 'say "hi"', plain: 'ok' }],
      [
        { header: 'Reference', value: (row) => row.reference },
        { header: 'Note', value: (row) => row.note },
        { header: 'Plain', value: (row) => row.plain },
      ],
    );
    expect(csv).toContain('"TXN,1"');
    expect(csv).toContain('"say ""hi"""');
    expect(csv.split('\r\n')).toHaveLength(2);
  });
});
