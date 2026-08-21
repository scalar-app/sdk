import { z } from 'zod';

import { IsoDateTimeSchema } from './common.js';

export const AUTO_SCHEDULE_MODES = ['off', 'suggest', 'apply'] as const;
export const AutoScheduleModeSchema = z.enum(AUTO_SCHEDULE_MODES);
export type AutoScheduleMode = z.infer<typeof AutoScheduleModeSchema>;

/**
 * The planner's inputs. Minutes are counted from local midnight in `timeZone`, and weekdays are
 * ISO numbers where 1 is Monday.
 *
 * `updatedAt` is null for someone who has never changed anything, which is how a caller tells the
 * server's defaults apart from a deliberate choice that happens to match them.
 */
export const PreferencesSchema = z.object({
  timeZone: z.string(),
  weekStartsOn: z.number().int().min(1).max(7),
  workdayStartMinute: z.number().int().min(0).max(1439),
  workdayEndMinute: z.number().int().min(1).max(1440),
  workDays: z.array(z.number().int().min(1).max(7)),
  defaultFocusMinutes: z.number().int().positive(),
  minimumBufferMinutes: z.number().int().nonnegative(),
  autoSchedule: AutoScheduleModeSchema,
  durationLearningEnabled: z.boolean(),
  updatedAt: IsoDateTimeSchema.nullable(),
});
export type Preferences = z.infer<typeof PreferencesSchema>;

const TimeZoneSchema = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .refine((value) => {
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: value });
      return true;
    } catch {
      return false;
    }
  }, 'Must be a valid IANA time zone.');

/** ISO weekdays, 1 is Monday. Sorted and deduplicated so the sent value has one shape. */
const WorkDaysSchema = z
  .array(z.number().int().min(1).max(7))
  .min(1)
  .max(7)
  .transform((days) => [...new Set(days)].sort((a, b) => a - b));

export const UpdatePreferencesInputSchema = z
  .object({
    timeZone: TimeZoneSchema.optional(),
    weekStartsOn: z.number().int().min(1).max(7).optional(),
    workdayStartMinute: z.number().int().min(0).max(1439).optional(),
    workdayEndMinute: z.number().int().min(1).max(1440).optional(),
    workDays: WorkDaysSchema.optional(),
    defaultFocusMinutes: z.number().int().min(5).max(480).optional(),
    minimumBufferMinutes: z.number().int().min(0).max(120).optional(),
    autoSchedule: AutoScheduleModeSchema.optional(),
    durationLearningEnabled: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'At least one field is required.' });
export type UpdatePreferencesInput = z.infer<typeof UpdatePreferencesInputSchema>;
