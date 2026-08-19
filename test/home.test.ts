import { describe, expect, it } from 'vitest';

import { createScalarClient, type Home } from '../src/index.js';
import { jsonResponse, mockFetch } from './helpers.js';

const baseUrl = 'https://api.example.test';

const quietDay: Home = {
  date: '2026-08-19',
  greeting: 'Good morning.',
  timeZone: 'UTC',
  upNext: {
    kind: 'nothing',
    itemId: null,
    taskId: null,
    title: 'Nothing scheduled',
    startAt: null,
    endAt: null,
    estimatedMinutes: null,
    reason: 'nothing_to_do',
  },
  attention: [],
  busyMinutes: 0,
};

describe('home', () => {
  it('sends the reader’s own zone rather than UTC', async () => {
    const { fetchImpl, calls } = mockFetch(() => jsonResponse(quietDay));
    const client = createScalarClient({ baseUrl, fetch: fetchImpl });

    await client.home.get();

    const sent = new URL(calls[0]?.url ?? '').searchParams.get('tz');
    expect(sent).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
  });

  it('parses up next and attention with their reasons', async () => {
    const { fetchImpl } = mockFetch(() =>
      jsonResponse({
        ...quietDay,
        upNext: {
          kind: 'focus',
          itemId: '11111111-1111-4111-8111-111111111111',
          taskId: '22222222-2222-4222-8222-222222222222',
          title: 'Finish problem set',
          startAt: '2026-08-19T09:50:00.000Z',
          endAt: null,
          estimatedMinutes: 45,
          reason: 'focus_in_progress',
        },
        attention: [
          {
            id: 'not_enough_time:22222222-2222-4222-8222-222222222222',
            kind: 'not_enough_time',
            title: 'CSE homework',
            detail: 'Needs 2 hr. There is 1 hr of free working time before it is due.',
            taskId: '22222222-2222-4222-8222-222222222222',
          },
        ],
      }),
    );
    const client = createScalarClient({ baseUrl, fetch: fetchImpl });

    const home = await client.home.get({ date: '2026-08-19' });

    expect(home.upNext.reason).toBe('focus_in_progress');
    expect(home.attention[0]?.kind).toBe('not_enough_time');
    expect(home.attention[0]?.detail).toContain('1 hr of free working time');
  });

  it('rejects a response that does not match the schema', async () => {
    const { fetchImpl } = mockFetch(() => jsonResponse({ date: '2026-08-19' }));
    const client = createScalarClient({ baseUrl, fetch: fetchImpl });
    await expect(client.home.get()).rejects.toThrow();
  });
});
