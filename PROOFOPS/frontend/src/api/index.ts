/**
 * API entry point. Chooses the configured data source and exposes the
 * single client instance used across the application.
 */
import { ApiClient, setActiveToken } from './client';
import { createSimulatedTransport, implementedRoutes } from './simulated';
import { createBackendTransport } from './backendTransport';

const configured = (import.meta.env?.VITE_DATA_SOURCE ?? 'simulated') as
  | 'simulated'
  | 'backend';

const backendBaseUrl = import.meta.env?.VITE_API_BASE_URL ?? 'http://localhost:8080/api';

export const dataSource = configured;

/** True when the interface is backed by the labelled simulated source. */
export const isSimulated = configured !== 'backend';

/** Display label for the simulated authoritative source (configurable). */
export const authoritativeSourceLabel =
  import.meta.env?.VITE_AUTHORITATIVE_SOURCE_LABEL || 'Simulated authoritative source';

/** Environment name shown in the interface. */
export const appEnvironment = import.meta.env?.VITE_APP_ENV || 'Sandbox';

export const api = new ApiClient(
  configured === 'backend' ? createBackendTransport(backendBaseUrl) : createSimulatedTransport(),
);

export { setActiveToken, implementedRoutes };
