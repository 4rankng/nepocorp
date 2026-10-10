import { describe, expect, it } from 'vitest';
import { TripStatus, type TripDetail } from '@tingting/shared';
import {
  getAncillaryTripCostBreakdown,
  getDataCompleteness,
  getExternalTripFinancials,
  getExternalTripPreviewGrossProfit,
  getMissingPlanFields,
  getTripDisplayGrossProfit,
  getTripRevenueBasis,
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

  it('never asks a hired-carrier trip for own-truck money figures', () => {
    const running = {
      ...plan,
      status: TripStatus.IN_TRANSIT,
      routeId: 3,
      externalCarrierId: 9,
      externalFreightCost: '5400000',
      externalPlateNumber: '15C-355.26',
      revenue: '7560000',
      containers: [{ containerNumber: 'MSCU123', containerTypeCode: '40HC' }],
    } as unknown as TripDetail;

    // Freight is bought whole — no company fuel, no road allowance paid to a
    // driver, no trip salary to settle.
    expect(getMissingPlanFields(running)).toEqual([]);
  });

  it('adds the running-trip fields once the trip is on the road', () => {
    const running = { ...plan, status: TripStatus.IN_TRANSIT } as unknown as TripDetail;

    expect(getMissingPlanFields(running)).toEqual(expect.arrayContaining([
      'Biển số xe ngoài', 'Số container', 'Doanh thu', 'Giá cước thuê ngoài',
    ]));
    expect(getMissingPlanFields(running)).not.toContain('Dầu');
    expect(getMissingPlanFields(running)).not.toContain('Tiền đi đường');
    expect(getMissingPlanFields(running)).not.toContain('Lương chuyến');
  });

  it('still demands fuel, road allowance and salary on an own-truck trip', () => {
    const own = {
      status: TripStatus.COMPLETED,
      carrierType: 'OWN',
      customerId: 4,
      routeId: 3,
      departureDate: '2026-09-21',
      truckId: 2,
      driverId: 7,
      revenue: '7560000',
      containers: [{ containerNumber: 'MSCU123', containerTypeCode: '40HC' }],
    } as unknown as TripDetail;

    expect(getMissingPlanFields(own)).toEqual(['Dầu', 'Tiền đi đường', 'Lương chuyến']);
  });

  it('marks nothing on a canceled trip', () => {
    expect(getMissingPlanFields({ status: TripStatus.CANCELED } as TripDetail)).toEqual([]);
  });
});

describe('getDataCompleteness', () => {
  it('counts a hired-carrier trip complete on revenue plus freight cost', () => {
    const external = {
      status: TripStatus.COMPLETED,
      carrierType: 'EXTERNAL',
      revenue: '7560000',
      externalFreightCost: '5400000',
    } as unknown as TripDetail;

    expect(getDataCompleteness(external)).toBe('complete');
    expect(getDataCompleteness({
      ...external,
      externalFreightCost: null,
    } as unknown as TripDetail)).toBe('incomplete');
  });

  it('keeps the four-figure bar for own-truck trips', () => {
    const own = {
      status: TripStatus.COMPLETED,
      carrierType: 'OWN',
      revenue: '7560000',
      fuelLiters: '120',
      totalRoadAllowance: '2000000',
      driverSalary: '900000',
    } as unknown as TripDetail;

    expect(getDataCompleteness(own)).toBe('complete');
    expect(getDataCompleteness({
      ...own,
      driverSalary: 0,
    } as unknown as TripDetail)).toBe('incomplete');
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

describe('getTripRevenueBasis (kanban 101026203100)', () => {
  type BasisInput = Pick<TripDetail, 'revenue' | 'vatRate'>;

  it('splits the VAT-inclusive contract value into ex-VAT freight and output VAT', () => {
    // Trip 356 / TRP-202610-0002: 8.466.120 ₫ contract at 8% VAT, stored profit
    // 2.379.475 ₫ = 7.839.000 − 5.459.525 — the ex-VAT basis, not the contract.
    const basis = getTripRevenueBasis({ revenue: '8466120', vatRate: '0.080' });

    expect(basis).toEqual({
      contract: 8466120,
      freightExVat: 7839000,
      vatAmount: 627120,
      vatRate: 0.08,
    });
    expect(basis.freightExVat - 5459525).toBe(2379475);
  });

  it('leaves a trip without VAT on the contract value (backward compatible)', () => {
    expect(getTripRevenueBasis({ revenue: '24130980', vatRate: '0.000' })).toEqual({
      contract: 24130980,
      freightExVat: 24130980,
      vatAmount: 0,
      vatRate: 0,
    });
    expect(getTripRevenueBasis({ revenue: '1000000', vatRate: null } as unknown as BasisInput)).toEqual({
      contract: 1000000,
      freightExVat: 1000000,
      vatAmount: 0,
      vatRate: 0,
    });
  });

  it('rounds the ex-VAT freight the way the stored profit was computed', () => {
    // computeExVatAmount rounds to the đồng; the memo rows must not drift from it.
    expect(getTripRevenueBasis({ revenue: '7560000', vatRate: '0.080' })).toEqual({
      contract: 7560000,
      freightExVat: 7000000,
      vatAmount: 560000,
      vatRate: 0.08,
    });
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
