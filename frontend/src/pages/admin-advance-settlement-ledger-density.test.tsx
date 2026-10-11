import { fireEvent, render, screen } from '@testing-library/react';
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
} from './admin-advance-settlement-rows';

describe('admin advance settlement ledger density', () => {
  const settlement = {
    id: 7,
    code: 'PT-2607-0004',
    forwarderName: 'Nguyễn Sĩ Quân',
    status: AdvanceSettlementStatus.PENDING,
    totalExpenseAmount: 49_952_400,
    refundAmount: 1_000_000,
    createdAt: '2026-07-21T00:00:00.000Z',
    linkedExpenses: [
      {
        tripId: 42,
        tripCode: 'TRP-202607-0042',
        departureDate: '2026-07-23',
        customerName: 'Công ty Biển Bạc',
        routeName: 'Hải Phòng – Hà Nội',
        tripContainerCount: 2,
        containerNumber: 'MSKU-001',
        expenseType: 'LIFTING',
        expenseTypeName: 'Phí nâng container',
        buyAmount: '1200000',
      },
      {
        tripId: 42,
        tripCode: 'TRP-202607-0042',
        departureDate: '2026-07-23',
        customerName: 'Công ty Biển Bạc',
        routeName: 'Hải Phòng – Hà Nội',
        tripContainerCount: 2,
        containerNumber: 'MSKU-002',
        expenseType: 'CUSTOMS',
        expenseTypeName: 'Phí hải quan',
        buyAmount: '800000',
      },
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

  // Named action contract (kanban 20260922_34) — the row components no longer
  // take react-query mutation objects.
  const settlementActions = { onApprove: vi.fn(), onReject: vi.fn(), onDelete: vi.fn() };

  it.each([
    {
      layout: 'desktop row',
      component: (
        <SettlementGridRow
          s={settlement}
          actions={settlementActions}
          canApproveReject
          canDelete={false}
        />
      ),
    },
    {
      layout: 'constrained-width card',
      component: (
        <SettlementMobileCard
          s={settlement}
          actions={settlementActions}
          canApproveReject
          canDelete={false}
        />
      ),
    },
  ])('shows one row per phiếu with its fee totals and the trips behind a disclosure in the $layout', ({ layout, component }) => {
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
      // One row per phiếu: the row carries the settlement's own identity and
      // scope, not a trip's.
      expect(screen.getByText('PT-2607-0004')).toBeTruthy();
      expect(screen.getByText(/1 chuyến · 2 cont/)).toBeTruthy();
    }

    // Settlement-level fee totals stay visible without expanding anything, so
    // the fee list is still readable at a glance.
    expect(screen.getByText(/Phí nâng container/)).toBeTruthy();
    expect(screen.getByText(/Phí hải quan/)).toBeTruthy();

    // The trips themselves are disclosed: a 33-trip phiếu used to render 33
    // rows (desktop) or a multi-thousand-pixel card.
    expect(screen.queryByText(/TRP-202607-0042/)).toBeNull();
    expect(screen.queryByText(/Công ty Biển Bạc/)).toBeNull();
    expect(screen.queryByText(/MSKU-001/)).toBeNull();
    expect(screen.queryByText(/MSKU-002/)).toBeNull();

    // Expanding reveals the transport plan with its own detail.
    fireEvent.click(screen.getByRole('button', { name: /chuyến của phiếu/ }));
    expect(screen.getByText(/TRP-202607-0042/)).toBeTruthy();
    expect(screen.getByText(/Công ty Biển Bạc/)).toBeTruthy();
    expect(screen.getByText(/Hải Phòng – Hà Nội/)).toBeTruthy();
  });

  it('shows company reimbursement as the opposite cash direction from a forwarder refund', () => {
    const reimbursementSettlement = {
      ...settlement,
      refundAmount: 0,
      reimbursementAmount: 5_513_200,
    } as unknown as AdvanceSettlementWithRefs;

    render(
      <MemoryRouter>
        <SettlementMobileCard
          s={reimbursementSettlement}
          actions={settlementActions}
          canApproveReject
          canDelete={false}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('Công ty hoàn thêm')).toBeTruthy();
    expect(screen.queryByText('Ops tạm ứng')).toBeNull();
  });
});
