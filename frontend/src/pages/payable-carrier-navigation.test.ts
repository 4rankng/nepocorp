import { describe, expect, it } from 'vitest';
import { payableDetailHref } from './PayableListPage';
import { payableBillingDocumentEntityType } from './payable-billing-document';

describe('payableDetailHref', () => {
  it('keeps outsourced carriers out of the customer receivable workflow', () => {
    expect(payableDetailHref({
      kind: 'carrier',
      supplier: { id: 42 } as never,
    })).toBe('/payables/42?kind=carrier');
  });

  it('keeps vendors on their supplier statement', () => {
    expect(payableDetailHref({
      kind: 'vendor',
      supplier: { id: 5 } as never,
    })).toBe('/payables/5');
  });
});

describe('payableBillingDocumentEntityType', () => {
  it('uses the explicit carrier scope for outsourced transport statements', () => {
    expect(payableBillingDocumentEntityType(true)).toBe('CARRIER');
  });

  it('keeps ordinary supplier statements in the vendor scope', () => {
    expect(payableBillingDocumentEntityType(false)).toBe('VENDOR');
  });
});
