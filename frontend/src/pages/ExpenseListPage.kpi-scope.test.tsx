import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ExpenseWithRefs } from '@tingting/shared';

/**
 * NEPO-17 — the /expenses KPI cards must aggregate EVERY filtered row, not
 * just the visible page. The old `reduce` over `expenseData.items` reported
 * page-1-only totals whenever the filters matched more than one page
 * (audit 24/10: bug số liệu, không chỉ layout).
 *
 * The mock serves 150 expenses: the paged list (pageSize=20) returns one page
 * at a time, the totals walk (pageSize=100) must span TWO pages to reach the
 * full set — a page-only KPI would show 5.050.000 instead of 11.325.000.
 */

type Mode = 'multi' | 'single' | 'company' | 'paid-only';
const state = { mode: 'multi' as Mode, urls: [] as string[] };

function makeExpense(i: number, component: 'TRUCK' | null, status?: 'PAID' | 'UNPAID'): ExpenseWithRefs {
  return {
    id: i,
    supplierId: 1,
    categoryId: 1,
    truckId: component === 'TRUCK' ? 1 : null,
    amount: String(1000 * i),
    paymentStatus: status ?? (i % 2 === 0 ? 'UNPAID' : 'PAID'),
    expenseDate: '2026-10-05',
    validFrom: null,
    validTo: null,
    receiptId: null,
    createdBy: null,
    createdAt: '2026-10-05T00:00:00.000Z',
    updatedAt: '2026-10-05T00:00:00.000Z',
    deletedAt: null,
    vehicleComponent: component,
    supplier: { id: 1, name: `NCC ${i}`, shortName: null, contactPerson: null, phone: null, taxCode: null, contactInfo: null, note: null, status: 'ACTIVE', createdAt: '2026-10-05T00:00:00.000Z', updatedAt: '2026-10-05T00:00:00.000Z', deletedAt: null },
    category: { id: 1, name: 'Hạng mục' },
    truck: component === 'TRUCK' ? { id: 1, licensePlate: '15C-001.01' } : null,
    trailer: null,
    note: null,
  } as unknown as ExpenseWithRefs;
}

function dataset(mode: Mode): ExpenseWithRefs[] {
  if (mode === 'single') return Array.from({ length: 3 }, (_, k) => makeExpense(k + 1, 'TRUCK'));
  if (mode === 'company') return Array.from({ length: 150 }, (_, k) => makeExpense(k + 1, null));
  if (mode === 'paid-only') return Array.from({ length: 4 }, (_, k) => makeExpense(k + 1, 'TRUCK', 'PAID'));
  return Array.from({ length: 150 }, (_, k) => makeExpense(k + 1, 'TRUCK'));
}

const apiGet = vi.hoisted(() => vi.fn());
apiGet.mockImplementation((url: string) => {
  state.urls.push(url);
  const qs = new URLSearchParams(url.split('?')[1] ?? '');
  const pageSize = Number(qs.get('pageSize') ?? 20);
  const page = Number(qs.get('page') ?? 1);
  const component = qs.get('vehicleComponent');
  // The company-mode dataset stores vehicleComponent = NULL, mirroring the
  // backend (company expenses have no vehicle).
  const items = dataset(component === 'COMPANY' ? 'company' : state.mode);
  return Promise.resolve({
    items: items.slice((page - 1) * pageSize, page * pageSize),
    total: items.length,
    page,
    pageSize,
  });
});

vi.mock('../lib/api', () => ({
  api: { get: apiGet },
}));
vi.mock('../api/configClient', () => ({
  configClient: {
    getAllSuppliers: () => Promise.resolve([]),
    getAllExpenseCategories: () => Promise.resolve([]),
  },
}));
vi.mock('../hooks/useCatalogs', () => ({
  useCatalogs: () => ({ data: { trucks: [], trailers: [], suppliers: [] } }),
}));
vi.mock('../hooks/useMonth', () => ({
  useMonth: () => ({ month: 10, year: 2026, setMonthYear: () => {} }),
}));
vi.mock('../hooks/animations', () => ({
  usePageAnimations: () => ({ rootRef: { current: null } }),
  useListAnimations: () => {},
}));
vi.mock('../components/shared/Toast', () => ({
  useToast: () => ({ toast: () => {}, showToast: () => {} }),
}));

import ExpenseListPage from './ExpenseListPage';

const renderPage = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <ExpenseListPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

beforeEach(() => {
  state.mode = 'multi';
  state.urls.length = 0;
});
afterEach(cleanup);

describe('NEPO-17/24 — the header metric aggregates the whole filtered set, not the visible page', () => {
  it('sums both pages of the totals walk (150 rows) and keeps figures stable across page changes', async () => {
    renderPage();

    // Full-set figures: total 11.325.000 → compact "11,3 tr"; 75 unpaid /
    // 75 paid phiếu. A page-1-only reduce would show 5.050.000 ("5,1 tr").
    const metric = await waitFor(() => {
      const el = document.querySelector('.expense-metric')!;
      expect(el.textContent).toMatch(/11[.,]3/);
      return el;
    });
    expect(metric.textContent).not.toMatch(/5[.,]1/);
    // Sub-line: "150 phiếu · đã trả 5.625.000".
    expect(metric.textContent).toContain('150 phiếu');
    expect(metric.textContent).toContain('5.625.000');

    // Unpaid > 0 → the "Chưa trả" chip renders with count + amount.
    const chip = document.querySelector('.expense-metric__chip');
    expect(chip?.textContent).toContain('75');
    expect(chip?.textContent).toContain('5.700.000');

    // Change page → list refetches page 2, metric figures unchanged.
    const urlsBefore = state.urls.length;
    fireEvent.click(screen.getByRole('button', { name: '2' }));
    await waitFor(() => expect(state.urls.length).toBeGreaterThan(urlsBefore));
    expect(state.urls.at(-1)).toContain('page=2');
    expect(document.querySelector('.expense-metric')?.textContent).toMatch(/11[.,]3/);
    expect(document.querySelector('.expense-metric__chip')?.textContent).toContain('5.700.000');
  });

  it('hides the "Chưa trả" chip entirely when nothing is unpaid (verdict: no 0-₫ badge)', async () => {
    state.mode = 'paid-only';
    renderPage();
    await waitFor(() => expect(document.querySelector('.expense-metric')?.textContent).toContain('đã trả'));
    expect(document.querySelector('.expense-metric__chip')).toBeNull();
  });

  it('shows "no value yet" instead of a wrong 0 while the walk is in flight', async () => {
    // Never-resolving walk request: the metric must not flash a page-only 0 ₫.
    apiGet.mockImplementationOnce((url: string) =>
      url.includes('pageSize=100') ? new Promise(() => {}) : Promise.resolve((() => {
        const qs = new URLSearchParams(url.split('?')[1] ?? '');
        const page = Number(qs.get('page') ?? 1);
        const items = dataset('multi').slice((page - 1) * 20, page * 20);
        return { items, total: 150, page, pageSize: 20 };
      })()),
    );
    renderPage();
    await waitFor(() => expect(document.querySelector('.expense-metric__value')?.textContent).toContain('—'));
    expect(document.querySelector('.expense-metric__value')?.textContent).not.toContain('0 ₫');
    // And no chip while the walk is unresolved.
    expect(document.querySelector('.expense-metric__chip')).toBeNull();
  });

  it('keeps the count line but drops all controls when the list fits one page', async () => {
    state.mode = 'single';
    renderPage();
    await waitFor(() => expect(document.querySelector('.expense-table-foot')?.textContent).toContain('Đang hiển thị 1–3 trên 3 phiếu'));
    expect(document.querySelector('.ds-pagination__btn')).toBeNull();
    expect(document.querySelector('.ds-pagination__size')).toBeNull();
  });

  it('hides the Thành phần/Xe columns when the filtered set has no vehicle data, restores them otherwise', async () => {
    renderPage();
    // Unfiltered multi dataset: every row has TRUCK data → both columns show.
    await waitFor(() => expect(document.querySelector('.expense-table')?.textContent).toContain('Đầu kéo'));
    expect(Array.from(document.querySelectorAll('thead th')).map(th => th.textContent)).toContain('Xe');
    expect(Array.from(document.querySelectorAll('thead th')).map(th => th.textContent)).toContain('Thành phần');

    // Company view: every row stores vehicleComponent = NULL → both blank
    // columns must auto-hide (they used to render a full column of '—'/'').
    // NEPO-24: on the jsdom fallback width the type select lives in the
    // "Bộ lọc" popover.
    fireEvent.click(screen.getByRole('button', { name: /^Bộ lọc/ }));
    const dialog = await screen.findByRole('dialog', { name: 'Bộ lọc bổ sung' });
    fireEvent.change(within(dialog).getByLabelText('Loại chi phí'), { target: { value: 'COMPANY' } });
    await waitFor(() => {
      const headers = Array.from(document.querySelectorAll('thead th')).map(th => th.textContent);
      expect(headers).not.toContain('Xe');
      expect(headers).not.toContain('Thành phần');
    });
  });
});
