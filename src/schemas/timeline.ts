import { z } from 'zod';

import { IdSchema, IsoDateTimeSchema } from './common.js';

export const TIMELINE_BLOCK_TYPES = ['event', 'task'] as const;
export const TimelineBlockTypeSchema = z.enum(TIMELINE_BLOCK_TYPES);
export type TimelineBlockType = z.infer<typeof TimelineBlockTypeSchema>;

export const TIMELINE_BLOCK_SOURCES = ['manual', 'integration', 'planner'] as const;
export const TimelineBlockSourceSchema = z.enum(TIMELINE_BLOCK_SOURCES);
export type TimelineBlockSource = z.infer<typeof TimelineBlockSourceSchema>;

/**
 * One thing in a day. Events and tasks stay separate resources; this is the shape they share once
 * the question is "what happens next".
 *
 * `locked` is the important field: a locked block is one Scalar plans around rather than moves.
 */
export const TimelineBlockSchema = z.object({
  id: z.string(),
  itemId: IdSchema,
  blockType: TimelineBlockTypeSchema,
  title: z.string(),
  startAt: IsoDateTimeSchema,
  endAt: IsoDateTimeSchema,
  allDay: z.boolean(),
  locked: z.boolean(),
  source: TimelineBlockSourceSchema,
  status: z.string().nullable(),
  priority: z.string().nullable(),
  spaceId: IdSchema.nullable(),
  projectId: IdSchema.nullable(),
  location: z.string().nullable(),
});
export type TimelineBlock = z.infer<typeof TimelineBlockSchema>;

export const TimelineQuerySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  tz: z.string().optional(),
});
export type TimelineQuery = z.infer<typeof TimelineQuerySchema>;

export const TimelineSchema = z.object({
  date: z.string(),
  timeZone: z.string(),
  blocks: z.array(TimelineBlockSchema),
  busyMinutes: z.number().int().nonnegative(),
  conflicts: z.array(z.object({ blockIds: z.tuple([z.string(), z.string()]) })),
});
export type Timeline = z.infer<typeof TimelineSchema>;

/** A span of days: what the calendar week view asks for. */
export const TimelineRangeQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  tz: z.string().optional(),
});
export type TimelineRangeQuery = z.infer<typeof TimelineRangeQuerySchema>;

export const TimelineDaySchema = z.object({
  date: z.string(),
  blocks: z.array(TimelineBlockSchema),
  busyMinutes: z.number().int().nonnegative(),
  conflicts: z.array(z.object({ blockIds: z.tuple([z.string(), z.string()]) })),
});
export type TimelineDay = z.infer<typeof TimelineDaySchema>;

export const TimelineRangeSchema = z.object({
  timeZone: z.string(),
  days: z.array(TimelineDaySchema),
});
export type TimelineRange = z.infer<typeof TimelineRangeSchema>;
