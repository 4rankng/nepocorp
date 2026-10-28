// TanStack Query hooks for the ADMIN AI OCR settings panel (NEPO-28).
//
// `useOcrAiSettings()` loads the singleton; `useSaveOcrAiSettings()` invalidates
// the cache on success so a freshly-saved model/key is reflected on re-render.
// Same useQuery + qk pattern as useLlmSettings.ts.
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ocrAiSettingsClient, type OcrAiTestOverrides } from '../api/ocrAiSettingsClient';
import { qk } from '../api/keys';
import type { OcrAiSettingsUpdate } from '@tingting/shared';

export function useOcrAiSettings() {
  return useQuery({
    queryKey: qk.ocrAiSettings.detail,
    queryFn: () => ocrAiSettingsClient.getSettings(),
    staleTime: 30_000,
  });
}

export function useSaveOcrAiSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: OcrAiSettingsUpdate) => ocrAiSettingsClient.saveSettings(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.ocrAiSettings.all });
    },
  });
}

/** ADMIN — one live probe against the configured model. The overrides let the
 *  admin test what they just typed without saving it first. */
export function useTestOcrAiConnection() {
  return useMutation({
    mutationFn: (overrides: OcrAiTestOverrides = {}) => ocrAiSettingsClient.testConnection(overrides),
  });
}
