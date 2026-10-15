import { describe, expect, it, vi } from 'vitest';
import { ApiClient, setActiveToken } from '../api/client';
import { ApiError } from '../api/errors';
import { createSimulatedTransport } from '../api/simulated';
import { createBackendTransport } from '../api/backendTransport';
import { allRoutes, buildPath, withQuery } from '../api/contract';

describe('contract', () => {
  it('substitutes path parameters', () => {
    expect(buildPath('/verifications/:id', { id: 'v-1' })).toBe('/verifications/v-1');
    expect(() => buildPath('/verifications/:id', {})).toThrow(/missing route parameter/i);
  });

  it('appends defined query parameters only', () => {
    expect(withQuery('/verifications', { page: 1, result: undefined, search: '' })).toBe(
      '/verifications?page=1',
    );
    expect(withQuery('/verifications', {})).toBe('/verifications');
  });

  it('exposes every documented route for the developer console', () => {
    const flat = allRoutes();
    expect(flat.length).toBeGreaterThan(30);
    flat.forEach((route) => {
      expect(route.path.startsWith('/')).toBe(true);
      expect(route.summary.length).toBeGreaterThan(10);
    });
  });
});

describe('ApiClient error classification', () => {
  it('marks 401 as session expiry', () => {
    const error = new ApiError(401, { code: 'session_expired', message: 'expired' });
    expect(error.isSessionExpired).toBe(true);
    expect(error.isPermissionDenied).toBe(false);
  });

  it('marks 403 as permission denied', () => {
    expect(new ApiError(403, {}).isPermissionDenied).toBe(true);
  });

  it('marks 503 as source unavailable — never a negative verification result', () => {
    const error = new ApiError(503, {});
    expect(error.isUnavailable).toBe(true);
    expect(error.message).toMatch(/no outcome/i);
  });

  it('marks 501 as not implemented in the configured source', () => {
    const error = new ApiError(501, {});
    expect(error.isNotImplemented).toBe(true);
  });

  it('marks status 0 as a network error', () => {
    expect(new ApiError(0, {}).isNetworkError).toBe(true);
  });
});

describe('simulated transport', () => {
  const rejection = async (promise: Promise<unknown>): Promise<ApiError> =>
    promise.then(
      () => {
        throw new Error('Expected the call to fail, but it resolved.');
      },
      (error: unknown) => {
        expect(error).toBeInstanceOf(ApiError);
        return error as ApiError;
      },
    );

  it('rejects unauthenticated workspace routes with 401', async () => {
    localStorage.clear();
    const client = new ApiClient(createSimulatedTransport());
    const error = await rejection(client.overviewSummary('7d'));
    expect(error.status).toBe(401);
    expect(error.isSessionExpired).toBe(true);
  });

  it('answers contract routes that are not implemented with an honest 501', async () => {
    localStorage.setItem('proofops.simulated.session', 'x');
    const client = new ApiClient(createSimulatedTransport());
    const error = await rejection(client.overviewSummary('7d'));
    expect(error.status).toBe(501);
    expect(error.code).toBe('not_implemented');
    expect(error.message).toMatch(/not available from the simulated data source/i);
    localStorage.clear();
  });

  it('does not require a session for public routes', async () => {
    localStorage.clear();
    const transport = createSimulatedTransport();
    const response = await transport({ method: 'GET', path: '/health' });
    // Unregistered public routes still 501, but never 401 — proving the
    // session gate is route-scoped rather than blanket.
    expect(response.status).toBe(501);
  });
});

describe('backend transport', () => {
  it('normalises network failures to a 0 ApiError', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('offline'));
    vi.stubGlobal('fetch', fetchMock);
    const client = new ApiClient(createBackendTransport('http://localhost:9999/api'));
    const error = await client.ping().then(
      () => {
        throw new Error('Expected the call to fail, but it resolved.');
      },
      (thrown: unknown) => thrown as ApiError,
    );
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(0);
    expect(error.isNetworkError).toBe(true);
    vi.unstubAllGlobals();
  });

  it('sends the bearer token and parses JSON', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ status: 'ok', simulated: false }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const client = new ApiClient(createBackendTransport('http://localhost:9999/api/'));
    setActiveToken('test-token');
    const result = await client.ping();
    setActiveToken(null);
    expect(result).toEqual({ status: 'ok', simulated: false });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:9999/api/health');
    expect(init.headers.Authorization).toBe('Bearer test-token');
    vi.unstubAllGlobals();
  });
});
