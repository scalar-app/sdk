import { z } from 'zod';

import { API_VERSION } from './constants.js';
import type { FetchLike, HttpOptions } from './http.js';
import { request } from './http.js';
import {
  CreateSpaceInputSchema,
  CreateTaskInputSchema,
  ConnectIntegrationResponseSchema,
  EventListSchema,
  HealthSchema,
  ListEventsQuerySchema,
  ListIntegrationsResponseSchema,
  ListSpacesQuerySchema,
  ListTasksQuerySchema,
  ListWorkspacesResponseSchema,
  MeResponseSchema,
  RequestMagicLinkInputSchema,
  RequestMagicLinkResponseSchema,
  SpaceListSchema,
  SpaceSchema,
  TaskListSchema,
  TaskSchema,
  TodayQuerySchema,
  TodayResponseSchema,
  UpdateSpaceInputSchema,
  UpdateTaskInputSchema,
  VerifyMagicLinkResponseSchema,
} from './schemas/index.js';
import type {
  ConnectIntegrationResponse,
  CreateSpaceInput,
  CreateTaskInput,
  DisconnectData,
  Event,
  Health,
  IntegrationAccount,
  ListEventsQuery,
  ListSpacesQuery,
  ListTasksQuery,
  Paginated,
  RequestMagicLinkInput,
  RequestMagicLinkResponse,
  Space,
  Task,
  TodayQuery,
  TodayResponse,
  UpdateSpaceInput,
  UpdateTaskInput,
  User,
  VerifyMagicLinkResponse,
  Workspace,
} from './schemas/index.js';

export interface ScalarClientOptions {
  /** Origin of the API, for example `https://api.scalar.app` or `http://localhost:4000`. */
  baseUrl: string;
  /** Custom fetch implementation. Defaults to the global `fetch`. */
  fetch?: FetchLike;
  /** Extra headers sent with every request. */
  headers?: Record<string, string>;
  /** Fetch credentials mode. Defaults to `'include'` so the session cookie travels cross-origin. */
  credentials?: RequestCredentials;
}

/** Per-call options accepted by every client method. */
export interface CallOptions {
  signal?: AbortSignal;
}

/** Accepts an empty body (204) or `{ ok: true }`. */
const EmptyOrOkSchema = z.union([z.undefined(), z.object({ ok: z.literal(true) })]);

const prefix = `/api/${API_VERSION}`;

export function createScalarClient(options: ScalarClientOptions) {
  const globalFetch: FetchLike | undefined =
    typeof globalThis.fetch === 'function'
      ? (input, init) => globalThis.fetch(input, init)
      : undefined;
  const fetchImpl = options.fetch ?? globalFetch;
  if (!fetchImpl) {
    throw new Error(
      'No fetch implementation available. Pass `fetch` in createScalarClient options.',
    );
  }

  const http: HttpOptions = {
    baseUrl: options.baseUrl,
    fetch: fetchImpl,
    headers: options.headers ?? {},
    credentials: options.credentials ?? 'include',
  };

  return {
    /** Configuration this client was created with (read-only). */
    config: {
      baseUrl: http.baseUrl,
      credentials: http.credentials,
      apiVersion: API_VERSION,
    } as const,

    health: {
      get: (call?: CallOptions): Promise<Health> =>
        request(http, { method: 'GET', path: '/health', signal: call?.signal }, HealthSchema),
    },

    auth: {
      requestMagicLink: (
        input: RequestMagicLinkInput,
        call?: CallOptions,
      ): Promise<RequestMagicLinkResponse> =>
        request(
          http,
          {
            method: 'POST',
            path: `${prefix}/auth/magic-link`,
            body: input,
            bodySchema: RequestMagicLinkInputSchema,
            signal: call?.signal,
          },
          RequestMagicLinkResponseSchema,
        ),
      verifyMagicLink: (token: string, call?: CallOptions): Promise<VerifyMagicLinkResponse> =>
        request(
          http,
          {
            method: 'GET',
            path: `${prefix}/auth/magic-link/verify`,
            query: { token },
            signal: call?.signal,
          },
          VerifyMagicLinkResponseSchema,
        ),
      logout: async (call?: CallOptions): Promise<void> => {
        await request(
          http,
          { method: 'POST', path: `${prefix}/auth/logout`, signal: call?.signal },
          EmptyOrOkSchema,
        );
      },
    },

    me: {
      get: async (call?: CallOptions): Promise<User> => {
        const res = await request(
          http,
          { method: 'GET', path: `${prefix}/me`, signal: call?.signal },
          MeResponseSchema,
        );
        return res.user;
      },
    },

    workspaces: {
      list: async (call?: CallOptions): Promise<Workspace[]> => {
        const res = await request(
          http,
          { method: 'GET', path: `${prefix}/workspaces`, signal: call?.signal },
          ListWorkspacesResponseSchema,
        );
        return res.data;
      },
    },

    spaces: {
      list: (query: ListSpacesQuery = {}, call?: CallOptions): Promise<Paginated<Space>> =>
        request(
          http,
          {
            method: 'GET',
            path: `${prefix}/spaces`,
            query: ListSpacesQuerySchema.parse(query),
            signal: call?.signal,
          },
          SpaceListSchema,
        ),
      create: (input: CreateSpaceInput, call?: CallOptions): Promise<Space> =>
        request(
          http,
          {
            method: 'POST',
            path: `${prefix}/spaces`,
            body: input,
            bodySchema: CreateSpaceInputSchema,
            signal: call?.signal,
          },
          SpaceSchema,
        ),
      get: (id: string, call?: CallOptions): Promise<Space> =>
        request(
          http,
          {
            method: 'GET',
            path: `${prefix}/spaces/${encodeURIComponent(id)}`,
            signal: call?.signal,
          },
          SpaceSchema,
        ),
      update: (id: string, input: UpdateSpaceInput, call?: CallOptions): Promise<Space> =>
        request(
          http,
          {
            method: 'PATCH',
            path: `${prefix}/spaces/${encodeURIComponent(id)}`,
            body: input,
            bodySchema: UpdateSpaceInputSchema,
            signal: call?.signal,
          },
          SpaceSchema,
        ),
      delete: async (id: string, call?: CallOptions): Promise<void> => {
        await request(
          http,
          {
            method: 'DELETE',
            path: `${prefix}/spaces/${encodeURIComponent(id)}`,
            signal: call?.signal,
          },
          EmptyOrOkSchema,
        );
      },
    },

    tasks: {
      list: (query: ListTasksQuery = {}, call?: CallOptions): Promise<Paginated<Task>> =>
        request(
          http,
          {
            method: 'GET',
            path: `${prefix}/tasks`,
            query: ListTasksQuerySchema.parse(query),
            signal: call?.signal,
          },
          TaskListSchema,
        ),
      create: (input: CreateTaskInput, call?: CallOptions): Promise<Task> =>
        request(
          http,
          {
            method: 'POST',
            path: `${prefix}/tasks`,
            body: input,
            bodySchema: CreateTaskInputSchema,
            signal: call?.signal,
          },
          TaskSchema,
        ),
      get: (id: string, call?: CallOptions): Promise<Task> =>
        request(
          http,
          {
            method: 'GET',
            path: `${prefix}/tasks/${encodeURIComponent(id)}`,
            signal: call?.signal,
          },
          TaskSchema,
        ),
      update: (id: string, input: UpdateTaskInput, call?: CallOptions): Promise<Task> =>
        request(
          http,
          {
            method: 'PATCH',
            path: `${prefix}/tasks/${encodeURIComponent(id)}`,
            body: input,
            bodySchema: UpdateTaskInputSchema,
            signal: call?.signal,
          },
          TaskSchema,
        ),
      delete: async (id: string, call?: CallOptions): Promise<void> => {
        await request(
          http,
          {
            method: 'DELETE',
            path: `${prefix}/tasks/${encodeURIComponent(id)}`,
            signal: call?.signal,
          },
          EmptyOrOkSchema,
        );
      },
    },

    events: {
      list: (query: ListEventsQuery, call?: CallOptions): Promise<Paginated<Event>> =>
        request(
          http,
          {
            method: 'GET',
            path: `${prefix}/events`,
            query: ListEventsQuerySchema.parse(query),
            signal: call?.signal,
          },
          EventListSchema,
        ),
    },

    integrations: {
      list: async (call?: CallOptions): Promise<IntegrationAccount[]> => {
        const res = await request(
          http,
          { method: 'GET', path: `${prefix}/integrations`, signal: call?.signal },
          ListIntegrationsResponseSchema,
        );
        return res.data;
      },
      /** Returns the provider consent URL. Send the browser there to start the connection. */
      connectGoogle: (call?: CallOptions): Promise<ConnectIntegrationResponse> =>
        request(
          http,
          { method: 'POST', path: `${prefix}/integrations/google/connect`, signal: call?.signal },
          ConnectIntegrationResponseSchema,
        ),
      /** Queues a sync. Returns once accepted; progress shows up in `list()`. */
      sync: async (id: string, call?: CallOptions): Promise<void> => {
        await request(
          http,
          {
            method: 'POST',
            path: `${prefix}/integrations/${encodeURIComponent(id)}/sync`,
            signal: call?.signal,
          },
          EmptyOrOkSchema,
        );
      },
      disconnect: async (
        id: string,
        options: { data?: DisconnectData } = {},
        call?: CallOptions,
      ): Promise<void> => {
        await request(
          http,
          {
            method: 'DELETE',
            path: `${prefix}/integrations/${encodeURIComponent(id)}`,
            query: { data: options.data ?? 'keep' },
            signal: call?.signal,
          },
          EmptyOrOkSchema,
        );
      },
    },

    today: {
      get: (query: TodayQuery = {}, call?: CallOptions): Promise<TodayResponse> =>
        request(
          http,
          {
            method: 'GET',
            path: `${prefix}/today`,
            query: TodayQuerySchema.parse(query),
            signal: call?.signal,
          },
          TodayResponseSchema,
        ),
    },
  };
}

export type ScalarClient = ReturnType<typeof createScalarClient>;
