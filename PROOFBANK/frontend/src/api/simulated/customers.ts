/**
 * Simulated customer endpoints. The source owns the customer population,
 * pagination, search, filtering and sorting, exactly as a backend would.
 */
import { uuid } from '../../lib/utils';
import type {
  Account,
  Customer,
  CustomerDetail,
  CustomerQuery,
  CustomerStatus,
  Page,
  SimulationEvent,
  SetCustomerStatusInput,
  Transaction,
  UpdateCustomerInput,
  CreateCustomerInput,
} from '../../types/domain';
import type { SimulatedWorld } from './data';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(input: {
  name: string;
  email: string;
  phone: string;
}): Record<string, string> {
  const fields: Record<string, string> = {};
  if (!input.name || input.name.trim().length < 2) {
    fields.name = 'Enter the customer name (at least 2 characters).';
  }
  if (!emailPattern.test(input.email ?? '')) {
    fields.email = 'Enter a valid email address.';
  }
  if (!input.phone || input.phone.replace(/\D/g, '').length < 7) {
    fields.phone = 'Enter a reachable phone number.';
  }
  return fields;
}

/** Paginated, searchable, sortable customer listing. */
export function listCustomers(
  world: SimulatedWorld,
  query: CustomerQuery,
): Page<Customer> {
  const search = (query.search ?? '').trim().toLowerCase();
  const status = query.status ?? 'all';
  const sort = query.sort ?? 'name';
  const direction = query.direction ?? 'asc';
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 10));

  let items = world.customers.filter((customer) => {
    if (status !== 'all' && customer.status !== status) return false;
    if (!search) return true;
    return (
      customer.name.toLowerCase().includes(search) ||
      customer.email.toLowerCase().includes(search) ||
      customer.code.toLowerCase().includes(search)
    );
  });

  items = items.slice().sort((a, b) => {
    const factor = direction === 'asc' ? 1 : -1;
    switch (sort) {
      case 'createdAt':
        return factor * a.createdAt.localeCompare(b.createdAt);
      case 'accountCount':
        return factor * (a.accountCount - b.accountCount);
      default:
        return factor * a.name.localeCompare(b.name);
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

/** Customer profile with linked accounts, recent transactions and events. */
export function getCustomerDetail(
  world: SimulatedWorld,
  id: string,
): CustomerDetail | null {
  const customer = world.customers.find((candidate) => candidate.id === id);
  if (!customer) return null;

  const accounts = world.accounts.filter((account) => account.customerId === id);
  const accountIds = new Set(accounts.map((account) => account.id));

  const recentTransactions = world.transactions
    .filter(
      (transaction) =>
        (transaction.sourceAccountId && accountIds.has(transaction.sourceAccountId)) ||
        (transaction.destinationAccountId &&
          accountIds.has(transaction.destinationAccountId)),
    )
    .slice(0, 8);

  const references = new Set(
    recentTransactions.map((transaction) => transaction.reference),
  );
  const events: SimulationEvent[] = world.events
    .filter(
      (event) => event.transactionReference && references.has(event.transactionReference),
    )
    .slice(0, 8);

  return { customer, accounts, recentTransactions, events };
}

/** Creates a customer in the simulated source. */
export function createCustomer(
  world: SimulatedWorld,
  input: CreateCustomerInput,
  actor: string,
): { ok: true; customer: Customer } | { ok: false; fields: Record<string, string> } {
  const fields = validate({
    name: input.name ?? '',
    email: input.email ?? '',
    phone: input.phone ?? '',
  });
  if (Object.keys(fields).length > 0) return { ok: false, fields };

  const highest = world.customers.reduce((max, customer) => {
    const numeric = Number.parseInt(customer.code.replace(/\D/g, ''), 10);
    return Number.isFinite(numeric) ? Math.max(max, numeric) : max;
  }, 0);

  const customer: Customer = {
    id: uuid('cus'),
    code: `CUS-${String(highest + 1).padStart(5, '0')}`,
    name: input.name.trim(),
    email: input.email.trim(),
    phone: input.phone.trim(),
    status: input.status ?? 'ACTIVE',
    createdAt: new Date().toISOString(),
    accountCount: 0,
  };
  world.customers.push(customer);
  void actor;
  return { ok: true, customer };
}

export function updateCustomer(
  world: SimulatedWorld,
  id: string,
  input: UpdateCustomerInput,
): { ok: true; customer: Customer } | { ok: false; fields: Record<string, string> } {
  const customer = world.customers.find((candidate) => candidate.id === id);
  if (!customer) return { ok: false, fields: {} };

  const next = {
    name: input.name ?? customer.name,
    email: input.email ?? customer.email,
    phone: input.phone ?? customer.phone,
  };
  const fields = validate(next);
  if (Object.keys(fields).length > 0) return { ok: false, fields };

  customer.name = next.name.trim();
  customer.email = next.email.trim();
  customer.phone = next.phone.trim();
  return { ok: true, customer };
}

/**
 * Changes a customer's status. Suspending a customer freezes their accounts,
 * and reactivating restores them — the simulation states the rule rather than
 * applying a silent side effect.
 */
export function setCustomerStatus(
  world: SimulatedWorld,
  id: string,
  input: SetCustomerStatusInput,
  actor: string,
): { ok: true; customer: Customer; accountsFrozen: number } | { ok: false; notFound: true } {
  const customer = world.customers.find((candidate) => candidate.id === id);
  if (!customer) return { ok: false, notFound: true };

  const previous = customer.status;
  customer.status = input.status;

  const accounts = world.accounts.filter((account) => account.customerId === id);
  const target: CustomerStatus | null =
    input.status === 'SUSPENDED' ? 'SUSPENDED' : previous === 'SUSPENDED' ? 'ACTIVE' : null;

  if (target === 'SUSPENDED') {
    accounts.forEach((account) => {
      if (account.status === 'FROZEN') return;
      account.status = 'FROZEN';
      world.accountStatusHistory[account.id] = [
        {
          status: 'FROZEN',
          at: new Date().toISOString(),
          note: input.reason ?? 'Customer suspended; accounts frozen.',
          actor,
        },
        ...(world.accountStatusHistory[account.id] ?? []),
      ];
    });
  } else if (previous === 'SUSPENDED') {
    accounts.forEach((account) => {
      account.status = 'ACTIVE';
      world.accountStatusHistory[account.id] = [
        {
          status: 'ACTIVE',
          at: new Date().toISOString(),
          note: input.reason ?? 'Customer reactivated; accounts restored.',
          actor,
        },
        ...(world.accountStatusHistory[account.id] ?? []),
      ];
    });
  }

  return {
    ok: true,
    customer,
    accountsFrozen: target === 'SUSPENDED' ? accounts.length : 0,
  };
}

/** Accounts linked to a customer, used by the account creation form. */
export function accountsForCustomer(world: SimulatedWorld, customerId: string): Account[] {
  return world.accounts.filter((account) => account.customerId === customerId);
}

/** Transactions for an account, newest first, for detail panels. */
export function transactionsForAccount(
  world: SimulatedWorld,
  accountId: string,
  limit = 8,
): Transaction[] {
  return world.transactions
    .filter(
      (transaction) =>
        transaction.sourceAccountId === accountId ||
        transaction.destinationAccountId === accountId,
    )
    .slice(0, limit);
}

export type { CustomerQuery };
