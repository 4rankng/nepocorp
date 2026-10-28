import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { OcrUsageSettingsUpdate } from '@tingting/shared';
import { ocrUsageClient } from '../api/ocrUsageClient';
import { qk } from '../api/keys';

/** ADMIN — the configured OCR monthly allowance + overage price per call. */
export function useOcrUsageSettings() {
  return useQuery({
    queryKey: qk.ocrUsage.settings,
    queryFn: () => ocrUsageClient.getSettings(),
    staleTime: 30_000,
  });
}

/** ADMIN — save allowance + price. Invalidates the dashboard status too, so
 *  the widget re-costs the current month against the new values at once. */
export function useSaveOcrUsageSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: OcrUsageSettingsUpdate) => ocrUsageClient.saveSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.ocrUsage.all });
    },
  });
}

/** Financial roles — usage snapshot for a calendar month, for the dashboard
 *  widget. `enabled: false` skips the request entirely (e.g. DRIVER has no
 *  financial-read, so the dashboard gate decides whether to even ask).
 *  `month` is 'YYYY-MM'; omit it for the current calendar month. */
export function useOcrUsageStatus(options?: { enabled?: boolean; month?: string }) {
  return useQuery({
    // The month is part of the key — switching months must not show the
    // previous month's figures while the new ones are in flight.
    queryKey: qk.ocrUsage.statusForMonth(options?.month ?? 'current'),
    queryFn: () => ocrUsageClient.getStatus(options?.month),
    staleTime: 30_000,
    enabled: options?.enabled ?? true,
  });
}
