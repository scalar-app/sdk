import { z } from 'zod';

import { IdSchema, IsoDateTimeSchema, PaginationQuerySchema } from './common.js';
import { TaskPrioritySchema, TaskSchema } from './task.js';

/**
 * A proposed patch to an inbox item. Every field is optional: a suggestion is allowed to be
 * partial, because a Canvas assignment knows its due date and its course, and nothing about how
 * long it will take.
 */
export const SuggestionValuesSchema = z.object({
  spaceId: IdSchema.nullable().optional(),
  projectId: IdSchema.nullable().optional(),
  priority: TaskPrioritySchema.optional(),
  dueAt: IsoDateTimeSchema.nullable().optional(),
  estimatedMinutes: z.number().int().positive().nullable().optional(),
  scheduledStart: IsoDateTimeSchema.nullable().optional(),
  scheduledEnd: IsoDateTimeSchema.nullable().optional(),
});
export type SuggestionValues = z.infer<typeof SuggestionValuesSchema>;

export const SUGGESTION_ORIGINS = ['integration', 'planner', 'ai'] as const;
export const SuggestionOriginSchema = z.enum(SUGGESTION_ORIGINS);
export type SuggestionOrigin = z.infer<typeof SuggestionOriginSchema>;

export const SuggestionSchema = z.object({
  /** Null for a suggestion worked out on the spot rather than stored. */
  id: IdSchema.nullable(),
  origin: SuggestionOriginSchema,
  source: z.string(),
  reason: z.string().nullable(),
  values: SuggestionValuesSchema,
});
export type Suggestion = z.infer<typeof SuggestionSchema>;

export const InboxItemSchema = z.object({
  task: TaskSchema,
  suggestion: SuggestionSchema.nullable(),
});
export type InboxItem = z.infer<typeof InboxItemSchema>;

export const ListInboxQuerySchema = PaginationQuerySchema.extend({
  tz: z.string().optional(),
});
export type ListInboxQuery = z.infer<typeof ListInboxQuerySchema>;

export const InboxListSchema = z.object({
  data: z.array(InboxItemSchema),
  nextCursor: z.string().nullable(),
});
export type InboxList = z.infer<typeof InboxListSchema>;

/** Send back what is on screen, which may not be what was suggested. Editing is the point. */
export const AcceptSuggestionInputSchema = z.object({
  values: SuggestionValuesSchema,
  suggestionId: IdSchema.optional(),
});
export type AcceptSuggestionInput = z.infer<typeof AcceptSuggestionInputSchema>;

export const DismissSuggestionInputSchema = z.object({
  suggestionId: IdSchema.optional(),
});
export type DismissSuggestionInput = z.infer<typeof DismissSuggestionInputSchema>;

export const InboxDecisionResultSchema = z.object({ task: TaskSchema });
export type InboxDecisionResult = z.infer<typeof InboxDecisionResultSchema>;
