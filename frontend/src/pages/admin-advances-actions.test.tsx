import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AdvanceRequestStatus } from '@tingting/shared';
import { AdvanceGridRow } from './AdminAdvancesPage';

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

  const approveMutate = vi.fn();
  const approveMutation = {
    isPending: false,
    variables: undefined,
    mutate: approveMutate,
  } as never;

  const rejectMutate = vi.fn();
  const rejectMutation = {
    isPending: false,
    variables: undefined,
    mutate: rejectMutate,
  } as never;

  it('renders distinct accessible approve and reject controls', () => {
    render(
      <AdvanceGridRow
        req={request}
        approveMutation={approveMutation}
        rejectMutation={rejectMutation}
      />,
    );

    const approve = screen.getByRole('button', { name: 'Duyệt yêu cầu của Phan Kim Phụng' });
    const reject = screen.getByRole('button', { name: 'Từ chối yêu cầu của Phan Kim Phụng' });

    expect(approve.className).toContain('adv-decision-btn--approve');
    expect(reject.className).toContain('adv-decision-btn--reject');
    expect(approve.getAttribute('title')).toBe('Duyệt yêu cầu');
    expect(reject.getAttribute('title')).toBe('Từ chối yêu cầu');
    fireEvent.click(approve);
    fireEvent.click(reject);

    expect(approveMutate).toHaveBeenCalledWith(17);
    expect(rejectMutate).toHaveBeenCalledWith(17);
  });
});
