import { z } from 'zod';

/**
 * What a self hoster needs to see when something is wrong.
 *
 * `not_configured` is not a failure: a Scalar with no AI and nothing connected is a working
 * Scalar, and a page that showed that as degraded would teach people to ignore the page.
 */
export const COMPONENT_STATUSES = ['ok', 'not_configured', 'error'] as const;
export const ComponentStatusSchema = z.enum(COMPONENT_STATUSES);
export type ComponentStatus = z.infer<typeof ComponentStatusSchema>;

export const ComponentReportSchema = z.object({
  status: ComponentStatusSchema,
  /** One sentence, aimed at whoever runs the server. */
  detail: z.string(),
});
export type ComponentReport = z.infer<typeof ComponentReportSchema>;

export const DiagnosticsSchema = z.object({
  version: z.string(),
  schemaVersion: z.number().int(),
  components: z.object({
    database: ComponentReportSchema,
    redis: ComponentReportSchema,
    worker: ComponentReportSchema,
    ai: ComponentReportSchema,
    email: ComponentReportSchema,
    integrations: ComponentReportSchema,
  }),
});
export type Diagnostics = z.infer<typeof DiagnosticsSchema>;
