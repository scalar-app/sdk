import { z } from 'zod';

import { EventSchema } from './event.js';
import { SpaceSchema } from './space.js';
import { TaskSchema } from './task.js';

export const SearchQuerySchema = z.object({
  /** At least two characters: a single letter matches most of a workspace and helps nobody. */
  q: z.string().trim().min(2).max(200),
  /** How many of each kind to return, not a total. Defaults to 10 on the server. */
  limit: z.number().int().min(1).max(50).optional(),
});
export type SearchQuery = z.infer<typeof SearchQuerySchema>;

export const SearchResultsSchema = z.object({
  query: z.string(),
  tasks: z.array(TaskSchema),
  events: z.array(EventSchema),
  spaces: z.array(SpaceSchema),
  counts: z.object({
    tasks: z.number().int().nonnegative(),
    events: z.number().int().nonnegative(),
    spaces: z.number().int().nonnegative(),
    total: z.number().int().nonnegative(),
  }),
});
export type SearchResults = z.infer<typeof SearchResultsSchema>;
