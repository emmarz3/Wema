/**
 * Error normalisation. Every transport failure surfaces to screens as an
 * ApiError with a stable code, so the interface can react to timeouts,
 * permission failures and outages without parsing messages.
 */

export interface ApiErrorBody {
  code?: string;
  message?: string;
  details?: unknown;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, body: unknown) {
    const parsed = (body ?? {}) as ApiErrorBody;
    super(parsed.message || defaultMessage(status, parsed.code));
    this.name = 'ApiError';
    this.status = status;
    this.code = parsed.code || defaultCode(status);
    this.details = parsed.details;
  }

  /** True when the request failed before reaching the interface. */
  get isNetworkError(): boolean {
    return this.status === 0;
  }

  /** True when the session is no longer valid and the user must sign in. */
  get isSessionExpired(): boolean {
    return this.status === 401 || this.code === 'session_expired';
  }

  /** True when the signed-in role lacks the capability. */
  get isPermissionDenied(): boolean {
    return this.status === 403 || this.code === 'permission_denied';
  }

  /** True when the source could not answer (outage/timeout). The interface
   *  must never treat this as a negative verification result. */
  get isUnavailable(): boolean {
    return this.status === 503 || this.code === 'source_unavailable';
  }

  /** True when the route exists in the contract but the configured data
   *  source has not implemented it yet. */
  get isNotImplemented(): boolean {
    return this.status === 501 || this.code === 'not_implemented';
  }
}

function defaultCode(status: number): string {
  if (status === 0) return 'network_error';
  if (status === 400) return 'bad_request';
  if (status === 401) return 'session_expired';
  if (status === 403) return 'permission_denied';
  if (status === 404) return 'not_found';
  if (status === 422) return 'validation_failed';
  if (status === 501) return 'not_implemented';
  if (status === 503) return 'source_unavailable';
  return 'unexpected_error';
}

function defaultMessage(status: number, code?: string): string {
  switch (code ?? defaultCode(status)) {
    case 'network_error':
      return 'ProofOps could not be reached. Check your connection and try again.';
    case 'session_expired':
      return 'Your session has expired. Sign in again to continue.';
    case 'permission_denied':
      return 'Your role does not permit this action.';
    case 'not_found':
      return 'The requested record was not found.';
    case 'validation_failed':
      return 'Some fields need attention before this can continue.';
    case 'not_implemented':
      return 'This capability is not available from the configured data source yet.';
    case 'source_unavailable':
      return 'The authoritative source could not be reached. No outcome was recorded.';
    default:
      return 'Something went wrong. The operation did not complete.';
  }
}

export function toApiError(status: number, body: unknown): ApiError {
  if (body instanceof ApiError) return body;
  return new ApiError(status, body);
}
