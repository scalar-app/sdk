import { z } from 'zod';

import { IdSchema, IsoDateTimeSchema, PaginatedSchema, PaginationQuerySchema } from './common.js';

/**
 * How a turn ended.
 *
 * `needs_approval` is the one to branch on: the assistant proposed changes and nothing has happened
 * until somebody approves them.
 */
export const CommandStopReasonSchema = z.enum([
  'answered',
  'needs_approval',
  'refused',
  'max_steps',
  'max_tokens',
]);
export type CommandStopReason = z.infer<typeof CommandStopReasonSchema>;

/** `pending` until a person decides. Only `executed` means the change actually happened. */
export const CommandActionStatusSchema = z.enum([
  'pending',
  'approved',
  'rejected',
  'executed',
  'failed',
]);
export type CommandActionStatus = z.infer<typeof CommandActionStatusSchema>;

export const CommandActionSchema = z.object({
  id: IdSchema,
  tool: z.string(),
  classification: z.string(),
  /** Plain language sentence describing what approving this does. Show it on the approval card. */
  summary: z.string(),
  status: CommandActionStatusSchema,
  createdAt: IsoDateTimeSchema,
});
export type CommandAction = z.infer<typeof CommandActionSchema>;

export const CommandRequestSchema = z.object({
  message: z.string().trim().min(1).max(4000),
  /** Continues an existing thread. Omit to start a new one. */
  threadId: IdSchema.optional(),
  /** IANA zone. Defaults to the browser zone in `ask()`. */
  timeZone: z.string().min(1).max(64).optional(),
});
export type CommandRequest = z.infer<typeof CommandRequestSchema>;

export const CommandResponseSchema = z.object({
  threadId: IdSchema,
  messageId: IdSchema,
  answer: z.string(),
  actions: z.array(CommandActionSchema),
  stopReason: CommandStopReasonSchema,
  refusalCategory: z.string().nullable(),
  usage: z.object({
    inputTokens: z.number().int().nonnegative(),
    outputTokens: z.number().int().nonnegative(),
  }),
});
export type CommandResponse = z.infer<typeof CommandResponseSchema>;

export const CommandMessageSchema = z.object({
  id: IdSchema,
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  stopReason: z.string().nullable(),
  refusalCategory: z.string().nullable(),
  createdAt: IsoDateTimeSchema,
  actions: z.array(CommandActionSchema),
});
export type CommandMessage = z.infer<typeof CommandMessageSchema>;

export const CommandThreadSchema = z.object({
  id: IdSchema,
  title: z.string(),
  createdAt: IsoDateTimeSchema,
  lastMessageAt: IsoDateTimeSchema,
});
export type CommandThread = z.infer<typeof CommandThreadSchema>;

export const CommandThreadDetailSchema = CommandThreadSchema.extend({
  messages: z.array(CommandMessageSchema),
});
export type CommandThreadDetail = z.infer<typeof CommandThreadDetailSchema>;

export const CommandActionResultSchema = z.object({
  action: CommandActionSchema,
  /** Id of the task the approved action created or changed. */
  resultId: IdSchema.nullable(),
  error: z.string().nullable(),
});
export type CommandActionResult = z.infer<typeof CommandActionResultSchema>;

export const ListCommandThreadsQuerySchema = PaginationQuerySchema;
export type ListCommandThreadsQuery = z.infer<typeof ListCommandThreadsQuerySchema>;

export const CommandThreadListSchema = PaginatedSchema(CommandThreadSchema);

/**
 * Which model vendor this installation talks to, if any. Read only: the provider is server
 * configuration, and a self hoster sets it in their environment rather than in a web form.
 */
export const AiStatusSchema = z.object({
  configured: z.boolean(),
  provider: z.string().nullable(),
});
export type AiStatus = z.infer<typeof AiStatusSchema>;
