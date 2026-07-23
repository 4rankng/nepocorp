import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import {
  AdvanceSettlementStatus,
  ExpenseEntryStatus,
  type AdvanceSettlementWithRefs,
} from '@tingting/shared';
import {
  SettlementGridRow,
  SettlementMobileCard,
} from './AdminAdvanceSettlementsPage';

describe('admin advance settlement ledger density', () => {
  const settlement = {
    id: 7,
    code: 'PT-2607-0004',
    forwarderName: 'Nguyễn Sĩ Quân',
    status: AdvanceSettlementStatus.PENDING,
    totalExpenseAmount: 49_952_400,
    refundAmount: 0,
    createdAt: '2026-07-21T00:00:00.000Z',
    linkedExpenses: [
      { tripId: 42, tripCode: 'TRP-202607-0042', containerNumber: 'MSKU-001' },
      { tripId: 42, tripCode: 'TRP-202607-0042', containerNumber: 'MSKU-002' },
    ],
    opsCompletion: {
      tripCount: 1,
      completedGroupCount: 1,
      totalGroupCount: 2,
      trips: [{
        tripId: 42,
        tripCode: 'TRP-202607-0042',
        departureDate: '2026-07-23',
        completedGroupCount: 1,
        totalGroupCount: 2,
        groups: [
          {
            tripContainerId: 10,
            containerNumber: 'MSKU-001',
            expenseCount: 1,
            status: ExpenseEntryStatus.COMPLETED,
          },
          {
            tripContainerId: 11,
            containerNumber: 'MSKU-002',
            expenseCount: 1,
            status: ExpenseEntryStatus.IN_PROGRESS,
          },
        ],
      }],
    },
  } as unknown as AdvanceSettlementWithRefs;

  const rejectMutation = {
    isPending: false,
    variables: undefined,
    mutate: vi.fn(),
  } as never;

  it.each([
    {
      layout: 'desktop row',
      component: (
        <SettlementGridRow
          s={settlement}
          rejectMutation={rejectMutation}
          canApproveReject
        />
      ),
    },
    {
      layout: 'constrained-width card',
      component: (
        <SettlementMobileCard
          s={settlement}
          rejectMutation={rejectMutation}
          canApproveReject
        />
      ),
    },
  ])('keeps the $layout aggregate-only', ({ layout, component }) => {
    render(
      <MemoryRouter>
        {component}
      </MemoryRouter>,
    );

    if (layout === 'constrained-width card') {
      expect(screen.getByText('Khoản chi').previousElementSibling?.textContent).toBe('2');
      expect(screen.getByText('Chuyến').previousElementSibling?.textContent).toBe('1');
      expect(screen.getByText('Container').previousElementSibling?.textContent).toBe('2');
    } else {
      expect(screen.getByText(/2 khoản chi/)).toBeTruthy();
      expect(screen.getByText(/1 chuyến · 2 container/)).toBeTruthy();
    }
    expect(screen.queryByText(/nhóm đã kê xong/i)).toBeNull();
    expect(screen.queryByText(/TRP-202607-0042/)).toBeNull();
    expect(screen.queryByText(/MSKU-001/)).toBeNull();
    expect(screen.queryByText(/MSKU-002/)).toBeNull();
  });
});
