import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ExpenseEntryStatus } from '@tingting/shared';
import { OpsCompletionSummary } from './AdminAdvanceSettlementsPage';

describe('accounting Ops completion summary', () => {
  it('shows completed, pending, and zero-expense groups by trip', () => {
    render(
      <OpsCompletionSummary
        loading={false}
        failed={false}
        summary={{
          tripCount: 1,
          completedGroupCount: 1,
          totalGroupCount: 3,
          trips: [{
            tripId: 42,
            tripCode: 'TRP-202607-0042',
            departureDate: '2026-07-23',
            completedGroupCount: 1,
            totalGroupCount: 3,
            groups: [
              { tripContainerId: 10, containerNumber: 'MSKU-001', expenseCount: 2, status: ExpenseEntryStatus.COMPLETED },
              { tripContainerId: 11, containerNumber: 'MSKU-002', expenseCount: 1, status: ExpenseEntryStatus.IN_PROGRESS },
              { tripContainerId: 12, containerNumber: 'MSKU-003', expenseCount: 0, status: ExpenseEntryStatus.IN_PROGRESS },
            ],
          }],
        }}
      />,
    );

    expect(screen.getByText('1/3 nhóm đã kê xong')).toBeTruthy();
    expect(screen.getByText('MSKU-001 · Đã kê xong')).toBeTruthy();
    expect(screen.getByText('MSKU-002 · Đang kê')).toBeTruthy();
    expect(screen.getByText('MSKU-003 · Đang kê').getAttribute('title')).toBe('0 khoản chi');
  });
});
