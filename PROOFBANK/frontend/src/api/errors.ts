/** Errors surfaced by the API layer. Never leaks stack traces or secrets. */
export interface ApiErrorBody {
  code: string;
  message: string;
  /** Field-level validation problems, when the source provides them. */
  fields?: Record<string, string>;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields?: Record<string, string>;

  constructor(status: number, body: ApiErrorBody) {
    super(body.message);
    this.name = 'ApiError';
    this.status = status;
    this.code = body.code;
    this.fields = body.fields;
  }

  /** True when the caller is not allowed to perform the action. */
  get isAuthError(): boolean {
    return this.status === 401;
  }

  get isForbidden(): boolean {
    return this.status === 403;
  }

  get isValidation(): boolean {
    return this.status === 400 || this.status === 422;
  }

  /** Safe, user-facing sentence: what happened and what to do next. */
  get userGuidance(): string {
    switch (this.code) {
      case 'invalid_credentials':
        return 'Check the email and password and try again.';
      case 'session_expired':
        return 'Your session expired. Sign in again to continue.';
      case 'insufficient_funds':
        return 'The source account does not have enough available balance for this operation.';
      case 'frozen_account':
        return 'The selected account is frozen or dormant and cannot be operated.';
      case 'duplicate_reference':
        return 'This reference has already been used. Generate a new reference or reuse the existing transaction.';
      case 'invalid_account':
        return 'Select a valid account before submitting.';
      case 'permission_denied':
        return 'Your role does not permit this action.';
      case 'simulation_unavailable':
        return 'The simulation service is not responding. Try again shortly.';
      case 'network_error':
        return 'The interface could not reach ProofBank. Check your connection and retry.';
      default:
        return 'If this persists, contact your environment administrator.';
    }
  }
}

export function toApiError(status: number, body: unknown): ApiError {
  if (body && typeof body === 'object' && 'message' in body) {
    const candidate = body as ApiErrorBody;
    return new ApiError(status, {
      code: typeof candidate.code === 'string' ? candidate.code : 'unknown_error',
      message:
        typeof candidate.message === 'string'
          ? candidate.message
          : 'The request could not be completed.',
      fields: candidate.fields,
    });
  }
  return new ApiError(status, {
    code: 'unknown_error',
    message: 'The request could not be completed.',
  });
}
