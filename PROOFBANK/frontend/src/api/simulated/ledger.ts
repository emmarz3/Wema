/**
 * Simulated ledger endpoints: explorer listing, balanced totals and
 * journal-entry detail. Entries are read-only everywhere in the interface.
 */
import type {
  LedgerDirection,
  LedgerEntry,
  LedgerEntryDetail,
  LedgerPage,
  LedgerQuery,
} from '../../types/domain';
import type { SimulatedWorld } from './data';
import { SETTLEMENT_ACCOUNT_ID } from './data';

function matches(world: SimulatedWorld, entry: LedgerEntry, query: LedgerQuery): boolean {
  const search = (query.search ?? '').trim().toLowerCase();
  if (query.accountId && entry.accountId !== query.accountId) return false;
  if (query.transactionId && entry.transactionId !== query.transactionId) return false;
  if (query.direction && query.direction !== 'all' && entry.direction !== query.direction) {
    return false;
  }
  if (query.status && query.status !== 'all' && entry.status !== query.status) return false;
  if (!search) return true;
  const transaction = world.transactions.find(
    (candidate) => candidate.id === entry.transactionId,
  );
  return (
    entry.code.toLowerCase().includes(search) ||
    entry.reference.toLowerCase().includes(search) ||
    entry.correlationId.toLowerCase().includes(search) ||
    entry.accountLabel.toLowerCase().includes(search) ||
    (entry.id.toLowerCase().includes(search) ?? false) ||
    (entry.accountId.toLowerCase().includes(search) ?? false) ||
    (transaction?.sourceLabel ?? '').toLowerCase().includes(search) ||
    (transaction?.destinationLabel ?? '').toLowerCase().includes(search)
  );
}

function directionOrder(direction: LedgerDirection): number {
  return direction === 'DEBIT' ? 0 : 1;
}

/** Ledger explorer page with balanced totals for the filtered set. */
export function listLedger(
  world: SimulatedWorld,
  query: LedgerQuery,
): LedgerPage {
  const sort = query.sort ?? 'postedAt';
  const direction = query.directionSort ?? 'desc';
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 15));

  const all = world.ledgerEntries.filter((entry) => matches(world, entry, query));

  const items = all.slice().sort((a, b) => {
    const factor = direction === 'asc' ? 1 : -1;
    switch (sort) {
      case 'amount':
        return factor * (a.amount.amountMinor - b.amount.amountMinor);
      case 'code':
        return factor * a.code.localeCompare(b.code);
      default:
        return (
          factor * a.postedAt.localeCompare(b.postedAt) ||
          directionOrder(a.direction) - directionOrder(b.direction)
        );
    }
  });

  const start = (page - 1) * pageSize;
  const pageItems = items.slice(start, start + pageSize);

  let debitMinor = 0;
  let creditMinor = 0;
  items.forEach((entry) => {
    if (entry.direction === 'DEBIT') debitMinor += entry.amount.amountMinor;
    else creditMinor += entry.amount.amountMinor;
  });

  return {
    items: pageItems,
    total: items.length,
    page,
    pageSize,
    totals: {
      debitMinor,
      creditMinor,
      currency: items[0]?.amount.currency ?? 'NGN',
      balanced: debitMinor === creditMinor,
    },
  };
}

/** Journal entry detail with the entries it belongs to and any compensation. */
export function getLedgerEntry(
  world: SimulatedWorld,
  id: string,
): LedgerEntryDetail | null {
  const entry = world.ledgerEntries.find((candidate) => candidate.id === id);
  if (!entry) return null;

  const related = world.ledgerEntries
    .filter((candidate) => candidate.transactionId === entry.transactionId)
    .sort((a, b) => a.postedAt.localeCompare(b.postedAt));

  return {
    entry,
    transaction:
      world.transactions.find((candidate) => candidate.id === entry.transactionId) ?? null,
    related,
    compensatingFor: entry.compensatesEntryId
      ? world.ledgerEntries.filter((candidate) => candidate.id === entry.compensatesEntryId)
      : [],
    compensatedBy: world.ledgerEntries.filter(
      (candidate) => candidate.compensatesEntryId === entry.id,
    ),
  };
}

/** Entries for one account (used by account detail views). */
export function listLedgerForAccount(world: SimulatedWorld, accountId: string): LedgerEntry[] {
  return world.ledgerEntries
    .filter((entry) => entry.accountId === accountId)
    .sort((a, b) => b.postedAt.localeCompare(a.postedAt));
}

export { SETTLEMENT_ACCOUNT_ID };
