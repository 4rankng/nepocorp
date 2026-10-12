import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import FleetPage from './FleetPage';

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  useQuery: () => ({
    data: [
      { id: 21, licensePlate: '15R-067.95', type: 'FT40', status: 'ACTIVE' },
      { id: 22, licensePlate: '15R-050.37', type: 'FT40', status: 'ACTIVE' },
    ],
  }),
}));

vi.mock('../hooks/useCatalogQueries', () => ({
  useTrucksAndDrivers: () => ({
    data: {
      trucks: [
        { id: 11, licensePlate: '15C-136.31', status: 'ACTIVE' },
        { id: 12, licensePlate: '15C-139.82', status: 'ACTIVE', currentTrailerId: 21 },
      ],
      drivers: [],
    },
  }),
}));

vi.mock('../hooks/useCRUD', () => ({
  useCRUD: () => ({}),
}));

vi.mock('../hooks/animations', () => ({
  usePageAnimations: () => ({ rootRef: { current: null } }),
}));

vi.mock('../hooks/useVehicleSchedules', () => ({
  useAllActiveVehicleSchedules: () => ({
    data: [
      { id: 41, title: 'Đăng kiểm tháng tới', vehicleComponent: 'TRUCK', vehicleId: 11 },
      { id: 42, title: 'Lịch của xe đã xóa', vehicleComponent: 'TRUCK', vehicleId: 999 },
    ],
    isError: false,
    refetch: vi.fn(),
  }),
  useVehicleScheduleHistory: () => ({
    data: [],
    isLoading: false,
  }),
  useVehicleScheduleMutations: () => ({
    create: { isPending: false, mutateAsync: vi.fn() },
    update: { isPending: false, mutateAsync: vi.fn() },
    complete: { isPending: false, mutateAsync: vi.fn() },
    cancel: { isPending: false, mutateAsync: vi.fn() },
  }),
}));

vi.mock('../features/fleet', () => ({
  TRUCK_STATUS: {},
  fleetStyles: {},
}));

vi.mock('../components/UI', () => ({
  PageHeader: ({ title, action }: { title: string; action?: ReactNode }) => (
    <header>
      <h1>{title}</h1>
      {action}
    </header>
  ),
  Btn: ({ children, onClick }: { children: ReactNode; onClick?: () => void }) => (
    <button type="button" onClick={onClick}>{children}</button>
  ),
  KPI: () => null,
}));

vi.mock('../components/shared/Breadcrumbs', () => ({
  Breadcrumbs: () => null,
}));

vi.mock('../features/fleet/truck-card', () => ({
  TruckCard: () => null,
}));

vi.mock('../features/fleet/trailer-card', () => ({
  TrailerCard: () => null,
}));

vi.mock('../features/fleet/driver-card', () => ({
  DriverCard: () => null,
}));

vi.mock('../features/fleet/schedules/VehicleScheduleBanner', () => ({
  VehicleScheduleBanner: ({ items }: { items: Array<{ title: string }> }) => (
    <div data-testid="fleet-schedule-banner">{items.map(item => item.title).join(',')}</div>
  ),
}));

vi.mock('../features/fleet/schedules/VehicleScheduleVehiclePicker', () => ({
  VehicleScheduleVehiclePicker: ({
    isOpen,
    onSelect,
    trailers,
  }: {
    isOpen: boolean;
    onSelect: (
      vehicleComponent: 'TRUCK' | 'TRAILER',
      vehicle: { id: number; plate: string; meta: string },
    ) => void;
    trailers: Array<{ id: number; plate: string; meta: string }>;
  }) => isOpen ? (
    <>
      <button
        type="button"
        onClick={() => onSelect('TRUCK', {
          id: 11,
          plate: '15C-136.31',
          meta: 'Hoạt động',
        })}
      >
        Chọn xe đầu kéo 15C-136.31
      </button>
      {trailers.map(t => (
        <div key={t.id}>{t.plate} {t.meta}</div>
      ))}
    </>
  ) : null,
}));

vi.mock('../features/fleet/schedules/VehicleScheduleManager', () => ({
  VehicleScheduleManager: ({
    isOpen,
    initialMode,
    vehiclePlate,
  }: {
    isOpen: boolean;
    initialMode: string;
    vehiclePlate: string;
  }) => isOpen ? (
    <div data-testid="vehicle-schedule-manager">
      {initialMode}:{vehiclePlate}
    </div>
  ) : null,
}));

describe('FleetPage scheduling action', () => {
  it('passes future reminders for operational vehicles to the banner and excludes removed vehicles', () => {
    render(
      <MemoryRouter>
        <FleetPage />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('fleet-schedule-banner').textContent).toBe('Đăng kiểm tháng tới');
  });

  it('uses the exact Thêm lịch label and opens creation for the selected vehicle', () => {
    render(
      <MemoryRouter>
        <FleetPage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Thêm lịch' }));
    fireEvent.click(screen.getByRole('button', { name: 'Chọn xe đầu kéo 15C-136.31' }));

    expect(screen.getByTestId('vehicle-schedule-manager').textContent)
      .toBe('create:15C-136.31');
  });

  /**
   * The picker's rơ-moóc rows name the tractor holding each trailer — the same
   * secondary info as the fleet truck dialog — with a fallback for unpaired
   * ones (kanban 091026010130).
   */
  it('labels each rơ-moóc row with the paired tractor and falls back for unpaired trailers', () => {
    render(
      <MemoryRouter>
        <FleetPage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Thêm lịch' }));

    expect(screen.getByText(/15R-067\.95/).textContent).toContain('đang ghép 15C-139.82');
    expect(screen.getByText(/15R-050\.37/).textContent).toContain('trống');
  });
});
