/**
 * Shared pagination parser for route handlers.
 *
 * Eliminates the inconsistent `parseInt(req.query.page) || 1` pattern
 * scattered across route files — some clamped, some didn't, some used
 * different defaults. All routes now go through here for consistent
 * clamping and offset computation.
 */
import type { Request } from 'express';

export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

function parseQueryInteger(value: unknown, fallback: number): number {
  const parsed = typeof value === 'string' ? parseInt(value, 10) : NaN;
  return Number.isSafeInteger(parsed) && parsed !== 0 ? parsed : fallback;
}

export function parsePagination(
  req: Request,
  defaults?: { page?: number; limit?: number; maxLimit?: number; limitParam?: 'limit' | 'pageSize' },
): PaginationParams {
  const defaultPage = defaults?.page ?? 1;
  const defaultLimit = defaults?.limit ?? 50;
  const maxLimit = defaults?.maxLimit ?? 100;

  const limit = Math.max(1, Math.min(maxLimit, parseQueryInteger(req.query[defaults?.limitParam ?? 'limit'], defaultLimit)));
  // Keep the derived offset representable as an integer as well as the page.
  const maxPage = Math.floor(Number.MAX_SAFE_INTEGER / limit);
  const page = Math.min(maxPage, Math.max(1, parseQueryInteger(req.query.page, defaultPage)));

  return { page, limit, offset: (page - 1) * limit };
}
