import { describe, expect, it } from 'vitest';
import type { PnlReport, PnlTripDetail } from '@tingting/shared';
import { deriveCostBreakdown } from './finance-derived';

const detail = (overrides: Partial<PnlTripDetail> = {}): PnlTripDetail => ({
  id: 1,
  tripCode: 'LC-0001',
  departureDate: '2026-10-02',
  routeName: 'Hải Phòng – Hà Nội',
  revenue: 0,
  customerCommission: 0,
  fuelOrHireCost: 0,
  roadAllowance: 0,
  tollAndCompanyTickets: 0,
  driverAndAllowances: 0,
  totalCost: 0,
  profit: 0,
  costDifference: 0,
  costMatches: true,
  isExternal: false,
  vehicleBucketId: 7,
  ...overrides,
});

const report = (overrides: Partial<PnlReport> = {}): PnlReport => ({
  period: { month: 10, year: 2026 },
  totalRevenue: 0,
  totalCosts: 0,
  grossProfit: 0,
  managementFee: 0,
  otherIncome: 0,
  netProfit: 0,
  tripCount: 0,
  trucks: [],
  maintenanceExpensesTotal: 0,
  maintenanceExpensesByTruck: {},
  maintenanceByComponent: {},
  companyExpenses: 0,
  categoryBreakdown: [],
  ...overrides,
});

describe('deriveCostBreakdown', () => {
  it('splits the report total into rows that add back up to it exactly', () => {
    // Local-dev October 2026 figures (kanban 101026013010): the donut used to
    // total 176,222,320 while the P&L showed a 151,026,765 subtotal.
    const breakdown = deriveCostBreakdown(report({
      totalCosts: 151_026_765,
      maintenanceExpensesTotal: 5_559_636,
      tripDetails: [
        detail({ id: 1, fuelOrHireCost: 70_000_000, roadAllowance: 30_000_000, driverAndAllowances: 4_000_000, tollAndCompanyTickets: 2_000_000, totalCost: 106_000_000 }),
        detail({ id: 2, fuelOrHireCost: 29_602_570, roadAllowance: 7_205_944, driverAndAllowances: 1_769_225, tollAndCompanyTickets: 889_390, totalCost: 39_467_129 }),
      ],
    }));

    expect(breakdown.fuel).toBe(99_602_570);
    expect(breakdown.road).toBe(37_205_944);
    expect(breakdown.driver).toBe(5_769_225);
    expect(breakdown.tolls).toBe(2_889_390);
    expect(breakdown.maintenance).toBe(5_559_636);
    expect(breakdown.total).toBe(151_026_765);

    const sum = breakdown.fuel + breakdown.road + breakdown.driver + breakdown.tolls + breakdown.maintenance;
    expect(sum).toBe(breakdown.total);
  });

  it('excludes external trips — their hire cost lives in the margin revenue line', () => {
    const breakdown = deriveCostBreakdown(report({
      totalCosts: 10_000_000,
      tripDetails: [
        detail({ id: 1, fuelOrHireCost: 6_000_000, roadAllowance: 3_000_000, totalCost: 9_000_000, vehicleBucketId: 7 }),
        detail({ id: 2, isExternal: true, fuelOrHireCost: 99_000_000, roadAllowance: 99_000_000, driverAndAllowances: 99_000_000, totalCost: 99_000_000, vehicleBucketId: 0 }),
      ],
    }));

    expect(breakdown.fuel).toBe(6_000_000);
    expect(breakdown.road).toBe(3_000_000);
    expect(breakdown.driver).toBe(0);
    expect(breakdown.tripCount).toBe(1);
  });

  it('counts the OWN trips behind the cost rows', () => {
    const breakdown = deriveCostBreakdown(report({
      tripDetails: [
        detail({ id: 1 }),
        detail({ id: 2 }),
        detail({ id: 3, isExternal: true }),
      ],
    }));

    expect(breakdown.tripCount).toBe(2);
  });

  it('absorbs an itemisation gap into the tolls row so the parts still sum to the total', () => {
    // totalCost beyond fuel+road+driver is tolls (tollCost + tollsDiscount) and,
    // if the backend ever itemises differently, any residue — never silently dropped.
    const breakdown = deriveCostBreakdown(report({
      totalCosts: 1_000_000,
      tripDetails: [detail({ id: 1, fuelOrHireCost: 400_000, roadAllowance: 300_000, driverAndAllowances: 200_000, totalCost: 1_000_000 })],
    }));

    expect(breakdown.tolls).toBe(100_000);
    expect(breakdown.fuel + breakdown.road + breakdown.driver + breakdown.tolls + breakdown.maintenance).toBe(1_000_000);
  });

  it('returns a zero breakdown for a missing report instead of NaN', () => {
    expect(deriveCostBreakdown(undefined)).toEqual({
      fuel: 0, road: 0, driver: 0, tolls: 0, maintenance: 0, total: 0, tripCount: 0,
    });
  });
});
