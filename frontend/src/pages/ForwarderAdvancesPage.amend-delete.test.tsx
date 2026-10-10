import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { ToastProvider } from '../components/shared/Toast';
import ForwarderAdvancesPage from './ForwarderAdvancesPage';

/**
 * Forwarder self-service on an advance request.
 *
 * The buttons are gated on status because the service is: an APPROVED request
 * has already been credited to the ledger at its original amount, so both
 * controls must stay off that row rather than failing on click.
 */

const mocks = vi.hoisted(() => ({
  requests: vi.fn(),
  balance: vi.fn(),
  settlements: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}));

vi.mock('../hooks/useQueries', () => ({
  useForwarderAdvanceRequests: mocks.requests,
  useCreateAdvanceRequest: mocks.create,
  useUpdateAdvanceRequest: mocks.update,
  useDeleteAdvanceRequest: mocks.remove,
  useForwarderAdvanceBalance: mocks.balance,
  useForwarderSettlements: mocks.settlements,
}));
vi.mock('../hooks/useMonth', () => ({ useMonth: () => ({ month: 9, year: 2026 }) }));
vi.mock('../hooks/animations', () => ({
  usePageAnimations: () => ({ rootRef: { current: null } }),
  useListAnimations: () => ({ rootRef: { current: null } }),
  useCounterAnimation: () => ({ animateCounters: () => {} }),
}));
vi.mock('../hooks/usePrefersReducedMotion', () => ({ usePrefersReducedMotion: () => true }));

const pending = {
  id: 11,
  requesterName: 'Nguyễn Văn A',
  requesterId: 2,
  amount: '20000000',
  createdAt: '2026-09-10T00:00:00.000Z',
  status: 'PENDING',
  reason: 'Tạm ứng nâng hạ',
  approverName: null,
  approvedAt: null,
};
const approved = {
  ...pending,
  id: 12,
  status: 'APPROVED',
  approverName: 'Quản lý',
  approvedAt: '2026-09-11T00:00:00.000Z',
};

const success = (data: unknown) => ({ data, isLoading: false, error: null, refetch: vi.fn() });

function renderPage() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <ForwarderAdvancesPage />
      </ToastProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requests.mockReturnValue(success({ items: [pending, approved], counts: { PENDING: 1, APPROVED: 1 } }));
  mocks.balance.mockReturnValue(success({ outstanding: '20000000' }));
  mocks.settlements.mockReturnValue(success({ items: [] }));
  mocks.create.mockReturnValue({ error: null, isPending: false, mutate: vi.fn() });
  mocks.update.mockReturnValue({ error: null, isPending: false, mutate: vi.fn() });
  mocks.remove.mockReturnValue({ isPending: false, mutate: vi.fn() });
});
afterEach(cleanup);

it('offers edit and delete on a pending request', () => {
  renderPage();

  expect(screen.getByRole('button', { name: 'Điều chỉnh yêu cầu tạm ứng 20.000.000 ₫' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Xóa yêu cầu tạm ứng 20.000.000 ₫' })).toBeTruthy();
});

it('hides edit and delete on an approved request', () => {
  renderPage();

  // Only the pending row is actionable, so exactly one pair of controls exists.
  expect(screen.getAllByRole('button', { name: /Điều chỉnh yêu cầu tạm ứng/ })).toHaveLength(1);
  expect(screen.getAllByRole('button', { name: /Xóa yêu cầu tạm ứng/ })).toHaveLength(1);
});

it('opens the shared form in edit mode, prefilled with the current amount and reason', () => {
  renderPage();

  fireEvent.click(screen.getByRole('button', { name: 'Điều chỉnh yêu cầu tạm ứng 20.000.000 ₫' }));

  expect(screen.getByText('Điều chỉnh yêu cầu tạm ứng')).toBeTruthy();
  const amount = screen.getByLabelText('Số tiền (₫)') as HTMLInputElement;
  const reason = screen.getByLabelText('Lý do') as HTMLInputElement;
  expect(amount.value).toBe('20000000');
  expect(reason.value).toBe('Tạm ứng nâng hạ');
  expect(screen.getByRole('button', { name: 'Lưu thay đổi' })).toBeTruthy();
});

it('submits the edit as an update, never as a create', () => {
  const createMutate = vi.fn();
  const updateMutate = vi.fn();
  mocks.create.mockReturnValue({ error: null, isPending: false, mutate: createMutate });
  mocks.update.mockReturnValue({ error: null, isPending: false, mutate: updateMutate });
  renderPage();

  fireEvent.click(screen.getByRole('button', { name: 'Điều chỉnh yêu cầu tạm ứng 20.000.000 ₫' }));
  fireEvent.change(screen.getByLabelText('Số tiền (₫)'), { target: { value: '25500000' } });
  fireEvent.change(screen.getByLabelText('Lý do'), { target: { value: 'Sửa lý do' } });
  fireEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));

  expect(updateMutate).toHaveBeenCalledWith(
    { id: 11, amount: 25500000, reason: 'Sửa lý do' },
    expect.anything(),
  );
  expect(createMutate).not.toHaveBeenCalled();
});

it('closes the form and resets it back to create mode when the edit is cancelled', () => {
  renderPage();

  fireEvent.click(screen.getByRole('button', { name: 'Điều chỉnh yêu cầu tạm ứng 20.000.000 ₫' }));
  fireEvent.click(screen.getByRole('button', { name: 'Hủy' }));
  fireEvent.click(screen.getByRole('button', { name: /Tạo yêu cầu/ }));

  // Create mode: empty fields, not the row's previous values.
  expect((screen.getByLabelText('Số tiền (₫)') as HTMLInputElement).value).toBe('');
  expect(screen.getByRole('button', { name: 'Gửi yêu cầu' })).toBeTruthy();
});

it('asks for confirmation naming the amount before deleting', async () => {
  const removeMutate = vi.fn();
  mocks.remove.mockReturnValue({ isPending: false, mutate: removeMutate });
  renderPage();

  fireEvent.click(screen.getByRole('button', { name: 'Xóa yêu cầu tạm ứng 20.000.000 ₫' }));

  await waitFor(() => {
    expect(screen.getByText(/Xóa yêu cầu tạm ứng 20\.000\.000 ₫\?/)).toBeTruthy();
  });
  expect(removeMutate).not.toHaveBeenCalled();
});

it('deletes only after the danger dialog is confirmed', async () => {
  const removeMutate = vi.fn();
  mocks.remove.mockReturnValue({ isPending: false, mutate: removeMutate });
  renderPage();

  fireEvent.click(screen.getByRole('button', { name: 'Xóa yêu cầu tạm ứng 20.000.000 ₫' }));
  const confirmButton = await screen.findByRole('button', { name: 'Xóa' });
  fireEvent.click(confirmButton);

  await waitFor(() => expect(removeMutate).toHaveBeenCalledWith(11, expect.anything()));
});

it('leaves the request alone when the dialog is dismissed', async () => {
  const removeMutate = vi.fn();
  mocks.remove.mockReturnValue({ isPending: false, mutate: removeMutate });
  renderPage();

  fireEvent.click(screen.getByRole('button', { name: 'Xóa yêu cầu tạm ứng 20.000.000 ₫' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Huỷ' }));

  await waitFor(() => expect(screen.queryByText(/sẽ bị xóa vĩnh viễn/)).toBeNull());
  expect(removeMutate).not.toHaveBeenCalled();
});

it('surfaces a service refusal instead of swallowing it', () => {
  mocks.update.mockReturnValue({
    error: new Error('Không sửa được yêu cầu đã duyệt — số tiền đã ghi vào sổ cái'),
    isPending: false,
    mutate: vi.fn(),
  });
  renderPage();

  fireEvent.click(screen.getByRole('button', { name: 'Điều chỉnh yêu cầu tạm ứng 20.000.000 ₫' }));

  const alert = screen.getByRole('alert');
  expect(alert.textContent).toContain('số tiền đã ghi vào sổ cái');
});