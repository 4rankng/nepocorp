import { describe, expect, it } from 'vitest';
import { TripStatus, type TripDetail } from '@tingting/shared';
import {
  getAncillaryTripCostBreakdown,
  getDataCompleteness,
  getExternalTripFinancials,
  getExternalTripPreviewGrossProfit,
  getMissingPlanFields,
  getTripDisplayGrossProfit,
  getTripDisplayMarginPct,
  getTripDisplayRevenue,
  getTripDisplayTotalCost,
  getTripRevenueBasis,
  hasTripWageData,
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

  it('does not ask for trip salary when chấm công already records the wage days (NEPO-31)', () => {
    const own = {
      status: TripStatus.COMPLETED,
      carrierType: 'OWN',
      customerId: 4,
      routeId: 3,
      departureDate: '2026-09-21',
      truckId: 2,
      driverId: 7,
      revenue: '7560000',
      fuelLiters: '120',
      totalRoadAllowance: '2000000',
      containers: [{ containerNumber: 'MSCU123', containerTypeCode: '40HC' }],
      // The auto-filled allocation is legitimately 0 (no configured base
      // salary) while the real wage days live in chấm công — not a data gap.
      driverSalary: 0,
      attendanceDayCount: 1,
    } as unknown as TripDetail;

    expect(getMissingPlanFields(own)).toEqual([]);
  });

  it('still demands trip salary when neither pay nor chấm công exists (NEPO-31)', () => {
    const own = {
      status: TripStatus.COMPLETED,
      carrierType: 'OWN',
      customerId: 4,
      routeId: 3,
      departureDate: '2026-09-21',
      truckId: 2,
      driverId: 7,
      revenue: '7560000',
      fuelLiters: '120',
      totalRoadAllowance: '2000000',
      containers: [{ containerNumber: 'MSCU123', containerTypeCode: '40HC' }],
      driverSalary: 0,
      attendanceDayCount: 0,
    } as unknown as TripDetail;

    expect(getMissingPlanFields(own)).toEqual(['Lương chuyến']);
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

  it('counts a chấm-công-covered trip complete without an entered salary (NEPO-31)', () => {
    const own = {
      status: TripStatus.COMPLETED,
      carrierType: 'OWN',
      revenue: '7560000',
      fuelLiters: '120',
      totalRoadAllowance: '2000000',
      driverSalary: 0,
      attendanceDayCount: 2,
    } as unknown as TripDetail;

    expect(getDataCompleteness(own)).toBe('complete');
    // Wage days alone must not carry a trip that also owes the other figures.
    expect(getDataCompleteness({
      ...own,
      totalRoadAllowance: 0,
    } as unknown as TripDetail)).toBe('incomplete');
    // Neither pay nor chấm công → the wage data is genuinely missing.
    expect(getDataCompleteness({
      ...own,
      attendanceDayCount: 0,
    } as unknown as TripDetail)).toBe('incomplete');
  });
});

describe('hasTripWageData (NEPO-31)', () => {
  it('accepts either the per-trip salary figure or chấm công coverage', () => {
    expect(hasTripWageData({ driverSalary: '384615' } as unknown as TripDetail)).toBe(true);
    expect(hasTripWageData({ driverSalary: 0, attendanceDayCount: 1 } as unknown as TripDetail)).toBe(true);
    expect(hasTripWageData({ driverSalary: 0, attendanceDayCount: 0 } as unknown as TripDetail)).toBe(false);
    expect(hasTripWageData({} as unknown as TripDetail)).toBe(false);
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

describe('display-basis helpers (kanban 101026203100)', () => {
  const vatTrip = {
    id: 356,
    carrierType: 'OWN',
    revenue: '8466120',
    vatRate: '0.080',
    customerCommission: '0',
    totalCost: '5459525',
    grossProfit: '2379475',
  } as TripDetail;

  it('prints the revenue the stored profit is recorded on, not the contract value', () => {
    expect(getTripDisplayRevenue(vatTrip)).toBe(7839000);
    expect(getTripDisplayTotalCost(vatTrip)).toBe(5459525);
    expect(getTripDisplayGrossProfit(vatTrip)).toBe(2379475);
    // The row the trip list prints must add up on one basis.
    expect(getTripDisplayRevenue(vatTrip) - getTripDisplayTotalCost(vatTrip))
      .toBe(getTripDisplayGrossProfit(vatTrip));
  });

  it('measures the margin on the same ex-VAT revenue', () => {
    expect((getTripDisplayMarginPct(vatTrip) ?? 0).toFixed(1)).toBe('30.4');
  });

  it('deducts customer commission from the displayed revenue like the profit does', () => {
    const commissioned = { ...vatTrip, customerCommission: '200000' } as TripDetail;
    expect(getTripDisplayRevenue(commissioned)).toBe(7639000);
  });

  it('keeps hired-carrier freight ex-VAT so a xe ngoài row reconciles too', () => {
    const external = {
      carrierType: 'EXTERNAL',
      revenue: '7560000',
      externalFreightCost: '7128000',
      vatRate: '0.080',
      customerCommission: '200000',
      totalCost: '7128000',
    } as TripDetail;

    expect(getTripDisplayRevenue(external)).toBe(6800000);
    expect(getTripDisplayTotalCost(external)).toBe(6600000);
    expect(getTripDisplayGrossProfit(external)).toBe(200000);
    expect(getTripDisplayRevenue(external) - getTripDisplayTotalCost(external))
      .toBe(getTripDisplayGrossProfit(external));
    expect((getTripDisplayMarginPct(external) ?? 0).toFixed(1)).toBe('2.9');
  });

  it('returns no margin when there is no revenue to measure against', () => {
    expect(getTripDisplayMarginPct({ ...vatTrip, revenue: '0', grossProfit: '0' } as TripDetail)).toBeNull();
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
