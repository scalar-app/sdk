import { describe, expect, it } from 'vitest';

import { collectAll, createScalarClient, paginate } from '../src/index.js';
import { jsonResponse, makeTask, mockFetch } from './helpers.js';

const baseUrl = 'https://api.example.test';

describe('paginate', () => {
  it('follows nextCursor until null', async () => {
    const { fetchImpl, calls } = mockFetch((call) => {
      const cursor = new URL(call.url).searchParams.get('cursor');
      if (cursor === null) {
        return jsonResponse({
          data: [makeTask({ id: 't1' }), makeTask({ id: 't2' })],
          nextCursor: 'c1',
        });
      }
      if (cursor === 'c1') {
        return jsonResponse({ data: [makeTask({ id: 't3' })], nextCursor: 'c2' });
      }
      return jsonResponse({ data: [makeTask({ id: 't4' })], nextCursor: null });
    });
    const client = createScalarClient({ baseUrl, fetch: fetchImpl });

    const ids: string[] = [];
    for await (const task of paginate((cursor) =>
      client.tasks.list({ status: ['todo'], cursor, limit: 2 }),
    )) {
      ids.push(task.id);
    }

    expect(ids).toEqual(['t1', 't2', 't3', 't4']);
    expect(calls).toHaveLength(3);
    expect(new URL(calls[1]?.url ?? '').searchParams.get('cursor')).toBe('c1');
    expect(new URL(calls[1]?.url ?? '').searchParams.get('status')).toBe('todo');
  });
});

describe('collectAll', () => {
  it('collects everything', async () => {
    let page = 0;
    const items = await collectAll(() => {
      page += 1;
      return Promise.resolve({
        data: [page, page * 10],
        nextCursor: page < 3 ? String(page) : null,
      });
    });
    expect(items).toEqual([1, 10, 2, 20, 3, 30]);
  });

  it('stops at max and does not fetch further pages', async () => {
    let fetches = 0;
    const items = await collectAll(
      (cursor) => {
        fetches += 1;
        return Promise.resolve({
          data: cursor ? ['c', 'd'] : ['a', 'b'],
          nextCursor: cursor ? null : 'next',
        });
      },
      { max: 2 },
    );
    expect(items).toEqual(['a', 'b']);
    expect(fetches).toBe(1);
  });

  it('returns empty for max 0', async () => {
    const items = await collectAll(() => Promise.resolve({ data: [1], nextCursor: null }), {
      max: 0,
    });
    expect(items).toEqual([]);
  });
});
