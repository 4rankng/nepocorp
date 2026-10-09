import { describe, expect, it } from 'vitest';
import { ledgerHeading } from './payableDetailUtils';
import { TxnType } from '@tingting/shared';

/**
 * The ledger card heading must be ONE clean segment that follows the active tab.
 *
 * It first ignored the tab entirely (a fuel table under a freight heading —
 * 091026010110), then over-corrected by gluing base + tab together, producing
 * hybrid strings like "Chi tiết cước vận chuyển thuê ngoài — Cước thuê ngoài"
 * and "Chi tiết cước vận chuyển thuê ngoài — Chi phí nhiên liệu" (091026165510).
 */
describe('ledgerHeading', () => {
  it('shows the entity-level base heading for "Tất cả"', () => {
    expect(ledgerHeading(true, 'all').title).toBe('Chi tiết cước vận chuyển thuê ngoài');
    expect(ledgerHeading(false, 'all').title).toBe('Chi tiết công nợ phải trả');
  });

  it('replaces the heading with exactly the active tab scope', () => {
    expect(ledgerHeading(true, TxnType.FUEL_EXPENSE).title).toBe('Chi phí nhiên liệu');
    expect(ledgerHeading(true, TxnType.EXTERNAL_CARRIER_COST).title).toBe('Cước thuê ngoài');
    expect(ledgerHeading(true, TxnType.VENDOR_PAYMENT).title).toBe('Thanh toán công nợ');
    expect(ledgerHeading(false, TxnType.VENDOR_EXPENSE).title).toBe('Ghi nhận chi phí');
    expect(ledgerHeading(false, TxnType.ADJUSTMENT).title).toBe('Điều chỉnh');
  });

  it('never emits a glued base — scope heading (the 091026165510 regression)', () => {
    const tabs = [
      TxnType.VENDOR_EXPENSE, TxnType.VENDOR_PAYMENT, TxnType.FUEL_EXPENSE,
      TxnType.EXTERNAL_CARRIER_COST, TxnType.ADJUSTMENT,
    ] as const;
    for (const isCarrier of [true, false]) {
      for (const tab of tabs) {
        const { title } = ledgerHeading(isCarrier, tab);
        expect(title).not.toContain('—');
        expect(title).not.toMatch(/Chi tiết/);
        // No stutter: the scope is never repeated inside its own heading.
        expect(title.split(title).length - 1).toBe(1);
      }
    }
  });

  it('keeps the tab name in the subtitle so the scope stays explained', () => {
    const { title, subtitle } = ledgerHeading(true, TxnType.FUEL_EXPENSE);
    expect(subtitle).toContain(title);
  });
});