import { z } from 'zod';

import { IdSchema, IsoDateTimeSchema } from './common.js';

export const PLAN_REASONS = [
  'due_within_24_hours',
  'due_soon',
  'high_priority',
  'earliest_available',
  'fits_available_window',
  'preferred_focus_period',
  'before_deadline',
  'after_dependency',
] as const;
export const PlanReasonSchema = z.enum(PLAN_REASONS);
export type PlanReason = z.infer<typeof PlanReasonSchema>;

export const PLAN_CONFLICT_KINDS = [
  'overlapping_fixed_blocks',
  'insufficient_time_before_deadline',
  'outside_working_hours',
  'task_too_large_for_window',
  'dependency_incomplete',
] as const;
export const PlanConflictKindSchema = z.enum(PLAN_CONFLICT_KINDS);
export type PlanConflictKind = z.infer<typeof PlanConflictKindSchema>;

export const PLAN_WARNING_KINDS = [
  'placed_outside_preferred_window',
  'no_estimate_used_default',
  'deadline_in_the_past',
] as const;
export const PlanWarningKindSchema = z.enum(PLAN_WARNING_KINDS);
export type PlanWarningKind = z.infer<typeof PlanWarningKindSchema>;

export const ProposedBlockSchema = z.object({
  taskId: IdSchema,
  title: z.string(),
  startAt: IsoDateTimeSchema,
  endAt: IsoDateTimeSchema,
  minutes: z.number().int().positive(),
  /** Why the planner put it here. Machine readable so the UI can phrase it. */
  reasons: z.array(PlanReasonSchema),
});
export type ProposedBlock = z.infer<typeof ProposedBlockSchema>;

export const PlanPreviewSchema = z.object({
  rangeStart: IsoDateTimeSchema,
  rangeEnd: IsoDateTimeSchema,
  timeZone: z.string(),
  blocks: z.array(ProposedBlockSchema),
  unscheduled: z.array(
    z.object({
      taskId: IdSchema,
      title: z.string(),
      kind: PlanConflictKindSchema,
      detail: z.string(),
    }),
  ),
  conflicts: z.array(
    z.object({
      kind: PlanConflictKindSchema,
      taskId: IdSchema.optional(),
      blockIds: z.array(z.string()).optional(),
      detail: z.string(),
    }),
  ),
  warnings: z.array(
    z.object({
      kind: PlanWarningKindSchema,
      taskId: IdSchema.optional(),
      detail: z.string(),
    }),
  ),
});
export type PlanPreview = z.infer<typeof PlanPreviewSchema>;

/** The most tasks one plan may cover. Mirrors MAX_PLAN_TASKS in the API. */
export const MAX_PLAN_TASKS = 100;

export const PreviewPlanInputSchema = z.object({
  tz: z.string().min(1).max(64).optional(),
  rangeStart: IsoDateTimeSchema.optional(),
  rangeEnd: IsoDateTimeSchema.optional(),
  taskIds: z.array(IdSchema).min(1).max(MAX_PLAN_TASKS).optional(),
});
export type PreviewPlanInput = z.infer<typeof PreviewPlanInputSchema>;

/**
 * Apply sends the approved blocks back rather than asking the server to re-plan, so what is saved
 * is what was on screen. Drop a block to leave that task alone, or change its times to adjust it.
 */
export const ApplyPlanInputSchema = z.object({
  blocks: z
    .array(
      z.object({
        taskId: IdSchema,
        startAt: IsoDateTimeSchema,
        endAt: IsoDateTimeSchema,
      }),
    )
    .min(1)
    .max(MAX_PLAN_TASKS)
    .refine((blocks) => blocks.every((block) => new Date(block.endAt) > new Date(block.startAt)), {
      message: 'Each block must end after it starts.',
    })
    .refine((blocks) => new Set(blocks.map((block) => block.taskId)).size === blocks.length, {
      message: 'Each task may appear only once.',
    }),
});
export type ApplyPlanInput = z.infer<typeof ApplyPlanInputSchema>;

export const ApplyPlanResultSchema = z.object({
  applied: z.number().int().nonnegative(),
  taskIds: z.array(IdSchema),
});
export type ApplyPlanResult = z.infer<typeof ApplyPlanResultSchema>;
