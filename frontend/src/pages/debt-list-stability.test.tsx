import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { CustomerAging, CustomerAgingResponse } from '../api/financialClient';
import DebtListPage from './DebtListPage';

/**
 * The /debt summary surfaces must render stably:
 *
 * - The total + four aging buckets used to derive from `data ?? zeros`, so
 *   every reload flashed "0 ₫ / 0 khách hàng" and every search keystroke
 *   (the query key carries the search text) blanked `data` and re-flashed the
 *   zeros before the new totals settled (kanban 091026010100).
 * - The bucket-tab selection lived only in useState, so a reload dropped it
 *   back to "Tất cả" even though the page reads ?filter= (the dashboard links
 *   here as /debt?filter=over90) (kanban 091026235510).
 * - NEPO-18: one summary band replaces the hero + minis + aging cards; the
 *   customer count lives only in the "Tất cả N" tab; the SỔ RÒNG column
 *   auto-hides while no customer has a linked supplier; the row status rides
 *   the colored dot beside the name instead of a second line.
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

const bandAmount = (container: HTMLElement) => container.querySelector('.debt-band__amount')?.textContent;

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

describe('debt list summary and tab render stably (kanban 091026010100, 091026235510)', () => {
  it('shows "—" placeholders instead of zero totals while the aging report loads', async () => {
    const gate = deferred<CustomerAgingResponse>();
    mocks.getCustomerAging.mockReturnValue(gate.promise);
    const { container } = mount();

    expect(bandAmount(container)).toBe('—₫');
    expect(screen.queryByText('0 khách hàng')).toBeNull();
    expect(screen.queryByText(/Tất cả 0/)).toBeNull();
    expect([...container.querySelectorAll('.debt-band__chip-value')].map(el => el.textContent))
      .toEqual(['—', '—']);

    gate.resolve(response([customer()]));
    await screen.findAllByText('200.000.000');
    expect(bandAmount(container)).toBe('200.000.000₫');
    expect([...container.querySelectorAll('.debt-band__chip-value')].map(el => el.textContent))
      .toEqual(['1', '1']); // 1 quá hạn (over90 > 0) · 1 rủi ro cao (total > 100M)
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
    expect(bandAmount(container)).toBe('200.000.000₫');

    second.resolve(response([customer({
      customerId: 2,
      customerName: 'KHÁCH HÀNG KHÁC',
      netBalance: 500,
      totalOutstanding: 500,
      aging: { current: 500, d30: 0, d60: 0, over90: 0 },
      maxOverdueDays: 0,
    })]));
    await screen.findAllByText('500');
    expect(bandAmount(container)).toBe('500₫');
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
    expect(overdueTab.getAttribute('aria-pressed')).toBe('true');
    expect(screen.queryAllByText('KHÁCH TRONG HẠN')).toHaveLength(0);

    fireEvent.click(screen.getByRole('button', { name: /0–30 NGÀY/ }));
    expect(screen.getByTestId('search-probe').textContent).toBe('?filter=current');
    first.unmount();

    // "Reload": a fresh mount at the URL the tab selection wrote.
    mount(['/debt?filter=current']);
    await screen.findAllByText('KHÁCH TRONG HẠN');
    expect(screen.getByRole('button', { name: /0–30 NGÀY/ }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.queryAllByText('CÔNG TY CỔ PHẦN NITODA')).toHaveLength(0);
  });
});

describe('NEPO-18 — one summary band, one count source, auto-hidden SỔ RÒNG, dot status', () => {
  it('carries the customer count only in the "Tất cả" tab — never in the header or the band', async () => {
    mocks.getCustomerAging.mockResolvedValue(response([
      customer(),
      customer({
        customerId: 3,
        customerName: 'KHÁCH HÀNG HAI',
        netBalance: 100,
        totalOutstanding: 100,
        aging: { current: 100, d30: 0, d60: 0, over90: 0 },
        maxOverdueDays: 0,
      }),
    ]));
    const { container } = mount();
    await screen.findAllByText('CÔNG TY CỔ PHẦN NITODA');

    // The tab is the one place the count lives.
    expect(screen.getByRole('button', { name: 'Tất cả 2' })).toBeTruthy();
    // The old duplicated string is gone from header and hero/band alike.
    expect(screen.queryAllByText(/khách hàng · cập nhật vừa xong/)).toHaveLength(0);
    expect(container.querySelector('.debt-band')?.textContent).not.toContain('khách hàng');
  });

  it('auto-hides the SỔ RÒNG column while no customer links a supplier', async () => {
    mocks.getCustomerAging.mockResolvedValue(response([customer()]));
    const { container } = mount();
    await screen.findAllByText('200.000.000');

    const headers = [...container.querySelectorAll('thead th')].map(th => th.textContent ?? '');
    expect(headers.some(h => h.includes('Số ròng'))).toBe(false);
    expect(container.querySelector('table')?.className).toContain('debt-list-table--no-net');
  });

  it('brings SỔ RÒNG back as soon as one customer gains a linked supplier', async () => {
    mocks.getCustomerAging.mockResolvedValue(response([
      customer({ linkedSupplierId: 9, linkedSupplierApBalance: 150_000_000, netBalance: 50_000_000 }),
    ]));
    const { container } = mount();
    await screen.findAllByText('50.000.000 ₫');

    const headers = [...container.querySelectorAll('thead th')].map(th => th.textContent ?? '');
    expect(headers.some(h => h.includes('Số ròng'))).toBe(true);
    expect(container.querySelector('table')?.className).not.toContain('--no-net');
  });

  it('rides the row status on the dot beside the name — no second line under it', async () => {
    mocks.getCustomerAging.mockResolvedValue(response([customer()]));
    const { container } = mount();
    await screen.findAllByText('200.000.000');

    // The sub-line texts are gone from the table entirely.
    expect(screen.queryByText('Nợ quá hạn')).toBeNull();
    expect(screen.queryByText('Trong hạn')).toBeNull();
    // The dot carries the status as tooltip + accessible name.
    const dot = container.querySelector('.debt-list-table .debt-status-dot--overdue');
    expect(dot).toBeTruthy();
    expect(dot?.getAttribute('title')).toBe('Nợ quá hạn');
    expect(dot?.getAttribute('aria-label')).toBe('Nợ quá hạn');
  });
});
