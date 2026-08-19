import { z } from 'zod';

import { IdSchema, IsoDateTimeSchema, PaginatedSchema, PaginationQuerySchema } from './common.js';

export const FOCUS_STATUSES = ['active', 'completed', 'cancelled'] as const;
export const FocusStatusSchema = z.enum(FOCUS_STATUSES);
export type FocusStatus = z.infer<typeof FocusStatusSchema>;

export const FocusSessionSchema = z.object({
  id: IdSchema,
  taskId: IdSchema,
  taskTitle: z.string(),
  status: FocusStatusSchema,
  plannedMinutes: z.number().int().nullable(),
  startedAt: IsoDateTimeSchema,
  endedAt: IsoDateTimeSchema.nullable(),
  actualMinutes: z.number().int().nullable(),
  notes: z.string().nullable(),
});
export type FocusSession = z.infer<typeof FocusSessionSchema>;

export const StartFocusInputSchema = z.object({
  taskId: IdSchema,
  plannedMinutes: z.number().int().min(1).max(480).optional(),
});
export type StartFocusInput = z.infer<typeof StartFocusInputSchema>;

export const CompleteFocusInputSchema = z.object({
  notes: z.string().max(20000).nullable().optional(),
  /** Whether the work itself is finished, not just this session. */
  completeTask: z.boolean().optional(),
});
export type CompleteFocusInput = z.infer<typeof CompleteFocusInputSchema>;

/**
 * `estimateUpdated` is true when Scalar filled in an estimate that was empty. It never overwrites
 * one a person set, and the flag is here so a changed estimate can be shown rather than discovered.
 */
export const CompleteFocusResultSchema = z.object({
  session: FocusSessionSchema,
  taskCompleted: z.boolean(),
  estimateUpdated: z.boolean(),
  typicalMinutes: z.number().int().nullable(),
});
export type CompleteFocusResult = z.infer<typeof CompleteFocusResultSchema>;

export const CurrentFocusSchema = z.object({ session: FocusSessionSchema.nullable() });
export type CurrentFocus = z.infer<typeof CurrentFocusSchema>;

export const ListFocusQuerySchema = PaginationQuerySchema.extend({
  taskId: IdSchema.optional(),
});
export type ListFocusQuery = z.infer<typeof ListFocusQuerySchema>;

export const FocusSessionListSchema = PaginatedSchema(FocusSessionSchema);
export type FocusSessionList = z.infer<typeof FocusSessionListSchema>;
