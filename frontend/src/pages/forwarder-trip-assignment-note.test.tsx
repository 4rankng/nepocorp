import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import ForwarderTripDetailPage from './ForwarderTripDetailPage';

const mocks = vi.hoisted(() => ({ trip: vi.fn() }));
const mutation = () => ({ mutate: vi.fn(), isPending: false });
vi.mock('../hooks/useQueries', () => ({
  useForwarderTripDetail: mocks.trip,
  useCreateForwarderContainer: () => mutation(),
  useCreateForwarderExpense: () => mutation(),
  useDeleteForwarderExpense: () => mutation(),
}));
vi.mock('../hooks/useForwarderQueries', () => ({
  useUpdateForwarderExpense: () => mutation(),
  useSetForwarderExpenseCompletion: () => mutation(),
}));
vi.mock('@tanstack/react-query', () => ({ useQuery: () => ({ data: { items: [] } }) }));
vi.mock('../hooks/useCatalogs', () => ({ useCatalogs: () => ({ data: {} }) }));
vi.mock('../hooks/animations', () => ({ usePageAnimations: () => ({ rootRef: { current: null } }) }));
vi.mock('../hooks/useBackShortcut', () => ({ useBackShortcut: vi.fn() }));
afterEach(cleanup);

function tripWith(driver: { driverId: number | null; driverName: string | null }) {
  mocks.trip.mockReturnValue({
    data: {
      id: 384,
      tripCode: 'TRP-202610-0030',
      status: 'CREATED',
      departureDate: '2026-10-11',
      routeName: 'Hải Phòng - Đông Anh, Hà Nội',
      truckPlate: null,
      customerName: 'CÔNG TY CỔ PHẦN NITODA',
      containers: [],
      expenses: [],
      legs: [],
      completionScopes: [],
      ...driver,
    },
    isLoading: false,
    error: null,
  });
}

it('explains that driver assignment belongs to Quản lý when no driver is assigned', () => {
  tripWith({ driverId: null, driverName: null });
  const view = render(<MemoryRouter><ForwarderTripDetailPage /></MemoryRouter>);

  expect(view.container.textContent).toContain('Chưa phân công');
  expect(view.container.textContent).toContain('Chuyến chưa được phân công lái xe');
  expect(view.container.textContent).toContain('Quản lý điều vận');
  // The portal must not pretend it can assign the driver itself.
  expect(screen.queryByRole('button', { name: /phân công|gán lái xe/i })).toBeNull();
});

it('shows the assigned driver and drops the ownership note', () => {
  tripWith({ driverId: 3, driverName: 'Nguyễn Văn A' });
  const view = render(<MemoryRouter><ForwarderTripDetailPage /></MemoryRouter>);

  expect(view.container.textContent).toContain('Nguyễn Văn A');
  expect(view.container.textContent).not.toContain('Chuyến chưa được phân công lái xe');
});
