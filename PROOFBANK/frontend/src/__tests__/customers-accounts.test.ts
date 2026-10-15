import { describe, expect, it } from 'vitest';
import { buildWorld } from '../api/simulated/data';
import {
  createCustomer,
  getCustomerDetail,
  listCustomers,
  setCustomerStatus,
  updateCustomer,
} from '../api/simulated/customers';
import {
  createAccount,
  getAccountDetail,
  listAccounts,
  setAccountStatus,
} from '../api/simulated/accounts';
import { createClientForTests } from './apiTestClient';

function freshWorld() {
  return buildWorld(Date.UTC(2026, 9, 13, 12, 0, 0));
}

describe('customer listing', () => {
  const world = freshWorld();

  it('paginates the population', () => {
    const first = listCustomers(world, { page: 1, pageSize: 10 });
    expect(first.items).toHaveLength(10);
    expect(first.total).toBe(world.customers.length);
    expect(first.page).toBe(1);

    const second = listCustomers(world, { page: 2, pageSize: 10 });
    expect(second.items[0].id).not.toBe(first.items[0].id);
    expect([...first.items, ...second.items].length).toBeLessThanOrEqual(
      world.customers.length,
    );
  });

  it('sorts by name in both directions', () => {
    const asc = listCustomers(world, { sort: 'name', direction: 'asc', pageSize: 50 });
    const desc = listCustomers(world, { sort: 'name', direction: 'desc', pageSize: 50 });
    expect(asc.items[0].name.localeCompare(asc.items[1].name)).toBeLessThanOrEqual(0);
    expect(desc.items[0].name).toBe(asc.items[asc.items.length - 1].name);
  });

  it('searches by name, email and customer code', () => {
    const target = world.customers[3];
    const byName = listCustomers(world, { search: target.name.slice(0, 4), pageSize: 50 });
    const byEmail = listCustomers(world, { search: target.email, pageSize: 50 });
    const byCode = listCustomers(world, { search: target.code, pageSize: 50 });
    expect(byName.total).toBeGreaterThan(0);
    expect(byEmail.items.map((c) => c.id)).toContain(target.id);
    expect(byCode.items.map((c) => c.id)).toContain(target.id);
  });

  it('filters by status', () => {
    const suspended = listCustomers(world, { status: 'SUSPENDED', pageSize: 50 });
    expect(suspended.items.length).toBeGreaterThan(0);
    expect(suspended.items.every((customer) => customer.status === 'SUSPENDED')).toBe(true);
  });
});

describe('customer detail', () => {
  const world = freshWorld();

  it('returns the profile with linked accounts, transactions and events', () => {
    const customer = world.customers.find((candidate) => candidate.accountCount > 0)!;
    const detail = getCustomerDetail(world, customer.id)!;
    expect(detail.customer.id).toBe(customer.id);
    expect(detail.accounts.length).toBe(customer.accountCount);
    expect(
      detail.accounts.every((account) => account.customerId === customer.id),
    ).toBe(true);
    // Every recent transaction touches one of the customer's accounts.
    const accountIds = new Set(detail.accounts.map((account) => account.id));
    for (const transaction of detail.recentTransactions) {
      const touches =
        (transaction.sourceAccountId && accountIds.has(transaction.sourceAccountId)) ||
        (transaction.destinationAccountId &&
          accountIds.has(transaction.destinationAccountId));
      expect(touches).toBe(true);
    }
  });

  it('returns null for an unknown customer', () => {
    expect(getCustomerDetail(world, 'cus_missing')).toBeNull();
  });
});

describe('customer mutations', () => {
  it('rejects invalid input with field errors', () => {
    const world = freshWorld();
    const result = createCustomer(
      world,
      { name: 'A', email: 'not-an-email', phone: '123' },
      'Tester',
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(Object.keys(result.fields).sort()).toEqual(['email', 'name', 'phone']);
    }
  });

  it('creates a customer that appears in the listing', () => {
    const world = freshWorld();
    const before = listCustomers(world, { pageSize: 100 }).total;
    const result = createCustomer(
      world,
      {
        name: 'Ada Nwosu',
        email: 'ada.nwosu@example.test',
        phone: '+234 801 234 5678',
      },
      'Tester',
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.customer.code).toMatch(/^CUS-\d{5}$/);
    expect(result.customer.status).toBe('ACTIVE');
    expect(result.customer.accountCount).toBe(0);
    expect(listCustomers(world, { pageSize: 100 }).total).toBe(before + 1);
    expect(
      listCustomers(world, { search: 'ada.nwosu@example.test', pageSize: 100 }).total,
    ).toBe(1);
  });

  it('updates a customer and validates the result', () => {
    const world = freshWorld();
    const target = world.customers[0];
    const updated = updateCustomer(world, target.id, { phone: '+234 999 888 7777' });
    expect(updated.ok).toBe(true);
    if (updated.ok) {
      expect(updated.customer.phone).toBe('+234 999 888 7777');
      expect(updated.customer.name).toBe(target.name);
    }
    const rejected = updateCustomer(world, target.id, { email: 'broken' });
    expect(rejected.ok).toBe(false);
  });

  it('freezes linked accounts when a customer is suspended', () => {
    const world = freshWorld();
    const active = world.customers.find(
      (customer) =>
        customer.status === 'ACTIVE' &&
        world.accounts.filter((account) => account.customerId === customer.id).length > 0,
    )!;
    const result = setCustomerStatus(
      world,
      active.id,
      { status: 'SUSPENDED', reason: 'Test suspension' },
      'Tester',
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.customer.status).toBe('SUSPENDED');
    expect(result.accountsFrozen).toBeGreaterThan(0);
    const accounts = world.accounts.filter((account) => account.customerId === active.id);
    expect(accounts.every((account) => account.status === 'FROZEN')).toBe(true);
    // The freeze is recorded in each account's history.
    accounts.forEach((account) => {
      expect(world.accountStatusHistory[account.id][0].status).toBe('FROZEN');
    });

    // Reactivation restores the accounts.
    const restored = setCustomerStatus(world, active.id, { status: 'ACTIVE' }, 'Tester');
    expect(restored.ok).toBe(true);
    expect(
      world.accounts
        .filter((account) => account.customerId === active.id)
        .every((account) => account.status === 'ACTIVE'),
    ).toBe(true);
  });

  it('reports missing customers', () => {
    const world = freshWorld();
    expect(setCustomerStatus(world, 'cus_missing', { status: 'ACTIVE' }, 'Tester')).toEqual({
      ok: false,
      notFound: true,
    });
  });
});

describe('account listing', () => {
  const world = freshWorld();

  it('paginates the population', () => {
    const first = listAccounts(world, { page: 1, pageSize: 10 });
    expect(first.items).toHaveLength(10);
    expect(first.total).toBe(world.accounts.length);
  });

  it('searches by account number and customer name', () => {
    const target = world.accounts[5];
    expect(listAccounts(world, { search: target.number, pageSize: 50 }).items[0].id).toBe(
      target.id,
    );
    const byCustomer = listAccounts(world, { search: target.customerName, pageSize: 50 });
    expect(byCustomer.items.length).toBeGreaterThan(0);
  });

  it('filters by type and status', () => {
    const savings = listAccounts(world, { type: 'SAVINGS', pageSize: 100 });
    expect(savings.items.every((account) => account.type === 'SAVINGS')).toBe(true);
    const frozen = listAccounts(world, { status: 'FROZEN', pageSize: 100 });
    expect(frozen.items.every((account) => account.status === 'FROZEN')).toBe(true);
  });

  it('sorts by available balance', () => {
    const asc = listAccounts(world, {
      sort: 'availableBalance',
      direction: 'asc',
      pageSize: 100,
    });
    for (let index = 1; index < asc.items.length; index += 1) {
      expect(
        asc.items[index].availableBalance.amountMinor,
      ).toBeGreaterThanOrEqual(asc.items[index - 1].availableBalance.amountMinor);
    }
  });
});

describe('account detail and mutations', () => {
  it('reports balances, history and posted entries', () => {
    const world = freshWorld();
    const target = world.accounts.find(
      (account) => (world.ledgerEntryCounts[account.id] ?? 0) > 0,
    )!;
    const detail = getAccountDetail(world, target.id)!;
    expect(detail.account.id).toBe(target.id);
    expect(detail.statusHistory.length).toBeGreaterThan(0);
    expect(detail.ledgerEntryCount).toBeGreaterThan(0);
    // Available never exceeds ledger on the simulated balance sheet.
    expect(detail.account.availableBalance.amountMinor).toBeLessThanOrEqual(
      detail.account.ledgerBalance.amountMinor,
    );
  });

  it('opens a new account at a zero balance', () => {
    const world = freshWorld();
    const customer = world.customers[0];
    const accountsBefore = customer.accountCount;
    const result = createAccount(world, {
      customerId: customer.id,
      type: 'CURRENT',
      currency: 'USD',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.account.availableBalance.amountMinor).toBe(0);
    expect(result.account.ledgerBalance.amountMinor).toBe(0);
    expect(result.account.currency).toBe('USD');
    expect(result.account.type).toBe('CURRENT');
    expect(result.account.status).toBe('ACTIVE');
    expect(customer.accountCount).toBe(accountsBefore + 1);
    expect(world.accountStatusHistory[result.account.id]).toHaveLength(1);
  });

  it('rejects accounts for unknown customers and unsupported currencies', () => {
    const world = freshWorld();
    expect(
      createAccount(world, { customerId: 'cus_missing', type: 'SAVINGS', currency: 'NGN' }),
    ).toEqual({ ok: false, code: 'invalid_customer' });
    expect(
      createAccount(world, {
        customerId: world.customers[0].id,
        type: 'SAVINGS',
        currency: 'XXX',
      }),
    ).toEqual({ ok: false, code: 'invalid_currency' });
  });

  it('records account status changes in history', () => {
    const world = freshWorld();
    const target = world.accounts[0];
    const before = world.accountStatusHistory[target.id].length;
    const result = setAccountStatus(
      world,
      target.id,
      { status: 'FROZEN', reason: 'Manual review' },
      'Tester',
    );
    expect(result.ok).toBe(true);
    expect(world.accountStatusHistory[target.id]).toHaveLength(before + 1);
    expect(world.accountStatusHistory[target.id][0]).toMatchObject({
      status: 'FROZEN',
      note: 'Manual review',
      actor: 'Tester',
    });
    expect(setAccountStatus(world, 'acc_missing', { status: 'ACTIVE' }, 'Tester')).toEqual({
      ok: false,
      notFound: true,
    });
  });
});

describe('customer and account endpoints over the API client', () => {
  async function signedIn() {
    const client = createClientForTests();
    await client.signIn({
      email: 'amara.okafor@proofbank.test',
      password: 'demonstration1',
      role: 'super_admin',
    });
    return client;
  }

  it('lists and reads customers', async () => {
    const client = await signedIn();
    const page = await client.customersList({ page: 1, pageSize: 5 });
    expect(page.items).toHaveLength(5);
    const detail = await client.customerDetail(page.items[0].id);
    expect(detail.customer.id).toBe(page.items[0].id);
  });

  it('creates a customer through the API', async () => {
    const client = await signedIn();
    const created = await client.createCustomer({
      name: 'Zainab Sani',
      email: 'zainab.sani@example.test',
      phone: '+234 802 555 0101',
    });
    expect(created.code).toMatch(/^CUS-\d{5}$/);
    const page = await client.customersList({ search: created.email });
    expect(page.items[0].id).toBe(created.id);
  });

  it('rejects an invalid customer with field errors', async () => {
    const client = await signedIn();
    await expect(
      client.createCustomer({ name: 'X', email: 'bad', phone: '1' }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('returns 404 for unknown customers and accounts', async () => {
    const client = await signedIn();
    await expect(client.customerDetail('cus_missing')).rejects.toMatchObject({
      status: 404,
    });
    await expect(client.accountDetail('acc_missing')).rejects.toMatchObject({
      status: 404,
    });
  });

  it('creates an account and rejects an unknown customer', async () => {
    const client = await signedIn();
    const page = await client.customersList({ pageSize: 1 });
    const account = await client.createAccount({
      customerId: page.items[0].id,
      type: 'SAVINGS',
      currency: 'NGN',
    });
    expect(account.number).toMatch(/^\d{10}$/);
    const detail = await client.accountDetail(account.id);
    expect(detail.account.availableBalance.amountMinor).toBe(0);
    await expect(
      client.createAccount({
        customerId: 'cus_missing',
        type: 'SAVINGS',
        currency: 'NGN',
      }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('changes a customer status and reports frozen accounts', async () => {
    const client = await signedIn();
    const page = await client.customersList({ status: 'ACTIVE', pageSize: 5 });
    const target = page.items[0];
    const result = await client.setCustomerStatus(target.id, {
      status: 'SUSPENDED',
      reason: 'Test freeze',
    });
    expect(result.customer.status).toBe('SUSPENDED');
    expect(result.accountsFrozen).toBeGreaterThanOrEqual(0);
  });
});
