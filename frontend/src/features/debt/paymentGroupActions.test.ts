import { describe, expect, it } from 'vitest';
import { TxnType } from '@tingting/shared';
import type { LedgerEntry } from '@tingting/shared';
import { isReceiptedPaymentRow, paymentActionUrl, receiptGroupCredit } from './paymentGroupActions';

/** LedgerEntry factory — only the fields the helpers read. */
function paymentRow(overrides: Partial<LedgerEntry>): LedgerEntry {
  return {
    id: 1,
    timestamp: '2026-10-05T00:00:00.000Z',
    txnType: TxnType.PAYMENT_RECEIVED,
    txnId: null,
    receiptId: null,
    entityType: 'CUSTOMER',
    entityId: 7,
    credit: '0',
    debit: '0',
    balance: '0',
    note: null,
    createdAt: '2026-10-05T00:00:00.000Z',
    ...overrides,
  };
}

describe('paymentGroupActions (NEPO-52)', () => {
  it('routes receipted rows to the by-receipt endpoints, never /payments/:id', () => {
    const row = paymentRow({ id: -3, receiptId: '9399' });   // synthetic display id
    expect(isReceiptedPaymentRow(row)).toBe(true);
    expect(paymentActionUrl('edit', 7, row)).toBe('/payments/by-receipt/7/9399');
    expect(paymentActionUrl('delete', 7, row)).toBe('/payments/by-receipt/7/9399');
    // The synthetic (or any non-entry) id must never leak into the URL.
    expect(paymentActionUrl('edit', 7, row)).not.toContain('/payments/-3');
  });

  it('encodes receipt codes with URL-hostile characters', () => {
    const row = paymentRow({ id: -1, receiptId: 'PT 09/A' });
    expect(paymentActionUrl('delete', 12, row)).toBe(`/payments/by-receipt/12/${encodeURIComponent('PT 09/A')}`);
  });

  it('routes legacy no-receipt rows to the per-entry endpoints with their real id', () => {
    const row = paymentRow({ id: 42, receiptId: null });
    expect(isReceiptedPaymentRow(row)).toBe(false);
    expect(paymentActionUrl('edit', 7, row)).toBe('/payments/42');
  });

  it('sums the receipt total over the full book, not one slice', () => {
    const target = paymentRow({ id: -1, receiptId: '9399', credit: '1000000.00' });
    const fullBook = [
      target,
      paymentRow({ id: -2, receiptId: '9399', credit: '772400.00' }),
      paymentRow({ id: -3, receiptId: 'other', credit: '5000000.00' }),
      paymentRow({ id: 9, receiptId: null, txnType: TxnType.TRIP_REVENUE, credit: '0', debit: '1772400.00' }),
    ];
    expect(receiptGroupCredit(target, fullBook)).toBeCloseTo(1_772_400, 0);
  });

  it('falls back to the row credit when the book carries no matching rows', () => {
    const row = paymentRow({ id: -1, receiptId: 'solo', credit: '1772400.00' });
    expect(receiptGroupCredit(row, [])).toBe(1_772_400);
  });

  it('treats non-payment rows as per-entry regardless of a receipt-looking field', () => {
    const row = paymentRow({ id: 5, receiptId: 'X', txnType: TxnType.ADJUSTMENT });
    expect(isReceiptedPaymentRow(row)).toBe(false);
    expect(paymentActionUrl('delete', 7, row)).toBe('/payments/5');
  });

  it('refuses to route a synthetic-id payment row that lost its receiptId (NEPO-60)', () => {
    // reattributePaymentRows only emits id ≤ 0 for receipt-group rows — a
    // synthetic id without a biên lai is a corrupt shape, and the per-entry
    // endpoint would reject it with 'ID bản ghi thanh toán không hợp lệ'
    // (the accountant's NEPO-60 report). The router must throw before that
    // request can leave the page, so the error lands in the edit error /
    // delete toast instead of a doomed 400.
    const row = paymentRow({ id: -3, receiptId: null });
    expect(() => paymentActionUrl('edit', 7, row)).toThrow('thiếu mã biên lai');
    expect(() => paymentActionUrl('delete', 7, row)).toThrow('thiếu mã biên lai');
  });

  it('refuses to route when the customerId is not a usable id (NEPO-60)', () => {
    // The page derives the customerId from the route param; a non-numeric
    // param would previously build /payments/by-receipt/NaN/… and earn the
    // backend's guard 400. Throw at the router instead.
    const receipted = paymentRow({ id: -1, receiptId: '9399' });
    const legacy = paymentRow({ id: 42, receiptId: null });
    for (const bad of [Number.NaN, 0, -5]) {
      expect(() => paymentActionUrl('edit', bad, receipted)).toThrow('khách hàng');
      expect(() => paymentActionUrl('delete', bad, legacy)).toThrow('khách hàng');
    }
  });
});
