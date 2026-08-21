import { z } from 'zod';

import { EmailSchema, IdSchema, IsoDateTimeSchema } from './common.js';
import { WorkspaceSchema } from './workspace.js';

export const UserSchema = z.object({
  id: IdSchema,
  email: EmailSchema,
  name: z.string().nullable(),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
});
export type User = z.infer<typeof UserSchema>;

export const RequestMagicLinkInputSchema = z.object({
  email: EmailSchema,
});
export type RequestMagicLinkInput = z.infer<typeof RequestMagicLinkInputSchema>;

export const RequestMagicLinkResponseSchema = z.object({
  ok: z.literal(true),
  /** Only present when the API runs outside production; email delivery is not implemented yet. */
  devLink: z.string().optional(),
});
export type RequestMagicLinkResponse = z.infer<typeof RequestMagicLinkResponseSchema>;

export const VerifyMagicLinkResponseSchema = z.object({
  user: UserSchema,
  workspace: WorkspaceSchema,
});
export type VerifyMagicLinkResponse = z.infer<typeof VerifyMagicLinkResponseSchema>;

export const LogoutResponseSchema = z.object({
  ok: z.literal(true),
});
export type LogoutResponse = z.infer<typeof LogoutResponseSchema>;

export const MeResponseSchema = z.object({
  user: UserSchema,
  workspace: WorkspaceSchema,
});
export type MeResponse = z.infer<typeof MeResponseSchema>;
