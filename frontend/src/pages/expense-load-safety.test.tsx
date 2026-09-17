import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import ExpenseEntryPage from './ExpenseEntryPage';

vi.mock('../lib/api', () => ({ api: { get: vi.fn().mockRejectedValue(new Error('Không tìm thấy chi phí')) } }));
vi.mock('../api/configClient', () => ({ configClient: { getAllSuppliers: vi.fn().mockResolvedValue([]), getAllExpenseCategories: vi.fn().mockResolvedValue([]) } }));
vi.mock('../hooks/useCatalogs', () => ({ useCatalogs: () => ({ data: { trucks: [], trailers: [] } }) }));
vi.mock('../hooks/animations', () => ({ usePageAnimations: () => ({ rootRef: { current: null } }) }));
vi.mock('../hooks/useBackShortcut', () => ({ useBackShortcut: vi.fn() }));
vi.mock('../hooks/useDirtyGuard', () => ({ useDirtyGuard: () => ({ isDirty: false }) }));
vi.mock('../components/shared/Toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));

afterEach(cleanup);

it('shows a retry instead of an editable blank expense when loading the original fails', async () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/expenses/123/edit']}>
        <Routes><Route path="/expenses/:id/edit" element={<ExpenseEntryPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  expect(await screen.findByText('Không thể tải chi phí')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Thử lại' })).toBeTruthy();
  expect(screen.queryByRole('textbox')).toBeNull();
  queryClient.clear();
});
