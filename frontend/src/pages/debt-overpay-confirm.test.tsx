import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TxnType } from '@tingting/shared';
import type { CustomerStatement, LedgerEntry } from '@tingting/shared';
import type * as FinancialClientModule from '../api/financialClient';
import type * as ApiModule from '../lib/api';
import DebtDetailPage from './DebtDetailPage';

/**
 * NEPO-45 — receiving MORE than the outstanding debt is legal (tiền trả
 * trước), gated by a confirmation dialog instead of the old hard block:
 *
 * - an amount beyond the debt opens the confirm dialog first and only posts
 *   after "Xác nhận", with the full received total in the request;
 * - an amount within the debt posts directly, no dialog;
 * - the allocation is integer VND — a VAT vulgar fraction on a trip's
 *   outstanding (25.883.199.999…₫) must not false-trigger "vượt quá" when the
 *   entered amount exactly matches the outstanding total;
 * - an overpaid customer reads "Đã trả trước" on the strip, outside aging.
 */

const mocks = vi.hoisted(() => ({
  getCustomerStatement: vi.fn(),
  post: vi.fn(),
  toast: vi.fn(),
}));

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
  return { ...original, api: { ...original.api, get: vi.fn(async () => []), post: mocks.post } };
});
vi.mock('../hooks/animations', () => ({ usePageAnimations: () => ({ rootRef: { current: null } }) }));
vi.mock('../hooks/useAgentOpenable', () => ({ useAgentOpenable: () => undefined }));
vi.mock('../hooks/useMediaQuery', () => ({ useMediaQuery: () => false }));
vi.mock('../hooks/useAuth', () => ({ useAuth: () => ({ user: { role: 'MANAGER' } }) }));
vi.mock('../components/shared/Toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('../lib/download', () => ({ downloadBlob: vi.fn(), openBlobInNewTab: vi.fn() }));
vi.mock('../components/billing/BillingDocumentsPanel', () => ({ default: () => null }));

function ledgerRow(over: Partial<LedgerEntry> = {}): LedgerEntry {
  return {
    id: 1,
    timestamp: '2026-09-10T00:00:00.000Z',
    txnType: TxnType.TRIP_REVENUE,
    txnId: 901,
    receiptId: null,
    entityType: 'CUSTOMER',
    entityId: 13,
    credit: '0',
    debit: '25883200',
    balance: '25883200',
    note: 'Cước chuyến 09',
    createdAt: '2026-09-10T00:00:00.000Z',
    ...over,
  };
}

function makeProfile(over: Partial<CustomerStatement> = {}): CustomerStatement {
  return {
    customer: { id: 13, name: 'CHÈ MÓC SƯƠNG', contactInfo: '0900000000', isCarrier: false },
    ledgerRows: [ledgerRow()],
    agingBuckets: [{ range: '0-30 ngày', amount: 25_883_200 }],
    totalOutstanding: 25_883_200,
    unpaidTrips: [{ tripId: 901, date: '2026-09-10', outstanding: 25_883_200, note: 'Cước chuyến 09' }],
    latestActivityDate: '2026-10-01',
    ...over,
  };
}

function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/debt/13']}>
        <Routes>
          <Route path="/debt/:id" element={<DebtDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

async function openPaymentModal(profile: CustomerStatement) {
  mocks.getCustomerStatement.mockImplementation((_id: number, range?: { dateFrom?: string; dateTo?: string }) =>
    range ? Promise.resolve({ ...profile, periodSummary: undefined }) : Promise.resolve(profile));
  mount();
  await screen.findByRole('heading', { name: 'Chi tiết & chứng từ công nợ' });
  await act(async () => {
    fireEvent.click(screen.getAllByRole('button', { name: 'Ghi nhận thanh toán' })[0]);
  });
  return screen.getByLabelText(/Số tiền nhận/) as HTMLInputElement;
}

async function fillAndSubmit(amount: string) {
  fireEvent.change(screen.getByLabelText(/Số tiền nhận/), { target: { value: amount } });
  fireEvent.change(screen.getByLabelText(/Mã biên lai/), { target: { value: 'PT-20261105-01' } });
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Ghi nhận' }));
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.post.mockResolvedValue({ ok: true });
});
afterEach(cleanup);

describe('NEPO-45 — receiving beyond the debt confirms then records, never blocks', () => {
  it('overpay opens the confirm dialog and posts the full total only after Xác nhận', async () => {
    mocks.post.mockResolvedValue({ ok: true, overpaid: 2_999_000 });
    await openPaymentModal(makeProfile());
    await fillAndSubmit('28882200');

    // The old hard block is gone; a confirm dialog carries the excess figure.
    expect(screen.queryByText(/vượt quá tổng công nợ/)).toBeNull();
    const dialog = await screen.findByRole('alertdialog');
    expect(dialog.textContent).toContain('Nhận vượt dư nợ 2.999.000 ₫ — phần vượt ghi làm tiền trả trước. Tiếp tục?');
    expect(mocks.post).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Xác nhận' }));
    });

    await waitFor(() => expect(mocks.post).toHaveBeenCalledTimes(1));
    const [, body] = mocks.post.mock.calls[0];
    expect(body.receiptId).toBe('PT-20261105-01');
    // The FULL received total travels to the server (28.882.200), the excess
    // riding as a separate entry — the server re-applies FIFO and posts the
    // excess as advance credit.
    expect(body.payments).toEqual([
      { tripId: 901, amount: 25_883_200 },
      { tripId: 901, amount: 2_999_000 },
    ]);
    expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({
      kind: 'success',
      message: expect.stringContaining('phần vượt 2.999.000 ₫ ghi làm tiền trả trước'),
    }));
  });

  it('an amount within the debt posts directly — no dialog', async () => {
    await openPaymentModal(makeProfile());
    await fillAndSubmit('25883200');

    await waitFor(() => expect(mocks.post).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    const [, body] = mocks.post.mock.calls[0];
    expect(body.payments).toEqual([{ tripId: 901, amount: 25_883_200 }]);
    expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({
      kind: 'success',
      message: 'Đã ghi nhận thanh toán 25.883.200 ₫.',
    }));
  });

  it('a VAT vulgar-fraction outstanding does not false-trigger "vượt quá" on an exact total', async () => {
    // 25.883.200 ÷ 1.1-style sums leave 25_883_199.999…₫ on the trip row —
    // the float allocation used to leak an epsilon and block the exact total.
    const profile = makeProfile({
      unpaidTrips: [{ tripId: 901, date: '2026-09-10', outstanding: 25_883_199.999999996, note: 'Cước chuyến 09' }],
    });
    await openPaymentModal(profile);
    await fillAndSubmit('25883200');

    await waitFor(() => expect(mocks.post).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(screen.queryByText(/vượt quá tổng công nợ/)).toBeNull();
    const [, body] = mocks.post.mock.calls[0];
    expect(body.payments).toEqual([{ tripId: 901, amount: 25_883_200 }]);
  });

  it('an overpaid customer reads "Đã trả trước" outside the aging buckets', async () => {
    const profile = makeProfile({
      ledgerRows: [
        ledgerRow(),
        ledgerRow({ id: 2, txnType: TxnType.PAYMENT_RECEIVED, txnId: null, debit: '0', credit: '28882200', balance: '-2999000', note: 'Thanh toán vượt dư nợ (trả trước 2.999.000 ₫)' }),
      ],
      agingBuckets: [],
      totalOutstanding: 0,
      unpaidTrips: [],
    });
    mocks.getCustomerStatement.mockImplementation((_id: number, range?: { dateFrom?: string; dateTo?: string }) =>
      range ? Promise.resolve({ ...profile, periodSummary: undefined }) : Promise.resolve(profile));
    mount();
    await screen.findByRole('heading', { name: 'Chi tiết & chứng từ công nợ' });

    expect(screen.getByText('Đã trả trước')).toBeTruthy();
    expect(screen.getByText('2.999.000 ₫')).toBeTruthy();
    expect(screen.getByText(/không nằm trong nhóm tuổi nợ/)).toBeTruthy();
  });
});
