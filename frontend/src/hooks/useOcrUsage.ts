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

/** Financial roles — current-month usage snapshot for the dashboard widget.
 *  `enabled: false` skips the request entirely (e.g. DRIVER has no
 *  financial-read, so the dashboard gate decides whether to even ask). */
export function useOcrUsageStatus(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: qk.ocrUsage.status,
    queryFn: () => ocrUsageClient.getStatus(),
    staleTime: 30_000,
    enabled: options?.enabled ?? true,
  });
}
