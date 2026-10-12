import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import ExpenseEntryPage from './ExpenseEntryPage';

/**
 * kanban 101026203120 — a 30.000 ₫ phí dịch vụ expense appeared under its
 * category tab but disappeared on the 'Tất cả' tab of /payables.
 *
 * Root cause is client-side cache vintage: `main.tsx` sets a global 5-minute
 * staleTime (and refetchOnWindowFocus: false), while the expense save/delete
 * paths invalidated only `['expenses']`. The payables tabs are separate query
 * keys (`['payables-summary', category]`), so after a write the 'Tất cả' tab —
 * whose key the chip-count row keeps warm on every visit — kept serving its
 * pre-write snapshot while a not-yet-cached category tab fetched post-write
 * data. Every payables/statement snapshot must be invalidated by an expense
 * write, so every tab shows every debt it claims.
 */

const EXISTING = {
  id: 187,
  expenseDate: '2026-06-06',
  supplierId: 6,
  categoryId: 12,
  truckId: 2,
  vehicleComponent: 'TRUCK',
  amount: '30000',
  paymentStatus: 'UNPAID',
  validFrom: null,
  validTo: null,
  receiptId: null,
  note: 'QA 101026203120 reproduce',
  createdAt: '2026-10-12T08:03:08.813Z',
  updatedAt: '2026-10-12T08:03:08.813Z',
  deletedAt: null,
};

const { put: putMock, delete: deleteMock, get: getMock } = vi.hoisted(() => ({
  put: vi.fn(),
  delete: vi.fn(),
  get: vi.fn(),
}));

vi.mock('../lib/api', () => ({
  api: {
    get: getMock,
    put: putMock,
    post: vi.fn(),
    delete: deleteMock,
    upload: vi.fn(),
  },
}));
vi.mock('../api/configClient', () => ({
  configClient: {
    getAllSuppliers: vi.fn().mockResolvedValue([{ id: 6, name: 'NCC test' }]),
    getAllExpenseCategories: vi.fn().mockResolvedValue([{ id: 12, name: 'Phí gửi xe', isRenewable: false }]),
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
  deleteMock.mockReset();
  getMock.mockReset();
});

// The three payables snapshots a write must invalidate: the 'Tất cả' response
// (also the source of the chip counts), a category-tab response, and the
// supplier statement behind /payables/:id and the linked-supplier AP ledger.
const SEEDED_KEYS: unknown[][] = [
  ['payables-summary', 'all'],
  ['payables-summary', 'ancillary'],
  ['supplier-statement', 6, null, null],
];

function renderEditPage() {
  // Mirrors main.tsx — the global 5-minute staleTime is what let the pre-write
  // snapshot survive the navigation back to /payables.
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 5 * 60 * 1000 } },
  });
  for (const key of SEEDED_KEYS) queryClient.setQueryData(key, { items: [] });
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

function assertPayablesInvalidated(queryClient: QueryClient) {
  for (const key of SEEDED_KEYS) {
    expect(queryClient.getQueryState(key as readonly unknown[])?.isInvalidated,
      `cache ${JSON.stringify(key)} must be invalidated`).toBe(true);
  }
}

it('invalidates every payables snapshot after a successful expense save', async () => {
  getMock.mockImplementation((path: string) =>
    path.endsWith('/photos') ? Promise.resolve({ items: [] }) : Promise.resolve(EXISTING),
  );
  putMock.mockResolvedValue({ ...EXISTING, amount: '45000' });

  const { queryClient } = renderEditPage();

  const amountInput = (await screen.findByLabelText(/số tiền/i)) as HTMLInputElement;
  await waitFor(() => expect(amountInput.value.replace(/\D/g, '')).toContain('30000'));

  fireEvent.change(amountInput, { target: { value: '45000' } });
  fireEvent.click(screen.getByRole('button', { name: /^cập nhật$/i }));

  await waitFor(() => expect(putMock).toHaveBeenCalledTimes(1));
  await waitFor(() => assertPayablesInvalidated(queryClient));

  queryClient.clear();
});

it('invalidates every payables snapshot after a confirmed expense delete', async () => {
  getMock.mockImplementation((path: string) =>
    path.endsWith('/photos') ? Promise.resolve({ items: [] }) : Promise.resolve(EXISTING),
  );
  deleteMock.mockResolvedValue({ ok: true });

  const { queryClient } = renderEditPage();

  await screen.findByLabelText(/số tiền/i);
  fireEvent.click(screen.getByRole('button', { name: /^xóa$/i }));
  fireEvent.click(await screen.findByRole('button', { name: 'Xóa chi phí' }));

  await waitFor(() => expect(deleteMock).toHaveBeenCalledTimes(1));
  await waitFor(() => assertPayablesInvalidated(queryClient));

  queryClient.clear();
});
