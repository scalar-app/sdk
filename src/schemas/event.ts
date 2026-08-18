import { z } from 'zod';

import { IdSchema, IsoDateTimeSchema, PaginatedSchema, PaginationQuerySchema } from './common.js';

export const EventSchema = z.object({
  id: IdSchema,
  workspaceId: IdSchema,
  title: z.string(),
  description: z.string().nullable(),
  startsAt: IsoDateTimeSchema,
  endsAt: IsoDateTimeSchema,
  allDay: z.boolean(),
  location: z.string().nullable(),
  source: z.string(),
  sourceObjectId: z.string().nullable(),
  sourceUrl: z.string().nullable(),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
});
export type Event = z.infer<typeof EventSchema>;

export const ListEventsQuerySchema = PaginationQuerySchema.extend({
  from: IsoDateTimeSchema,
  to: IsoDateTimeSchema,
});
export type ListEventsQuery = z.infer<typeof ListEventsQuerySchema>;

export const EventListSchema = PaginatedSchema(EventSchema);
export type EventList = z.infer<typeof EventListSchema>;
