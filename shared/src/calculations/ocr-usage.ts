/**
 * OCR usage billing math (ticket NEPO-27) — pure, shared by the backend status
 * endpoint and the dashboard widget so both sides can never disagree on what
 * "over the allowance" means.
 *
 * All inputs are integers; VND has no decimals (project convention).
 */
import type { OcrUsageStatus } from '../schemas/ocr-usage';

export interface OcrUsageSettingsInput {
  monthlyAllowance: number;
  overagePricePerCall: number;
}

/**
 * Compose the dashboard snapshot from the live settings and this month's
 * counter. Remaining and overage are mutually exclusive by construction:
 * below the allowance everything left is `remaining`; from the first request
 * past it, every extra request is `overageCount` and costed at the configured
 * per-call price.
 */
export function computeOcrUsageStatus(
  settings: OcrUsageSettingsInput,
  used: number,
  period: string,
): OcrUsageStatus {
  const safeUsed = Math.max(0, Math.floor(used));
  const overageCount = Math.max(0, safeUsed - settings.monthlyAllowance);
  return {
    monthlyAllowance: settings.monthlyAllowance,
    overagePricePerCall: settings.overagePricePerCall,
    period,
    used: safeUsed,
    remaining: Math.max(0, settings.monthlyAllowance - safeUsed),
    overageCount,
    overageCost: overageCount * settings.overagePricePerCall,
  };
}

/**
 * Calendar-month key ('YYYY-MM') in the SERVER-LOCAL timezone. Mirrors
 * reporting-shared's localDateStr — toISOString() would drift to the previous
 * day/month for UTC+7 evenings after midnight UTC. The key IS the reset
 * mechanism: each month writes its own counter row, so no reset job exists.
 */
export function ocrUsagePeriodKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}
