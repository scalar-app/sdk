import { z } from 'zod';

import { IdSchema, IsoDateTimeSchema, PaginatedSchema, PaginationQuerySchema } from './common.js';

export const SpaceSchema = z.object({
  id: IdSchema,
  workspaceId: IdSchema,
  name: z.string(),
  description: z.string().nullable(),
  color: z.string().nullable(),
  archivedAt: IsoDateTimeSchema.nullable(),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
});
export type Space = z.infer<typeof SpaceSchema>;

export const CreateSpaceInputSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(4000).nullable().optional(),
  color: z.string().max(32).nullable().optional(),
});
export type CreateSpaceInput = z.infer<typeof CreateSpaceInputSchema>;

export const UpdateSpaceInputSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(4000).nullable().optional(),
  color: z.string().max(32).nullable().optional(),
  archivedAt: IsoDateTimeSchema.nullable().optional(),
});
export type UpdateSpaceInput = z.infer<typeof UpdateSpaceInputSchema>;

export const ListSpacesQuerySchema = PaginationQuerySchema;
export type ListSpacesQuery = z.infer<typeof ListSpacesQuerySchema>;

export const SpaceListSchema = PaginatedSchema(SpaceSchema);
export type SpaceList = z.infer<typeof SpaceListSchema>;
