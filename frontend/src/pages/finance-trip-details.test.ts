import { describe, expect, it } from 'vitest';
import type { TripDetail } from '@tingting/shared';
import { financeVehicleBucketId, toFinanceTripDetail } from './finance-trip-details';

const trip = (overrides: Partial<TripDetail> = {}): TripDetail => ({
  id: 12,
  tripCode: 'LC-0012',
  departureDate: '2026-07-10',
  carrierType: 'OWN',
  truckId: 7,
  vatRate: '0.08',
  revenue: '10800000',
  totalFuelCost: '3000000',
  totalRoadAllowance: '1200000',
  tollCost: '220000',
  tollsDiscount: '80000',
  driverSalary: '500000',
  twoPointDeliveryBonus: '100000',
  vehicleShiftAllowance: '200000',
  totalCost: '5300000',
  route: { name: 'Hải Phòng – Hà Nội' },
  ...overrides,
} as TripDetail);

describe('finance trip detail', () => {
  it('reconstructs own-truck cost inputs and ex-VAT revenue', () => {
    const detail = toFinanceTripDetail(trip());

    expect(detail.revenue).toBe(10_000_000);
    expect(detail.tollAndCompanyTickets).toBe(300_000);
    expect(detail.driverAndAllowances).toBe(800_000);
    expect(detail.totalCost).toBe(5_300_000);
    expect(detail.profit).toBe(4_700_000);
    expect(detail.costMatches).toBe(true);
    expect(detail.costDifference).toBe(0);
  });

  it('flags a stored total that does not match its visible inputs', () => {
    const detail = toFinanceTripDetail(trip({ totalCost: '5400000' }));

    expect(detail.costMatches).toBe(false);
    expect(detail.costDifference).toBe(100_000);
  });

  it('uses external hire cost and the external vehicle bucket', () => {
    const external = trip({
      carrierType: 'EXTERNAL',
      truckId: null as unknown as number,
      externalFreightCost: '7000000',
      totalCost: '7000000',
    });
    const detail = toFinanceTripDetail(external);

    expect(financeVehicleBucketId(external)).toBe(0);
    expect(detail.fuelOrHireCost).toBe(7_000_000);
    expect(detail.roadAllowance).toBe(0);
    expect(detail.costMatches).toBe(true);
  });
});

