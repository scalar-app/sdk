import { describe, expect, it } from 'vitest';

import { createScalarClient, type Timeline } from '../src/index.js';
import { jsonResponse, mockFetch } from './helpers.js';

const baseUrl = 'https://api.example.test';

const emptyDay: Timeline = {
  date: '2026-08-19',
  timeZone: 'UTC',
  blocks: [],
  busyMinutes: 0,
  conflicts: [],
};

describe('timeline', () => {
  it('sends the requested date and zone', async () => {
    const { fetchImpl, calls } = mockFetch(() => jsonResponse(emptyDay));
    const client = createScalarClient({ baseUrl, fetch: fetchImpl });

    await client.timeline.get({ date: '2026-08-19', tz: 'America/Los_Angeles' });

    expect(calls[0]?.url).toBe(
      `${baseUrl}/api/v1/timeline?date=2026-08-19&tz=America%2FLos_Angeles`,
    );
  });

  it('falls back to the reader’s own zone rather than UTC', async () => {
    const { fetchImpl, calls } = mockFetch(() => jsonResponse(emptyDay));
    const client = createScalarClient({ baseUrl, fetch: fetchImpl });

    await client.timeline.get();

    const sent = new URL(calls[0]?.url ?? '').searchParams.get('tz');
    expect(sent).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
  });

  it('parses blocks and conflicts', async () => {
    const { fetchImpl } = mockFetch(() =>
      jsonResponse({
        ...emptyDay,
        busyMinutes: 60,
        blocks: [
          {
            id: 'event:e1',
            itemId: '11111111-1111-4111-8111-111111111111',
            blockType: 'event',
            title: 'Calculus',
            startAt: '2026-08-19T09:00:00.000Z',
            endAt: '2026-08-19T10:00:00.000Z',
            allDay: false,
            locked: true,
            source: 'integration',
            status: null,
            priority: null,
            spaceId: null,
            projectId: null,
            location: 'Room 4',
          },
        ],
        conflicts: [{ blockIds: ['event:e1', 'task:t1'] }],
      }),
    );
    const client = createScalarClient({ baseUrl, fetch: fetchImpl });

    const timeline = await client.timeline.get({ date: '2026-08-19' });

    expect(timeline.blocks[0]).toMatchObject({ blockType: 'event', locked: true });
    expect(timeline.conflicts[0]?.blockIds).toEqual(['event:e1', 'task:t1']);
  });

  it('rejects a response that does not match the schema', async () => {
    const { fetchImpl } = mockFetch(() => jsonResponse({ date: '2026-08-19' }));
    const client = createScalarClient({ baseUrl, fetch: fetchImpl });
    await expect(client.timeline.get()).rejects.toThrow();
  });
});
