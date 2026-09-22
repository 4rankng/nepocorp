import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
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

/** jsdom has no IntersectionObserver; this one can be fired by hand. */
class FakeIntersectionObserver {
  static instances: FakeIntersectionObserver[] = [];
  readonly root = null;
  readonly rootMargin = '';
  readonly thresholds: number[] = [];
  readonly callback: IntersectionObserverCallback;
  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
    FakeIntersectionObserver.instances.push(this);
  }
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] { return []; }
  fire(isIntersecting: boolean) {
    this.callback([{ isIntersecting } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  FakeIntersectionObserver.instances = [];
  vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
  mocks.customers.mockReturnValue(ready(rows));
  mocks.balances.mockReturnValue(ready([{ entityId: 16, arDebt: 2000000, tripRevenue: 4000000 }]));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const mount = () => render(<MemoryRouter><CustomersPage /></MemoryRouter>);
it('loads further batches when the list is scrolled, and resets the batch on a filter change', () => {
  const view = mount();
  const mobile = within(view.container.querySelector('.mobile-only') as HTMLElement);
  // First batch only — the later customers are behind the scroll sentinel.
  expect(mobile.queryByText('Khách hàng 16')).toBeNull();

  act(() => { FakeIntersectionObserver.instances.forEach((observer) => observer.fire(true)); });
  expect(mobile.getByText('Khách hàng 16')).toBeTruthy();

  const filters = within(view.container.querySelector('.list-filter-options') as HTMLElement);
  fireEvent.click(filters.getByRole('button', { name: 'Tạm khoá 1' }));
  expect(mobile.getByText('Khách hàng 16')).toBeTruthy();
});
it('exports every matching customer and searches beyond the loaded batch', () => {
  mount();
  fireEvent.click(screen.getByRole('button', { name: 'Xuất Excel' }));
  expect(mocks.exportFile.mock.calls[0][2]).toHaveLength(16);
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'MST16' } });
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
