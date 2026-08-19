import { z } from 'zod';

import { API_VERSION } from './constants.js';
import type { FetchLike, HttpOptions } from './http.js';
import { request } from './http.js';
import {
  CreateProjectInputSchema,
  CreateSpaceInputSchema,
  CreateTaskInputSchema,
  AiStatusSchema,
  CommandActionResultSchema,
  CommandRequestSchema,
  CommandResponseSchema,
  CommandThreadDetailSchema,
  CommandActionSchema,
  CommandThreadListSchema,
  ConnectCanvasInputSchema,
  ConnectCanvasResponseSchema,
  ConnectIntegrationResponseSchema,
  EventListSchema,
  DiagnosticsSchema,
  HealthSchema,
  HomeQuerySchema,
  HomeSchema,
  InboxDecisionResultSchema,
  InboxListSchema,
  ListEventsQuerySchema,
  ListIntegrationsResponseSchema,
  ListCommandThreadsQuerySchema,
  ListFocusQuerySchema,
  ListInboxQuerySchema,
  ListProjectsQuerySchema,
  ListSpacesQuerySchema,
  ListTasksQuerySchema,
  ListWorkspacesResponseSchema,
  AcceptSuggestionInputSchema,
  ApplyPlanInputSchema,
  ApplyPlanResultSchema,
  CompleteFocusInputSchema,
  CompleteFocusResultSchema,
  CurrentFocusSchema,
  DismissSuggestionInputSchema,
  FocusSessionListSchema,
  FocusSessionSchema,
  MeResponseSchema,
  PlanPreviewSchema,
  StartFocusInputSchema,
  PreferencesSchema,
  PreviewPlanInputSchema,
  ProjectListSchema,
  ProjectSchema,
  RequestMagicLinkInputSchema,
  SearchQuerySchema,
  SearchResultsSchema,
  RequestMagicLinkResponseSchema,
  SpaceListSchema,
  SpaceSchema,
  TaskListSchema,
  TaskSchema,
  TimelineQuerySchema,
  TimelineRangeQuerySchema,
  TimelineRangeSchema,
  TimelineSchema,
  TodayQuerySchema,
  TodayResponseSchema,
  UpdatePreferencesInputSchema,
  UpdateProjectInputSchema,
  UpdateSpaceInputSchema,
  UpdateTaskInputSchema,
  VerifyMagicLinkResponseSchema,
} from './schemas/index.js';
import type {
  AiStatus,
  Diagnostics,
  CommandAction,
  CommandActionResult,
  CommandRequest,
  CommandResponse,
  CommandThread,
  CommandThreadDetail,
  ListCommandThreadsQuery,
  ConnectCanvasInput,
  ConnectIntegrationResponse,
  CreateProjectInput,
  CreateSpaceInput,
  CreateTaskInput,
  DisconnectData,
  Event,
  Health,
  Home,
  HomeQuery,
  InboxDecisionResult,
  InboxItem,
  IntegrationAccount,
  ListEventsQuery,
  ListFocusQuery,
  ListInboxQuery,
  ListProjectsQuery,
  ListSpacesQuery,
  ListTasksQuery,
  AcceptSuggestionInput,
  ApplyPlanInput,
  ApplyPlanResult,
  CompleteFocusInput,
  CompleteFocusResult,
  DismissSuggestionInput,
  FocusSession,
  Paginated,
  PlanPreview,
  Preferences,
  PreviewPlanInput,
  StartFocusInput,
  Project,
  RequestMagicLinkInput,
  RequestMagicLinkResponse,
  SearchQuery,
  SearchResults,
  Space,
  Task,
  Timeline,
  TimelineQuery,
  TimelineRange,
  TimelineRangeQuery,
  TodayQuery,
  TodayResponse,
  UpdatePreferencesInput,
  UpdateProjectInput,
  UpdateSpaceInput,
  UpdateTaskInput,
  User,
  VerifyMagicLinkResponse,
  Workspace,
} from './schemas/index.js';

export interface ScalarClientOptions {
  /** Origin of your Scalar API, for example `http://localhost:4000`. Scalar is self-hosted. */
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

/** The browser's zone where there is one, so answers use the reader's clock. */
function resolveTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

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

    /** How this installation is doing, component by component. Needs a session. */
    diagnostics: {
      get: (call?: CallOptions): Promise<Diagnostics> =>
        request(
          http,
          { method: 'GET', path: `${prefix}/diagnostics`, signal: call?.signal },
          DiagnosticsSchema,
        ),
    },

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

    projects: {
      list: (query: ListProjectsQuery = {}, call?: CallOptions): Promise<Paginated<Project>> =>
        request(
          http,
          {
            method: 'GET',
            path: `${prefix}/projects`,
            query: ListProjectsQuerySchema.parse(query),
            signal: call?.signal,
          },
          ProjectListSchema,
        ),
      create: (input: CreateProjectInput, call?: CallOptions): Promise<Project> =>
        request(
          http,
          {
            method: 'POST',
            path: `${prefix}/projects`,
            body: input,
            bodySchema: CreateProjectInputSchema,
            signal: call?.signal,
          },
          ProjectSchema,
        ),
      get: (id: string, call?: CallOptions): Promise<Project> =>
        request(
          http,
          {
            method: 'GET',
            path: `${prefix}/projects/${encodeURIComponent(id)}`,
            signal: call?.signal,
          },
          ProjectSchema,
        ),
      update: (id: string, input: UpdateProjectInput, call?: CallOptions): Promise<Project> =>
        request(
          http,
          {
            method: 'PATCH',
            path: `${prefix}/projects/${encodeURIComponent(id)}`,
            body: input,
            bodySchema: UpdateProjectInputSchema,
            signal: call?.signal,
          },
          ProjectSchema,
        ),
      delete: async (id: string, call?: CallOptions): Promise<void> => {
        await request(
          http,
          {
            method: 'DELETE',
            path: `${prefix}/projects/${encodeURIComponent(id)}`,
            signal: call?.signal,
          },
          EmptyOrOkSchema,
        );
      },
    },

    inbox: {
      /** Unfiled work with whatever is proposed about it, in one call. */
      list: (query: ListInboxQuery = {}, call?: CallOptions): Promise<Paginated<InboxItem>> =>
        request(
          http,
          {
            method: 'GET',
            path: `${prefix}/inbox`,
            query: ListInboxQuerySchema.parse(query),
            signal: call?.signal,
          },
          InboxListSchema,
        ),
      /** Applies the values (possibly edited) and files the item out of the inbox. */
      accept: (
        taskId: string,
        input: AcceptSuggestionInput,
        call?: CallOptions,
      ): Promise<InboxDecisionResult> =>
        request(
          http,
          {
            method: 'POST',
            path: `${prefix}/inbox/${encodeURIComponent(taskId)}/accept`,
            body: input,
            bodySchema: AcceptSuggestionInputSchema,
            signal: call?.signal,
          },
          InboxDecisionResultSchema,
        ),
      /** Turns down the proposal. The item stays in the inbox. */
      dismiss: (
        taskId: string,
        input: DismissSuggestionInput = {},
        call?: CallOptions,
      ): Promise<InboxDecisionResult> =>
        request(
          http,
          {
            method: 'POST',
            path: `${prefix}/inbox/${encodeURIComponent(taskId)}/dismiss`,
            body: input,
            bodySchema: DismissSuggestionInputSchema,
            signal: call?.signal,
          },
          InboxDecisionResultSchema,
        ),
    },

    focus: {
      /** The running session, or null. No session is a normal state rather than an error. */
      current: async (call?: CallOptions): Promise<FocusSession | null> => {
        const res = await request(
          http,
          { method: 'GET', path: `${prefix}/focus/current`, signal: call?.signal },
          CurrentFocusSchema,
        );
        return res.session;
      },
      start: (input: StartFocusInput, call?: CallOptions): Promise<FocusSession> =>
        request(
          http,
          {
            method: 'POST',
            path: `${prefix}/focus/start`,
            body: input,
            bodySchema: StartFocusInputSchema,
            signal: call?.signal,
          },
          FocusSessionSchema,
        ),
      complete: (
        id: string,
        input: CompleteFocusInput = {},
        call?: CallOptions,
      ): Promise<CompleteFocusResult> =>
        request(
          http,
          {
            method: 'POST',
            path: `${prefix}/focus/${encodeURIComponent(id)}/complete`,
            body: input,
            bodySchema: CompleteFocusInputSchema,
            signal: call?.signal,
          },
          CompleteFocusResultSchema,
        ),
      /** Ends a session without recording it as work done. */
      cancel: (id: string, call?: CallOptions): Promise<FocusSession> =>
        request(
          http,
          {
            method: 'POST',
            path: `${prefix}/focus/${encodeURIComponent(id)}/cancel`,
            signal: call?.signal,
          },
          FocusSessionSchema,
        ),
      sessions: (
        query: ListFocusQuery = {},
        call?: CallOptions,
      ): Promise<Paginated<FocusSession>> =>
        request(
          http,
          {
            method: 'GET',
            path: `${prefix}/focus/sessions`,
            query: ListFocusQuerySchema.parse(query),
            signal: call?.signal,
          },
          FocusSessionListSchema,
        ),
    },

    planner: {
      /** Works out a plan and returns it. Writes nothing. */
      preview: (input: PreviewPlanInput = {}, call?: CallOptions): Promise<PlanPreview> =>
        request(
          http,
          {
            method: 'POST',
            path: `${prefix}/planner/preview`,
            body: { tz: resolveTimeZone(), ...input },
            bodySchema: PreviewPlanInputSchema,
            signal: call?.signal,
          },
          PlanPreviewSchema,
        ),
      /**
       * Writes an approved plan, whole or not at all. Send back the blocks that were approved,
       * having dropped or adjusted any of them. Throws `PLAN_STALE` (409) when the day changed
       * underneath the preview.
       */
      apply: (input: ApplyPlanInput, call?: CallOptions): Promise<ApplyPlanResult> =>
        request(
          http,
          {
            method: 'POST',
            path: `${prefix}/planner/apply`,
            body: input,
            bodySchema: ApplyPlanInputSchema,
            signal: call?.signal,
          },
          ApplyPlanResultSchema,
        ),
    },

    preferences: {
      get: (call?: CallOptions): Promise<Preferences> =>
        request(
          http,
          { method: 'GET', path: `${prefix}/preferences`, signal: call?.signal },
          PreferencesSchema,
        ),
      update: (input: UpdatePreferencesInput, call?: CallOptions): Promise<Preferences> =>
        request(
          http,
          {
            method: 'PATCH',
            path: `${prefix}/preferences`,
            body: input,
            bodySchema: UpdatePreferencesInputSchema,
            signal: call?.signal,
          },
          PreferencesSchema,
        ),
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
      /**
       * Connects Canvas with a personal access token. The token is sent once and is never
       * returned by any endpoint afterwards.
       */
      connectCanvas: async (input: ConnectCanvasInput, call?: CallOptions): Promise<string> => {
        const res = await request(
          http,
          {
            method: 'POST',
            path: `${prefix}/integrations/canvas/connect`,
            body: input,
            bodySchema: ConnectCanvasInputSchema,
            signal: call?.signal,
          },
          ConnectCanvasResponseSchema,
        );
        return res.id;
      },

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

    /**
     * Scalar Command.
     *
     * `ask` returns an answer plus any proposed actions. A proposal has not happened: when
     * `stopReason` is `needs_approval`, show each action's `summary` and call `approve` or `reject`.
     * Nothing in the workspace changes until `approve` resolves with an action status of `executed`.
     *
     * These endpoints return 503 `AI_UNAVAILABLE` on a server with no model key configured.
     */
    command: {
      /** Never fails when nothing is configured: "no provider" is an answer, not an error. */
      status: (call?: CallOptions): Promise<AiStatus> =>
        request(
          http,
          { method: 'GET', path: `${prefix}/command/status`, signal: call?.signal },
          AiStatusSchema,
        ),
      ask: (input: CommandRequest, call?: CallOptions): Promise<CommandResponse> =>
        request(
          http,
          {
            method: 'POST',
            path: `${prefix}/command`,
            body: {
              ...input,
              timeZone: input.timeZone ?? resolveTimeZone(),
            },
            bodySchema: CommandRequestSchema,
            signal: call?.signal,
          },
          CommandResponseSchema,
        ),

      listThreads: (
        query: ListCommandThreadsQuery = {},
        call?: CallOptions,
      ): Promise<Paginated<CommandThread>> =>
        request(
          http,
          {
            method: 'GET',
            path: `${prefix}/command/threads`,
            query: ListCommandThreadsQuerySchema.parse(query),
            signal: call?.signal,
          },
          CommandThreadListSchema,
        ),

      getThread: (id: string, call?: CallOptions): Promise<CommandThreadDetail> =>
        request(
          http,
          {
            method: 'GET',
            path: `${prefix}/command/threads/${encodeURIComponent(id)}`,
            signal: call?.signal,
          },
          CommandThreadDetailSchema,
        ),

      /** Executes a proposed action. This is the only call that changes anything. */
      approve: (id: string, call?: CallOptions): Promise<CommandActionResult> =>
        request(
          http,
          {
            method: 'POST',
            path: `${prefix}/command/actions/${encodeURIComponent(id)}/approve`,
            signal: call?.signal,
          },
          CommandActionResultSchema,
        ),

      reject: (id: string, call?: CallOptions): Promise<CommandAction> =>
        request(
          http,
          {
            method: 'POST',
            path: `${prefix}/command/actions/${encodeURIComponent(id)}/reject`,
            signal: call?.signal,
          },
          CommandActionSchema,
        ),
    },

    /**
     * Search across tasks, events and spaces in one request.
     *
     * Substring matching, not ranked full text, so treat the order as recency rather than
     * relevance. `counts` describes what came back, which is capped per kind by `limit`.
     */
    search: {
      query: (input: SearchQuery, call?: CallOptions): Promise<SearchResults> =>
        request(
          http,
          {
            method: 'GET',
            path: `${prefix}/search`,
            query: SearchQuerySchema.parse(input),
            signal: call?.signal,
          },
          SearchResultsSchema,
        ),
    },

    home: {
      /**
       * Everything Home needs in one request: what to do next, and what needs a decision. Computed
       * deterministically on the server, so this is never a slow or surprising call.
       */
      get: (query: HomeQuery = {}, call?: CallOptions): Promise<Home> => {
        const parsed = HomeQuerySchema.parse(query);
        return request(
          http,
          {
            method: 'GET',
            path: `${prefix}/home`,
            query: { ...parsed, tz: parsed.tz ?? resolveTimeZone() },
            signal: call?.signal,
          },
          HomeSchema,
        );
      },
    },

    timeline: {
      /** A span of days in one request, for a week view. */
      range: (query: TimelineRangeQuery, call?: CallOptions): Promise<TimelineRange> => {
        const parsed = TimelineRangeQuerySchema.parse(query);
        return request(
          http,
          {
            method: 'GET',
            path: `${prefix}/timeline/range`,
            query: { ...parsed, tz: parsed.tz ?? resolveTimeZone() },
            signal: call?.signal,
          },
          TimelineRangeSchema,
        );
      },

      /**
       * The day as one sequence. `tz` defaults to the reader's own zone, because a timeline in
       * UTC is the wrong day for almost everybody.
       */
      get: (query: TimelineQuery = {}, call?: CallOptions): Promise<Timeline> => {
        const parsed = TimelineQuerySchema.parse(query);
        return request(
          http,
          {
            method: 'GET',
            path: `${prefix}/timeline`,
            query: { ...parsed, tz: parsed.tz ?? resolveTimeZone() },
            signal: call?.signal,
          },
          TimelineSchema,
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
