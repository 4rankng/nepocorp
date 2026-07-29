import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import FleetPage from './FleetPage';

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  useQuery: () => ({ data: [] }),
}));

vi.mock('../hooks/useCatalogQueries', () => ({
  useTrucksAndDrivers: () => ({ data: { trucks: [], drivers: [] } }),
}));

vi.mock('../hooks/useCRUD', () => ({
  useCRUD: () => ({}),
}));

vi.mock('../hooks/animations', () => ({
  usePageAnimations: () => ({ rootRef: { current: null } }),
}));

vi.mock('../hooks/useVehicleSchedules', () => ({
  useActiveVehicleSchedules: () => ({
    data: [],
    isError: false,
    refetch: vi.fn(),
  }),
  useAllActiveVehicleSchedules: () => ({
    data: [],
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
  VehicleScheduleBanner: () => null,
}));

vi.mock('../features/fleet/schedules/VehicleScheduleVehiclePicker', () => ({
  VehicleScheduleVehiclePicker: ({
    isOpen,
    onSelect,
  }: {
    isOpen: boolean;
    onSelect: (
      vehicleComponent: 'TRUCK' | 'TRAILER',
      vehicle: { id: number; plate: string; meta: string },
    ) => void;
  }) => isOpen ? (
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
});
