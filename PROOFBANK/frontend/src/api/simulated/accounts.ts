/**
 * Simulated account endpoints. The source owns the account population,
 * pagination, search, filtering, sorting, status history and creation.
 */
import { uuid } from '../../lib/utils';
import type {
  Account,
  AccountDetail,
  AccountQuery,
  AccountStatusChange,
  AccountType,
  CreateAccountInput,
  Money,
  Page,
  SetAccountStatusInput,
} from '../../types/domain';
import type { SimulatedWorld } from './data';

const SUPPORTED_CURRENCIES = ['NGN', 'USD', 'GBP', 'EUR'] as const;

function currencySymbol(currency: string): string {
  switch (currency) {
    case 'NGN':
      return '₦';
    case 'USD':
      return '$';
    case 'GBP':
      return '£';
    case 'EUR':
      return '€';
    default:
      return `${currency} `;
  }
}

/** Paginated, searchable, sortable account listing. */
export function listAccounts(
  world: SimulatedWorld,
  query: AccountQuery,
): Page<Account> {
  const search = (query.search ?? '').trim().toLowerCase();
  const type = query.type ?? 'all';
  const status = query.status ?? 'all';
  const sort = query.sort ?? 'number';
  const direction = query.direction ?? 'asc';
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 10));

  let items = world.accounts.filter((account) => {
    if (type !== 'all' && account.type !== type) return false;
    if (status !== 'all' && account.status !== status) return false;
    if (!search) return true;
    return (
      account.number.includes(search) ||
      account.customerName.toLowerCase().includes(search) ||
      account.id.toLowerCase().includes(search)
    );
  });

  items = items.slice().sort((a, b) => {
    const factor = direction === 'asc' ? 1 : -1;
    switch (sort) {
      case 'createdAt':
        return factor * a.createdAt.localeCompare(b.createdAt);
      case 'availableBalance':
        return (
          factor * (a.availableBalance.amountMinor - b.availableBalance.amountMinor)
        );
      case 'customerName':
        return factor * a.customerName.localeCompare(b.customerName);
      default:
        return factor * a.number.localeCompare(b.number);
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

/** Account detail with balances, recent activity, status history and postings. */
export function getAccountDetail(
  world: SimulatedWorld,
  id: string,
): AccountDetail | null {
  const account = world.accounts.find((candidate) => candidate.id === id);
  if (!account) return null;

  const recentTransactions = world.transactions
    .filter(
      (transaction) =>
        transaction.sourceAccountId === id || transaction.destinationAccountId === id,
    )
    .slice(0, 8);

  return {
    account,
    recentTransactions,
    statusHistory: world.accountStatusHistory[id] ?? [],
    ledgerEntryCount: world.ledgerEntryCounts[id] ?? 0,
  };
}

/** Creates an account for an existing customer. New accounts open at zero. */
export function createAccount(
  world: SimulatedWorld,
  input: CreateAccountInput,
): {
  ok: true;
  account: Account;
} | { ok: false; code: 'invalid_customer' | 'invalid_currency' } {
  const customer = world.customers.find((candidate) => candidate.id === input.customerId);
  if (!customer) return { ok: false, code: 'invalid_customer' };
  if (!SUPPORTED_CURRENCIES.includes(input.currency as (typeof SUPPORTED_CURRENCIES)[number])) {
    return { ok: false, code: 'invalid_currency' };
  }

  const sequence = String(world.accounts.length + 1).padStart(3, '0');
  const suffix = String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0');
  const type: AccountType = input.type === 'CURRENT' ? 'CURRENT' : 'SAVINGS';
  const money: Money = { amountMinor: 0, currency: input.currency };

  const account: Account = {
    id: uuid('acc'),
    number: `01${sequence}${suffix}`.slice(0, 10),
    customerId: customer.id,
    customerName: customer.name,
    type,
    currency: input.currency,
    status: 'ACTIVE',
    availableBalance: { ...money },
    ledgerBalance: { ...money },
    createdAt: new Date().toISOString(),
  };
  world.accounts.push(account);
  customer.accountCount += 1;
  world.accountStatusHistory[account.id] = [
    { status: 'ACTIVE', at: account.createdAt, note: 'Account opened.', actor: 'Workspace' },
  ];
  world.ledgerEntryCounts[account.id] = 0;

  return { ok: true, account };
}

/** Changes an account's status, recording the change in its history. */
export function setAccountStatus(
  world: SimulatedWorld,
  id: string,
  input: SetAccountStatusInput,
  actor: string,
): { ok: true; account: Account } | { ok: false; notFound: true } {
  const account = world.accounts.find((candidate) => candidate.id === id);
  if (!account) return { ok: false, notFound: true };

  account.status = input.status;
  const change: AccountStatusChange = {
    status: input.status,
    at: new Date().toISOString(),
    note: input.reason ?? 'Status changed from the workspace.',
    actor,
  };
  world.accountStatusHistory[id] = [change, ...(world.accountStatusHistory[id] ?? [])];

  return { ok: true, account };
}

export function accountStatusHistoryFor(
  world: SimulatedWorld,
  id: string,
): AccountStatusChange[] {
  return world.accountStatusHistory[id] ?? [];
}

export { currencySymbol };
