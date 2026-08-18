import { describe, expect, it } from 'vitest';

import { createScalarClient, type CommandAction, type CommandResponse } from '../src/index.js';
import { jsonResponse, mockFetch, type RecordedCall } from './helpers.js';

/** Request bodies are always JSON strings here; the client serializes before calling fetch. */
function sentBody(call: RecordedCall | undefined): Record<string, unknown> {
  return JSON.parse(typeof call?.init?.body === 'string' ? call.init.body : '{}') as Record<
    string,
    unknown
  >;
}

const baseUrl = 'https://api.example.test';

function action(overrides: Partial<CommandAction> = {}): CommandAction {
  return {
    id: 'act_1',
    tool: 'create_task',
    classification: 'write',
    summary: 'Create task "Email the TA"',
    status: 'pending',
    createdAt: '2026-08-18T10:00:00.000Z',
    ...overrides,
  };
}

function response(overrides: Partial<CommandResponse> = {}): CommandResponse {
  return {
    threadId: 'thr_1',
    messageId: 'msg_1',
    answer: 'Nothing is due today.',
    actions: [],
    stopReason: 'answered',
    refusalCategory: null,
    usage: { inputTokens: 10, outputTokens: 5 },
    ...overrides,
  };
}

describe('command.ask', () => {
  it('posts the message and fills in the browser time zone', async () => {
    const { fetchImpl, calls } = mockFetch(() => jsonResponse(response()));
    const client = createScalarClient({ baseUrl, fetch: fetchImpl });

    const result = await client.command.ask({ message: 'what is due today?' });

    expect(calls[0]?.url).toBe(`${baseUrl}/api/v1/command`);
    expect(calls[0]?.init?.method).toBe('POST');
    const body = sentBody(calls[0]);
    expect(body.message).toBe('what is due today?');
    expect(body.timeZone).toBeTruthy();
    expect(result.answer).toBe('Nothing is due today.');
  });

  it('keeps an explicit time zone', async () => {
    const { fetchImpl, calls } = mockFetch(() => jsonResponse(response()));
    const client = createScalarClient({ baseUrl, fetch: fetchImpl });

    await client.command.ask({ message: 'hello', timeZone: 'Europe/Berlin' });

    const body = sentBody(calls[0]);
    expect(body.timeZone).toBe('Europe/Berlin');
  });

  it('passes a thread id when continuing a conversation', async () => {
    const { fetchImpl, calls } = mockFetch(() => jsonResponse(response()));
    const client = createScalarClient({ baseUrl, fetch: fetchImpl });

    await client.command.ask({ message: 'and tomorrow?', threadId: 'thr_1' });

    const body = sentBody(calls[0]);
    expect(body.threadId).toBe('thr_1');
  });

  it('rejects an empty message before the request leaves', async () => {
    const { fetchImpl, calls } = mockFetch(() => jsonResponse(response()));
    const client = createScalarClient({ baseUrl, fetch: fetchImpl });

    await expect(client.command.ask({ message: '   ' })).rejects.toThrow();
    expect(calls).toHaveLength(0);
  });

  it('surfaces proposed actions and their pending status', async () => {
    const { fetchImpl } = mockFetch(() =>
      jsonResponse(response({ stopReason: 'needs_approval', actions: [action()] })),
    );
    const client = createScalarClient({ baseUrl, fetch: fetchImpl });

    const result = await client.command.ask({ message: 'add a task' });

    expect(result.stopReason).toBe('needs_approval');
    expect(result.actions[0]?.status).toBe('pending');
    expect(result.actions[0]?.summary).toContain('Email the TA');
  });

  it('reports a refusal without an answer', async () => {
    const { fetchImpl } = mockFetch(() =>
      jsonResponse(response({ answer: '', stopReason: 'refused', refusalCategory: 'cyber' })),
    );
    const client = createScalarClient({ baseUrl, fetch: fetchImpl });

    const result = await client.command.ask({ message: 'something disallowed' });

    expect(result.stopReason).toBe('refused');
    expect(result.answer).toBe('');
    expect(result.refusalCategory).toBe('cyber');
  });
});

describe('command approvals', () => {
  it('approves by id and reports what was created', async () => {
    const { fetchImpl, calls } = mockFetch(() =>
      jsonResponse({
        action: action({ status: 'executed' }),
        resultId: 'task_9',
        error: null,
      }),
    );
    const client = createScalarClient({ baseUrl, fetch: fetchImpl });

    const result = await client.command.approve('act 1');

    expect(calls[0]?.url).toBe(`${baseUrl}/api/v1/command/actions/act%201/approve`);
    expect(calls[0]?.init?.method).toBe('POST');
    expect(result.action.status).toBe('executed');
    expect(result.resultId).toBe('task_9');
  });

  it('reports an execution that failed without throwing', async () => {
    const { fetchImpl } = mockFetch(() =>
      jsonResponse({
        action: action({ status: 'failed' }),
        resultId: null,
        error: 'Task not found.',
      }),
    );
    const client = createScalarClient({ baseUrl, fetch: fetchImpl });

    const result = await client.command.approve('act_1');

    expect(result.action.status).toBe('failed');
    expect(result.error).toBe('Task not found.');
  });

  it('rejects by id', async () => {
    const { fetchImpl, calls } = mockFetch(() => jsonResponse(action({ status: 'rejected' })));
    const client = createScalarClient({ baseUrl, fetch: fetchImpl });

    const result = await client.command.reject('act_1');

    expect(calls[0]?.url).toBe(`${baseUrl}/api/v1/command/actions/act_1/reject`);
    expect(result.status).toBe('rejected');
  });
});

describe('command threads', () => {
  it('lists threads with pagination', async () => {
    const { fetchImpl, calls } = mockFetch(() =>
      jsonResponse({
        data: [
          {
            id: 'thr_1',
            title: 'what is due today?',
            createdAt: '2026-08-18T10:00:00.000Z',
            lastMessageAt: '2026-08-18T10:05:00.000Z',
          },
        ],
        nextCursor: null,
      }),
    );
    const client = createScalarClient({ baseUrl, fetch: fetchImpl });

    const page = await client.command.listThreads({ limit: 10 });

    expect(calls[0]?.url).toBe(`${baseUrl}/api/v1/command/threads?limit=10`);
    expect(page.data[0]?.title).toBe('what is due today?');
    expect(page.nextCursor).toBeNull();
  });

  it('reads a thread with its messages and actions', async () => {
    const { fetchImpl, calls } = mockFetch(() =>
      jsonResponse({
        id: 'thr_1',
        title: 'add a task',
        createdAt: '2026-08-18T10:00:00.000Z',
        lastMessageAt: '2026-08-18T10:05:00.000Z',
        messages: [
          {
            id: 'msg_1',
            role: 'user',
            content: 'add a task',
            stopReason: null,
            refusalCategory: null,
            createdAt: '2026-08-18T10:00:00.000Z',
            actions: [],
          },
          {
            id: 'msg_2',
            role: 'assistant',
            content: 'I can add that.',
            stopReason: 'needs_approval',
            refusalCategory: null,
            createdAt: '2026-08-18T10:01:00.000Z',
            actions: [action()],
          },
        ],
      }),
    );
    const client = createScalarClient({ baseUrl, fetch: fetchImpl });

    const thread = await client.command.getThread('thr_1');

    expect(calls[0]?.url).toBe(`${baseUrl}/api/v1/command/threads/thr_1`);
    expect(thread.messages).toHaveLength(2);
    expect(thread.messages[1]?.actions[0]?.status).toBe('pending');
  });
});

describe('command when the server has no model configured', () => {
  it('raises the API error so the caller can hide the feature', async () => {
    const { fetchImpl } = mockFetch(() =>
      jsonResponse(
        { error: { code: 'AI_UNAVAILABLE', message: 'Scalar Command is not configured.' } },
        { status: 503 },
      ),
    );
    const client = createScalarClient({ baseUrl, fetch: fetchImpl });

    await expect(client.command.ask({ message: 'hi' })).rejects.toMatchObject({
      status: 503,
      code: 'AI_UNAVAILABLE',
    });
  });
});
