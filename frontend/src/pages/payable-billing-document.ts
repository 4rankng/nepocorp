import type { BillingDocumentEntityType } from '@tingting/shared';

export function payableBillingDocumentEntityType(
  isCarrierPayable: boolean,
): BillingDocumentEntityType {
  return isCarrierPayable ? 'CARRIER' : 'VENDOR';
}
