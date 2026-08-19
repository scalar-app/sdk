import { describe, expect, it } from 'vitest';

import { createScalarClient, type Preferences, type Project } from '../src/index.js';
import { jsonResponse, mockFetch, type RecordedCall } from './helpers.js';

function body(call: RecordedCall | undefined): Record<string, unknown> {
  return JSON.parse(typeof call?.init?.body === 'string' ? call.init.body : '{}') as Record<
    string,
    unknown
  >;
}

const baseUrl = 'https://api.example.test';

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    workspaceId: '22222222-2222-4222-8222-222222222222',
    spaceId: null,
    name: 'Scalar V2',
    description: null,
    status: 'active',
    startAt: null,
    dueAt: null,
    source: 'scalar',
    sourceUrl: null,
    createdBy: '33333333-3333-4333-8333-333333333333',
    createdAt: '2026-08-18T10:00:00.000Z',
    updatedAt: '2026-08-18T10:00:00.000Z',
    ...overrides,
  };
}

const defaultPreferences: Preferences = {
  timeZone: 'UTC',
  weekStartsOn: 1,
  workdayStartMinute: 540,
  workdayEndMinute: 1020,
  workDays: [1, 2, 3, 4, 5],
  defaultFocusMinutes: 50,
  minimumBufferMinutes: 10,
  autoSchedule: 'suggest',
  durationLearningEnabled: true,
  updatedAt: null,
};

describe('projects', () => {
  it('lists with filters serialized as a comma list', async () => {
    const { fetchImpl, calls } = mockFetch(() =>
      jsonResponse({ data: [makeProject()], nextCursor: null }),
    );
    const client = createScalarClient({ baseUrl, fetch: fetchImpl });

    const page = await client.projects.list({ status: ['active', 'paused'], limit: 10 });

    expect(calls[0]?.url).toBe(`${baseUrl}/api/v1/projects?limit=10&status=active%2Cpaused`);
    expect(page.data[0]?.name).toBe('Scalar V2');
  });

  it('creates, updates and deletes', async () => {
    const { fetchImpl, calls } = mockFetch((call) =>
      call.init?.method === 'DELETE'
        ? jsonResponse({ ok: true })
        : jsonResponse(makeProject({ status: 'completed' })),
    );
    const client = createScalarClient({ baseUrl, fetch: fetchImpl });

    await client.projects.create({ name: 'Scalar V2' });
    expect(calls[0]?.init?.method).toBe('POST');
    expect(body(calls[0])).toEqual({ name: 'Scalar V2' });

    const updated = await client.projects.update('p1', { status: 'completed' });
    expect(calls[1]?.url).toBe(`${baseUrl}/api/v1/projects/p1`);
    expect(updated.status).toBe('completed');

    await client.projects.delete('p1');
    expect(calls[2]?.init?.method).toBe('DELETE');
  });

  it('rejects a response that does not match the schema', async () => {
    const { fetchImpl } = mockFetch(() => jsonResponse({ id: 'nope' }));
    const client = createScalarClient({ baseUrl, fetch: fetchImpl });
    await expect(client.projects.get('p1')).rejects.toThrow();
  });
});

describe('preferences', () => {
  it('reads the defaults', async () => {
    const { fetchImpl, calls } = mockFetch(() => jsonResponse(defaultPreferences));
    const client = createScalarClient({ baseUrl, fetch: fetchImpl });

    const prefs = await client.preferences.get();

    expect(calls[0]?.url).toBe(`${baseUrl}/api/v1/preferences`);
    expect(prefs.updatedAt).toBeNull();
    expect(prefs.workDays).toEqual([1, 2, 3, 4, 5]);
  });

  it('sends only the fields being changed', async () => {
    const { fetchImpl, calls } = mockFetch(() =>
      jsonResponse({
        ...defaultPreferences,
        timeZone: 'America/Los_Angeles',
        updatedAt: '2026-08-19T10:00:00.000Z',
      }),
    );
    const client = createScalarClient({ baseUrl, fetch: fetchImpl });

    const saved = await client.preferences.update({ timeZone: 'America/Los_Angeles' });

    expect(calls[0]?.init?.method).toBe('PATCH');
    expect(body(calls[0])).toEqual({ timeZone: 'America/Los_Angeles' });
    expect(saved.timeZone).toBe('America/Los_Angeles');
  });
});
