import { describe, expect, it } from 'vitest';

import { createScalarClient } from '../src/index.js';
import { jsonResponse, makeTask, mockFetch } from './helpers.js';

const baseUrl = 'https://api.example.test';

function results(over: Record<string, unknown> = {}) {
  return {
    query: 'problem',
    tasks: [],
    events: [],
    spaces: [],
    counts: { tasks: 0, events: 0, spaces: 0, total: 0 },
    ...over,
  };
}

describe('search.query', () => {
  it('sends the term and returns grouped results', async () => {
    const { fetchImpl, calls } = mockFetch(() =>
      jsonResponse(
        results({
          tasks: [makeTask({ title: 'Finish problem set 4' })],
          counts: { tasks: 1, events: 0, spaces: 0, total: 1 },
        }),
      ),
    );
    const client = createScalarClient({ baseUrl, fetch: fetchImpl });

    const found = await client.search.query({ q: 'problem' });

    expect(calls[0]?.url).toBe(`${baseUrl}/api/v1/search?q=problem`);
    expect(found.tasks[0]?.title).toBe('Finish problem set 4');
    expect(found.counts.total).toBe(1);
  });

  it('passes the per kind limit', async () => {
    const { fetchImpl, calls } = mockFetch(() => jsonResponse(results()));
    const client = createScalarClient({ baseUrl, fetch: fetchImpl });

    await client.search.query({ q: 'revision', limit: 5 });

    expect(calls[0]?.url).toBe(`${baseUrl}/api/v1/search?q=revision&limit=5`);
  });

  it('encodes a term with characters that would break a URL', async () => {
    const { fetchImpl, calls } = mockFetch(() => jsonResponse(results({ query: 'a&b c' })));
    const client = createScalarClient({ baseUrl, fetch: fetchImpl });

    await client.search.query({ q: 'a&b c' });

    // URLSearchParams encodes a space as +, which is valid in a query string.
    expect(calls[0]?.url).toBe(`${baseUrl}/api/v1/search?q=a%26b+c`);
  });

  // Query parameters are validated as the call is made, like the other query methods, so a bad
  // term fails immediately rather than after a round trip.
  it('refuses a term too short to be useful, before the request leaves', () => {
    const { fetchImpl, calls } = mockFetch(() => jsonResponse(results()));
    const client = createScalarClient({ baseUrl, fetch: fetchImpl });

    expect(() => client.search.query({ q: 'a' })).toThrow();
    expect(calls).toHaveLength(0);
  });
});
