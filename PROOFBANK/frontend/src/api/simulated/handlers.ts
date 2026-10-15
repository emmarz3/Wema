/**
 * Simulated route handlers. Every endpoint the interface may call either
 * lives here or is reported as not implemented — the transport never fakes
 * success for a route it cannot answer.
 */
import { uuid } from '../../lib/utils';
import { roles } from '../../lib/permissions';
import type { Role } from '../../lib/permissions';
import type { AuthSession, DashboardRange, SessionUser } from '../../types/domain';
import type { ApiRequest, ApiResponse } from '../types';
import { buildWorld, type SimulatedWorld } from './data';
import { computeSummary } from './metrics';
import {
  createCustomer,
  getCustomerDetail,
  listCustomers,
  setCustomerStatus,
  updateCustomer,
} from './customers';
import {
  createAccount,
  getAccountDetail,
  listAccounts,
  setAccountStatus,
} from './accounts';
import {
  deposit,
  getTransactionDetail,
  listTransactions,
  reverse,
  transfer,
  withdraw,
} from './transactions';
import { getLedgerEntry, listLedger } from './ledger';
import { getEventDetail, listEvents } from './events';
import { listDeliveries } from './deliveries';
import {
  executionHistory,
  getRun,
  listScenarios,
  startScenario,
} from './scenarios';
import {
  bindSimulationWorld,
  runSimulationCommand,
  simulationErrors,
  simulationHistory,
  simulationStatus,
} from './clock';

const SESSION_KEY = 'proofbank.simulated.session';

const world: SimulatedWorld = buildWorld();

// Heartbeats emit a simulated event into the world; the engine stays the only
// thing that advances the clock.
bindSimulationWorld({
  onHeartbeat: (status) => {
    world.events.unshift({
      id: uuid('evt'),
      type: 'simulation.heartbeat',
      occurredAt: status.heartbeatAt,
      transactionReference: null,
      correlationId: `corr_${uuid().replace(/-/g, '').slice(0, 16)}`,
      summary: `Simulation heartbeat — ${status.eventIntervalSeconds}s cadence`,
    });
    if (world.events.length > 500) world.events.length = 500;
  },
  onError: () => 'recorded',
});

interface SimulatedOperator {
  email: string;
  name: string;
  role: Role;
}

const operators: SimulatedOperator[] = [
  { email: 'amara.okafor@proofbank.test', name: 'Amara Okafor', role: 'super_admin' },
  { email: 'tunde.bello@proofbank.test', name: 'Tunde Bello', role: 'simulator_admin' },
  { email: 'chidi.nwosu@proofbank.test', name: 'Chidi Nwosu', role: 'operations_user' },
  { email: 'sim.developer@proofbank.test', name: 'Sim Developer', role: 'developer' },
  { email: 'grace.view@proofbank.test', name: 'Grace View', role: 'viewer' },
];

export function simulatedOperatorFor(role: Role): SimulatedOperator {
  return operators.find((operator) => operator.role === role) ?? operators[0];
}

/* ------------------------------------------------------------------ session */

function readSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthSession;
    if (!parsed?.token || !parsed?.user) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeSession(session: AuthSession | null): void {
  try {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    /* storage unavailable — session stays in memory for this tab */
  }
}

function createSession(role: Role): AuthSession {
  const operator = simulatedOperatorFor(role);
  const user: SessionUser = {
    id: uuid('usr'),
    name: operator.name,
    email: operator.email,
    role,
  };
  const session: AuthSession = {
    token: uuid('tok'),
    user,
    issuedAt: new Date().toISOString(),
  };
  writeSession(session);
  return session;
}

/* ------------------------------------------------------------------ helpers */

function latency(): Promise<void> {
  // Small, honest delay so loading states are exercised like a real network.
  const ms = 120 + Math.floor(Math.random() * 220);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function json<T>(status: number, body: T): ApiResponse {
  return { status, ok: status >= 200 && status < 300, body };
}

function badRequest(message: string, code = 'invalid_input'): ApiResponse {
  return json(400, { code, message });
}

/** Maps an operation failure onto the right HTTP status. */
function operationFailure(failure: {
  code: string;
  message: string;
}): ApiResponse {
  const status =
    failure.code === 'duplicate_reference'
      ? 409
      : failure.code === 'insufficient_funds'
        ? 422
        : 400;
  return json(status, { code: failure.code, message: failure.message });
}

function parseOptionalInt(raw: string | null): number | undefined {
  if (raw === null || raw.trim() === '') return undefined;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseLimit(params: URLSearchParams, fallback: number): number {
  const raw = params.get('limit');
  const parsed = raw === null ? fallback : Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, 50);
}

/* ------------------------------------------------------------------ handler */

export async function handle(request: ApiRequest): Promise<ApiResponse> {
  await latency();
  const [pathname, search = ''] = request.path.split('?');
  const params = new URLSearchParams(search);
  const { method, body } = request;

  // Parameterised routes are matched by shape: `/customers/:id` accepts real
  // identifiers rather than requiring exact template strings.
  const customerId = /^\/customers\/([^/]+)$/.exec(pathname)?.[1];
  const customerStatusId = /^\/customers\/([^/]+)\/status$/.exec(pathname)?.[1];
  const accountId = /^\/accounts\/([^/]+)$/.exec(pathname)?.[1];
  const accountStatusId = /^\/accounts\/([^/]+)\/status$/.exec(pathname)?.[1];
  const transactionId = /^\/transactions\/((?!recent$|deposit$|withdrawal$|transfer$)[^/]+)$/.exec(
    pathname,
  )?.[1];
  const transactionReverseId = /^\/transactions\/([^/]+)\/reverse$/.exec(pathname)?.[1];
  const ledgerEntryId = /^\/ledger\/([^/]+)$/.exec(pathname)?.[1];
  const eventId = /^\/events\/((?!recent$)[^/]+)$/.exec(pathname)?.[1];
  const scenarioRunId = /^\/scenarios\/executions\/([^/]+)$/.exec(pathname)?.[1];
  const route = `${method} ${pathname
    .replace(/^\/customers\/[^/]+$/, '/customers/:id')
    .replace(/^\/customers\/[^/]+\/status$/, '/customers/:id/status')
    .replace(/^\/accounts\/[^/]+$/, '/accounts/:id')
    .replace(/^\/accounts\/[^/]+\/status$/, '/accounts/:id/status')
    .replace(/^\/transactions\/[^/]+\/reverse$/, '/transactions/:id/reverse')
    .replace(
      /^\/transactions\/((?!recent$|deposit$|withdrawal$|transfer$)[^/]+)$/,
      '/transactions/:id',
    )
    .replace(/^\/ledger\/[^/]+$/, '/ledger/:id')
    .replace(/^\/events\/((?!recent$)[^/]+)$/, '/events/:id')
    .replace(/^\/scenarios\/executions\/[^/]+$/, '/scenarios/executions/:id')}`;

  switch (route) {
    /* ---------------------------------------------------------------- auth */
    case 'POST /auth/sign-in': {
      const payload = (body ?? {}) as {
        email?: string;
        password?: string;
        role?: Role;
      };
      const fields: Record<string, string> = {};
      if (!payload.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
        fields.email = 'Enter a valid email address.';
      }
      if (!payload.password || payload.password.length < 8) {
        fields.password = 'Use at least 8 characters.';
      }
      const role = payload.role ?? 'viewer';
      if (!roles.includes(role)) fields.role = 'Choose a demonstration role.';
      if (Object.keys(fields).length > 0) {
        return badRequest('The sign-in form needs attention.');
      }
      // Simulated authentication: the demonstration operator signs in.
      return json(200, createSession(role));
    }

    case 'GET /auth/session': {
      const session = readSession();
      if (!session) return json(404, { code: 'no_session', message: 'No active session.' });
      return json(200, session);
    }

    case 'POST /auth/sign-out':
      writeSession(null);
      return json(204, null);

    /* ---------------------------------------------------------- simulation */
    case 'GET /simulation/status':
      return json(200, simulationStatus());

    case 'GET /simulation/history':
      return json(200, simulationHistory());

    case 'GET /simulation/errors':
      return json(200, simulationErrors());

    case 'POST /simulation/start':
    case 'POST /simulation/pause':
    case 'POST /simulation/resume':
    case 'POST /simulation/stop': {
      const kind = pathname.split('/').pop() as 'start' | 'pause' | 'resume' | 'stop';
      const result = runSimulationCommand({ kind, actor: 'Workspace operator' });
      if (!result.ok) return json(409, { code: result.code, message: result.message });
      return json(200, result.status);
    }

    case 'POST /simulation/mode': {
      const payload = (body ?? {}) as { mode?: 'live' | 'scenario' | 'replay' };
      const result = runSimulationCommand({
        kind: 'mode',
        mode: payload.mode as never,
        actor: 'Workspace operator',
      });
      if (!result.ok) return json(400, { code: result.code, message: result.message });
      return json(200, result.status);
    }

    case 'POST /simulation/interval': {
      const payload = (body ?? {}) as { seconds?: number };
      const result = runSimulationCommand({
        kind: 'interval',
        seconds: payload.seconds ?? 0,
        actor: 'Workspace operator',
      });
      if (!result.ok) return json(400, { code: result.code, message: result.message });
      return json(200, result.status);
    }

    /* ----------------------------------------------------------- dashboard */
    case 'GET /dashboard/summary': {
      const rangeParam = params.get('range') ?? '24h';
      const ranges: DashboardRange[] = ['24h', '7d', '30d'];
      if (!ranges.includes(rangeParam as DashboardRange)) {
        return badRequest('Choose a supported activity range: 24h, 7d or 30d.');
      }
      return json(
        200,
        computeSummary(
          {
            customers: world.customers,
            accounts: world.accounts,
            transactions: world.transactions,
            events: world.events,
            scenarioExecutions: world.scenarioExecutions,
            deliveries: world.deliveries,
            incidents: world.incidents,
            services: world.services,
            simulation: simulationStatus(),
            currency: world.accounts[0]?.currency ?? 'NGN',
          },
          rangeParam as DashboardRange,
        ),
      );
    }

    /* ------------------------------------------------------------- recents */
    case 'GET /transactions/recent':
      return json(200, world.transactions.slice(0, parseLimit(params, 8)));

    /* ----------------------------------------------------------- scenarios */
    case 'GET /scenarios':
      return json(200, listScenarios());

    case 'POST /scenarios/execute': {
      const payload = (body ?? {}) as { name?: string; parameters?: Record<string, string> };
      if (!payload.name) return badRequest('Choose a scenario to run.');
      const result = startScenario(world, payload.name, payload.parameters ?? {});
      if (!result.ok) return json(404, { code: result.code, message: result.message });
      return json(201, result.run);
    }

    case 'GET /scenarios/executions':
      return json(200, executionHistory(world));

    case 'GET /scenarios/executions/:id': {
      const run = getRun(scenarioRunId ?? '');
      if (!run) {
        return json(404, { code: 'not_found', message: 'No scenario run with that identifier.' });
      }
      return json(200, run);
    }

    /* --------------------------------------------------------- transactions */
    case 'GET /transactions':
      return json(
        200,
        listTransactions(world, {
          search: params.get('search') ?? undefined,
          status: (params.get('status') as never) ?? 'all',
          type: (params.get('type') as never) ?? 'all',
          accountId: params.get('accountId') ?? undefined,
          from: params.get('from') ?? undefined,
          to: params.get('to') ?? undefined,
          minAmountMinor: parseOptionalInt(params.get('minAmount')),
          maxAmountMinor: parseOptionalInt(params.get('maxAmount')),
          sort: (params.get('sort') as never) ?? 'createdAt',
          direction: (params.get('direction') as 'asc' | 'desc') ?? 'desc',
          page: Number.parseInt(params.get('page') ?? '1', 10),
          pageSize: Number.parseInt(params.get('pageSize') ?? '10', 10),
        }),
      );

    case 'GET /transactions/:id': {
      const detail = getTransactionDetail(world, transactionId ?? '');
      if (!detail) {
        return json(404, { code: 'not_found', message: 'No transaction with that identifier.' });
      }
      return json(200, detail);
    }

    case 'POST /transactions/deposit': {
      const payload = (body ?? {}) as { accountId?: string; amountMinor?: number; currency?: string; reference?: string; note?: string };
      if (!payload.accountId || payload.amountMinor === undefined) {
        return badRequest('Choose an account and enter an amount.');
      }
      const result = deposit(world, {
        accountId: payload.accountId,
        amountMinor: payload.amountMinor,
        currency: payload.currency ?? 'NGN',
        reference: payload.reference,
        note: payload.note,
      });
      if (!result.ok) return operationFailure(result.failure);
      return json(201, result.result);
    }

    case 'POST /transactions/withdrawal': {
      const payload = (body ?? {}) as { accountId?: string; amountMinor?: number; currency?: string; reference?: string; note?: string };
      if (!payload.accountId || payload.amountMinor === undefined) {
        return badRequest('Choose an account and enter an amount.');
      }
      const result = withdraw(world, {
        accountId: payload.accountId,
        amountMinor: payload.amountMinor,
        currency: payload.currency ?? 'NGN',
        reference: payload.reference,
        note: payload.note,
      });
      if (!result.ok) return operationFailure(result.failure);
      return json(201, result.result);
    }

    case 'POST /transactions/transfer': {
      const payload = (body ?? {}) as {
        sourceAccountId?: string;
        destinationAccountId?: string;
        amountMinor?: number;
        currency?: string;
        reference?: string;
        note?: string;
      };
      if (!payload.sourceAccountId || !payload.destinationAccountId || payload.amountMinor === undefined) {
        return badRequest('Choose both accounts and enter an amount.');
      }
      const result = transfer(world, {
        sourceAccountId: payload.sourceAccountId,
        destinationAccountId: payload.destinationAccountId,
        amountMinor: payload.amountMinor,
        currency: payload.currency ?? 'NGN',
        reference: payload.reference,
        note: payload.note,
      });
      if (!result.ok) return operationFailure(result.failure);
      return json(201, result.result);
    }

    case 'POST /transactions/:id/reverse': {
      const payload = (body ?? {}) as { reason?: string };
      if (!payload.reason || payload.reason.trim().length < 3) {
        return badRequest('Record a reason for the reversal.');
      }
      const result = reverse(world, transactionReverseId ?? '', { reason: payload.reason });
      if (!result.ok) {
        return json(result.code === 'not_found' ? 404 : 409, {
          code: result.code,
          message: result.message,
        });
      }
      return json(200, result.result);
    }

    /* --------------------------------------------------------------- ledger */
    case 'GET /ledger':
      return json(
        200,
        listLedger(world, {
          search: params.get('search') ?? undefined,
          accountId: params.get('accountId') ?? undefined,
          transactionId: params.get('transactionId') ?? undefined,
          direction: (params.get('direction') as never) ?? 'all',
          status: (params.get('status') as never) ?? 'all',
          sort: (params.get('sort') as never) ?? 'postedAt',
          directionSort: (params.get('directionSort') as 'asc' | 'desc') ?? 'desc',
          page: Number.parseInt(params.get('page') ?? '1', 10),
          pageSize: Number.parseInt(params.get('pageSize') ?? '15', 10),
        }),
      );

    case 'GET /ledger/:id': {
      const detail = getLedgerEntry(world, ledgerEntryId ?? '');
      if (!detail) {
        return json(404, { code: 'not_found', message: 'No journal entry with that identifier.' });
      }
      return json(200, detail);
    }

    case 'GET /events/recent':
      return json(200, world.events.slice(0, parseLimit(params, 8)));

    case 'GET /scenario-executions/recent':
      return json(200, world.scenarioExecutions.slice(0, parseLimit(params, 6)));

    case 'GET /event-deliveries/recent':
      return json(200, world.deliveries.slice(0, parseLimit(params, 8)));

    /* -------------------------------------- event & delivery workspaces */
    case 'GET /events':
      return json(
        200,
        listEvents(world, {
          search: params.get('search') ?? undefined,
          type: (params.get('type') as never) ?? 'all',
          correlationId: params.get('correlationId') ?? undefined,
          from: params.get('from') ?? undefined,
          to: params.get('to') ?? undefined,
          direction: (params.get('direction') as 'asc' | 'desc') ?? 'desc',
          page: Number.parseInt(params.get('page') ?? '1', 10),
          pageSize: Number.parseInt(params.get('pageSize') ?? '15', 10),
        }),
      );

    case 'GET /events/:id': {
      const detail = getEventDetail(world, eventId ?? '');
      if (!detail) {
        return json(404, { code: 'not_found', message: 'No event with that identifier.' });
      }
      return json(200, detail);
    }

    case 'GET /event-deliveries':
      return json(
        200,
        listDeliveries(world, {
          search: params.get('search') ?? undefined,
          status: (params.get('status') as never) ?? 'all',
          eventType: (params.get('eventType') as never) ?? 'all',
          from: params.get('from') ?? undefined,
          to: params.get('to') ?? undefined,
          direction: (params.get('direction') as 'asc' | 'desc') ?? 'desc',
          page: Number.parseInt(params.get('page') ?? '1', 10),
          pageSize: Number.parseInt(params.get('pageSize') ?? '15', 10),
        }),
      );

    /* ---------------------------------------------------------- customers */
    case 'GET /customers':      return json(
        200,
        listCustomers(world, {
          search: params.get('search') ?? undefined,
          status: (params.get('status') as never) ?? 'all',
          sort: (params.get('sort') as never) ?? 'name',
          direction: (params.get('direction') as 'asc' | 'desc') ?? 'asc',
          page: Number.parseInt(params.get('page') ?? '1', 10),
          pageSize: Number.parseInt(params.get('pageSize') ?? '10', 10),
        }),
      );

    case 'POST /customers': {
      const result = createCustomer(world, body as never, 'Workspace');
      if (!result.ok) return badRequest('The customer form needs attention.');
      return json(201, result.customer);
    }

    case 'GET /customers/:id': {
      const detail = getCustomerDetail(world, customerId ?? '');
      if (!detail) {
        return json(404, { code: 'not_found', message: 'No customer with that identifier.' });
      }
      return json(200, detail);
    }

    case 'PATCH /customers/:id': {
      const result = updateCustomer(world, customerId ?? '', body as never);
      if (!result.ok) return badRequest('The customer form needs attention.');
      return json(200, result.customer);
    }

    case 'POST /customers/:id/status': {
      const payload = (body ?? {}) as { status?: 'ACTIVE' | 'SUSPENDED'; reason?: string };
      if (!payload.status || !['ACTIVE', 'SUSPENDED'].includes(payload.status)) {
        return badRequest('Choose a valid customer status.');
      }
      const result = setCustomerStatus(
        world,
        customerStatusId ?? '',
        { status: payload.status, reason: payload.reason },
        'Workspace operator',
      );
      if (!result.ok) {
        return json(404, { code: 'not_found', message: 'No customer with that identifier.' });
      }
      return json(200, result);
    }

    /* ----------------------------------------------------------- accounts */
    case 'GET /accounts':
      return json(
        200,
        listAccounts(world, {
          search: params.get('search') ?? undefined,
          type: (params.get('type') as never) ?? 'all',
          status: (params.get('status') as never) ?? 'all',
          sort: (params.get('sort') as never) ?? 'number',
          direction: (params.get('direction') as 'asc' | 'desc') ?? 'asc',
          page: Number.parseInt(params.get('page') ?? '1', 10),
          pageSize: Number.parseInt(params.get('pageSize') ?? '10', 10),
        }),
      );

    case 'POST /accounts': {
      const result = createAccount(world, body as never);
      if (!result.ok) {
        return result.code === 'invalid_customer'
          ? json(400, {
              code: 'invalid_customer',
              message: 'Choose an existing customer for the account.',
            })
          : json(400, {
              code: 'invalid_currency',
              message: 'Choose a supported currency.',
            });
      }
      return json(201, result.account);
    }

    case 'GET /accounts/:id': {
      const detail = getAccountDetail(world, accountId ?? '');
      if (!detail) {
        return json(404, { code: 'not_found', message: 'No account with that identifier.' });
      }
      return json(200, detail);
    }

    case 'POST /accounts/:id/status': {
      const payload = (body ?? {}) as {
        status?: 'ACTIVE' | 'DORMANT' | 'FROZEN';
        reason?: string;
      };
      if (!payload.status || !['ACTIVE', 'DORMANT', 'FROZEN'].includes(payload.status)) {
        return badRequest('Choose a valid account status.');
      }
      const result = setAccountStatus(
        world,
        accountStatusId ?? '',
        { status: payload.status, reason: payload.reason },
        'Workspace operator',
      );
      if (!result.ok) {
        return json(404, { code: 'not_found', message: 'No account with that identifier.' });
      }
      return json(200, result.account);
    }

    /* ------------------------------------------------------ infrastructure */
    case 'GET /infrastructure/health':
      return json(200, {
        services: world.services,
        incidents: world.incidents,
      });

    default:
      return json(404, {
        code: 'not_implemented',
        message: `No simulated implementation for ${method} ${pathname}.`,
      });
  }
}
