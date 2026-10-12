import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TxnType } from '@tingting/shared';
import type { CustomerStatement, LedgerEntry } from '@tingting/shared';
import type * as FinancialClientModule from '../api/financialClient';
import type * as ApiModule from '../lib/api';
import { qk } from '../api/keys';
import DebtDetailPage from './DebtDetailPage';

/**
 * The AR detail page's period/tab state must be stable across reloads
 * (kanban 091026235510) and its summary surfaces must not blank mid-refetch
 * (kanban 091026010100):
 *
 * - The period filter used to initialize to the current month and only jump to
 *   the ledger's activity month from a post-load effect, so every reload showed
 *   the tabs reset to default, fetched the (usually empty) default month first,
 *   and flashed its empty content before settling.
 * - The tab strip claimed "0 khoản phát sinh" and the ledger claimed "Không có
 *   giao dịch" before the period statement had even arrived.
 * - The period summary cards fell back to skeletons on every statement refetch
 *   even though their data was still on screen.
 */

const mocks = vi.hoisted(() => ({ getCustomerStatement: vi.fn() }));

vi.mock('../api/financialClient', async (importOriginal) => {
  const original = await importOriginal<typeof FinancialClientModule>();
  return {
    ...original,
    financialClient: {
      ...original.financialClient,
      getCustomerStatement: (id: number, range?: { dateFrom?: string; dateTo?: string }) =>
        mocks.getCustomerStatement(id, range),
    },
  };
});
vi.mock('../lib/api', async (importOriginal) => {
  const original = await importOriginal<typeof ApiModule>();
  return { ...original, api: { ...original.api, get: vi.fn(async () => []) } };
});
vi.mock('../hooks/animations', () => ({ usePageAnimations: () => ({ rootRef: { current: null } }) }));
vi.mock('../hooks/useAgentOpenable', () => ({ useAgentOpenable: () => undefined }));
vi.mock('../hooks/useMediaQuery', () => ({ useMediaQuery: () => false }));
vi.mock('../components/shared/Toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('../lib/download', () => ({ downloadBlob: vi.fn(), openBlobInNewTab: vi.fn() }));
vi.mock('../components/billing/BillingDocumentsPanel', () => ({ default: () => null }));

function ledgerRow(over: Partial<LedgerEntry> = {}): LedgerEntry {
  return {
    id: 1,
    timestamp: '2026-08-05T08:30:00.000Z',
    txnType: TxnType.TRIP_REVENUE,
    txnId: null,
    receiptId: null,
    entityType: 'CUSTOMER',
    entityId: 7,
    credit: '0',
    debit: '12000000',
    balance: '12000000',
    note: 'Cước chuyến tháng 8',
    createdAt: '2026-08-05T08:30:00.000Z',
    ...over,
  };
}

const profile: CustomerStatement = {
  customer: { id: 7, name: 'CÔNG TY CỔ PHẦN NITODA', contactInfo: '0900000000', isCarrier: false },
  ledgerRows: [ledgerRow()],
  agingBuckets: [{ range: '0-30', amount: 12_000_000 }],
  totalOutstanding: 12_000_000,
  unpaidTrips: [],
  latestActivityDate: '2026-08-05',
};

const periodStatement: CustomerStatement = {
  ...profile,
  periodSummary: {
    openingBalance: 5_000_000,
    closingBalance: 12_000_000,
    periodActivity: 7_000_000,
    debitTotal: 12_000_000,
    creditTotal: 5_000_000,
    dateFrom: '2026-08-01',
    dateTo: '2026-08-31',
  },
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => { resolve = r; });
  return { promise, resolve };
}

function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const view = render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/debt/7']}>
        <Routes>
          <Route path="/debt/:id" element={<DebtDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { ...view, client };
}

/** Every statement fetch that carried a period range. */
const rangeCalls = () => mocks.getCustomerStatement.mock.calls.filter(([, range]) => range);

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

describe('debt detail period and tab state are stable across reloads (kanban 091026235510, 091026010100)', () => {
  it('requests the ledger only for the activity month and opens the filter there', async () => {
    mocks.getCustomerStatement.mockImplementation((_id: number, range?: { dateFrom?: string; dateTo?: string }) =>
      range ? Promise.resolve(periodStatement) : Promise.resolve(profile));

    mount();
    await screen.findByRole('heading', { name: 'Chi tiết & chứng từ công nợ' });

    // The period controls mount on the activity month (2026-08), not on the
    // current month that the old effect later jumped away from.
    expect((screen.getByRole('combobox', { name: 'Chọn tháng' }) as HTMLSelectElement).value).toBe('8');
    expect((screen.getByRole('combobox', { name: 'Chọn năm' }) as HTMLSelectElement).value).toBe('2026');

    // Exactly one period-scoped fetch, for the activity month — the old init
    // also fetched the default current month first (double fetch + flash).
    expect(rangeCalls()).toHaveLength(1);
    expect(rangeCalls()[0][1]).toEqual({ dateFrom: '2026-08-01', dateTo: '2026-08-31' });
  });

  it('reads as loading — never empty or zero — before the period statement arrives', async () => {
    const gate = deferred<CustomerStatement>();
    mocks.getCustomerStatement.mockImplementation((_id: number, range?: { dateFrom?: string; dateTo?: string }) =>
      range ? gate.promise : Promise.resolve(profile));

    mount();
    await screen.findByRole('heading', { name: 'Chi tiết & chứng từ công nợ' });

    expect(screen.getByText('Đang tải giao dịch…')).toBeTruthy();
    expect(screen.queryByText('Không có giao dịch')).toBeNull();
    expect(screen.queryByText('0 khoản phát sinh')).toBeNull();

    gate.resolve(periodStatement);
    expect(await screen.findByText('1 khoản phát sinh')).toBeTruthy();
    // The note renders twice (reference cell + content cell), so match by list.
    expect((await screen.findAllByText('Cước chuyến tháng 8')).length).toBeGreaterThan(0);
  });

  it('keeps the period summary cards and tab count while the statement refetches', async () => {
    mocks.getCustomerStatement.mockImplementation((_id: number, range?: { dateFrom?: string; dateTo?: string }) =>
      range ? Promise.resolve(periodStatement) : Promise.resolve(profile));

    const { container, client } = mount();
    await screen.findByText('1 khoản phát sinh');
    expect(screen.getByText('5.000.000 ₫')).toBeTruthy();

    // A refetch in flight with the data still cached must not blank the
    // summary cards back to skeletons.
    const gate = deferred<CustomerStatement>();
    mocks.getCustomerStatement.mockImplementation((_id: number, range?: { dateFrom?: string; dateTo?: string }) =>
      range ? gate.promise : Promise.resolve(profile));
    await act(async () => { void client.invalidateQueries({ queryKey: qk.financial.customerStatementAll }); });

    expect(container.querySelector('.period-summary--loading')).toBeNull();
    expect(screen.getByText('5.000.000 ₫')).toBeTruthy();
    expect(screen.getByText('1 khoản phát sinh')).toBeTruthy();
  });
});
