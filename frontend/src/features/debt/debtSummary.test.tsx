import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import type { CustomerStatement } from '@tingting/shared';
import { DebtAgingSummary } from './debtSummary';
import { DebtDetailHeader } from './debtHeader';

/**
 * The AR detail surface used to take the LARGEST aging bucket as its status, so
 * a customer with 1,3 tỷ current plus 674 triệu overdue read "Toàn bộ công nợ
 * đang trong hạn 30 ngày" here while the list marked it "Nợ quá hạn"
 * (kanban 101026203130). Both now read the oldest non-empty bucket.
 */

const customer = {
  id: 1,
  name: 'CÔNG TY CỔ PHẦN NITODA',
  contactInfo: '0900000000',
  isCarrier: false,
} as unknown as CustomerStatement['customer'];

// Live NITODA buckets: the CURRENT bucket is the largest, and 674 triệu sits in 31–60.
const nitodaAging = [1_309_764_425, 674_492_444, 0, 0];

describe('AR detail overdue status (kanban 101026203130)', () => {
  it('calls out the overdue range even when the current bucket is the largest', () => {
    render(
      <DebtAgingSummary
        hasDebt
        activeAgingIdx={0}
        oldestOverdueIdx={1}
        agingAmounts={nitodaAging}
        ledgerRowCount={4}
      />,
    );

    expect(screen.getByText(/Có công nợ quá hạn 31–60 ngày — cần ưu tiên thu hồi/)).toBeTruthy();
    expect(screen.queryByText(/Toàn bộ công nợ đang trong hạn 30 ngày/)).toBeNull();
  });

  it('keeps the in-term wording when nothing sits past the current bucket', () => {
    render(
      <DebtAgingSummary
        hasDebt
        activeAgingIdx={0}
        oldestOverdueIdx={0}
        agingAmounts={[5_000_000, 0, 0, 0]}
        ledgerRowCount={1}
      />,
    );

    expect(screen.getByText(/Toàn bộ công nợ đang trong hạn 30 ngày — cần theo dõi thu hồi/)).toBeTruthy();
  });

  it('names the badge like the list row does', () => {
    const { unmount } = render(
      <MemoryRouter>
        <DebtDetailHeader customer={customer} hasDebt isOverdue onBack={() => {}} onRecordPayment={() => {}} onExport={() => {}} />
      </MemoryRouter>,
    );
    expect(screen.getByText('Nợ quá hạn')).toBeTruthy();
    expect(screen.queryByText('Còn nợ trong hạn')).toBeNull();
    unmount();

    render(
      <MemoryRouter>
        <DebtDetailHeader customer={customer} hasDebt isOverdue={false} onBack={() => {}} onRecordPayment={() => {}} onExport={() => {}} />
      </MemoryRouter>,
    );
    expect(screen.getByText('Còn nợ trong hạn')).toBeTruthy();
  });

  it('shows the settled badge when there is no debt at all', () => {
    render(
      <MemoryRouter>
        <DebtDetailHeader customer={customer} hasDebt={false} isOverdue={false} onBack={() => {}} onRecordPayment={() => {}} onExport={() => {}} />
      </MemoryRouter>,
    );
    expect(screen.getByText('Đã thanh toán đủ')).toBeTruthy();
  });
});
