import { z } from 'zod';

import { CalendarDateSchema } from './common.js';
import { EventSchema } from './event.js';
import { TaskSchema } from './task.js';

export const TodayQuerySchema = z.object({
  date: CalendarDateSchema.optional(),
  tz: z.string().min(1).optional(),
});
export type TodayQuery = z.infer<typeof TodayQuerySchema>;

export const TodayResponseSchema = z.object({
  date: CalendarDateSchema,
  greeting: z.string(),
  attentionCount: z.number().int().nonnegative(),
  urgent: z.array(TaskSchema),
  upcoming: z.array(EventSchema),
  dueToday: z.array(TaskSchema),
  overdue: z.array(TaskSchema),
});
export type TodayResponse = z.infer<typeof TodayResponseSchema>;
