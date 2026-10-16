/**
 * Simulated data source — the bundled stand-in for the ProofOps backend.
 *
 * This module is a data source, not decoration: everything it returns is
 * labelled SIMULATED by the interface. It is being implemented capability
 * by capability alongside the screens that need it (see the phase plan);
 * routes that are not implemented yet fail with a structured
 * `not_implemented` error, which the interface renders as an honest
 * unavailable state — never as fabricated data.
 *
 * When a real backend exists, set `VITE_DATA_SOURCE=backend` and this
 * module stops being used; no screen code changes.
 */
import type { ApiRequest, ApiResponse, Transport } from '../types';
import { registerAuthHandlers } from './auth';
import { registerVerificationHandlers } from './verification';
import { registerReceiptHandlers } from './receipt';
import { registerVerificationHandlers } from './verification';

/** A handler implements one contract route against the simulated store. */
export type SimulatedHandler = (request: ApiRequest) => Promise<ApiResponse> | ApiResponse;

const handlers = new Map<string, SimulatedHandler>();

function keyOf(method: string, path: string): string {
  return `${method} ${path}`;
}

/** Registers a handler for a contract route. */
export function registerHandler(
  method: string,
  pathTemplate: string,
  handler: SimulatedHandler,
): void {
  handlers.set(keyOf(method, pathTemplate), handler);
}

/** Registers a whole capability's routes at once. */
export function registerHandlers(
  routes_: Record<string, { method: string; path: string; handler: SimulatedHandler }>,
): void {
  Object.values(routes_).forEach(({ method, path, handler }) =>
    registerHandler(method, path, handler),
  );
}

/** Routes registered so far (reported by the health endpoint). */
export function implementedRoutes(): string[] {
  return [...handlers.keys()].sort();
}

function json(status: number, body: unknown): ApiResponse {
  return { status, ok: status >= 200 && status < 300, body };
}

/** Matches `/verifications/:id` templates against concrete paths. */
function matchHandler(method: string, path: string): SimulatedHandler | undefined {
  const direct = handlers.get(keyOf(method, path));
  if (direct) return direct;

  const pathOnly = path.split('?')[0];
  for (const [key, handler] of handlers) {
    const [handlerMethod, template] = key.split(' ');
    if (handlerMethod !== method) continue;
    const pattern = new RegExp(
      `^${template.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\:[A-Za-z]+/g, '[^/]+')}$`,
    );
    if (pattern.test(pathOnly)) return handler;
  }
  return undefined;
}

/** Creates the simulated transport (the backend stand-in). */
export function createSimulatedTransport(): Transport {
  return (request: ApiRequest): Promise<ApiResponse> => {
    const requiresSession = !request.path.startsWith('/auth/') && request.path !== '/health';
    if (requiresSession) {
      let hasSession = false;
      try {
        hasSession = Boolean(localStorage.getItem('proofops.simulated.session'));
      } catch {
        hasSession = true;
      }
      if (!hasSession) {
        return Promise.resolve(
          json(401, {
            code: 'session_expired',
            message: 'No active session. Sign in again to continue.',
          }),
        );
      }
    }

    const handler = matchHandler(request.method, request.path);
    if (!handler) {
      return Promise.resolve(
        json(501, {
          code: 'not_implemented',
          message:
            'This capability is not available from the simulated data source yet. It arrives in the phase that ships this screen.',
          route: `${request.method} ${request.path.split('?')[0]}`,
        }),
      );
    }

    return Promise.resolve()
      .then(() => handler(request))
      .catch(() =>
        json(503, {
          code: 'simulation_unavailable',
          message: 'The simulated data source could not complete the request.',
        }),
      );
  };
}

/* Register the simulated capabilities that are implemented so far. This
   runs after the handler registry exists; later phases register their
   handlers alongside their screens. */
registerAuthHandlers();
registerVerificationHandlers();
registerReceiptHandlers();
registerVerificationHandlers();
