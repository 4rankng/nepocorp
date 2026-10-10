import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type * as AdvanceQueries from '../hooks/useForwarderQueries';
import { ToastProvider } from '../components/shared/Toast';
import SettlementPrintPage from './SettlementPrintPage';

/**
 * The print page reads five mutation hooks inline (`.isPending` / `.error`).
 * A hook that hands back nothing — a module the dev server is midway through
 * replacing, a hook disabled for the role, a mocked module — used to take the
 * whole route down with `Cannot read properties of undefined (reading
 * 'isPending')` (kanban 101026101500). Missing hooks must read as "nothing in
 * flight", never as a crash.
 */

const expense = {
  id: 5,
  tripId: 42,
  expenseType: 'LIFTING',
  buyAmount: '500000',
  containerNumber: 'TLLU5759252',
  invoiceNumber: null,
  note: null,
  tripCode: 'TRP-202610-0042',
  departureDate: '2026-10-02',
  customerName: 'Công ty Biển Bạc',
  routeName: 'Hải Phòng – Hà Nội',
  tripContainerCount: 1,
};

const settlement = {
  id: 7,
  code: 'PT-2610-0007',
  forwarderId: 6,
  forwarderName: 'Nguyễn Sĩ Quân',
  totalExpenseAmount: '500000',
  refundAmount: '0',
  reimbursementAmount: '500000',
  status: 'PENDING',
  note: null,
  createdAt: '2026-10-07T00:00:00.000Z',
  linkedRequests: [{ id: 11, amount: '500000', reason: 'Tạm ứng nâng hạ', status: 'APPROVED', createdAt: '2026-10-01' }],
  linkedExpenses: [expense],
  eligibleAdvanceRequests: [],
  eligibleExpenses: [expense],
};

const mocks = vi.hoisted(() => ({
  role: 'ACCOUNTANT' as string,
  /** Each key is what the matching hook returns; undefined = "the hook returned nothing". */
  returns: {} as Record<string, unknown>,
}));

const loaded = (data: unknown) => ({ data, refetch: vi.fn(), isLoading: false, error: null });

vi.mock('../hooks/useForwarderQueries', async (importOriginal) => ({
  ...(await importOriginal<typeof AdvanceQueries>()),
  useForwarderSettlementDetail: () => loaded(settlement),
  useAdminSettlementDetail: () => loaded(settlement),
  useUpdateAdvanceSettlement: () => mocks.returns.update,
  useUpdateMyAdvanceSettlement: () => mocks.returns.updateMine,
  useUpdateSettlementExpense: () => mocks.returns.expense,
  useApproveSettlement: () => mocks.returns.approve,
  useRejectSettlement: () => mocks.returns.reject,
}));
vi.mock('../hooks/useAuth', () => ({ useAuth: () => ({ user: { role: mocks.role } }) }));
vi.mock('../hooks/animations', () => ({ usePageAnimations: () => ({ rootRef: { current: null } }) }));
vi.mock('../hooks/useBackShortcut', () => ({ useBackShortcut: vi.fn() }));
vi.mock('../lib/download', () => ({ downloadBlob: vi.fn() }));

function mount() {
  return render(
    <MemoryRouter initialEntries={['/settlements/7']}>
      <ToastProvider>
        <Routes>
          <Route path="/settlements/:id" element={<SettlementPrintPage />} />
        </Routes>
      </ToastProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mocks.role = 'ACCOUNTANT';
  mocks.returns = {};
});
afterEach(cleanup);

describe('settlement print tolerates hooks that return nothing (kanban 101026101500)', () => {
  it('renders the sheet, its sign-off buttons and its finalize button with every mutation hook undefined', () => {
    mount();

    expect(screen.getByText('PT-2610-0007')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Duyệt' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Từ chối' })).toBeTruthy();
    expect(screen.getByText('Sửa và hoàn tất')).toBeTruthy();
  });

  it('renders the expense adjustment editor when the adjustment hook returns undefined', () => {
    mount();

    // Opening the editor is what reads `updateExpense.isPending`.
    fireEvent.click(screen.getByRole('button', { name: 'Sửa' }));
    expect(screen.getByText('Lưu điều chỉnh')).toBeTruthy();
  });

  it('renders the portal save button when the portal hook returns undefined', () => {
    mocks.role = 'FORWARDER';
    mount();

    expect(screen.getByText('Lưu thay đổi')).toBeTruthy();
  });

  it('shows a mutation error message without reaching for a missing hook', () => {
    mocks.returns = { update: { isPending: false, error: new Error('Không có quyền thay đổi') } };
    mount();

    // The page renders `String(error)`, so match the message as a substring.
    expect(screen.getByText(/Không có quyền thay đổi/)).toBeTruthy();
  });

  it('still holds both sign-off buttons while one decision is in flight', () => {
    mocks.returns = { approve: { isPending: true, variables: 7 } };
    mount();

    expect((screen.getByRole('button', { name: 'Duyệt' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Từ chối' }) as HTMLButtonElement).disabled).toBe(true);
  });
});
