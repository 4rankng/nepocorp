import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import ForwarderTripDetailPage from './ForwarderTripDetailPage';

const mocks = vi.hoisted(() => ({
  trip: vi.fn(),
  assignTripDriver: vi.fn(),
  invalidateQueries: vi.fn(),
}));
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
vi.mock('../api/forwarderClient', () => ({
  forwarderClient: {
    listSuppliers: vi.fn(),
    listDrivers: vi.fn(),
    assignTripDriver: mocks.assignTripDriver,
  },
}));
vi.mock('@tanstack/react-query', () => ({
  useQuery: () => ({ data: { items: [{ id: 3, name: 'Nguyễn Văn A' }, { id: 5, name: 'Trần Thị B' }] } }),
  useQueryClient: () => ({ invalidateQueries: mocks.invalidateQueries }),
}));
vi.mock('../hooks/useCatalogs', () => ({ useCatalogs: () => ({ data: {} }) }));
vi.mock('../hooks/animations', () => ({ usePageAnimations: () => ({ rootRef: { current: null } }) }));
vi.mock('../hooks/useBackShortcut', () => ({ useBackShortcut: vi.fn() }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

function tripWith(driver: { driverId: number | null; driverName: string | null }, status = 'CREATED') {
  mocks.trip.mockReturnValue({
    data: {
      id: 384,
      tripCode: 'TRP-202610-0030',
      status,
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

// Mounted on the real route so `useParams` yields the trip id the page saves to.
function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/my-forwarder-trips/384']}>
      <Routes>
        <Route path="/my-forwarder-trips/:id" element={<ForwarderTripDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

it('lets the Giao nhận user pick and save a driver on an unassigned trip', async () => {
  tripWith({ driverId: null, driverName: null });
  renderPage();

  expect(screen.getByText('Chưa phân công')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Gán lái xe' }));

  // The picker offers the driver list — the catalog bootstrap has none for
  // portal roles, so the portal fetches its own (kanban 101026005000).
  const picker = screen.getByRole('combobox', { name: 'Chọn lái xe' });
  expect(picker.textContent).toContain('Nguyễn Văn A');
  expect(picker.textContent).toContain('Trần Thị B');

  fireEvent.change(picker, { target: { value: '3' } });
  mocks.assignTripDriver.mockResolvedValue({ id: 384, driverId: 3 });
  fireEvent.click(screen.getByRole('button', { name: 'Lưu' }));

  await waitFor(() => expect(mocks.assignTripDriver).toHaveBeenCalledWith(384, 3));
  // The detail is refetched so the saved driver is what a reload would show.
  await waitFor(() => expect(mocks.invalidateQueries).toHaveBeenCalled());
  await waitFor(() => expect(screen.queryByRole('combobox', { name: 'Chọn lái xe' })).toBeNull());
});

it('shows the assigned driver and offers a change, with no stale ownership note', () => {
  tripWith({ driverId: 3, driverName: 'Nguyễn Văn A' });
  const view = renderPage();

  expect(view.container.textContent).toContain('Nguyễn Văn A');
  expect(screen.getByRole('button', { name: 'Đổi lái xe' })).toBeTruthy();
  expect(view.container.textContent).not.toContain('Chuyến chưa được phân công lái xe');
  expect(view.container.textContent).not.toContain('Chuyến đã xuất phát mà chưa phân công lái xe');
});

it('defers driver changes of a departed trip to Quản lý điều vận', () => {
  tripWith({ driverId: null, driverName: null }, 'IN_TRANSIT');
  const view = renderPage();

  expect(view.container.textContent).toContain('Chưa phân công');
  expect(view.container.textContent).toContain('Chuyến đã xuất phát mà chưa phân công lái xe');
  expect(view.container.textContent).toContain('Quản lý điều vận');
  expect(screen.queryByRole('button', { name: /gán lái xe|đổi lái xe/i })).toBeNull();
});

it('surfaces the save error instead of failing silently', async () => {
  tripWith({ driverId: null, driverName: null });
  renderPage();

  fireEvent.click(screen.getByRole('button', { name: 'Gán lái xe' }));
  fireEvent.change(screen.getByRole('combobox', { name: 'Chọn lái xe' }), { target: { value: '5' } });
  mocks.assignTripDriver.mockRejectedValue(new Error('Lái xe không tồn tại hoặc đã ngừng hoạt động'));
  fireEvent.click(screen.getByRole('button', { name: 'Lưu' }));

  const alert = await screen.findByRole('alert');
  expect(alert.textContent).toContain('Lái xe không tồn tại hoặc đã ngừng hoạt động');
  // The picker stays open so the user can pick another driver.
  expect(screen.getByRole('combobox', { name: 'Chọn lái xe' })).toBeTruthy();
});
