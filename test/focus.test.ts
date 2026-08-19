import { describe, expect, it } from 'vitest';

import { createScalarClient, type FocusSession } from '../src/index.js';
import { jsonResponse, mockFetch } from './helpers.js';

const baseUrl = 'https://api.example.test';

const session: FocusSession = {
  id: '11111111-1111-4111-8111-111111111111',
  taskId: '22222222-2222-4222-8222-222222222222',
  taskTitle: 'Finish problem set',
  status: 'active',
  plannedMinutes: 45,
  startedAt: '2026-08-19T09:00:00.000Z',
  endedAt: null,
  actualMinutes: null,
  notes: null,
};

describe('focus', () => {
  it('returns null when nothing is running', async () => {
    const { fetchImpl, calls } = mockFetch(() => jsonResponse({ session: null }));
    const client = createScalarClient({ baseUrl, fetch: fetchImpl });

    expect(await client.focus.current()).toBeNull();
    expect(calls[0]?.url).toBe(`${baseUrl}/api/v1/focus/current`);
  });

  it('unwraps the running session', async () => {
    const { fetchImpl } = mockFetch(() => jsonResponse({ session }));
    const client = createScalarClient({ baseUrl, fetch: fetchImpl });

    expect((await client.focus.current())?.taskTitle).toBe('Finish problem set');
  });

  it('starts a session', async () => {
    const { fetchImpl, calls } = mockFetch(() => jsonResponse(session));
    const client = createScalarClient({ baseUrl, fetch: fetchImpl });

    await client.focus.start({ taskId: session.taskId, plannedMinutes: 45 });

    expect(calls[0]?.init?.method).toBe('POST');
    expect(calls[0]?.url).toBe(`${baseUrl}/api/v1/focus/start`);
  });

  it('completes a session and reports what changed', async () => {
    const { fetchImpl, calls } = mockFetch(() =>
      jsonResponse({
        session: {
          ...session,
          status: 'completed',
          endedAt: '2026-08-19T09:47:00.000Z',
          actualMinutes: 47,
        },
        taskCompleted: true,
        estimateUpdated: true,
        typicalMinutes: 50,
      }),
    );
    const client = createScalarClient({ baseUrl, fetch: fetchImpl });

    const result = await client.focus.complete(session.id, { completeTask: true });

    expect(calls[0]?.url).toBe(`${baseUrl}/api/v1/focus/${session.id}/complete`);
    expect(result).toMatchObject({
      taskCompleted: true,
      estimateUpdated: true,
      typicalMinutes: 50,
    });
    expect(result.session.actualMinutes).toBe(47);
  });

  it('cancels a session', async () => {
    const { fetchImpl, calls } = mockFetch(() =>
      jsonResponse({ ...session, status: 'cancelled', endedAt: '2026-08-19T09:10:00.000Z' }),
    );
    const client = createScalarClient({ baseUrl, fetch: fetchImpl });

    const cancelled = await client.focus.cancel(session.id);

    expect(calls[0]?.url).toBe(`${baseUrl}/api/v1/focus/${session.id}/cancel`);
    expect(cancelled.status).toBe('cancelled');
  });

  it('lists history for one task', async () => {
    const { fetchImpl, calls } = mockFetch(() =>
      jsonResponse({ data: [session], nextCursor: null }),
    );
    const client = createScalarClient({ baseUrl, fetch: fetchImpl });

    await client.focus.sessions({ taskId: session.taskId, limit: 10 });

    expect(calls[0]?.url).toContain(`taskId=${session.taskId}`);
  });
});
