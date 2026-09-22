import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import ForwarderSettlementCreatePage from './ForwarderSettlementCreatePage';

const mocks = vi.hoisted(() => ({ requests: vi.fn(), expenses: vi.fn(), retryRequests: vi.fn(), retryExpenses: vi.fn(), create: vi.fn() }));
vi.mock('../hooks/useForwarderQueries', () => ({
  useForwarderEligibleAdvanceRequests: mocks.requests,
  useUnlinkedExpenses: mocks.expenses,
  useCreateAdvanceSettlement: () => ({ mutateAsync: mocks.create, isPending: false }),
}));
vi.mock('../hooks/useCatalogs', () => ({ useCatalogs: () => ({ data: {} }) }));
vi.mock('../hooks/animations', () => ({ usePageAnimations: () => ({ rootRef: { current: null } }) }));
vi.mock('../hooks/useBackShortcut', () => ({ useBackShortcut: vi.fn() }));
const loaded = (data: unknown, refetch = vi.fn()) => ({ data, refetch, isLoading: false, error: null });
const mount = () => render(<MemoryRouter><ForwarderSettlementCreatePage /></MemoryRouter>);
beforeEach(() => {
  vi.clearAllMocks();
  mocks.requests.mockReturnValue(loaded({ items: [{ id: 7, status: 'APPROVED', amount: '100000', reason: 'Ứng phí cảng', createdAt: '2026-09-22' }] }, mocks.retryRequests));
  mocks.expenses.mockReturnValue(loaded({ items: [] }, mocks.retryExpenses));
});
afterEach(cleanup);

it.each(['requests', 'expenses'] as const)('does not turn loading %s into an empty payable form', (key) => {
  mocks[key].mockReturnValue({ ...loaded(undefined), isLoading: true });
  mount();
  expect(screen.getByRole('status').textContent).toContain('Đang tải tạm ứng và chi phí');
  expect(screen.queryByRole('button', { name: 'Gửi phiếu thanh toán' })).toBeNull();
  expect(screen.queryByText(/Không có tạm ứng/)).toBeNull();
});

it.each(['requests', 'expenses'] as const)('blocks incomplete %s and retries both authoritative option lists', (key) => {
  mocks[key].mockReturnValue({ ...mocks[key](), error: new Error('network failed') });
  const view = mount();
  expect(screen.getByRole('alert').textContent).toContain('Không thể tải dữ liệu lập phiếu');
  expect(screen.queryByRole('button', { name: 'Gửi phiếu thanh toán' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
  expect(mocks.retryRequests).toHaveBeenCalledOnce();
  expect(mocks.retryExpenses).toHaveBeenCalledOnce();
  mocks[key].mockReturnValue({ ...mocks[key](), error: null });
  view.rerender(<MemoryRouter><ForwarderSettlementCreatePage /></MemoryRouter>);
  expect(screen.getByRole('button', { name: 'Gửi phiếu thanh toán' })).toBeTruthy();
});

it('retains selections when a rejected submission is retried', async () => {
  mocks.create.mockRejectedValueOnce(new Error('temporary failure')).mockResolvedValueOnce({ id: 42, code: 'PT-42' });
  mount();
  fireEvent.click(screen.getAllByRole('checkbox')[0]);
  fireEvent.click(screen.getByRole('button', { name: 'Gửi phiếu thanh toán' }));
  await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1));
  expect((screen.getAllByRole('checkbox')[0] as HTMLInputElement).checked).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'Gửi phiếu thanh toán' }));
  await waitFor(() => expect(screen.getByText('PT-42')).toBeTruthy());
  expect(mocks.create.mock.calls[1][0].advanceRequestIds).toEqual([7]);
});
