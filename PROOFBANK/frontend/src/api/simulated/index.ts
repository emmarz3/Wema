/**
 * Simulated data source — the bundled stand-in for a ProofBank backend.
 *
 * IMPORTANT: this module is a data source, not decoration. Everything it
 * returns is labelled SIMULATED by the interface, values are generated
 * deterministically, and the simulation clock owned by `./clock` (not by
 * React components) is the only thing that advances simulated activity.
 *
 * When a real backend exists, set `VITE_DATA_SOURCE=backend` and this module
 * stops being used; no screen code changes.
 */
import type { ApiRequest, ApiResponse, Transport } from '../types';
import { handle } from './handlers';

export { observeSimulationStatus, simulationStatus } from './clock';
export { observeRuns } from './scenarios';
export { buildWorld } from './data';
export { simulatedOperatorFor } from './handlers';

function json(status: number, body: unknown): ApiResponse {
  return { status, ok: status >= 200 && status < 300, body };
}

/** Creates the simulated transport (the backend stand-in). */
export function createSimulatedTransport(): Transport {
  return (request: ApiRequest): Promise<ApiResponse> => {
    const requiresSession =
      !request.path.startsWith('/auth/sign-in') && request.path !== '/health';
    if (requiresSession) {
      let hasSession = false;
      try {
        hasSession = Boolean(localStorage.getItem('proofbank.simulated.session'));
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
    return handle(request).catch(() =>
      json(503, {
        code: 'simulation_unavailable',
        message: 'The simulation service could not be reached.',
      }),
    );
  };
}
