import {
  OCR_USAGE_PATHS,
  type OcrUsageSettingsResponse,
  type OcrUsageSettingsUpdate,
  type OcrUsageStatus,
} from '@tingting/shared';
import { api } from '../lib/api';

export const ocrUsageClient = {
  getSettings: () => api.get<OcrUsageSettingsResponse>(OCR_USAGE_PATHS.adminBase),
  saveSettings: (data: OcrUsageSettingsUpdate) =>
    api.put<OcrUsageSettingsResponse>(OCR_USAGE_PATHS.adminBase, data),
  /**
   * Status for a calendar month. `month` is 'YYYY-MM'; omit it for the
   * current calendar month.
   */
  getStatus: (month?: string) =>
    api.get<OcrUsageStatus>(
      month ? `${OCR_USAGE_PATHS.status}?month=${encodeURIComponent(month)}` : OCR_USAGE_PATHS.status,
    ),
};
