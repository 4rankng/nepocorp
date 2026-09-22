// Regression (kanban 20260922_33): a truck that is free while its DEFAULT driver is
// already hauling on another truck must not render as plain "Sẵn sàng" with the bare
// driver name — dispatch read that as "this driver is available here" and double-booked
// them. The row now carries the busy note and a distinct "Chờ tài xế" strip.

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { FleetGrid } from './FleetGrid';
import type { Driver, Truck } from '../utils';
import type { NormalizedTrip } from '../../../hooks/useTripQueries';

afterEach(cleanup);

const trucks: Truck[] = [
  { id: 1, licensePlate: '15C-136.31', status: 'ACTIVE' },
  { id: 2, licensePlate: '15C-180.99', status: 'ACTIVE' },
  { id: 3, licensePlate: '15C-200.00', status: 'ACTIVE' },
];

const drivers: Driver[] = [
  { id: 10, name: 'Nguyễn Văn Thụ', assignedTruckId: 2, status: 'ACTIVE' },
  { id: 11, name: 'Trần Văn Rảnh', assignedTruckId: 3, status: 'ACTIVE' },
];

const runningTrip = {
  id: 900,
  truckId: 1,
  truckPlate: '15C-136.31',
  driverId: 10,
  driverName: 'Nguyễn Văn Thụ',
  tripCode: 'TRP-202609-9001',
  routeName: 'Nam Đình Vũ → Cẩm Khê',
  customerName: 'CÔNG TY NITODA',
} as unknown as NormalizedTrip;

it('flags a free truck whose default driver is hauling on another truck', () => {
  render(<FleetGrid trucks={trucks} activeTrips={[runningTrip]} drivers={drivers} onTripClick={() => {}} />);

  // Truck 2 is free, but its default driver (Thụ) is on truck 1.
  const busyNote = screen.getByText(/\(Đang chạy xe 15C-136\.31\)/);
  expect(busyNote).toBeTruthy();
  expect(busyNote.closest('.fleet-driver')?.textContent).toContain('Nguyễn Văn Thụ');

  // The row must not advertise a plain ready state for that driver.
  const rows = Array.from(document.querySelectorAll('.fleet-row'));
  const truck2Row = rows.find((row) => row.textContent?.includes('15C-180.99'));
  expect(truck2Row?.querySelector('.driver-busy-note')).toBeTruthy();
});

it('leaves a genuinely free truck and the running truck untouched', () => {
  render(<FleetGrid trucks={trucks} activeTrips={[runningTrip]} drivers={drivers} onTripClick={() => {}} />);

  const rows = Array.from(document.querySelectorAll('.fleet-row'));
  const truck1Row = rows.find((row) => row.textContent?.includes('15C-136.31'))!;
  const truck3Row = rows.find((row) => row.textContent?.includes('15C-200.00'))!;

  // The truck the driver is actually on keeps showing the live trip, no busy note.
  expect(truck1Row.querySelector('.driver-busy-note')).toBeNull();
  expect(truck1Row.textContent).toContain('CÔNG TY NITODA');

  // A truck whose own default driver is free stays a normal ready row.
  expect(truck3Row.querySelector('.driver-busy-note')).toBeNull();
  expect(truck3Row.textContent).toContain('Trần Văn Rảnh');
});
