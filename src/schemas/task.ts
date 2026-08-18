import { z } from 'zod';

import { IdSchema, IsoDateTimeSchema, PaginatedSchema, PaginationQuerySchema } from './common.js';

export const TASK_STATUSES = [
  'inbox',
  'todo',
  'in_progress',
  'blocked',
  'done',
  'cancelled',
] as const;
export const TaskStatusSchema = z.enum(TASK_STATUSES);
export type TaskStatus = z.infer<typeof TaskStatusSchema>;

export const TASK_PRIORITIES = ['none', 'low', 'medium', 'high', 'urgent'] as const;
export const TaskPrioritySchema = z.enum(TASK_PRIORITIES);
export type TaskPriority = z.infer<typeof TaskPrioritySchema>;

export const TaskSchema = z.object({
  id: IdSchema,
  workspaceId: IdSchema,
  spaceId: IdSchema.nullable(),
  title: z.string(),
  description: z.string().nullable(),
  status: TaskStatusSchema,
  priority: TaskPrioritySchema,
  dueAt: IsoDateTimeSchema.nullable(),
  scheduledStart: IsoDateTimeSchema.nullable(),
  scheduledEnd: IsoDateTimeSchema.nullable(),
  estimatedMinutes: z.number().int().nonnegative().nullable(),
  sourceId: z.string().nullable(),
  parentTaskId: IdSchema.nullable(),
  createdBy: IdSchema,
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
  completedAt: IsoDateTimeSchema.nullable(),
});
export type Task = z.infer<typeof TaskSchema>;

export const CreateTaskInputSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(20000).nullable().optional(),
  spaceId: IdSchema.nullable().optional(),
  status: TaskStatusSchema.optional(),
  priority: TaskPrioritySchema.optional(),
  dueAt: IsoDateTimeSchema.nullable().optional(),
  scheduledStart: IsoDateTimeSchema.nullable().optional(),
  scheduledEnd: IsoDateTimeSchema.nullable().optional(),
  estimatedMinutes: z.number().int().nonnegative().nullable().optional(),
  parentTaskId: IdSchema.nullable().optional(),
});
export type CreateTaskInput = z.infer<typeof CreateTaskInputSchema>;

export const UpdateTaskInputSchema = CreateTaskInputSchema.partial();
export type UpdateTaskInput = z.infer<typeof UpdateTaskInputSchema>;

export const ListTasksQuerySchema = PaginationQuerySchema.extend({
  status: z.array(TaskStatusSchema).optional(),
  spaceId: IdSchema.optional(),
  dueBefore: IsoDateTimeSchema.optional(),
  dueAfter: IsoDateTimeSchema.optional(),
  q: z.string().optional(),
});
export type ListTasksQuery = z.infer<typeof ListTasksQuerySchema>;

export const TaskListSchema = PaginatedSchema(TaskSchema);
export type TaskList = z.infer<typeof TaskListSchema>;
