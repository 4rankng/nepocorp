import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AdvanceRequestStatus } from '@tingting/shared';
import { AdvanceGridRow, type AdvanceActions } from './AdminAdvancesPage';

describe('admin advance decision actions', () => {
  const request = {
    id: 17,
    requesterName: 'Phan Kim Phụng',
    requesterId: 9,
    amount: 5_000_000,
    createdAt: '2026-07-31T00:00:00.000Z',
    status: AdvanceRequestStatus.PENDING,
    reason: 'Phí nâng hạ',
    approverName: null,
  };

  function makeActions(overrides: Partial<AdvanceActions> = {}): AdvanceActions {
    return {
      onApprove: vi.fn(),
      onReject: vi.fn(),
      onRestore: vi.fn(),
      ...overrides,
    };
  }

  it('renders distinct accessible approve and reject controls', () => {
    const actions = makeActions();
    render(<AdvanceGridRow req={request} actions={actions} />);

    const approve = screen.getByRole('button', { name: 'Duyệt yêu cầu của Phan Kim Phụng' });
    const reject = screen.getByRole('button', { name: 'Từ chối yêu cầu của Phan Kim Phụng' });

    expect(approve.className).toContain('adv-decision-btn--approve');
    expect(reject.className).toContain('adv-decision-btn--reject');
    expect(approve.getAttribute('title')).toBe('Duyệt yêu cầu');
    expect(reject.getAttribute('title')).toBe('Từ chối yêu cầu');

    // The row delegates to the callback instead of firing a mutation directly,
    // so the page can gate rejection behind a confirmation (101026013000).
    fireEvent.click(approve);
    fireEvent.click(reject);

    expect(actions.onApprove).toHaveBeenCalledWith(17);
    expect(actions.onReject).toHaveBeenCalledWith(17);
  });

  it('offers a Thu hồi undo on a rejected request', () => {
    const rejected = { ...request, status: AdvanceRequestStatus.REJECTED, approverName: 'Nguyễn Quản Lý' };
    const actions = makeActions();
    render(<AdvanceGridRow req={rejected} actions={actions} />);

    // A rejected request has no decision buttons left — only the undo.
    expect(screen.queryByRole('button', { name: /Từ chối yêu cầu/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Duyệt yêu cầu/ })).toBeNull();

    const restore = screen.getByRole('button', { name: 'Thu hồi yêu cầu của Phan Kim Phụng' });
    expect(restore.className).toContain('adv-decision-btn--restore');

    fireEvent.click(restore);
    expect(actions.onRestore).toHaveBeenCalledWith(17);
    expect(actions.onApprove).not.toHaveBeenCalled();
    expect(actions.onReject).not.toHaveBeenCalled();
  });

  it('does not offer the undo on an approved request', () => {
    const approved = { ...request, status: AdvanceRequestStatus.APPROVED, approverName: 'Nguyễn Quản Lý' };
    render(<AdvanceGridRow req={approved} actions={makeActions()} />);

    expect(screen.queryByRole('button', { name: /Thu hồi/ })).toBeNull();
  });
});
