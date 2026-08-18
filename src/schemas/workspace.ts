import { z } from 'zod';

import { IdSchema, IsoDateTimeSchema } from './common.js';

export const WorkspaceSchema = z.object({
  id: IdSchema,
  name: z.string(),
  ownerId: IdSchema,
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
});
export type Workspace = z.infer<typeof WorkspaceSchema>;

export const ListWorkspacesResponseSchema = z.object({
  data: z.array(WorkspaceSchema),
});
export type ListWorkspacesResponse = z.infer<typeof ListWorkspacesResponseSchema>;
