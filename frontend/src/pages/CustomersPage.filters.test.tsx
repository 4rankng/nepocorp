import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import CustomersPage from './CustomersPage';
const mocks = vi.hoisted(() => ({ customers: vi.fn(), balances: vi.fn(), retry: vi.fn(), exportFile: vi.fn() }));
vi.mock('../hooks/useQueries', () => ({
  useAllCustomers: mocks.customers, useCustomerBalances: mocks.balances,
  useSuppliers: () => ({ data: { items: [] } }),
}));
vi.mock('../hooks/animations', () => ({ usePageAnimations: () => ({ rootRef: { current: null } }) }));
vi.mock('../lib/csv', () => ({ downloadCSV: mocks.exportFile }));
const rows = Array.from({ length: 16 }, (_, index) => ({
  id: index + 1, name: `Khách hàng ${index + 1}`, status: index === 15 ? 'LOCKED' : 'ACTIVE',
  creditLimit: '1000000', taxCode: `MST${index + 1}`,
}));
const ready = (data: unknown) => ({ data, isLoading: false, error: null, refetch: mocks.retry });
beforeEach(() => {
  vi.clearAllMocks();
  mocks.customers.mockReturnValue(ready(rows));
  mocks.balances.mockReturnValue(ready([{ entityId: 16, arDebt: 2000000, tripRevenue: 4000000 }]));
});
afterEach(cleanup);
const mount = () => render(<MemoryRouter><CustomersPage /></MemoryRouter>);
it('paginates both layouts and filters the entire catalog, including later pages', () => {
  const view = mount();
  const mobile = within(view.container.querySelector('.mobile-only') as HTMLElement);
  expect(mobile.queryByText('Khách hàng 16')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Trang sau' }));
  expect(mobile.getByText('Khách hàng 16')).toBeTruthy();
  const filters = within(view.container.querySelector('.list-filter-options') as HTMLElement);
  fireEvent.click(filters.getByRole('button', { name: 'Tạm khoá 1' }));
  expect(mobile.getByText('Khách hàng 16')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Trang trước' })).toHaveProperty('disabled', true);
  fireEvent.click(filters.getByRole('button', { name: 'Rủi ro cao' }));
  expect(mobile.getByText('Khách hàng 16')).toBeTruthy();
});
it('exports every matching customer across pages and searches beyond the first page', () => {
  mount();
  fireEvent.click(screen.getByRole('button', { name: 'Xuất Excel' }));
  expect(mocks.exportFile.mock.calls[0][2]).toHaveLength(16);
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'MST16' } });
  expect(screen.getByRole('button', { name: 'Trang sau' })).toHaveProperty('disabled', true);
  fireEvent.click(screen.getByRole('button', { name: 'Xuất Excel' }));
  expect(mocks.exportFile.mock.calls[1][2]).toHaveLength(1);
});
it('shows a retry when balances fail instead of asserting every customer owes zero', () => {
  mocks.balances.mockReturnValue({ ...ready(undefined), error: new Error('offline') });
  mount();
  expect(screen.getByRole('alert').textContent).toContain('Không thể tải');
  expect(screen.queryByText('Tổng khách hàng')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
  expect(mocks.retry).toHaveBeenCalledTimes(2);
});
