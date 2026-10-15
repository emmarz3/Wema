import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '../api/errors';
import type {
  AccountQuery,
  CustomerQuery,
  DashboardRange,
  DeliveryQuery,
  EventQuery,
  LedgerQuery,
  TransactionQuery,
} from '../types/domain';

/**
 * Shared query client. Queries refresh aggressively for an operations
 * console, but mutations never retry automatically: financial operations
 * are only repeated deliberately, and only when the data source says an
 * idempotent retry is safe.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: true,
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
          return false;
        }
        return failureCount < 2;
      },
    },
    mutations: {
      retry: false,
    },
  },
});

/** Keys for the queries used by the workspace, kept in one place. */
export const queryKeys = {
  session: ['session'] as const,
  simulationStatus: ['simulation', 'status'] as const,
  simulationHistory: ['simulation', 'history'] as const,
  simulationErrors: ['simulation', 'errors'] as const,
  dashboard: {
    summary: (range: DashboardRange) => ['dashboard', 'summary', range] as const,
  },
  customers: {
    list: (query: CustomerQuery) => ['customers', 'list', query] as const,
    detail: (id: string) => ['customers', 'detail', id] as const,
  },
  accounts: {
    list: (query: AccountQuery) => ['accounts', 'list', query] as const,
    detail: (id: string) => ['accounts', 'detail', id] as const,
  },
  transactions: {
    list: (query: TransactionQuery) => ['transactions', 'list', query] as const,
    detail: (id: string) => ['transactions', 'detail', id] as const,
  },
  ledger: {
    list: (query: LedgerQuery) => ['ledger', 'list', query] as const,
    detail: (id: string) => ['ledger', 'detail', id] as const,
  },
  scenarios: {
    catalogue: ['scenarios', 'catalogue'] as const,
    history: ['scenarios', 'history'] as const,
    detail: (id: string) => ['scenarios', 'detail', id] as const,
  },
  recents: {
    transactions: ['recents', 'transactions'] as const,
    events: ['recents', 'events'] as const,
    scenarioExecutions: ['recents', 'scenario-executions'] as const,
    deliveries: ['recents', 'deliveries'] as const,
  },
  events: {
    list: (query: EventQuery) => ['events', 'list', query] as const,
    detail: (id: string) => ['events', 'detail', id] as const,
  },
  deliveries: {
    list: (query: DeliveryQuery) => ['deliveries', 'list', query] as const,
  },
  infrastructure: {
    health: ['infrastructure', 'health'] as const,
  },
} as const;
