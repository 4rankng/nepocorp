import {
  OCR_AI_SETTINGS_PATHS,
  type OcrAiSettingsResponse,
  type OcrAiSettingsUpdate,
  type OcrAiTestResponse,
} from '@tingting/shared';
import { api } from '../lib/api';

/** Unsaved values the admin typed — probed without saving them first. */
export interface OcrAiTestOverrides {
  model?: string;
  apiKey?: string;
}

/** ADMIN — the AI model that reads container/seal photos + its API key. */
export const ocrAiSettingsClient = {
  getSettings: () => api.get<OcrAiSettingsResponse>(OCR_AI_SETTINGS_PATHS.adminBase),
  saveSettings: (data: OcrAiSettingsUpdate) =>
    api.put<OcrAiSettingsResponse>(OCR_AI_SETTINGS_PATHS.adminBase, data),
  /** One live call against the configured model — reports what actually failed. */
  testConnection: (overrides: OcrAiTestOverrides = {}) =>
    api.post<OcrAiTestResponse>(OCR_AI_SETTINGS_PATHS.test, overrides),
};
