/**
 * TanStack Query hook for the ADMIN AI OCR request log (NEPO-34).
 *
 * One query per filtered page — the filter values are part of the cache key
 * (see qk.ocrRequests.list), so switching a filter or the page never serves
 * another view's rows. The response is the whole screen payload: rows + total
 * + the 30-day stats + the per-status pill counts + the model options.
 */
import { useQuery } from '@tanstack/react-query';
import type { OcrRequestFilters, OcrRequestListResponse } from '@tingting/shared';
import { api } from '../lib/api';
import { qk } from '../api/keys';

/** Rows per page — the screen's pagination contract (20/trang). */
export const OCR_REQUESTS_PAGE_SIZE = 20;

export function useOcrRequests(filters: OcrRequestFilters, page: number) {
  return useQuery<OcrRequestListResponse>({
    queryKey: qk.ocrRequests.list(filters, page),
    queryFn: () => {
      const params = new URLSearchParams({
        limit: String(OCR_REQUESTS_PAGE_SIZE),
        offset: String((page - 1) * OCR_REQUESTS_PAGE_SIZE),
      });
      if (filters.status) params.set('status', filters.status);
      if (filters.model) params.set('model', filters.model);
      if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.set('dateTo', filters.dateTo);
      return api.get<OcrRequestListResponse>(`/admin/ocr-requests?${params}`);
    },
    // A log viewer tolerates a half-minute of staleness; the OCR route writes
    // rows continuously and the screen is not an operations dashboard.
    staleTime: 30_000,
  });
}
