import { ApiClient } from '../api/client';
import { createSimulatedTransport } from '../api/simulated';

/**
 * Test-only helper: constructs a client backed by the simulated transport
 * with a clean session, so tests never depend on exported singletons.
 */
export function createClientForTests(): ApiClient {
  return new ApiClient(createSimulatedTransport());
}
