import { Banknote, Fuel, type LucideIcon } from 'lucide-react';
import { computeTripTotals, TripStatus, type TripDetail } from '@tingting/shared';

export interface TripListContainer {
  containerNumber: string;
  containerTypeId: number | null;
  containerTypeCode: string | null;
  containerTypeName: string | null;
}

export interface TripListRow extends TripDetail {
  containers?: TripListContainer[];
}

export type StatusFilter = '' | TripStatus;

export const STATUS_PILL_CLASS: Record<TripStatus, string> = {
  [TripStatus.CREATED]: 'pill-moi',
  [TripStatus.IN_TRANSIT]: 'pill-dang',
  [TripStatus.COMPLETED]: 'pill-htth',
  [TripStatus.LOCKED]: 'pill-chot',
  [TripStatus.CANCELED]: 'pill-huy',
};

export const DEFAULT_WARN_THRESHOLD = 37;
export const PAGE_SIZE = 25;

export function buildTripCode(trip: TripDetail): string {
  if (trip.tripCode) return trip.tripCode;
  return '—';
}

/**
 * Format a number as Vietnamese currency with no symbol and no decimals.
 * Companion to `formatCurrency` in lib/format.ts which always includes " ₫".
 * Used by trip-table cells that place the unit in a separate span.
 */
export function formatMoney(n: number): string {
  return new Intl.NumberFormat('vi-VN').format(Math.round(n));
}

export interface ConsumptionInfo {
  liters: number;
  per100: number;
}

export function getTripDistance(trip: TripDetail): number {
  if (trip.legs && trip.legs.length > 0) {
    return trip.legs.reduce((sum, leg) => sum + Number(leg.km), 0);
  }
  return Number(trip.route?.distanceKm ?? 0);
}

export function calcConsumption(trip: TripDetail): ConsumptionInfo | null {
  const fuel = trip.fuelLiters ? Number(trip.fuelLiters) : null;
  const distance = getTripDistance(trip);
  if (!fuel || !distance) return null;
  return { liters: fuel, per100: (fuel / distance) * 100 };
}

interface ExternalTripPreviewInput {
  carrierType?: string | null;
  revenue?: string | number | null;
  externalFreightCost?: string | number | null;
  vatRate?: string | number | null;
  customerCommission?: string | number | null;
}

export interface ExternalTripFinancials {
  freightRevenue: number;
  recordedRevenue: number;
  externalFreightCost: number;
  grossProfit: number;
}

function computeExternalTripFinancials(trip: ExternalTripPreviewInput) {
  const revenue = Number(trip.revenue ?? 0);
  const externalFreightCost = Number(trip.externalFreightCost ?? 0);

  return computeTripTotals({
    legs: [],
    fuelMode: 'AUTO',
    fuelLitersOverride: null,
    fuelSupplementLiters: 0,
    fuelLoadedNorm: 0,
    fuelEmptyNorm: 0,
    fuelPerTripSupplement: 0,
    fuelUnitPrice: 0,
    fuelActualUnitPrice: null,
    isMountainRoute: false,
    mountainFixedAllowance: null,
    roadAllowanceBase: 0,
    tollsDiscount: 0,
    tollsAddition: 0,
    tollsStations: 0,
    tollPerStation: 0,
    hasReturnCargo: false,
    returnCargoBonus: 0,
    revenue,
    vatRate: Number(trip.vatRate ?? 0),
    customerCommission: Number(trip.customerCommission ?? 0),
    carrierType: 'EXTERNAL',
    externalFreightCost,
    driverSalary: 0,
    twoPointDeliveryBonus: 0,
    vehicleShiftAllowance: 0,
  });
}

export function getExternalTripFinancials(trip: ExternalTripPreviewInput): ExternalTripFinancials | null {
  if (trip.carrierType !== 'EXTERNAL') {
    return null;
  }

  const totals = computeExternalTripFinancials(trip);
  return {
    freightRevenue: totals.freightExVat,
    recordedRevenue: totals.recordedRevenue,
    externalFreightCost: totals.externalFreightExVat,
    grossProfit: totals.grossProfit,
  };
}

export function getExternalTripPreviewGrossProfit(trip: ExternalTripPreviewInput): number | null {
  if (!Number(trip.revenue ?? 0) || !Number(trip.externalFreightCost ?? 0)) {
    return null;
  }
  return getExternalTripFinancials(trip)?.grossProfit ?? null;
}

export function getTripDisplayGrossProfit(trip: TripDetail): number {
  const externalFinancials = getExternalTripFinancials(trip);
  if (externalFinancials) return externalFinancials.grossProfit;
  return Number(trip.grossProfit ?? 0);
}

export interface AncillaryTripCost {
  label: 'Lưu ca xe';
  amount: number;
}

/**
 * Keep the own-truck vehicle-shift cost visible outside the trip form.
 * Two-point delivery is included in totalRoadAllowance, so repeating it below
 * the total cost would make the list look as if it were charged twice.
 */
export function getAncillaryTripCostBreakdown(trip: Pick<TripDetail,
  'carrierType' | 'vehicleShiftAllowance'
>): AncillaryTripCost[] {
  if (trip.carrierType === 'EXTERNAL') return [];

  const vehicleShiftAllowance = Number(trip.vehicleShiftAllowance ?? 0);

  return [
    ...(vehicleShiftAllowance > 0
      ? [{ label: 'Lưu ca xe' as const, amount: vehicleShiftAllowance }]
      : []),
  ];
}

export interface MissingIndicator {
  icon: LucideIcon;
  label: string;
}

export function getMissingIndicators(trip: TripDetail): MissingIndicator[] {
  if (trip.status === TripStatus.CANCELED || trip.status === TripStatus.CREATED) return [];
  const missing: MissingIndicator[] = [];
  const revenue = Number(trip.revenue ?? 0);
  if (!revenue) missing.push({ icon: Banknote, label: 'Chưa nhập doanh thu' });
  const fuel = Number(trip.fuelLiters ?? 0);
  if (!fuel) missing.push({ icon: Fuel, label: 'Chưa khai báo dầu' });
  return missing;
}

export type DataCompleteness = 'complete' | 'incomplete' | 'na';

const VIETNAM_DAY_FORMAT = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Ho_Chi_Minh',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Today's date in Vietnam as YYYY-MM-DD — the app's business day (servers run UTC). */
export function todayInVietnam(now: Date = new Date()): string {
  return VIETNAM_DAY_FORMAT.format(now);
}

/** True when the trip departs on the current Vietnamese day (kanban 20260921_1). */
export function isTripToday(departureDate: string | null | undefined, now: Date = new Date()): boolean {
  if (!departureDate) return false;
  return departureDate.slice(0, 10) === todayInVietnam(now);
}

/**
 * Fields the trip still needs, in Vietnamese labels (kanban 20260921_5).
 *
 * A CREATED plan is judged on its PLANNING fields only — the container/seal
 * numbers and a subcontracted plate arrive later by design (the driver enters
 * the container numbers, the partner assigns the truck), so they are not
 * "missing" while the plan is still open. From IN_TRANSIT onwards those same
 * fields plus the financial figures count as missing.
 */
export function getMissingPlanFields(trip: TripDetail): string[] {
  if (trip.status === TripStatus.CANCELED) return [];

  const containers = (trip as TripListRow).containers ?? [];
  const missing: string[] = [];
  if (!trip.customerId) missing.push('Khách hàng');
  if (!trip.routeId) missing.push('Tuyến');
  if (!trip.departureDate) missing.push('Ngày khởi hành');
  if (trip.carrierType === 'EXTERNAL') {
    if (!trip.externalCarrierId) missing.push('Đối tác điều xe');
    if (!Number(trip.externalFreightCost ?? 0)) missing.push('Giá cước thuê ngoài');
  } else {
    if (!trip.truckId) missing.push('Xe đầu kéo');
    if (!trip.driverId) missing.push('Lái xe');
  }
  if (!containers.some((c) => c.containerTypeId ?? c.containerTypeCode ?? c.containerTypeName)) {
    missing.push('Loại container');
  }
  if (trip.status === TripStatus.CREATED) return missing;

  if (trip.carrierType === 'EXTERNAL' && !(trip.externalPlateNumber ?? '').trim()) {
    missing.push('Biển số xe ngoài');
  }
  if (!containers.some((c) => (c.containerNumber ?? '').trim())) missing.push('Số container');
  if (!Number(trip.revenue ?? 0)) missing.push('Doanh thu');
  if (!Number(trip.fuelLiters ?? 0)) missing.push('Dầu');
  if (!Number(trip.totalRoadAllowance ?? 0)) missing.push('Tiền đi đường');
  if (!Number(trip.driverSalary ?? 0)) missing.push('Lương chuyến');
  return missing;
}

export function getDataCompleteness(trip: TripDetail): DataCompleteness {
  if (trip.status === TripStatus.CREATED || trip.status === TripStatus.CANCELED) return 'na';
  const revenue = Number(trip.revenue ?? 0);
  const fuel = Number(trip.fuelLiters ?? 0);
  const road = Number(trip.totalRoadAllowance ?? 0);
  const salary = Number(trip.driverSalary ?? 0);
  if (revenue > 0 && fuel > 0 && road > 0 && salary > 0) return 'complete';
  return 'incomplete';
}
