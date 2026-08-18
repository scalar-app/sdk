import type { z } from 'zod';

import { ScalarApiError, ScalarNetworkError } from './errors.js';
import { ApiErrorSchema } from './schemas/common.js';

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export type QueryValue =
  string | number | boolean | null | undefined | readonly (string | number)[];
export type QueryParams = Record<string, QueryValue>;

export interface HttpOptions {
  baseUrl: string;
  fetch: FetchLike;
  headers: Record<string, string>;
  credentials: RequestCredentials;
}

export interface RequestOptions {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path: string;
  query?: QueryParams;
  body?: unknown;
  bodySchema?: z.ZodType;
  signal?: AbortSignal | undefined;
}

/** Serializes query params: arrays become comma lists, undefined and null are omitted. */
export function buildQueryString(query: QueryParams | undefined): string {
  if (!query) {
    return '';
  }
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) {
      continue;
    }
    if (Array.isArray(value)) {
      if (value.length === 0) {
        continue;
      }
      search.set(key, value.map(String).join(','));
      continue;
    }
    search.set(key, String(value));
  }
  const encoded = search.toString();
  return encoded ? `?${encoded}` : '';
}

export function buildUrl(baseUrl: string, path: string, query?: QueryParams): string {
  const base = baseUrl.replace(/\/+$/, '');
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${base}${suffix}${buildQueryString(query)}`;
}

function readRequestId(response: Response): string | undefined {
  return response.headers.get('x-request-id') ?? undefined;
}

async function readJson(response: Response): Promise<{ ok: true; value: unknown } | { ok: false }> {
  const text = await response.text();
  if (text.length === 0) {
    return { ok: true, value: undefined };
  }
  try {
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch {
    return { ok: false };
  }
}

export async function request<T>(
  http: HttpOptions,
  options: RequestOptions,
  schema: z.ZodType<T>,
): Promise<T> {
  const url = buildUrl(http.baseUrl, options.path, options.query);
  const headers: Record<string, string> = {
    accept: 'application/json',
    ...http.headers,
  };
  const init: RequestInit = {
    method: options.method,
    headers,
    credentials: http.credentials,
  };
  if (options.signal) {
    init.signal = options.signal;
  }
  if (options.body !== undefined) {
    const body = options.bodySchema ? options.bodySchema.parse(options.body) : options.body;
    headers['content-type'] = 'application/json';
    init.body = JSON.stringify(body);
  }

  let response: Response;
  try {
    response = await http.fetch(url, init);
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Network request failed';
    throw new ScalarNetworkError(message, cause);
  }

  const requestId = readRequestId(response);
  const parsed = await readJson(response);

  if (!response.ok) {
    if (parsed.ok) {
      const envelope = ApiErrorSchema.safeParse(parsed.value);
      if (envelope.success) {
        throw new ScalarApiError({
          status: response.status,
          code: envelope.data.error.code,
          message: envelope.data.error.message,
          requestId,
          details: parsed.value,
        });
      }
    }
    throw new ScalarApiError({
      status: response.status,
      code: 'UNKNOWN_ERROR',
      message: `Request failed with status ${String(response.status)}`,
      requestId,
      details: parsed.ok ? parsed.value : undefined,
    });
  }

  if (!parsed.ok) {
    throw new ScalarApiError({
      status: response.status,
      code: 'INVALID_RESPONSE',
      message: 'Response body is not valid JSON',
      requestId,
    });
  }

  const result = schema.safeParse(parsed.value);
  if (!result.success) {
    throw new ScalarApiError({
      status: response.status,
      code: 'INVALID_RESPONSE',
      message: 'Response body does not match the expected shape',
      requestId,
      details: result.error.issues,
    });
  }
  return result.data;
}
