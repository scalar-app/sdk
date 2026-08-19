import { z } from 'zod';

import { IdSchema, IsoDateTimeSchema } from './common.js';

export const UP_NEXT_KINDS = ['focus', 'event', 'scheduled_task', 'task', 'nothing'] as const;
export const UpNextKindSchema = z.enum(UP_NEXT_KINDS);
export type UpNextKind = z.infer<typeof UpNextKindSchema>;

export const UP_NEXT_REASONS = [
  'focus_in_progress',
  'happening_now',
  'next_scheduled',
  'next_event',
  'most_urgent_unscheduled',
  'nothing_to_do',
] as const;
export const UpNextReasonSchema = z.enum(UP_NEXT_REASONS);
export type UpNextReason = z.infer<typeof UpNextReasonSchema>;

/** The answer to "what should I be doing right now", with the reason it is the answer. */
export const UpNextSchema = z.object({
  kind: UpNextKindSchema,
  itemId: z.string().nullable(),
  taskId: IdSchema.nullable(),
  title: z.string(),
  startAt: IsoDateTimeSchema.nullable(),
  endAt: IsoDateTimeSchema.nullable(),
  estimatedMinutes: z.number().int().nullable(),
  reason: UpNextReasonSchema,
});
export type UpNext = z.infer<typeof UpNextSchema>;

export const ATTENTION_KINDS = [
  'overdue',
  'due_soon',
  'not_enough_time',
  'schedule_conflict',
  'unscheduled_urgent',
  'integration_disconnected',
  'sync_failing',
] as const;
export const AttentionKindSchema = z.enum(ATTENTION_KINDS);
export type AttentionKind = z.infer<typeof AttentionKindSchema>;

/** `detail` carries the numbers behind the claim, so it can be shown rather than paraphrased. */
export const AttentionItemSchema = z.object({
  id: z.string(),
  kind: AttentionKindSchema,
  title: z.string(),
  detail: z.string(),
  taskId: IdSchema.nullable(),
});
export type AttentionItem = z.infer<typeof AttentionItemSchema>;

export const HomeQuerySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  tz: z.string().optional(),
});
export type HomeQuery = z.infer<typeof HomeQuerySchema>;

export const HomeSchema = z.object({
  date: z.string(),
  greeting: z.string(),
  timeZone: z.string(),
  upNext: UpNextSchema,
  attention: z.array(AttentionItemSchema),
  busyMinutes: z.number().int().nonnegative(),
});
export type Home = z.infer<typeof HomeSchema>;
