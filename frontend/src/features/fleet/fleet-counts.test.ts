import { describe, expect, it } from 'vitest';
import { countFleetDrivers, driverTruckId } from './fleet-counts';

const driver = (assignedTruckId: number | null, status = 'ACTIVE') => ({ assignedTruckId, status });

describe('fleet driver assignment counts', () => {
  it('agrees with the table rows and the footer of the same driver list', () => {
    // The reported shape of /fleet: 7 drivers, 4 paired with a truck, one of
    // them INACTIVE — the floor said "4/6 phân xe" over a table of 7 whose
    // footer read "3 lái xe chưa được phân xe".
    const drivers = [
      driver(4), driver(3), driver(2), driver(1),
      driver(null), driver(null), driver(null, 'INACTIVE'),
    ];
    const truckIds = new Set([1, 2, 3, 4, 47]);

    const counts = countFleetDrivers(drivers, truckIds);

    expect(counts).toEqual({ total: 7, active: 6, assigned: 4, unassigned: 3 });
    expect(counts.assigned + counts.unassigned).toBe(counts.total);
  });

  it('counts a driver whose truck left the fleet as unassigned', () => {
    // The table renders "— Chưa phân —" for a dangling truck id, so the
    // summary must not claim that driver is phân xe.
    const counts = countFleetDrivers([driver(999)], new Set([1, 2]));

    expect(counts).toEqual({ total: 1, active: 1, assigned: 0, unassigned: 1 });
  });

  it('accepts the truck map the fleet page already holds', () => {
    const truckMap = new Map([[7, { licensePlate: '15C-136.31' }]]);

    expect(countFleetDrivers([driver(7)], truckMap).assigned).toBe(1);
  });

  it('treats an empty or missing truck id as unassigned', () => {
    expect(driverTruckId({ assignedTruckId: null }, new Set([1]))).toBeNull();
    expect(driverTruckId({}, new Set([1]))).toBeNull();
    expect(driverTruckId({ assignedTruckId: 1 }, new Set([1]))).toBe(1);
  });
});
