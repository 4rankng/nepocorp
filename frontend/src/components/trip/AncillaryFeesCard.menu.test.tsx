import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TripExpense } from '@tingting/shared';
import { AncillaryFeesCard } from './AncillaryFeesCard';

// NEPO-72 — the reported bug: the ⋯ Thao tác menu (Sửa/Xóa) never rendered on
// fee rows because `canDecide=false` gated the whole action container. These
// tests pin the restored menu: Sửa/Xóa on every row (approved included),
// Duyệt/Từ chối still gated away, and the NEPO-69 freeze explanation for a fee
// already issued on a Báo nợ.

let expenseRows: TripExpense[] = [];
const confirmMock = vi.fn();

vi.mock('@tanstack/react-query', () => ({
  useQuery: () => ({ data: expenseRows, isLoading: false }),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

vi.mock('../../api/tripClient', () => ({
  tripClient: {
    listTripExpenses: vi.fn(),
    createTripExpense: vi.fn(),
    updateTripExpense: vi.fn(),
    deleteTripExpense: vi.fn(),
    approveTripExpense: vi.fn(),
    rejectTripExpense: vi.fn(),
  },
}));

vi.mock('../../hooks/useCatalogs', () => ({
  useCatalogs: () => ({
    data: { forwarderExpenseTypes: [{ code: 'CUSTOMS', defaultMarkup: true }] },
  }),
}));

vi.mock('../useConfirm', () => ({
  useConfirm: () => ({ confirm: confirmMock, dialog: null }),
}));

function fee(overrides: Partial<TripExpense> = {}): TripExpense {
  return {
    id: 1,
    tripId: 7,
    forwarderId: null,
    expenseType: 'CUSTOMS',
    buyAmount: '450000',
    sellAmount: '540000',
    settlementMethod: 'COMPANY_DIRECT',
    supplierId: null,
    invoiceNumber: null,
    invoiceDate: null,
    declarationNumber: 'TK-2026-001',
    containerNumber: null,
    tripContainerId: null,
    approvalStatus: 'APPROVED',
    note: null,
    createdAt: '2026-11-26T00:00:00Z',
    updatedAt: '2026-11-26T00:00:00Z',
    issuedDebitNoteNumber: null,
    ...overrides,
  };
}

beforeEach(() => {
  confirmMock.mockReset();
  confirmMock.mockResolvedValue(true);
});

describe('AncillaryFeesCard Thao tác menu (NEPO-72)', () => {
  it('offers Sửa/Xóa on an approved fee row and keeps Duyệt/Từ chối gated', () => {
    expenseRows = [fee()];
    render(<AncillaryFeesCard tripId={7} />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Thao tác' })[0]);
    expect(screen.getAllByRole('menuitem', { name: 'Sửa' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('menuitem', { name: 'Xóa' }).length).toBeGreaterThan(0);
    expect(screen.queryByRole('menuitem', { name: 'Duyệt' })).toBeNull();
    expect(screen.queryByRole('menuitem', { name: 'Từ chối' })).toBeNull();
  });

  it('a fee issued on a Báo nợ explains the freeze instead of opening the form', async () => {
    expenseRows = [fee({ id: 2, issuedDebitNoteNumber: 'DN26110009' })];
    render(<AncillaryFeesCard tripId={7} />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Thao tác' })[0]);
    fireEvent.click(screen.getAllByRole('menuitem', { name: 'Sửa' })[0]);
    const message = String(confirmMock.mock.calls[0]?.[0] ?? '');
    expect(message).toMatch(/đã phát hành Báo nợ/);
    expect(message).toContain('DN26110009');
    expect(screen.queryByText('Số tờ khai hải quan *')).toBeNull();
  });

  it('Sửa on an editable approved fee opens the prefilled customs form', () => {
    expenseRows = [fee()];
    render(<AncillaryFeesCard tripId={7} />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Thao tác' })[0]);
    fireEvent.click(screen.getAllByRole('menuitem', { name: 'Sửa' })[0]);
    expect(screen.getByText('Số tờ khai hải quan *')).toBeTruthy();
    expect(confirmMock).not.toHaveBeenCalled();
  });
});
