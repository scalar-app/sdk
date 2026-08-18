import { describe, expect, it } from 'vitest';
import { createScalarClient } from '../src/client.js';
import { ScalarApiError } from '../src/errors.js';
import { jsonResponse, mockFetch } from './helpers.js';

const baseUrl = 'https://api.test';

function account(overrides: Record<string, unknown> = {}) {
  return {
    id: 'acc_1',
    provider: 'google_calendar',
    displayName: 'calendar@example.com',
    status: 'active',
    connectedAt: '2026-08-18T10:00:00.000Z',
    resources: [
      {
        resourceId: 'primary',
        resourceName: 'Personal',
        syncStatus: 'idle',
        lastSuccessfulSyncAt: '2026-08-18T10:05:00.000Z',
        lastAttemptAt: '2026-08-18T10:05:00.000Z',
        lastError: null,
        nextSyncAt: '2026-08-18T10:20:00.000Z',
      },
    ],
    ...overrides,
  };
}

describe('integrations', () => {
  it('lists accounts and unwraps data', async () => {
    const { fetchImpl, calls } = mockFetch(() => jsonResponse({ data: [account()] }));
    const client = createScalarClient({ baseUrl, fetch: fetchImpl });
    const list = await client.integrations.list();
    expect(calls[0]?.url).toBe(`${baseUrl}/api/v1/integrations`);
    expect(list).toHaveLength(1);
    expect(list[0]?.resources[0]?.syncStatus).toBe('idle');
  });

  it('returns the consent url', async () => {
    const { fetchImpl, calls } = mockFetch(() =>
      jsonResponse({ url: 'https://accounts.google.com/o/oauth2/v2/auth?state=abc' }),
    );
    const client = createScalarClient({ baseUrl, fetch: fetchImpl });
    const res = await client.integrations.connectGoogle();
    expect(calls[0]?.init?.method).toBe('POST');
    expect(res.url).toContain('accounts.google.com');
  });

  it('queues a sync and disconnects with the data choice', async () => {
    const { fetchImpl, calls } = mockFetch(() => jsonResponse({ ok: true }));
    const client = createScalarClient({ baseUrl, fetch: fetchImpl });
    await client.integrations.sync('acc_1');
    expect(calls[0]?.url).toBe(`${baseUrl}/api/v1/integrations/acc_1/sync`);

    await client.integrations.disconnect('acc_1');
    expect(calls[1]?.url).toBe(`${baseUrl}/api/v1/integrations/acc_1?data=keep`);
    await client.integrations.disconnect('acc_1', { data: 'delete' });
    expect(calls[2]?.url).toBe(`${baseUrl}/api/v1/integrations/acc_1?data=delete`);
    expect(calls[2]?.init?.method).toBe('DELETE');
  });

  it('surfaces a not active conflict', async () => {
    const { fetchImpl } = mockFetch(() =>
      jsonResponse(
        {
          error: {
            code: 'INTEGRATION_NOT_ACTIVE',
            message: 'Reconnect this account before syncing.',
          },
        },
        { status: 409 },
      ),
    );
    const client = createScalarClient({ baseUrl, fetch: fetchImpl });
    const error = await client.integrations.sync('acc_1').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ScalarApiError);
    expect((error as ScalarApiError).code).toBe('INTEGRATION_NOT_ACTIVE');
  });
});
