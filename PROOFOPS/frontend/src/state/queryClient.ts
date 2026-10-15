import { QueryClient } from '@tanstack/react-query';

/**
 * Shared TanStack Query client.
 *
 * Retry defaults are safe for financial operations: queries retry only
 * transient failures (network / 5xx) and never on 4xx; mutations do not
 * retry at all because repeating a write could double an operation — the
 * backend idempotency contract is the real guard, not the client.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      gcTime: 5 * 60_000,
      retry: (failureCount, error) => {
        const status = (error as { status?: number })?.status;
        if (status && status >= 400 && status < 500) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
});

/** Query key roots, kept central so invalidation stays predictable. */
export const queryKeys = {
  session: ['session'] as const,
  overview: (range: string) => ['overview', range] as const,
  verifications: (params: unknown) => ['verifications', params] as const,
  verification: (id: string) => ['verification', id] as const,
  receipts: (id: string) => ['receipt', id] as const,
  proofs: (params: unknown) => ['proofs', params] as const,
  proof: (id: string) => ['proof', id] as const,
  reconciliation: (id: string) => ['reconciliation', id] as const,
  infrastructure: (range: string) => ['infrastructure', range] as const,
  deliveries: (params: unknown) => ['deliveries', params] as const,
  delivery: (id: string) => ['delivery', id] as const,
  events: (params: unknown) => ['events', params] as const,
  incidents: (params: unknown) => ['incidents', params] as const,
  incident: (id: string) => ['incident', id] as const,
  investigation: (id: string) => ['investigation', id] as const,
  apiKeys: ['developer', 'keys'] as const,
  webhooks: ['developer', 'webhooks'] as const,
  requestLogs: (params: unknown) => ['developer', 'request-logs', params] as const,
  notifications: ['notifications'] as const,
  members: ['settings', 'members'] as const,
  audit: (params: unknown) => ['settings', 'audit', params] as const,
};
