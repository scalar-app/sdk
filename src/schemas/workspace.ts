import { z } from 'zod';

import { IdSchema, IsoDateTimeSchema } from './common.js';

export const WorkspaceKindSchema = z.enum(['personal', 'team']);
export type WorkspaceKind = z.infer<typeof WorkspaceKindSchema>;

export const WorkspaceRoleSchema = z.enum(['owner', 'admin', 'member']);
export type WorkspaceRole = z.infer<typeof WorkspaceRoleSchema>;

export const WorkspaceSchema = z.object({
  id: IdSchema,
  name: z.string(),
  ownerId: IdSchema,
  kind: WorkspaceKindSchema,
  /** The calling user's role in this workspace. */
  role: WorkspaceRoleSchema,
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
});
export type Workspace = z.infer<typeof WorkspaceSchema>;

export const ListWorkspacesResponseSchema = z.object({
  data: z.array(WorkspaceSchema),
});
export type ListWorkspacesResponse = z.infer<typeof ListWorkspacesResponseSchema>;
