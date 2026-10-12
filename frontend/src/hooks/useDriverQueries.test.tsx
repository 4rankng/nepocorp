import type { ReactNode } from 'react';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DriverTripRow, DriverTripsPageData } from '../api/driverClient';
import { useDriverEarnings, useDriverTrips } from './useDriverQueries';

// The bug under pinning (kanban 101026004000): the driver portal's queries
// used to cache under account-agnostic keys, so opening the screen for the
// next account rendered the previous account's rows before the refetch
// corrected them. These tests hold the account identity as the only variable.
const mocks = vi.hoisted(() => ({
  user: { userId: 1 } as { userId: number } | null,
  getTrips: vi.fn(),
  getEarnings: vi.fn(),
}));
vi.mock('./useAuth', () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock('../api/driverClient', () => ({
  driverClient: { getTrips: mocks.getTrips, getEarnings: mocks.getEarnings },
}));

function tripRow(id: number, routeName: string): DriverTripRow {
  return {
    id,
    departureDate: '2026-10-01',
    status: 'COMPLETED',
    driverSalary: '500000',
    routeName,
    truckPlate: '51C-000.00',
    customerName: 'Khách hàng',
    containerNumbers: [],
  };
}
function tripPage(items: DriverTripRow[]): DriverTripsPageData {
  return { items, total: items.length, page: 1, pageSize: 20, statusCounts: { COMPLETED: items.length } };
}
function earnings(payableBalance: string) {
  return {
    baseSalary: '5000000',
    tripIncome: '0',
    penalties: '0',
    netIncome: '5000000',
    productionSalary: '1000000',
    roadAllowance: '200000',
    paidOrAdvanced: '0',
    payableBalance,
  };
}

let client: QueryClient;
// Same shape as usePersistedContainerType.test.tsx: the frontend's TS lib
// predates ES2024, so Promise.withResolvers is untyped here.
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}
function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  mocks.user = { userId: 1 };
});
afterEach(() => {
  cleanup();
  client.clear();
  vi.clearAllMocks();
});

describe('driver account cache isolation', () => {
  it('never renders the previous account trips for the next account', async () => {
    mocks.getTrips.mockResolvedValue(tripPage([tripRow(1, 'Tuyến của tài khoản 1')]));
    const { result, rerender } = renderHook(() => useDriverTrips({ page: 1, limit: 20 }), { wrapper });
    await waitFor(() => expect(result.current.data?.items[0]?.routeName).toBe('Tuyến của tài khoản 1'));

    // The next account's rows are still in flight at the moment of the switch:
    // nothing from the previous account may show in that window.
    const pending = deferred<unknown>();
    mocks.getTrips.mockReturnValue(pending.promise);
    mocks.user = { userId: 2 };
    rerender();
    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBe(true);

    pending.resolve(tripPage([tripRow(2, 'Tuyến của tài khoản 2')]));
    await waitFor(() => expect(result.current.data?.items[0]?.routeName).toBe('Tuyến của tài khoản 2'));
  });

  it('never renders the previous account earnings on the finance screen', async () => {
    mocks.getEarnings.mockResolvedValue(earnings('3050000'));
    const { result, rerender } = renderHook(() => useDriverEarnings(9, 2026), { wrapper });
    await waitFor(() => expect(result.current.data?.payableBalance).toBe('3050000'));

    const pending = deferred<unknown>();
    mocks.getEarnings.mockReturnValue(pending.promise);
    mocks.user = { userId: 2 };
    rerender();
    expect(result.current.data).toBeUndefined();

    pending.resolve(earnings('777000'));
    await waitFor(() => expect(result.current.data?.payableBalance).toBe('777000'));
  });

  it('keeps this account rows on screen while the next page loads', async () => {
    mocks.getTrips.mockResolvedValue(tripPage([tripRow(1, 'Trang 1')]));
    const { result, rerender } = renderHook(
      ({ page }: { page: number }) => useDriverTrips({ page, limit: 20 }),
      { wrapper, initialProps: { page: 1 } },
    );
    await waitFor(() => expect(result.current.data?.items[0]?.routeName).toBe('Trang 1'));

    const pending = deferred<unknown>();
    mocks.getTrips.mockReturnValue(pending.promise);
    rerender({ page: 2 });
    expect(result.current.data?.items[0]?.routeName).toBe('Trang 1');

    pending.resolve(tripPage([tripRow(2, 'Trang 2')]));
    await waitFor(() => expect(result.current.data?.items[0]?.routeName).toBe('Trang 2'));
  });

  it('fetches nothing for a signed-out account', () => {
    mocks.user = null;
    renderHook(() => useDriverTrips({ page: 1, limit: 20 }), { wrapper });
    renderHook(() => useDriverEarnings(9, 2026), { wrapper });
    expect(mocks.getTrips).not.toHaveBeenCalled();
    expect(mocks.getEarnings).not.toHaveBeenCalled();
  });
});
