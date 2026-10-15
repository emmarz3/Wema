/**
 * Backend transport — used when `VITE_DATA_SOURCE=backend`.
 *
 * Talks to the real ProofBank API the same way the simulated transport
 * does, so screens are transport-agnostic. Every response shape below is
 * what this transport normalises to.
 */
import type { Transport } from './types';

export function createBackendTransport(baseUrl: string): Transport {
  const root = baseUrl.replace(/\/+$/, '');

  return async (request) => {
    try {
      const headers: Record<string, string> = {
        Accept: 'application/json',
      };
      if (request.body !== undefined) headers['Content-Type'] = 'application/json';
      if (request.token) headers.Authorization = `Bearer ${request.token}`;

      const response = await fetch(`${root}${request.path}`, {
        method: request.method,
        headers,
        body: request.body === undefined ? undefined : JSON.stringify(request.body),
      });

      const text = await response.text();
      const body = text ? safeParse(text) : null;
      return { status: response.status, ok: response.ok, body };
    } catch {
      return {
        status: 0,
        ok: false,
        body: {
          code: 'network_error',
          message: 'The interface could not reach the ProofBank backend.',
        },
      };
    }
  };
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return { code: 'invalid_response', message: text.slice(0, 200) };
  }
}
