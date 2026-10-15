/** Transport-agnostic request/response shapes used by the API client. */
export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

export interface ApiRequest {
  method: HttpMethod;
  /** Path relative to the API root, e.g. `/verifications`. */
  path: string;
  body?: unknown;
  /** Bearer token, when the route needs authentication. */
  token?: string;
}

export interface ApiResponse {
  status: number;
  ok: boolean;
  body: unknown;
}

export type Transport = (request: ApiRequest) => Promise<ApiResponse>;
