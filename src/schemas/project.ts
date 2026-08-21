import { z } from 'zod';

import { IdSchema, IsoDateTimeSchema, PaginatedSchema, PaginationQuerySchema } from './common.js';

export const PROJECT_STATUSES = ['active', 'paused', 'completed', 'archived'] as const;
export const ProjectStatusSchema = z.enum(PROJECT_STATUSES);
export type ProjectStatus = z.infer<typeof ProjectStatusSchema>;

export const ProjectSchema = z.object({
  id: IdSchema,
  workspaceId: IdSchema,
  spaceId: IdSchema.nullable(),
  name: z.string(),
  description: z.string().nullable(),
  status: ProjectStatusSchema,
  startAt: IsoDateTimeSchema.nullable(),
  dueAt: IsoDateTimeSchema.nullable(),
  /** `scalar` for one you made, or the provider that it mirrors, such as a Canvas course. */
  source: z.string(),
  sourceUrl: z.string().nullable(),
  createdBy: IdSchema,
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
});
export type Project = z.infer<typeof ProjectSchema>;

function datesAreOrdered(value: {
  startAt?: string | null | undefined;
  dueAt?: string | null | undefined;
}): boolean {
  if (!value.startAt || !value.dueAt) return true;
  return new Date(value.startAt) <= new Date(value.dueAt);
}

const DATE_ORDER_MESSAGE = 'dueAt must not be before startAt.';

const projectInputFields = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().max(20000).nullable().optional(),
  spaceId: IdSchema.nullable().optional(),
  status: ProjectStatusSchema.optional(),
  startAt: IsoDateTimeSchema.nullable().optional(),
  dueAt: IsoDateTimeSchema.nullable().optional(),
});

export const CreateProjectInputSchema = projectInputFields.refine(datesAreOrdered, {
  message: DATE_ORDER_MESSAGE,
  path: ['dueAt'],
});
export type CreateProjectInput = z.infer<typeof CreateProjectInputSchema>;

export const UpdateProjectInputSchema = projectInputFields
  .partial()
  .refine((value) => Object.keys(value).length > 0, { message: 'At least one field is required.' })
  .refine(datesAreOrdered, { message: DATE_ORDER_MESSAGE, path: ['dueAt'] });
export type UpdateProjectInput = z.infer<typeof UpdateProjectInputSchema>;

export const ListProjectsQuerySchema = PaginationQuerySchema.extend({
  status: z.array(ProjectStatusSchema).optional(),
  spaceId: IdSchema.optional(),
});
export type ListProjectsQuery = z.infer<typeof ListProjectsQuerySchema>;

export const ProjectListSchema = PaginatedSchema(ProjectSchema);
export type ProjectList = z.infer<typeof ProjectListSchema>;
