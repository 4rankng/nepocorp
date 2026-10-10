// Regression (kanban 20260922_34): the settlement header carried no actions — the
// only way to reject was a button repeated on EVERY child row, pushed to the right
// edge, and there was no way to approve the batch at all. The header now owns
// "Duyệt cả phiếu" / "Từ chối cả phiếu" behind a confirmation step.

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { AdvanceSettlementStatus } from '@tingting/shared';
import { SettlementGridRow, type SettlementActions } from './AdminAdvanceSettlementsPage';

afterEach(cleanup);

const settlement = {
  id: 42,
  code: 'PT-2609-0002',
  status: AdvanceSettlementStatus.PENDING,
  totalExpenseAmount: '12000000',
  refundAmount: '3000000',
  reimbursementAmount: '10970000',
  linkedExpenses: [],
} as never;

function mount(
  actions: SettlementActions,
  canApproveReject = true,
  status = AdvanceSettlementStatus.PENDING,
  canDelete = false,
) {
  return render(
    <MemoryRouter>
      <SettlementGridRow
        s={{ ...(settlement as object), status } as never}
        actions={actions}
        canApproveReject={canApproveReject}
        canDelete={canDelete}
      />
    </MemoryRouter>,
  );
}

const stubActions = (): SettlementActions => ({ onApprove: vi.fn(), onReject: vi.fn(), onDelete: vi.fn() });

/**
 * Removing an un-approved phiếu is its own right (ADMIN/MANAGER/ACCOUNTANT — the
 * same band the DELETE route admits), not a by-product of the accountant-only
 * amount editor it used to be nested inside: a MANAGER could sign a phiếu off but
 * had no way to throw one away (kanban 101026154020). It also belongs to the
 * settlement header, once, exactly like the batch decisions.
 */
it('offers one delete action on a PENDING phiếu to the roles that may delete it', () => {
  mount(stubActions(), true, AdvanceSettlementStatus.PENDING, true);

  const deletes = screen.getAllByRole('button', { name: /Xóa phiếu PT-2609-0002/ });
  expect(deletes).toHaveLength(1);

  fireEvent.click(deletes[0]);
  expect(screen.getByText(/Xóa phiếu hoàn ứng PT-2609-0002\? Thao tác không thể hoàn tác\./)).toBeTruthy();
});

it('never offers removal once the phiếu has left PENDING', () => {
  mount(stubActions(), true, AdvanceSettlementStatus.APPROVED, true);

  expect(screen.queryByRole('button', { name: /Xóa phiếu PT-2609-0002/ })).toBeNull();
});

it('puts approve and reject on the settlement header, not on every child row', () => {
  mount(stubActions());

  expect(screen.getByRole('button', { name: /Duyệt cả phiếu PT-2609-0002/ })).toBeTruthy();
  expect(screen.getByRole('button', { name: /Từ chối cả phiếu PT-2609-0002/ })).toBeTruthy();
  // The old per-row reject button must be gone.
  expect(document.querySelector('.as-reject-action')).toBeNull();
});

it('confirms before approving and names the amount being signed off', () => {
  const actions = stubActions();
  mount(actions);

  fireEvent.click(screen.getByRole('button', { name: /Duyệt cả phiếu PT-2609-0002/ }));

  // Nothing is written until the accountant confirms.
  expect(actions.onApprove).not.toHaveBeenCalled();
  expect(screen.getByText(/Công ty hoàn thêm: 10\.970\.000 ₫/)).toBeTruthy();

  fireEvent.click(screen.getByRole('button', { name: 'Duyệt cả phiếu' }));
  expect(actions.onApprove).toHaveBeenCalledWith(42);
  expect(actions.onReject).not.toHaveBeenCalled();
});

it('cancelling the confirmation writes nothing', () => {
  const actions = stubActions();
  mount(actions);

  fireEvent.click(screen.getByRole('button', { name: /Từ chối cả phiếu PT-2609-0002/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Hủy' }));

  expect(actions.onReject).not.toHaveBeenCalled();
  expect(actions.onApprove).not.toHaveBeenCalled();
});

it('offers no batch actions on a settled batch or without the right role', () => {
  mount(stubActions(), true, AdvanceSettlementStatus.APPROVED);
  expect(screen.queryByRole('button', { name: /Duyệt cả phiếu/ })).toBeNull();
  cleanup();

  mount(stubActions(), false);
  expect(screen.queryByRole('button', { name: /Duyệt cả phiếu/ })).toBeNull();
  expect(screen.queryByRole('button', { name: /Từ chối cả phiếu/ })).toBeNull();
});
