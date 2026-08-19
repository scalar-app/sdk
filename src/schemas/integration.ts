import { z } from 'zod';
import { IdSchema, IsoDateTimeSchema } from './common.js';

export const INTEGRATION_PROVIDERS = ['google_calendar', 'canvas'] as const;
export const IntegrationProviderSchema = z.enum(INTEGRATION_PROVIDERS);
export type IntegrationProvider = z.infer<typeof IntegrationProviderSchema>;

export const INTEGRATION_STATUSES = ['active', 'reauthorization_required', 'disconnected'] as const;
export const IntegrationStatusSchema = z.enum(INTEGRATION_STATUSES);
export type IntegrationStatus = z.infer<typeof IntegrationStatusSchema>;

export const SYNC_STATUSES = ['idle', 'queued', 'running', 'error'] as const;
export const SyncStatusSchema = z.enum(SYNC_STATUSES);
export type SyncStatus = z.infer<typeof SyncStatusSchema>;

export const SyncResourceSchema = z.object({
  resourceId: z.string(),
  resourceName: z.string().nullable(),
  syncStatus: SyncStatusSchema,
  lastSuccessfulSyncAt: IsoDateTimeSchema.nullable(),
  lastAttemptAt: IsoDateTimeSchema.nullable(),
  lastError: z.string().nullable(),
  nextSyncAt: IsoDateTimeSchema.nullable(),
});
export type SyncResource = z.infer<typeof SyncResourceSchema>;

export const IntegrationAccountSchema = z.object({
  id: IdSchema,
  provider: IntegrationProviderSchema,
  displayName: z.string().nullable(),
  status: IntegrationStatusSchema,
  connectedAt: IsoDateTimeSchema,
  resources: z.array(SyncResourceSchema),
});
export type IntegrationAccount = z.infer<typeof IntegrationAccountSchema>;

export const ListIntegrationsResponseSchema = z.object({ data: z.array(IntegrationAccountSchema) });
export type ListIntegrationsResponse = z.infer<typeof ListIntegrationsResponseSchema>;

export const ConnectIntegrationResponseSchema = z.object({ url: z.url() });
export type ConnectIntegrationResponse = z.infer<typeof ConnectIntegrationResponseSchema>;

/** `keep` leaves imported items in place without a link to the account; `delete` removes them. */
export const DisconnectDataSchema = z.enum(['keep', 'delete']);
export type DisconnectData = z.infer<typeof DisconnectDataSchema>;

/**
 * Canvas connects with a personal access token the person generates in their own Canvas settings,
 * because Canvas OAuth needs a developer key only an institution's administrator can issue.
 *
 * The token is sent once and never returned by any endpoint afterwards.
 */
export const ConnectCanvasInputSchema = z.object({
  baseUrl: z.url(),
  accessToken: z.string().min(10).max(500),
});
export type ConnectCanvasInput = z.infer<typeof ConnectCanvasInputSchema>;

export const ConnectCanvasResponseSchema = z.object({ id: IdSchema });
export type ConnectCanvasResponse = z.infer<typeof ConnectCanvasResponseSchema>;
