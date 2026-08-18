import { describe, expect, it } from 'vitest';

import {
  API_VERSION,
  ScalarApiError,
  ScalarNetworkError,
  buildQueryString,
  createScalarClient,
} from '../src/index.js';
import { jsonResponse, makeTask, mockFetch } from './helpers.js';

const baseUrl = 'https://api.example.test';

describe('API_VERSION', () => {
  it('is v1', () => {
    expect(API_VERSION).toBe('v1');
  });
});

describe('buildQueryString', () => {
  it('serializes arrays as comma lists and omits undefined and null', () => {
    const qs = buildQueryString({
      status: ['todo', 'done'],
      spaceId: undefined,
      q: null,
      limit: 20,
      empty: [],
    });
    expect(qs).toBe('?status=todo%2Cdone&limit=20');
  });

  it('returns an empty string when nothing is set', () => {
    expect(buildQueryString({ a: undefined })).toBe('');
    expect(buildQueryString(undefined)).toBe('');
  });
});

describe('createScalarClient', () => {
  it('builds URLs with the v1 prefix and encodes path params', async () => {
    const { fetchImpl, calls } = mockFetch(() => jsonResponse(makeTask({ id: 'a b' })));
    const client = createScalarClient({ baseUrl: `${baseUrl}/`, fetch: fetchImpl });

    await client.tasks.get('a b');

    expect(calls[0]?.url).toBe(`${baseUrl}/api/v1/tasks/a%20b`);
    expect(calls[0]?.init?.method).toBe('GET');
  });

  it('serializes list query params', async () => {
    const { fetchImpl, calls } = mockFetch(() => jsonResponse({ data: [], nextCursor: null }));
    const client = createScalarClient({ baseUrl, fetch: fetchImpl });

    await client.tasks.list({
      status: ['todo', 'in_progress'],
      spaceId: 'space_1',
      limit: 50,
      cursor: undefined,
      q: 'sdk',
    });

    const url = new URL(calls[0]?.url ?? '');
    expect(url.pathname).toBe('/api/v1/tasks');
    expect(url.searchParams.get('status')).toBe('todo,in_progress');
    expect(url.searchParams.get('spaceId')).toBe('space_1');
    expect(url.searchParams.get('limit')).toBe('50');
    expect(url.searchParams.get('q')).toBe('sdk');
    expect(url.searchParams.has('cursor')).toBe(false);
  });

  it('sends credentials include and json headers by default', async () => {
    const { fetchImpl, calls } = mockFetch(() => jsonResponse(makeTask()));
    const client = createScalarClient({ baseUrl, fetch: fetchImpl, headers: { 'x-app': 'web' } });

    await client.tasks.create({ title: 'Hello' });

    const init = calls[0]?.init;
    expect(init?.credentials).toBe('include');
    expect(init?.method).toBe('POST');
    expect(init?.body).toBe(JSON.stringify({ title: 'Hello' }));
    const headers = init?.headers as Record<string, string>;
    expect(headers['content-type']).toBe('application/json');
    expect(headers.accept).toBe('application/json');
    expect(headers['x-app']).toBe('web');
  });

  it('honours a custom credentials mode', async () => {
    const { fetchImpl, calls } = mockFetch(() => jsonResponse({ user: user() }));
    const client = createScalarClient({ baseUrl, fetch: fetchImpl, credentials: 'same-origin' });

    await client.me.get();

    expect(calls[0]?.init?.credentials).toBe('same-origin');
  });

  it('parses and unwraps successful responses', async () => {
    const { fetchImpl } = mockFetch(() => jsonResponse({ user: user() }));
    const client = createScalarClient({ baseUrl, fetch: fetchImpl });

    const me = await client.me.get();

    expect(me.email).toBe('nk@example.test');
  });

  it('parses the today response', async () => {
    const { fetchImpl, calls } = mockFetch(() =>
      jsonResponse({
        date: '2026-08-18',
        greeting: 'Good morning',
        attentionCount: 1,
        urgent: [makeTask({ priority: 'urgent' })],
        upcoming: [],
        dueToday: [],
        overdue: [],
      }),
    );
    const client = createScalarClient({ baseUrl, fetch: fetchImpl });

    const today = await client.today.get({ date: '2026-08-18', tz: 'Europe/Berlin' });

    expect(today.urgent[0]?.priority).toBe('urgent');
    expect(calls[0]?.url).toBe(`${baseUrl}/api/v1/today?date=2026-08-18&tz=Europe%2FBerlin`);
  });

  it('throws ScalarApiError with the envelope code on 404', async () => {
    const { fetchImpl } = mockFetch(() =>
      jsonResponse(
        { error: { code: 'TASK_NOT_FOUND', message: 'Task not found.' } },
        { status: 404, headers: { 'x-request-id': 'req_404' } },
      ),
    );
    const client = createScalarClient({ baseUrl, fetch: fetchImpl });

    const err = await client.tasks.get('missing').catch((e: unknown) => e);

    expect(err).toBeInstanceOf(ScalarApiError);
    const apiErr = err as ScalarApiError;
    expect(apiErr.status).toBe(404);
    expect(apiErr.code).toBe('TASK_NOT_FOUND');
    expect(apiErr.message).toBe('Task not found.');
    expect(apiErr.requestId).toBe('req_404');
  });

  it('falls back to UNKNOWN_ERROR when the error body is not an envelope', async () => {
    const { fetchImpl } = mockFetch(
      () => new Response('<html>Bad gateway</html>', { status: 502, headers: {} }),
    );
    const client = createScalarClient({ baseUrl, fetch: fetchImpl });

    const err = await client.workspaces.list().catch((e: unknown) => e);

    expect(err).toBeInstanceOf(ScalarApiError);
    expect((err as ScalarApiError).code).toBe('UNKNOWN_ERROR');
    expect((err as ScalarApiError).status).toBe(502);
    expect((err as ScalarApiError).requestId).toBeUndefined();
  });

  it('throws INVALID_RESPONSE when a 2xx body does not match the schema', async () => {
    const { fetchImpl } = mockFetch(() => jsonResponse({ id: 'task_1', title: 42 }));
    const client = createScalarClient({ baseUrl, fetch: fetchImpl });

    const err = await client.tasks.get('task_1').catch((e: unknown) => e);

    expect(err).toBeInstanceOf(ScalarApiError);
    expect((err as ScalarApiError).code).toBe('INVALID_RESPONSE');
    expect((err as ScalarApiError).status).toBe(200);
    expect(Array.isArray((err as ScalarApiError).details)).toBe(true);
  });

  it('accepts empty 204 bodies for delete and logout', async () => {
    const { fetchImpl, calls } = mockFetch(() => new Response(null, { status: 204 }));
    const client = createScalarClient({ baseUrl, fetch: fetchImpl });

    await expect(client.tasks.delete('task_1')).resolves.toBeUndefined();
    await expect(client.auth.logout()).resolves.toBeUndefined();
    expect(calls[0]?.init?.method).toBe('DELETE');
    expect(calls[1]?.url).toBe(`${baseUrl}/api/v1/auth/logout`);
  });

  it('wraps fetch failures in ScalarNetworkError', async () => {
    const client = createScalarClient({
      baseUrl,
      fetch: () => Promise.reject(new TypeError('Failed to fetch')),
    });

    const err = await client.me.get().catch((e: unknown) => e);

    expect(err).toBeInstanceOf(ScalarNetworkError);
    expect((err as ScalarNetworkError).message).toBe('Failed to fetch');
  });

  it('validates input before sending', async () => {
    const { fetchImpl, calls } = mockFetch(() => jsonResponse({ ok: true }));
    const client = createScalarClient({ baseUrl, fetch: fetchImpl });

    await expect(client.auth.requestMagicLink({ email: 'not-an-email' })).rejects.toThrow();
    expect(calls).toHaveLength(0);

    await client.auth.requestMagicLink({ email: 'nk@example.test' });
    expect(calls[0]?.url).toBe(`${baseUrl}/api/v1/auth/magic-link`);
  });

  it('passes the magic link token as a query param', async () => {
    const { fetchImpl, calls } = mockFetch(() =>
      jsonResponse({ user: user(), workspace: workspace() }),
    );
    const client = createScalarClient({ baseUrl, fetch: fetchImpl });

    await client.auth.verifyMagicLink('tok/en');

    expect(calls[0]?.url).toBe(`${baseUrl}/api/v1/auth/magic-link/verify?token=tok%2Fen`);
  });
});

function user() {
  return {
    id: 'user_1',
    email: 'nk@example.test',
    name: null,
    createdAt: '2026-08-18T10:00:00.000Z',
    updatedAt: '2026-08-18T10:00:00.000Z',
  };
}

function workspace() {
  return {
    id: 'ws_1',
    name: 'Personal',
    ownerId: 'user_1',
    createdAt: '2026-08-18T10:00:00.000Z',
    updatedAt: '2026-08-18T10:00:00.000Z',
  };
}
