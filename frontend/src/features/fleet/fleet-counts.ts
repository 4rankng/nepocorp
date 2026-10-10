/**
 * One definition of "phân xe" for the whole fleet screen.
 *
 * The KPI ratio, the Lái xe table cell and the table footer each counted
 * assignment their own way, so they disagreed: the floor showed
 * "4/6 phân xe" over a table of 7 drivers whose footer said
 * "3 lái xe chưa được phân xe" (kanban 101026101500). Everything now comes
 * from driverTruckId/countFleetDrivers, over the same driver set the panel
 * lists.
 */

export interface TruckIdLookup {
  has(id: number): boolean;
}

export interface FleetDriverCounts {
  /** Drivers in the catalog — the Lái xe table lists exactly one row each. */
  total: number;
  /** Drivers with status ACTIVE ("đang làm"). */
  active: number;
  /** Drivers paired with a truck that is in the fleet. */
  assigned: number;
  /** total - assigned — the footer's "chưa được phân xe". */
  unassigned: number;
}

/**
 * The truck a driver is paired with, or null when there is none.
 *
 * A driver pointing at a truck that is no longer in the fleet reads
 * "— Chưa phân —" in the table, so they must not be counted as assigned.
 */
export function driverTruckId(
  driver: { assignedTruckId?: number | null },
  knownTruckIds: TruckIdLookup,
): number | null {
  const truckId = driver.assignedTruckId;
  return truckId != null && knownTruckIds.has(truckId) ? truckId : null;
}

export function countFleetDrivers(
  drivers: ReadonlyArray<{ assignedTruckId?: number | null; status?: string }>,
  knownTruckIds: TruckIdLookup,
): FleetDriverCounts {
  let active = 0;
  let assigned = 0;
  for (const driver of drivers) {
    if (driver.status === 'ACTIVE') active += 1;
    if (driverTruckId(driver, knownTruckIds) !== null) assigned += 1;
  }
  return { total: drivers.length, active, assigned, unassigned: drivers.length - assigned };
}
