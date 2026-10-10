import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { ToastProvider } from '../components/shared/Toast';
import AdminAdvancesPage from './AdminAdvancesPage';

const mocks = vi.hoisted(() => ({
  approve: vi.fn(),
  reject: vi.fn(),
  restore: vi.fn(),
  // The 20.000.000 ₫ 'Tạm ứng nâng hạ' request that QA rejected by accident.
  request: {
    id: 60,
    requesterName: 'Nguyễn Sĩ Quân',
    requesterId: 12,
    amount: 20_000_000,
    createdAt: '2026-10-07T00:00:00.000Z',
    status: 'PENDING',
    reason: 'Tạm ứng nâng hạ',
    approverName: null,
  },
}));

vi.mock('../hooks/useQueries', () => ({
  useAdminAdvanceRequests: () => ({ data: { items: [mocks.request] }, isLoading: false, error: null, refetch: vi.fn() }),
  useAdminAdvanceBalances: () => ({ data: { items: [], totalOutstanding: '0' } }),
  useApproveAdvanceRequest: () => ({ isPending: false, variables: undefined, mutate: mocks.approve }),
  useRejectAdvanceRequest: () => ({ isPending: false, variables: undefined, mutate: mocks.reject }),
  useRestoreAdvanceRequest: () => ({ isPending: false, variables: undefined, mutate: mocks.restore }),
}));
vi.mock('../hooks/useFocusDeepLink', () => ({ useFocusDeepLink: () => undefined }));
vi.mock('../hooks/useMonth', () => ({ useMonth: () => ({ month: 10, year: 2026, setMonthYear: vi.fn() }) }));
vi.mock('../hooks/animations', () => ({ usePageAnimations: () => ({ rootRef: { current: null } }) }));

function mount() {
  return render(
    <MemoryRouter initialEntries={['/advances']}>
      <ToastProvider>
        <AdminAdvancesPage />
      </ToastProvider>
    </MemoryRouter>,
  );
}

const rejectTrigger = () => screen.getByRole('button', { name: 'Từ chối yêu cầu của Nguyễn Sĩ Quân' });

describe('admin advances reject confirmation (kanban 101026013000)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('asks before rejecting, naming the requester and the amount', async () => {
    mount();
    fireEvent.click(rejectTrigger());

    const dialog = await screen.findByRole('alertdialog');
    expect(dialog.textContent).toContain('Nguyễn Sĩ Quân');
    expect(dialog.textContent).toContain('20.000.000 ₫');
    // Nothing happens until the manager confirms.
    expect(mocks.reject).not.toHaveBeenCalled();
  });

  it('cancelling leaves the request pending — no mutation fires', async () => {
    mount();
    fireEvent.click(rejectTrigger());
    const dialog = await screen.findByRole('alertdialog');

    fireEvent.click(within(dialog).getByRole('button', { name: 'Huỷ' }));
    expect(mocks.reject).not.toHaveBeenCalled();
  });

  it('confirming rejects the request', async () => {
    mount();
    fireEvent.click(rejectTrigger());
    const dialog = await screen.findByRole('alertdialog');

    fireEvent.click(within(dialog).getByRole('button', { name: 'Từ chối' }));
    await waitFor(() =>
      expect(mocks.reject).toHaveBeenCalledWith(60, expect.objectContaining({ onSuccess: expect.any(Function) })),
    );
  });
});
