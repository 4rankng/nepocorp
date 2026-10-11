// Pure helpers + form constants for the ancillary-fees card. Split out of
// `ancillary-fees-card-utils.tsx` (now `ancillary-fees-totals.tsx`) so the
// component module exports only components (React Fast Refresh).

import { FORWARDER_EXPENSE_TYPE_DEFAULTS } from '@tingting/shared';
import type { AncillaryExpenseType } from '@tingting/shared';
import type { CatalogData } from '../../hooks/useCatalogs';

export const EXPENSE_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  Object.entries(FORWARDER_EXPENSE_TYPE_DEFAULTS).map(([k, v]) => [k, v.name])
);

export function feeTypeLabel(code: string): string {
  return EXPENSE_TYPE_LABELS[code] ?? code;
}

// Single source of truth for the markup formula. Changing the multiplier
// (e.g. to 1.18) or per-type override only requires editing this one helper —
// previously the same `Math.round(buy * 1.2)` lived in 3 places including
// the prefill-detection check, which silently produced wrong auto-suggestions
// when the formula drifted out of sync.
export const MARKUP_MULTIPLIER = 1.2;
export function suggestedSellFor(buyNum: number, hasMarkup: boolean): string {
  if (!hasMarkup) return String(buyNum);
  if (!buyNum) return '';
  return String(Math.round(buyNum * MARKUP_MULTIPLIER));
}

export function resolveMarkupConfig(
  catalogTypes: CatalogData['forwarderExpenseTypes'] | undefined,
  code: string,
): boolean {
  const fromCatalog = catalogTypes?.find(t => t.code === code)?.defaultMarkup;
  return fromCatalog ?? (FORWARDER_EXPENSE_TYPE_DEFAULTS[code]?.defaultMarkup ?? false);
}

export const EMPTY_FORM = {
  expenseType: 'LIFTING' as AncillaryExpenseType,
  buyAmount: '',
  sellAmount: '',
  settlementMethod: 'FORWARDER_ADVANCE' as 'COMPANY_DIRECT' | 'FORWARDER_ADVANCE',
  supplierId: '',
  forwarderId: '',
  containerNumber: '',
  invoiceNumber: '',
  invoiceDate: '',
  declarationNumber: '',
  note: '',
};
