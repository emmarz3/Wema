/** Transport-agnostic request/response shapes used by the API client. */
export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

export interface ApiRequest {
  method: HttpMethod;
  /** Path relative to the API root, e.g. `/auth/session`. */
  path: string;
  body?: unknown;
  /** Bearer token, when the route needs authentication. */
  token?: string;
}

export interface ApiResponse {
  status: number;
  ok: boolean;
  body: unknown;
}

export type Transport = (request: ApiRequest) => Promise<ApiResponse>;

/**
 * Single source of truth for every route the interface calls. Screen code
 * never builds URLs inline; new endpoints are added here first so the
 * contract stays auditable.
 */
export const routes = {
  auth: {
    signIn: { method: 'POST', path: '/auth/sign-in' },
    session: { method: 'GET', path: '/auth/session' },
    signOut: { method: 'POST', path: '/auth/sign-out' },
  },
  customers: {
    list: { method: 'GET', path: '/customers' },
    detail: { method: 'GET', path: '/customers/:id' },
    create: { method: 'POST', path: '/customers' },
    update: { method: 'PATCH', path: '/customers/:id' },
    setStatus: { method: 'POST', path: '/customers/:id/status' },
  },
  accounts: {
    list: { method: 'GET', path: '/accounts' },
    detail: { method: 'GET', path: '/accounts/:id' },
    create: { method: 'POST', path: '/accounts' },
    setStatus: { method: 'POST', path: '/accounts/:id/status' },
  },
  simulation: {
    status: { method: 'GET', path: '/simulation/status' },
    history: { method: 'GET', path: '/simulation/history' },
    errors: { method: 'GET', path: '/simulation/errors' },
    start: { method: 'POST', path: '/simulation/start' },
    pause: { method: 'POST', path: '/simulation/pause' },
    resume: { method: 'POST', path: '/simulation/resume' },
    stop: { method: 'POST', path: '/simulation/stop' },
    setMode: { method: 'POST', path: '/simulation/mode' },
    setInterval: { method: 'POST', path: '/simulation/interval' },
  },
  dashboard: {
    summary: { method: 'GET', path: '/dashboard/summary' },
  },
  transactions: {
    recent: { method: 'GET', path: '/transactions/recent' },
    list: { method: 'GET', path: '/transactions' },
    detail: { method: 'GET', path: '/transactions/:id' },
    deposit: { method: 'POST', path: '/transactions/deposit' },
    withdrawal: { method: 'POST', path: '/transactions/withdrawal' },
    transfer: { method: 'POST', path: '/transactions/transfer' },
    reverse: { method: 'POST', path: '/transactions/:id/reverse' },
  },
  ledger: {
    list: { method: 'GET', path: '/ledger' },
    detail: { method: 'GET', path: '/ledger/:id' },
  },
  events: {
    recent: { method: 'GET', path: '/events/recent' },
    list: { method: 'GET', path: '/events' },
    detail: { method: 'GET', path: '/events/:id' },
  },
  scenarioExecutions: {
    recent: { method: 'GET', path: '/scenario-executions/recent' },
  },
  scenarios: {
    catalogue: { method: 'GET', path: '/scenarios' },
    execute: { method: 'POST', path: '/scenarios/execute' },
    history: { method: 'GET', path: '/scenarios/executions' },
    detail: { method: 'GET', path: '/scenarios/executions/:id' },
  },
  eventDeliveries: {
    recent: { method: 'GET', path: '/event-deliveries/recent' },
    list: { method: 'GET', path: '/event-deliveries' },
  },
  infrastructure: {
    health: { method: 'GET', path: '/infrastructure/health' },
  },
} as const;

export type RouteKey = keyof typeof routes;

/**
 * Substitutes `:param` placeholders in a route template.
 * Route templates are the single place paths are written.
 */
export function buildPath(
  template: string,
  params: Record<string, string>,
): string {
  return template.replace(/:([A-Za-z]+)/g, (_match, key: string) => {
    const value = params[key];
    if (value === undefined) {
      throw new Error(`Missing route parameter "${key}" for ${template}`);
    }
    return encodeURIComponent(value);
  });
}

/** Appends defined query parameters to a path. */
export function withQuery(
  path: string,
  params: Record<string, string | number | boolean | undefined | null>,
): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    search.set(key, String(value));
  });
  const query = search.toString();
  return query ? `${path}?${query}` : path;
}
