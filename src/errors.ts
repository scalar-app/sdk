export interface ScalarApiErrorOptions {
  status: number;
  code: string;
  message: string;
  requestId?: string | undefined;
  details?: unknown;
}

/** Thrown when the API responds with a non-2xx status or a body that does not match the contract. */
export class ScalarApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly requestId: string | undefined;
  readonly details: unknown;

  constructor(options: ScalarApiErrorOptions) {
    super(options.message);
    this.name = 'ScalarApiError';
    this.status = options.status;
    this.code = options.code;
    this.requestId = options.requestId;
    this.details = options.details;
  }
}

/** Thrown when the request never produced an HTTP response (offline, DNS, CORS, abort). */
export class ScalarNetworkError extends Error {
  override readonly cause: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'ScalarNetworkError';
    this.cause = cause;
  }
}

export function isScalarApiError(value: unknown): value is ScalarApiError {
  return value instanceof ScalarApiError;
}

export function isScalarNetworkError(value: unknown): value is ScalarNetworkError {
  return value instanceof ScalarNetworkError;
}
