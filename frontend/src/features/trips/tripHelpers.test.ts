import { describe, expect, it } from 'vitest';
import { TripStatus, type TripDetail } from '@tingting/shared';
import {
  getAncillaryTripCostBreakdown,
  getExternalTripFinancials,
  getExternalTripPreviewGrossProfit,
  getMissingPlanFields,
  getTripDisplayGrossProfit,
  isTripToday,
} from './tripHelpers';

describe('isTripToday — Vietnam business day (kanban 20260921_1)', () => {
  it('uses the Vietnam midnight boundary, not the UTC day', () => {
    const justAfterVnMidnight = new Date('2026-09-20T17:00:00Z'); // 2026-09-21 00:00 VN
    expect(isTripToday('2026-09-21', justAfterVnMidnight)).toBe(true);
    expect(isTripToday('2026-09-20', justAfterVnMidnight)).toBe(false);

    const justBeforeVnMidnight = new Date('2026-09-20T16:59:00Z'); // 2026-09-20 23:59 VN
    expect(isTripToday('2026-09-20', justBeforeVnMidnight)).toBe(true);
    expect(isTripToday('2026-09-21', justBeforeVnMidnight)).toBe(false);
  });

  it('is false without a departure date', () => {
    expect(isTripToday(null)).toBe(false);
    expect(isTripToday('')).toBe(false);
  });
});

describe('getMissingPlanFields (kanban 20260921_5)', () => {
  const plan = {
    status: TripStatus.CREATED,
    carrierType: 'EXTERNAL',
    customerId: 4,
    routeId: null,
    departureDate: '2026-09-21',
    externalCarrierId: null,
    externalFreightCost: null,
    externalPlateNumber: null,
    containers: [],
  } as unknown as TripDetail;

  it('lists planning fields for an open plan but not the numbers that arrive later', () => {
    const missing = getMissingPlanFields(plan);

    expect(missing).toContain('Tuyến');
    expect(missing).toContain('Đối tác điều xe');
    expect(missing).toContain('Loại container');
    // The partner assigns the plate and the driver enters container numbers
    // after planning, so neither is "missing" while the plan is open.
    expect(missing).not.toContain('Biển số xe ngoài');
    expect(missing).not.toContain('Số container');
    expect(missing).not.toContain('Doanh thu');
  });

  it('adds the running-trip fields once the trip is on the road', () => {
    const running = { ...plan, status: TripStatus.IN_TRANSIT } as unknown as TripDetail;

    expect(getMissingPlanFields(running)).toEqual(expect.arrayContaining([
      'Biển số xe ngoài', 'Số container', 'Doanh thu', 'Dầu', 'Tiền đi đường', 'Lương chuyến',
    ]));
  });

  it('marks nothing on a canceled trip', () => {
    expect(getMissingPlanFields({ status: TripStatus.CANCELED } as TripDetail)).toEqual([]);
  });
});

describe('getTripDisplayGrossProfit', () => {
  it('recomputes stale external profit from both prices ex-VAT for the reported commission case', () => {
    const trip = {
      carrierType: 'EXTERNAL',
      revenue: '7560000',
      externalFreightCost: '7128000',
      vatRate: '0.080',
      customerCommission: '200000',
      grossProfit: '-328000',
      totalCost: '7128000',
    } as TripDetail;

    expect(getTripDisplayGrossProfit(trip)).toBe(200000);
  });

  it('computes external-trip preview from shared trip totals for the production commission case', () => {
    expect(getExternalTripPreviewGrossProfit({
      carrierType: 'EXTERNAL',
      revenue: '7560000',
      externalFreightCost: '7128000',
      vatRate: '0.080',
      customerCommission: '200000',
    })).toBe(200000);
  });

  it('projects a reconciling ex-VAT breakdown for the reported commission case', () => {
    expect(getExternalTripFinancials({
      carrierType: 'EXTERNAL',
      revenue: '7560000',
      externalFreightCost: '7128000',
      vatRate: '0.080',
      customerCommission: '200000',
    })).toEqual({
      freightRevenue: 7000000,
      recordedRevenue: 6800000,
      externalFreightCost: 6600000,
      grossProfit: 200000,
    });
  });

  it('keeps the legacy zero-VAT contract when vatRate is null', () => {
    expect(getExternalTripFinancials({
      carrierType: 'EXTERNAL',
      revenue: '7560000',
      externalFreightCost: '7128000',
      vatRate: null,
      customerCommission: '200000',
    })?.grossProfit).toBe(232000);
  });

  it.each([
    { vatRate: 0, commission: 0, revenue: 1000000, expected: 300000 },
    { vatRate: 0, commission: 50000, revenue: 1000000, expected: 250000 },
    { vatRate: 0.08, commission: 0, revenue: 1080000, externalFreightCost: 756000, expected: 300000 },
    { vatRate: 0.08, commission: 50000, revenue: 1080000, externalFreightCost: 756000, expected: 250000 },
    { vatRate: 0.1, commission: 0, revenue: 1100000, externalFreightCost: 770000, expected: 300000 },
    { vatRate: 0.1, commission: 50000, revenue: 1100000, externalFreightCost: 770000, expected: 250000 },
  ])('matches canonical external preview math for VAT $vatRate and commission $commission', ({
    vatRate,
    commission,
    revenue,
    externalFreightCost = 700000,
    expected,
  }) => {
    expect(getExternalTripPreviewGrossProfit({
      carrierType: 'EXTERNAL',
      revenue,
      externalFreightCost,
      vatRate,
      customerCommission: commission,
    })).toBe(expected);
  });

  it('keeps stored gross profit for own-truck trips', () => {
    const trip = {
      carrierType: 'OWN',
      revenue: '24130980',
      totalCost: '23220000',
      grossProfit: '-876500',
    } as TripDetail;

    expect(getTripDisplayGrossProfit(trip)).toBe(-876500);
  });
});

describe('getAncillaryTripCostBreakdown', () => {
  it('keeps vehicle-shift cost visible without repeating two-point delivery', () => {
    const trip = {
      carrierType: 'OWN',
      twoPointDeliveryBonus: '100000',
      vehicleShiftAllowance: '200000',
    } as TripDetail;

    expect(getAncillaryTripCostBreakdown(trip)).toEqual([
      { label: 'Lưu ca xe', amount: 200000 },
    ]);
  });

  it('does not show own-truck ancillary costs for an external carrier trip', () => {
    expect(getAncillaryTripCostBreakdown({
      carrierType: 'EXTERNAL',
      twoPointDeliveryBonus: '100000',
      vehicleShiftAllowance: '200000',
    } as TripDetail)).toEqual([]);
  });
});
