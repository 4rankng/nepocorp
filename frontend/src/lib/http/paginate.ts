import { api } from '../api';
import { toQuery } from './query';
import type { PaginatedResponse } from '@tingting/shared';

/**
 * Auto-paginate a list endpoint. The backend caps page size at 100; this
 * walks pages with bounded concurrency (default 5) and concatenates items.
 * A failed page rejects the whole list so callers can retry instead of displaying
 * incomplete catalogs and incorrect totals.
 *
 * Returns a flat array of items; the `total` count is dropped because
 * callers usually display the full list anyway.
 */
export async function fetchAllPaginated<T>(
  endpoint: string,
  params?: Record<string, string | number | undefined>,
  concurrency = 5,
): Promise<T[]> {
  const pageSize = 100;
  const first = await api.get<PaginatedResponse<T>>(
    `${endpoint}${toQuery({ ...params, limit: pageSize, page: 1 })}`,
  );
  const total = first.total ?? 0;
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return first.items ?? [];

  const results: PaginatedResponse<T>[] = [first];
  const pageNums = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);
  for (let i = 0; i < pageNums.length; i += concurrency) {
    const batch = pageNums.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map((p) =>
        api.get<PaginatedResponse<T>>(
          `${endpoint}${toQuery({ ...params, limit: pageSize, page: p })}`,
        ),
      ),
    );
    results.push(...batchResults);
  }
  return results.flatMap((r) => r.items ?? []);
}
