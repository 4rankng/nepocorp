import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { TripStatus } from '@tingting/shared';
import DriverTripsPage from './DriverTripsPage';
import ForwarderTripsPage from './ForwarderTripsPage';
import ForwarderSettlementsPage from './ForwarderSettlementsPage';

const mocks = vi.hoisted(() => ({
  driverTrips: vi.fn(), forwarderTrips: vi.fn(), settlements: vi.fn(), retry: vi.fn(),
}));
vi.mock('../hooks/useQueries', () => ({
  useDriverTrips: mocks.driverTrips,
  useForwarderTrips: mocks.forwarderTrips,
}));
vi.mock('../hooks/useForwarderQueries', () => ({ useForwarderSettlements: mocks.settlements }));
vi.mock('../hooks/useMonth', () => ({ useMonth: () => ({ month: 9, year: 2026 }) }));
vi.mock('../hooks/useCatalogs', () => ({ useCatalogs: () => ({ data: {} }) }));
vi.mock('../hooks/animations', () => ({
  usePageAnimations: () => ({ rootRef: { current: null } }),
  useListAnimations: () => ({ rootRef: { current: null } }),
  useCounterAnimation: () => ({ animateCounters: vi.fn() }),
}));
vi.mock('../hooks/usePrefersReducedMotion', () => ({ usePrefersReducedMotion: () => true }));
vi.mock('../design-system', async importOriginal => ({
  ...await importOriginal<typeof import('../design-system')>(),
  useDebouncedValue: (value: unknown) => value,
}));

const trip = { id: 1, status: TripStatus.CREATED, routeName: 'Hà Nội → Hải Phòng', departureDate: '2026-09-17', containerCount: 3 };
const success = (data: unknown) => ({ data, isLoading: false, error: null, refetch: mocks.retry });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.driverTrips.mockReturnValue(success({ items: [trip], total: 1, statusCounts: { CREATED: 1, COMPLETED: 4 } }));
  mocks.forwarderTrips.mockImplementation((_status, filters) => success(filters.search
    ? { items: [], counts: {} }
    : { items: [trip], counts: { CREATED: 1 } }));
  mocks.settlements.mockReturnValue(success({ items: [{ id: 1, code: 'TT-0001', status: 'PENDING', totalExpenseAmount: '1250000', refundAmount: '0', reimbursementAmount: '0', createdAt: '2026-09-17' }] }));
});
afterEach(cleanup);

it('keeps forwarder search available after zero matches and can clear it', () => {
  render(<MemoryRouter><ForwarderTripsPage /></MemoryRouter>);
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'missing-container' } });
  expect(screen.getByRole('textbox')).toHaveProperty('value', 'missing-container');
  expect(screen.getByText('Không tìm thấy chuyến đi')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Xóa bộ lọc' }));
  expect(screen.getByRole('textbox')).toHaveProperty('value', '');
  expect(screen.getByText(trip.routeName)).toBeTruthy();
});

it('renders actual forwarder totals when reduced motion skips counters', () => {
  const { container } = render(<MemoryRouter><ForwarderTripsPage /></MemoryRouter>);
  expect(container.querySelector('.hero-kpi-card__amount')?.textContent).toBe('1 chuyến');
  expect(container.querySelector('.hero-kpi-mini__value')?.textContent).toBe('3');
});

it('preserves forwarder search focus while the next query is loading', () => {
  mocks.forwarderTrips.mockImplementation((_status, filters) => filters.search
    ? { ...success(undefined), isLoading: true }
    : success({ items: [trip], counts: { CREATED: 1 } }));
  render(<MemoryRouter><ForwarderTripsPage /></MemoryRouter>);
  const search = screen.getByRole('textbox');
  search.focus();
  fireEvent.change(search, { target: { value: 'container' } });
  expect(screen.getByRole('textbox')).toBe(search);
  expect(document.activeElement).toBe(search);
  expect(screen.getByRole('status').textContent).toContain('Đang tải danh sách chuyến đi');
});

it('renders actual settlement money and counts without animations', () => {
  const { container } = render(<MemoryRouter><ForwarderSettlementsPage /></MemoryRouter>);
  expect(container.querySelector('.hero-kpi-card__amount')?.textContent).toBe('1.250.000₫');
  expect([...container.querySelectorAll('.hero-kpi-mini__value')].map(el => el.textContent)).toEqual(['1', '1']);
});

it('keeps the all-status count independent of the driver status filter', () => {
  render(<MemoryRouter><DriverTripsPage /></MemoryRouter>);
  expect(screen.getByRole('button', { name: /Tất cả/ }).textContent).toBe('Tất cả5');
});

it('keeps driver status filters reachable when the selected status becomes empty', () => {
  mocks.driverTrips.mockImplementation(({ status }) => success(status
    ? { items: [], total: 0, statusCounts: { COMPLETED: 4 } }
    : { items: [trip], total: 5, statusCounts: { CREATED: 1, COMPLETED: 4 } }));
  render(<MemoryRouter><DriverTripsPage /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: /Mới tạo/ }));
  expect(screen.getByRole('button', { name: /Tất cả/ })).toBeTruthy();
  expect(screen.getByText('Không có lệnh ở trạng thái này')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: /Tất cả/ }));
  expect(screen.getByText(trip.routeName)).toBeTruthy();
});

it('provides an explicit retry after a driver list request fails', () => {
  mocks.driverTrips.mockReturnValue({ ...success(undefined), error: new Error('offline') });
  render(<MemoryRouter><DriverTripsPage /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
  expect(mocks.retry).toHaveBeenCalledOnce();
});
