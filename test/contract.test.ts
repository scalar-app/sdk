import { describe, expect, it } from 'vitest';

import {
  CreateProjectInputSchema,
  CreateTaskInputSchema,
  UpdatePreferencesInputSchema,
  UpdateProjectInputSchema,
  UpdateSpaceInputSchema,
  UpdateTaskInputSchema,
  ListEventsQuerySchema,
  TimelineRangeQuerySchema,
  ApplyPlanInputSchema,
  PreviewPlanInputSchema,
  createScalarClient,
} from '../src/index.js';
import { jsonResponse, mockFetch } from './helpers.js';

const baseUrl = 'http://localhost:4000';

/**
 * The SDK mirrors the API contract, so anything the API rejects with a 400 should not survive
 * client-side parsing either. Each case here was a request the SDK used to let through.
 */
describe('request validation parity with the API', () => {
  it('rejects an update with no fields', () => {
    expect(UpdateSpaceInputSchema.safeParse({}).success).toBe(false);
    expect(UpdateTaskInputSchema.safeParse({}).success).toBe(false);
    expect(UpdateProjectInputSchema.safeParse({}).success).toBe(false);
    expect(UpdatePreferencesInputSchema.safeParse({}).success).toBe(false);
  });

  it('caps estimatedMinutes at 100000', () => {
    expect(CreateTaskInputSchema.safeParse({ title: 'a', estimatedMinutes: 100_001 }).success).toBe(
      false,
    );
    expect(CreateTaskInputSchema.safeParse({ title: 'a', estimatedMinutes: 100_000 }).success).toBe(
      true,
    );
  });

  it('requires scheduledEnd to be after scheduledStart', () => {
    const out = CreateTaskInputSchema.safeParse({
      title: 'a',
      scheduledStart: '2026-08-18T12:00:00.000Z',
      scheduledEnd: '2026-08-18T11:00:00.000Z',
    });
    expect(out.success).toBe(false);
  });

  it('requires dueAt not to precede startAt', () => {
    const out = CreateProjectInputSchema.safeParse({
      name: 'a',
      startAt: '2026-08-18T12:00:00.000Z',
      dueAt: '2026-08-17T12:00:00.000Z',
    });
    expect(out.success).toBe(false);
  });

  it('requires event `to` to be after `from`', () => {
    expect(
      ListEventsQuerySchema.safeParse({
        from: '2026-08-18T12:00:00.000Z',
        to: '2026-08-18T11:00:00.000Z',
      }).success,
    ).toBe(false);
  });

  it('requires timeline range `to` not to precede `from`', () => {
    expect(
      TimelineRangeQuerySchema.safeParse({ from: '2026-08-18', to: '2026-08-17' }).success,
    ).toBe(false);
  });

  it('caps plan size and rejects duplicate or backwards blocks', () => {
    const block = (taskId: string) => ({
      taskId,
      startAt: '2026-08-18T10:00:00.000Z',
      endAt: '2026-08-18T11:00:00.000Z',
    });
    expect(ApplyPlanInputSchema.safeParse({ blocks: [block('t1'), block('t1')] }).success).toBe(
      false,
    );
    expect(
      ApplyPlanInputSchema.safeParse({
        blocks: [
          { taskId: 't1', startAt: '2026-08-18T11:00:00.000Z', endAt: '2026-08-18T10:00:00.000Z' },
        ],
      }).success,
    ).toBe(false);
    expect(
      PreviewPlanInputSchema.safeParse({
        taskIds: Array.from({ length: 101 }, (_, i) => `t${String(i)}`),
      }).success,
    ).toBe(false);
  });

  it('rejects an invalid IANA time zone', () => {
    expect(UpdatePreferencesInputSchema.safeParse({ timeZone: 'Not/AZone' }).success).toBe(false);
    expect(UpdatePreferencesInputSchema.safeParse({ timeZone: 'Europe/Sofia' }).success).toBe(true);
  });

  it('sorts and dedupes workDays the way the API stores them', () => {
    const out = UpdatePreferencesInputSchema.parse({ workDays: [5, 1, 1, 3] });
    expect(out.workDays).toEqual([1, 3, 5]);
  });
});

describe('response shapes the SDK used to discard', () => {
  it('keeps workspace kind and role', async () => {
    const { fetchImpl } = mockFetch(() =>
      jsonResponse({
        data: [
          {
            id: 'ws_1',
            name: 'Personal',
            ownerId: 'user_1',
            kind: 'personal',
            role: 'owner',
            createdAt: '2026-08-18T10:00:00.000Z',
            updatedAt: '2026-08-18T10:00:00.000Z',
          },
        ],
      }),
    );
    const client = createScalarClient({ baseUrl, fetch: fetchImpl });

    const [ws] = await client.workspaces.list();

    expect(ws?.kind).toBe('personal');
    expect(ws?.role).toBe('owner');
  });

  it('exposes the workspace /me returns alongside the user', async () => {
    const { fetchImpl } = mockFetch(() =>
      jsonResponse({
        user: {
          id: 'user_1',
          email: 'nk@example.test',
          name: null,
          createdAt: '2026-08-18T10:00:00.000Z',
          updatedAt: '2026-08-18T10:00:00.000Z',
        },
        workspace: {
          id: 'ws_1',
          name: 'Personal',
          ownerId: 'user_1',
          kind: 'team',
          role: 'admin',
          createdAt: '2026-08-18T10:00:00.000Z',
          updatedAt: '2026-08-18T10:00:00.000Z',
        },
      }),
    );
    const client = createScalarClient({ baseUrl, fetch: fetchImpl });

    const context = await client.me.context();

    expect(context.workspace.role).toBe('admin');
  });

  it('returns the degraded body instead of throwing on 503', async () => {
    const { fetchImpl } = mockFetch(() =>
      jsonResponse(
        { status: 'degraded', checks: { database: 'ok', redis: 'error' } },
        {
          status: 503,
        },
      ),
    );
    const client = createScalarClient({ baseUrl, fetch: fetchImpl });

    const health = await client.health.get();

    expect(health.status).toBe('degraded');
    expect(health).toMatchObject({ checks: { redis: 'error' } });
  });
});

describe('time zone defaults', () => {
  it('sends a time zone for today, as home and timeline already did', async () => {
    const { fetchImpl, calls } = mockFetch(() =>
      jsonResponse({
        date: '2026-08-18',
        timeZone: 'UTC',
        tasks: [],
        events: [],
        attentionCount: 0,
      }),
    );
    const client = createScalarClient({ baseUrl, fetch: fetchImpl });

    await client.today.get().catch(() => undefined);

    expect(calls[0]?.url).toContain('tz=');
  });
});
