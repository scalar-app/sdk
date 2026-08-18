import { z } from 'zod';

export const IsoDateTimeSchema = z.iso.datetime({ offset: true });
export const IdSchema = z.string().min(1);
export const EmailSchema = z.email();
/** Calendar date in YYYY-MM-DD form. */
export const CalendarDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');

export const PaginationQuerySchema = z.object({
  limit: z.number().int().min(1).max(200).optional(),
  cursor: z.string().min(1).optional(),
});
export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;

export function PaginatedSchema<T extends z.ZodType>(item: T) {
  return z.object({
    data: z.array(item),
    nextCursor: z.string().nullable(),
  });
}
export interface Paginated<T> {
  data: T[];
  nextCursor: string | null;
}

export const ApiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;

export const HealthSchema = z.object({ status: z.literal('ok') });
export type Health = z.infer<typeof HealthSchema>;
