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
  getStatus: () => api.get<OcrUsageStatus>(OCR_USAGE_PATHS.status),
};
