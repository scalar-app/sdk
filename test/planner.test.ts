import { describe, expect, it } from 'vitest';

import { createScalarClient, type PlanPreview } from '../src/index.js';
import { jsonResponse, mockFetch, type RecordedCall } from './helpers.js';

const baseUrl = 'https://api.example.test';

interface SentBody {
  tz?: string;
  rangeStart?: string;
  taskIds?: string[];
}

function body(call: RecordedCall | undefined): SentBody {
  return JSON.parse(typeof call?.init?.body === 'string' ? call.init.body : '{}') as SentBody;
}

const emptyPlan: PlanPreview = {
  rangeStart: '2026-08-19T08:00:00.000Z',
  rangeEnd: '2026-08-26T08:00:00.000Z',
  timeZone: 'UTC',
  blocks: [],
  unscheduled: [],
  conflicts: [],
  warnings: [],
};

describe('planner.preview', () => {
  it('fills in the reader’s zone and posts the range', async () => {
    const { fetchImpl, calls } = mockFetch(() => jsonResponse(emptyPlan));
    const client = createScalarClient({ baseUrl, fetch: fetchImpl });

    await client.planner.preview({ rangeStart: '2026-08-19T08:00:00.000Z' });

    expect(calls[0]?.url).toBe(`${baseUrl}/api/v1/planner/preview`);
    expect(calls[0]?.init?.method).toBe('POST');
    const sent = body(calls[0]);
    expect(sent.rangeStart).toBe('2026-08-19T08:00:00.000Z');
    expect(sent.tz).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
  });

  it('lets the caller override the zone', async () => {
    const { fetchImpl, calls } = mockFetch(() => jsonResponse(emptyPlan));
    const client = createScalarClient({ baseUrl, fetch: fetchImpl });

    await client.planner.preview({ tz: 'Asia/Tokyo' });

    expect(body(calls[0]).tz).toBe('Asia/Tokyo');
  });

  it('parses blocks, unscheduled items, conflicts and warnings', async () => {
    const { fetchImpl } = mockFetch(() =>
      jsonResponse({
        ...emptyPlan,
        blocks: [
          {
            taskId: '11111111-1111-4111-8111-111111111111',
            title: 'Finish problem set',
            startAt: '2026-08-19T09:00:00.000Z',
            endAt: '2026-08-19T10:00:00.000Z',
            minutes: 60,
            reasons: ['due_within_24_hours', 'fits_available_window'],
          },
        ],
        unscheduled: [
          {
            taskId: '22222222-2222-4222-8222-222222222222',
            title: 'Rewrite everything',
            kind: 'task_too_large_for_window',
            detail: 'This needs 600 minutes and the largest free block is 480.',
          },
        ],
        warnings: [
          {
            kind: 'no_estimate_used_default',
            taskId: '11111111-1111-4111-8111-111111111111',
            detail: 'No estimate, so 50 minutes was assumed.',
          },
        ],
      }),
    );
    const client = createScalarClient({ baseUrl, fetch: fetchImpl });

    const plan = await client.planner.preview();

    expect(plan.blocks[0]?.reasons).toContain('due_within_24_hours');
    expect(plan.unscheduled[0]?.kind).toBe('task_too_large_for_window');
    expect(plan.warnings[0]?.kind).toBe('no_estimate_used_default');
  });
});

describe('planner.apply', () => {
  it('sends back the approved blocks', async () => {
    const { fetchImpl, calls } = mockFetch(() =>
      jsonResponse({ applied: 1, taskIds: ['11111111-1111-4111-8111-111111111111'] }),
    );
    const client = createScalarClient({ baseUrl, fetch: fetchImpl });

    const result = await client.planner.apply({
      blocks: [
        {
          taskId: '11111111-1111-4111-8111-111111111111',
          startAt: '2026-08-19T09:00:00.000Z',
          endAt: '2026-08-19T10:00:00.000Z',
        },
      ],
    });

    expect(calls[0]?.url).toBe(`${baseUrl}/api/v1/planner/apply`);
    expect(result.applied).toBe(1);
  });

  it('surfaces a stale plan as an API error the caller can act on', async () => {
    const { fetchImpl } = mockFetch(() =>
      jsonResponse({ error: { code: 'PLAN_STALE', message: 'Review it again.' } }, { status: 409 }),
    );
    const client = createScalarClient({ baseUrl, fetch: fetchImpl });

    await expect(
      client.planner.apply({
        blocks: [
          {
            taskId: '11111111-1111-4111-8111-111111111111',
            startAt: '2026-08-19T09:00:00.000Z',
            endAt: '2026-08-19T10:00:00.000Z',
          },
        ],
      }),
    ).rejects.toMatchObject({ status: 409, code: 'PLAN_STALE' });
  });
});
