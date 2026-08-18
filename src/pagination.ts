import type { Paginated } from './schemas/common.js';

export type PageFetcher<T> = (cursor: string | undefined) => Promise<Paginated<T>>;

/** Yields every item across pages, following `nextCursor` until it is null. */
export async function* paginate<T>(fetchPage: PageFetcher<T>): AsyncGenerator<T, void, undefined> {
  let cursor: string | undefined;
  for (;;) {
    const page = await fetchPage(cursor);
    for (const item of page.data) {
      yield item;
    }
    if (page.nextCursor === null) {
      return;
    }
    cursor = page.nextCursor;
  }
}

export interface CollectAllOptions {
  /** Stop after this many items. Unlimited by default. */
  max?: number;
}

/** Collects every item across pages into an array. */
export async function collectAll<T>(
  fetchPage: PageFetcher<T>,
  options: CollectAllOptions = {},
): Promise<T[]> {
  const max = options.max ?? Number.POSITIVE_INFINITY;
  const items: T[] = [];
  if (max <= 0) {
    return items;
  }
  for await (const item of paginate(fetchPage)) {
    items.push(item);
    if (items.length >= max) {
      break;
    }
  }
  return items;
}
