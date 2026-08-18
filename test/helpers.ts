import { vi } from 'vitest';

import type { FetchLike, Task } from '../src/index.js';

export interface RecordedCall {
  url: string;
  init: RequestInit | undefined;
}

export function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set('content-type', 'application/json');
  if (!headers.has('x-request-id')) {
    headers.set('x-request-id', 'req_test');
  }
  return new Response(body === undefined ? null : JSON.stringify(body), { ...init, headers });
}

export function mockFetch(responder: (call: RecordedCall, index: number) => Response) {
  const calls: RecordedCall[] = [];
  const fetchImpl = vi.fn<FetchLike>((url, init) => {
    const call = { url, init };
    calls.push(call);
    return Promise.resolve(responder(call, calls.length - 1));
  });
  return { fetchImpl, calls };
}

export function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task_1',
    workspaceId: 'ws_1',
    spaceId: null,
    title: 'Write the SDK',
    description: null,
    status: 'todo',
    priority: 'medium',
    dueAt: null,
    scheduledStart: null,
    scheduledEnd: null,
    estimatedMinutes: null,
    sourceId: null,
    parentTaskId: null,
    createdBy: 'user_1',
    createdAt: '2026-08-18T10:00:00.000Z',
    updatedAt: '2026-08-18T10:00:00.000Z',
    completedAt: null,
    ...overrides,
  };
}
