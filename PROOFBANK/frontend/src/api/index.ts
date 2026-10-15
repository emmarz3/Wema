/**
 * API entry point. Chooses the configured data source and exposes the
 * single client instance used across the application.
 */
import { ApiClient, setActiveToken } from './client';
import {
  createSimulatedTransport,
  observeRuns,
  observeSimulationStatus,
} from './simulated';
import { createBackendTransport } from './backendTransport';

const configured = (import.meta.env?.VITE_DATA_SOURCE ?? 'simulated') as
  | 'simulated'
  | 'backend';

const backendBaseUrl =
  import.meta.env?.VITE_API_BASE_URL ?? 'http://localhost:8080/api';

export const dataSource = configured;

/** True when the interface is backed by the labelled simulated source. */
export const isSimulated = configured !== 'backend';

export const proofOpsLabel = import.meta.env?.VITE_PROOFOPS_LABEL || 'ProofOps';

/**
 * Optional base URL of the sibling ProofOps workspace. Cross-links between
 * the two products are host/router integrations only: when a URL is
 * configured here the interface can offer a contextual link filtered by the
 * event or delivery; when it is not, no link is presented. The interface
 * never claims an authorised ProofOps API integration it does not have.
 */
export const proofOpsBaseUrl = (import.meta.env?.VITE_PROOFOPS_URL ?? '').trim();

export const proofOpsConfigured = proofOpsBaseUrl.length > 0;

/**
 * Builds a contextual link into the ProofOps event workspace, filtered to
 * the event type and/or correlation id of the record being viewed. Returns
 * null unless a valid http(s) base URL is configured.
 */
export function proofOpsEventsUrl(params: {
  eventType?: string;
  correlationId?: string | null;
}): string | null {
  if (!proofOpsConfigured) return null;
  try {
    const base = new URL(proofOpsBaseUrl);
    if (base.protocol !== 'http:' && base.protocol !== 'https:') return null;
    const url = new URL('/events', base);
    if (params.eventType) url.searchParams.set('type', params.eventType);
    if (params.correlationId) url.searchParams.set('correlationId', params.correlationId);
    return url.toString();
  } catch {
    return null;
  }
}

export const api = new ApiClient(
  configured === 'backend'
    ? createBackendTransport(backendBaseUrl)
    : createSimulatedTransport(),
);

export { setActiveToken, observeSimulationStatus, observeRuns };
