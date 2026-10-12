import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { CustomerAging, CustomerAgingResponse } from '../api/financialClient';
import DebtListPage from './DebtListPage';

/**
 * The /debt summary surfaces must render stably:
 *
 * - The hero total + four aging buckets used to derive from `data ?? zeros`, so
 *   every reload flashed "0 ₫ / 0 khách hàng" and every search keystroke
 *   (the query key carries the search text) blanked `data` and re-flashed the
 *   zeros before the new totals settled (kanban 091026010100).
 * - The bucket-tab selection lived only in useState, so a reload dropped it
 *   back to "Tất cả" even though the page reads ?filter= (the dashboard links
 *   here as /debt?filter=over90) (kanban 091026235510).
 */

const mocks = vi.hoisted(() => ({ getCustomerAging: vi.fn() }));

vi.mock('../api/financialClient', () => ({
  financialClient: {
    getCustomerAging: (params?: { search?: string }) => mocks.getCustomerAging(params),
  },
}));
vi.mock('../hooks/animations', () => ({
  usePageAnimations: () => ({ rootRef: { current: null } }),
  useListAnimations: () => ({ rootRef: { current: null } }),
}));
vi.mock('../components/shared/Toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('../lib/download', () => ({ downloadBlob: vi.fn() }));

function customer(over: Partial<CustomerAging> = {}): CustomerAging {
  return {
    customerId: 1,
    customerName: 'CÔNG TY CỔ PHẦN NITODA',
    contactInfo: '0900000000',
    linkedSupplierId: null,
    linkedSupplierApBalance: 0,
    netBalance: 200_000_000,
    totalOutstanding: 200_000_000,
    aging: { current: 0, d30: 0, d60: 0, over90: 200_000_000 },
    maxOverdueDays: 95,
    ...over,
  };
}

function response(customers: CustomerAging[]): CustomerAgingResponse {
  return { customers, page: 1, limit: 50, total: customers.length, totalPages: 1 };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => { resolve = r; });
  return { promise, resolve };
}

function SearchProbe() {
  const location = useLocation();
  return <div data-testid="search-probe">{location.search}</div>;
}

function mount(initialEntries = ['/debt']) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={initialEntries}>
        <DebtListPage />
        <SearchProbe />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const heroAmount = (container: HTMLElement) => container.querySelector('.debt-hero__amount')?.textContent;

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

describe('debt list summary and tab render stably (kanban 091026010100, 091026235510)', () => {
  it('shows "—" placeholders instead of zero totals while the aging report loads', async () => {
    const gate = deferred<CustomerAgingResponse>();
    mocks.getCustomerAging.mockReturnValue(gate.promise);
    const { container } = mount();

    expect(heroAmount(container)).toBe('—₫');
    expect(screen.queryByText('0 khách hàng')).toBeNull();
    expect(screen.queryByText(/Tất cả 0/)).toBeNull();
    expect([...container.querySelectorAll('.hero-kpi-mini__value')].map(el => el.textContent))
      .toEqual(['—', '—']);

    gate.resolve(response([customer()]));
    await screen.findAllByText('200.000.000');
    expect(heroAmount(container)).toBe('200.000.000₫');
  });

  it('keeps the loaded totals on screen while a new search is in flight', async () => {
    const first = deferred<CustomerAgingResponse>();
    mocks.getCustomerAging.mockReturnValue(first.promise);
    const { container } = mount();
    first.resolve(response([customer()]));
    await screen.findAllByText('200.000.000');

    const second = deferred<CustomerAgingResponse>();
    mocks.getCustomerAging.mockReturnValue(second.promise);
    fireEvent.change(
      screen.getByRole('searchbox', { name: 'Tìm công nợ theo khách hàng' }),
      { target: { value: 'NIT' } },
    );

    // The previous response must still drive the summary — no zero/placeholder
    // flash between keystrokes.
    expect(heroAmount(container)).toBe('200.000.000₫');

    second.resolve(response([customer({
      customerId: 2,
      customerName: 'KHÁCH HÀNG KHÁC',
      netBalance: 500,
      totalOutstanding: 500,
      aging: { current: 500, d30: 0, d60: 0, over90: 0 },
      maxOverdueDays: 0,
    })]));
    await screen.findAllByText('500');
    expect(heroAmount(container)).toBe('500₫');
  });

  it('keeps the selected bucket tab across a reload via the ?filter= param', async () => {
    const data = response([
      customer(),
      customer({
        customerId: 3,
        customerName: 'KHÁCH TRONG HẠN',
        netBalance: 100,
        totalOutstanding: 100,
        aging: { current: 100, d30: 0, d60: 0, over90: 0 },
        maxOverdueDays: 0,
      }),
    ]);
    mocks.getCustomerAging.mockResolvedValue(data);

    const first = mount(['/debt?filter=over90']);
    // Customer names render twice (mobile card + desktop table), so match by list.
    await screen.findAllByText('CÔNG TY CỔ PHẦN NITODA');
    const overdueTab = screen.getByRole('button', { name: /TRÊN 90 NGÀY/ });
    expect(overdueTab.className).toContain('is-active');
    expect(screen.queryAllByText('KHÁCH TRONG HẠN')).toHaveLength(0);

    fireEvent.click(screen.getByRole('button', { name: /0–30 NGÀY/ }));
    expect(screen.getByTestId('search-probe').textContent).toBe('?filter=current');
    first.unmount();

    // "Reload": a fresh mount at the URL the tab selection wrote.
    mount(['/debt?filter=current']);
    await screen.findAllByText('KHÁCH TRONG HẠN');
    expect(screen.getByRole('button', { name: /0–30 NGÀY/ }).className).toContain('is-active');
    expect(screen.queryAllByText('CÔNG TY CỔ PHẦN NITODA')).toHaveLength(0);
  });
});
