import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import ExpenseEntryPage from './ExpenseEntryPage';

/**
 * kanban 081026232500 — editing an expense reported "Đã cập nhật chi phí."
 * but the new values were gone when the phiếu was reopened.
 *
 * Root cause was client-side, not server-side: `main.tsx` configures a global
 * `staleTime` of 5 minutes, and the save path only invalidated the `['expenses']`
 * list prefix. The edit page reads the row from `qk.tripForm.expense(id)`
 * (`['expense', id]`), which stayed cached and "fresh", so the form re-hydrated
 * from the pre-edit snapshot. This test pins the fix: after a successful PUT the
 * single-expense cache must hold the row the server just returned.
 */

const EXISTING = {
  id: 187,
  expenseDate: '2026-06-06',
  supplierId: 6,
  categoryId: 12,
  truckId: 2,
  vehicleComponent: 'TRUCK',
  amount: '800000',
  paymentStatus: 'UNPAID',
  validFrom: null,
  validTo: null,
  receiptId: null,
  note: 'ghi chú cũ',
  createdAt: '2026-10-08T08:55:09.289Z',
  updatedAt: '2026-10-08T08:55:09.289Z',
  deletedAt: null,
};

const { put: putMock, get: getMock } = vi.hoisted(() => ({
  put: vi.fn(),
  get: vi.fn(),
}));

vi.mock('../lib/api', () => ({
  api: {
    get: getMock,
    put: putMock,
    post: vi.fn(),
    delete: vi.fn(),
    upload: vi.fn(),
  },
}));
vi.mock('../api/configClient', () => ({
  configClient: {
    getAllSuppliers: vi.fn().mockResolvedValue([{ id: 6, name: 'NCC test' }]),
    getAllExpenseCategories: vi.fn().mockResolvedValue([{ id: 12, name: 'Bảo dưỡng', isRenewable: false }]),
  },
}));
vi.mock('../hooks/useCatalogs', () => ({
  useCatalogs: () => ({ data: { trucks: [], trailers: [] } }),
}));
vi.mock('../hooks/animations', () => ({ usePageAnimations: () => ({ rootRef: { current: null } }) }));
vi.mock('../hooks/useBackShortcut', () => ({ useBackShortcut: vi.fn() }));
vi.mock('../hooks/useDirtyGuard', () => ({ useDirtyGuard: () => ({ isDirty: false }) }));
vi.mock('../components/shared/Toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));

afterEach(() => {
  cleanup();
  putMock.mockReset();
  getMock.mockReset();
});

function renderEditPage() {
  // Mirrors main.tsx: the global 5-minute staleTime is what let the stale row
  // survive a remount, so the test must not use a 0 staleTime to hide the bug.
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 5 * 60 * 1000 } },
  });
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/expenses/187/edit']}>
        <Routes>
          <Route path="/expenses/:id/edit" element={<ExpenseEntryPage />} />
          <Route path="/expenses" element={<h1>Danh sách chi phí</h1>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { queryClient, ...utils };
}

it('replaces the cached expense row after a successful edit', async () => {
  // Mirrors the server: after the PUT the stored row is the updated one, so the
  // refetch triggered by the invalidation must return the new values.
  let stored = EXISTING;
  getMock.mockImplementation((path: string) =>
    path.endsWith('/photos') ? Promise.resolve({ items: [] }) : Promise.resolve(stored),
  );

  const updated = { ...EXISTING, amount: '555000', note: 'ghi chú mới' };
  putMock.mockImplementation(() => {
    stored = updated;
    return Promise.resolve(updated);
  });

  const { queryClient } = renderEditPage();

  const amountInput = (await screen.findByLabelText(/số tiền/i)) as HTMLInputElement;
  await waitFor(() => expect(amountInput.value.replace(/\D/g, '')).toContain('800000'));

  fireEvent.change(amountInput, { target: { value: '555000' } });
  fireEvent.click(screen.getByRole('button', { name: /^cập nhật$/i }));

  await waitFor(() => expect(putMock).toHaveBeenCalledTimes(1));

  // The row the server echoed back must own the cache for this expense —
  // otherwise reopening the phiếu hydrates the form with the pre-edit values.
  await waitFor(() => {
    expect(queryClient.getQueryData(['expense', '187'])).toMatchObject({
      amount: '555000',
      note: 'ghi chú mới',
    });
  });

  queryClient.clear();
});