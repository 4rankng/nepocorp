import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PayableSummarySection } from './payableDetailSummary';

/**
 * The AP detail note had the same defect as the AR one: it followed the LARGEST
 * aging bucket, so AN KHÁNH (current 164,7 triệu vs 31–60: 143,8 triệu) read
 * "Toàn bộ công nợ đang trong hạn 30 ngày" while the payables list counted it
 * as overdue and its sibling NAM PHONG printed "Có công nợ quá hạn 31–60 ngày"
 * (kanban 101026203130).
 */

const base = {
  totalOutstanding: 308_490_000,
  agingTotal: 308_490_000,
  hasDebt: true,
  hasCredit: false,
  overpaymentAmount: 0,
  ledgerCount: 6,
};

describe('AP detail overdue note (kanban 101026203130)', () => {
  it('calls out the overdue range even when the current bucket is the largest', () => {
    // AN KHÁNH's live buckets, largest first.
    render(
      <PayableSummarySection
        {...base}
        effectiveAging={[164_700_004, 143_789_996, 0, 0]}
        activeAgingIdx={0}
        oldestOverdueIdx={1}
      />,
    );

    expect(screen.getByText(/Có công nợ quá hạn 31–60 ngày — cần ưu tiên thanh toán/)).toBeTruthy();
    expect(screen.queryByText('Toàn bộ công nợ đang trong hạn 30 ngày.')).toBeNull();
  });

  it('keeps the in-term wording when everything sits in the current bucket', () => {
    render(
      <PayableSummarySection
        {...base}
        totalOutstanding={30_000}
        agingTotal={30_000}
        effectiveAging={[30_000, 0, 0, 0]}
        activeAgingIdx={0}
        oldestOverdueIdx={0}
      />,
    );

    expect(screen.getByText('Toàn bộ công nợ đang trong hạn 30 ngày.')).toBeTruthy();
  });

  it('reports the oldest overdue range when several are open', () => {
    render(
      <PayableSummarySection
        {...base}
        effectiveAging={[0, 15_040_000, 4_266_000, 21_501_600]}
        activeAgingIdx={3}
        oldestOverdueIdx={3}
      />,
    );

    expect(screen.getByText(/Có công nợ quá hạn trên 90 ngày — cần ưu tiên thanh toán/)).toBeTruthy();
  });
});
