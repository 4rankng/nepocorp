// NEPO-14 — the dashboard decision item deep-links `/trips?status=COMPLETED`.
// TripListPage must honour the URL status once at mount (the route previously
// landed on the UNFILTERED list — the link looked broken), while unknown
// values fall back to no filter instead of poisoning the query.
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Role, TripStatus, type TripDetail } from '@tingting/shared';
import TripListPage from './TripListPage';

const mocks = vi.hoisted(() => ({ listTrips: vi.fn(), summary: vi.fn(), bulk: vi.fn() }));

vi.mock('../api/tripClient', () => ({
  tripClient: {
    listTrips: mocks.listTrips,
    getTripsSummary: mocks.summary,
    bulkUpdateTripFigures: mocks.bulk,
  },
}));
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 1, username: 'admin', role: Role.ADMIN } }),
}));
vi.mock('../hooks/useMonth', () => ({
  useMonth: () => ({ month: 9, year: 2026, setMonthYear: vi.fn() }),
}));
vi.mock('../hooks/useQueries', () => ({ useFuelConfig: () => ({ data: undefined }) }));
vi.mock('../hooks/animations', () => ({
  usePageAnimations: () => ({ rootRef: { current: null } }),
  useListAnimations: () => ({ rootRef: { current: null } }),
}));

const TRIP = {
  id: 1165,
  tripCode: 'TRP-202609-0048',
  status: TripStatus.COMPLETED,
  departureDate: '2026-09-12',
  customer: { id: 3, name: 'CÔNG TY TNHH VẬN TẢI BIỂN ĐÔNG' },
  route: { id: 7, name: 'Nam Đình Vũ → Cẩm Khê, Phú Thọ' },
  tripsRoute: { distance: 240 },
  carrierType: 'OWN',
  truck: { id: 5, licensePlate: '15C-123.45' },
  revenue: '0',
  totalCost: '0',
  totalRoadAllowance: '0',
  driverSalary: '0',
  fuelLiters: '0',
  containers: [],
} as unknown as TripDetail;

function mount(initialEntry: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <TripListPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function lastStatus(): string | undefined {
  const call = mocks.listTrips.mock.calls.at(-1)?.[0] as { status?: string } | undefined;
  return call?.status;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.listTrips.mockResolvedValue({ items: [TRIP], total: 1 });
  mocks.summary.mockResolvedValue({ statusCounts: {}, truckOptions: [], customerOptions: [] });
});

afterEach(cleanup);

describe('TripListPage URL status deep-link (NEPO-14)', () => {
  it('queries with status=COMPLETED for /trips?status=COMPLETED', async () => {
    mount('/trips?status=COMPLETED');
    await vi.waitFor(() => expect(mocks.listTrips).toHaveBeenCalled());
    expect(lastStatus()).toBe('COMPLETED');
  });

  it('falls back to no filter for an unknown status value', async () => {
    mount('/trips?status=GARBAGE');
    await vi.waitFor(() => expect(mocks.listTrips).toHaveBeenCalled());
    expect(['', undefined]).toContain(lastStatus());
  });

  it('keeps the plain /trips entry unfiltered', async () => {
    mount('/trips');
    await vi.waitFor(() => expect(mocks.listTrips).toHaveBeenCalled());
    expect(['', undefined]).toContain(lastStatus());
  });
});
