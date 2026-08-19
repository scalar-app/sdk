import { describe, expect, it } from 'vitest';

import { createScalarClient, type InboxItem } from '../src/index.js';
import { jsonResponse, makeTask, mockFetch, type RecordedCall } from './helpers.js';

const baseUrl = 'https://api.example.test';

function body(call: RecordedCall | undefined): Record<string, unknown> {
  return JSON.parse(typeof call?.init?.body === 'string' ? call.init.body : '{}') as Record<
    string,
    unknown
  >;
}

const item: InboxItem = {
  task: makeTask({ id: '11111111-1111-4111-8111-111111111111', status: 'inbox' }),
  suggestion: {
    id: null,
    origin: 'planner',
    source: 'scalar',
    reason: 'Fits before it is due, in 90 minutes of free working time.',
    values: {
      scheduledStart: '2026-08-20T09:00:00.000Z',
      scheduledEnd: '2026-08-20T10:30:00.000Z',
      estimatedMinutes: 90,
    },
  },
};

describe('inbox', () => {
  it('lists items with their suggestions', async () => {
    const { fetchImpl, calls } = mockFetch(() => jsonResponse({ data: [item], nextCursor: null }));
    const client = createScalarClient({ baseUrl, fetch: fetchImpl });

    const page = await client.inbox.list({ limit: 25 });

    expect(calls[0]?.url).toBe(`${baseUrl}/api/v1/inbox?limit=25`);
    expect(page.data[0]?.suggestion?.origin).toBe('planner');
    expect(page.data[0]?.suggestion?.values.estimatedMinutes).toBe(90);
  });

  it('accepts an item with the values on screen', async () => {
    const { fetchImpl, calls } = mockFetch(() =>
      jsonResponse({ task: makeTask({ status: 'todo' }) }),
    );
    const client = createScalarClient({ baseUrl, fetch: fetchImpl });

    const result = await client.inbox.accept(item.task.id, {
      values: { estimatedMinutes: 30 },
    });

    expect(calls[0]?.url).toBe(`${baseUrl}/api/v1/inbox/${item.task.id}/accept`);
    expect(body(calls[0])).toEqual({ values: { estimatedMinutes: 30 } });
    expect(result.task.status).toBe('todo');
  });

  it('dismisses a stored suggestion by id', async () => {
    const { fetchImpl, calls } = mockFetch(() =>
      jsonResponse({ task: makeTask({ status: 'inbox' }) }),
    );
    const client = createScalarClient({ baseUrl, fetch: fetchImpl });

    const result = await client.inbox.dismiss(item.task.id, {
      suggestionId: '22222222-2222-4222-8222-222222222222',
    });

    expect(calls[0]?.url).toBe(`${baseUrl}/api/v1/inbox/${item.task.id}/dismiss`);
    // The work stays; only the advice was turned down.
    expect(result.task.status).toBe('inbox');
  });

  it('handles an item with nothing suggested about it', async () => {
    const { fetchImpl } = mockFetch(() =>
      jsonResponse({ data: [{ task: item.task, suggestion: null }], nextCursor: null }),
    );
    const client = createScalarClient({ baseUrl, fetch: fetchImpl });

    const page = await client.inbox.list();
    expect(page.data[0]?.suggestion).toBeNull();
  });
});
