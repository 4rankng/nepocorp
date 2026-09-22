import { cleanup, fireEvent, render, screen } from '@testing-library/react';
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

const ERROR_CLASS = 'expense-input--error';

function mount() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const view = render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/expenses/new']}>
        <Routes><Route path="/expenses/new" element={<ExpenseEntryPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { view, queryClient };
}

const controlClass = (id: string) => document.getElementById(id)?.className ?? '';

it('marks every invalid required control with the error class on empty submit, sparing valid ones', async () => {
  const { queryClient } = mount();

  fireEvent.click(await screen.findByRole('button', { name: /Tạo phiếu chi/ }));

  // messages still surface — validation flow unchanged
  expect(await screen.findByText('Vui lòng chọn nhà cung cấp')).toBeTruthy();
  expect(screen.getByText('Vui lòng chọn hạng mục chi phí')).toBeTruthy();

  // AC1: every field failing validation carries the error state
  expect(controlClass('supplierId')).toContain(ERROR_CLASS);
  expect(controlClass('categoryId')).toContain(ERROR_CLASS);
  expect(controlClass('amount')).toContain(ERROR_CLASS);

  // controls with no error never get it (expenseDate prefilled, paymentStatus defaulted)
  expect(controlClass('expenseDate')).not.toContain(ERROR_CLASS);
  expect(controlClass('paymentStatus')).not.toContain(ERROR_CLASS);
  expect(controlClass('expenseType')).not.toContain(ERROR_CLASS);
  queryClient.clear();
});

it('clears the error state exactly when the field error clears', async () => {
  const { queryClient } = mount();

  fireEvent.click(await screen.findByRole('button', { name: /Tạo phiếu chi/ }));
  await screen.findByText('Số tiền phải là số dương');
  expect(controlClass('amount')).toContain(ERROR_CLASS);

  fireEvent.change(document.getElementById('amount')!, { target: { value: '5000' } });

  expect(controlClass('amount')).not.toContain(ERROR_CLASS);
  // siblings stay errored until their own errors clear
  expect(controlClass('supplierId')).toContain(ERROR_CLASS);
  expect(controlClass('categoryId')).toContain(ERROR_CLASS);
  queryClient.clear();
});
