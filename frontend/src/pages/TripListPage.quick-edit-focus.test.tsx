import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
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
  status: TripStatus.CREATED,
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

/**
 * Types one character the way the browser does: into whatever is focused.
 * A character typed while focus has fallen back to <body> is lost — exactly the
 * defect where the cell remounts on the first keystroke (card 20260922_31).
 */
function typeIntoFocusedField(text: string) {
  for (const char of text) {
    const active = document.activeElement;
    if (!(active instanceof HTMLInputElement)) continue;
    fireEvent.change(active, { target: { value: active.value + char } });
  }
}

function mount() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const view = render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/trips']}>
        <TripListPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { view, queryClient };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.listTrips.mockResolvedValue({ items: [TRIP], total: 1 });
  mocks.summary.mockResolvedValue({ statusCounts: {}, truckOptions: [], customerOptions: [] });
});

afterEach(cleanup);

describe('quick-edit money inputs', () => {
  it('keeps one focused input for the whole typed amount instead of remounting per keystroke', async () => {
    const { queryClient } = mount();

    fireEvent.click(await waitFor(() => {
      const button = document.querySelector<HTMLButtonElement>('button[aria-label="Bật chế độ sửa nhanh"]');
      if (!button) throw new Error('quick-edit toggle not rendered yet');
      return button;
    }));

    const input = await waitFor(() => {
      const el = document.querySelector<HTMLInputElement>('.col-revenue .quick-money-input');
      if (!el) throw new Error('revenue quick-edit input not rendered yet');
      return el;
    });

    input.focus();
    expect(document.activeElement).toBe(input);

    typeIntoFocusedField('15000000');

    // Same element instance: the cell must not be remounted while typing.
    expect(document.querySelector('.col-revenue .quick-money-input')).toBe(input);
    expect(document.activeElement).toBe(input);
    expect(input.value).toBe('15000000');

    queryClient.clear();
  });
});
