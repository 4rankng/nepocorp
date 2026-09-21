/**
 * TripListPage — refactored to use the design-system + features/trips
 * extraction. The page is now a thin orchestrator (~200 LOC instead of 942):
 *
 *   1. Read URL/month state.
 *   2. Drive the query state via `useTableQueryState`.
 *   3. Render the page chrome (hero, filters, table card).
 *   4. Pass column definitions + mobile card renderer from features/trips.
 *
 * All previously-inlined helpers (buildTripCode, calcConsumption, missing
 * indicators, data completeness, status pill class map, export-to-CSV)
 * now live in `features/trips/`. Column definitions live in
 * `features/trips/tripColumns.tsx`. The mobile card lives in
 * `features/trips/TripMobileCard.tsx`.
 *
 * This refactor is **behavior-preserving**: same data, same columns,
 * same mobile layout, same filter pills, same export.
 */
import { FuelMode, TripStatus, type TripDetail, type UpdateTripFiguresRequest } from '@tingting/shared';
import type { TripQuickEditDraft } from '../features/trips';
import { moneyInputToNumber } from '../lib/moneyInput';

export function draftNumber(value: unknown): string {
  if (value === null || value === undefined || value === '') return '';
  const n = Number(value);
  if (!Number.isFinite(n) || n === 0) return '';
  return String(n).replace(/\.00$/, '');
}

/**
 * Litres are the one quick-edit field that may carry decimals ("120.5"), so a
 * single separator is read as the decimal point. Anything else is invalid input
 * rather than a silently-zeroed amount (kanban 20260921_3). Money uses
 * `moneyInputToNumber` instead: VND has no decimals, so every separator there is
 * grouping ("1.000.000" → 1000000).
 */
function parseLitersDraft(value: string): number | undefined {
  const cleaned = value.replace(/\s/g, '');
  if (!cleaned) return undefined;
  const normalized = cleaned.replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(normalized)) return undefined;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : undefined;
}

export type QuickDraftField = keyof TripQuickEditDraft;

export const QUICK_DRAFT_FIELD_LABELS: Record<QuickDraftField, string> = {
  fuelLiters: 'Dầu (L)',
  roadAllowance: 'Tiền đi đường',
  driverSalary: 'Lương chuyến',
  revenue: 'Doanh thu',
};

/**
 * First quick-edit field whose typed value cannot be read as a number, or null.
 * A field that was emptied on purpose is NOT invalid — clearing means zero.
 */
export function invalidQuickField(draft: TripQuickEditDraft | undefined): QuickDraftField | null {
  if (!draft) return null;
  for (const field of ['fuelLiters', 'roadAllowance', 'driverSalary', 'revenue'] as QuickDraftField[]) {
    const raw = draft[field];
    if (!raw.trim()) continue;
    const parsed = field === 'fuelLiters' ? parseLitersDraft(raw) : moneyInputToNumber(raw);
    if (parsed === undefined) return field;
  }
  return null;
}

/**
 * Quick edit adjusts the road component the same way the form's override
 * field does: before the two-point delivery payment is folded in.
 * totalRoadAllowance already includes that payment, so seeding the draft from
 * it directly would re-add the bonus as an override on every save.
 */
function quickEditRoadComponent(trip: TripDetail): number {
  const total = Number(trip.totalRoadAllowance ?? 0);
  if (trip.carrierType === 'EXTERNAL') return total;
  return Math.max(0, total - Number(trip.twoPointDeliveryBonus ?? 0));
}

export function quickDraftFromTrip(trip: TripDetail): TripQuickEditDraft {
  return {
    fuelLiters: draftNumber(trip.fuelLitersOverride ?? trip.fuelLiters),
    roadAllowance: draftNumber(trip.roadAllowanceOverride ?? quickEditRoadComponent(trip)),
    driverSalary: draftNumber(trip.driverSalary),
    revenue: draftNumber(trip.revenue),
  };
}

export function isEditableInQuickMode(trip: TripDetail): boolean {
  return trip.status !== TripStatus.LOCKED && trip.status !== TripStatus.CANCELED;
}

export function draftChanged(trip: TripDetail, draft?: TripQuickEditDraft): boolean {
  if (!draft) return false;
  const original = quickDraftFromTrip(trip);
  return draft.fuelLiters !== original.fuelLiters
    || draft.roadAllowance !== original.roadAllowance
    || draft.driverSalary !== original.driverSalary
    || draft.revenue !== original.revenue;
}

export function figuresPayloadFromDraft(trip: TripDetail, draft: TripQuickEditDraft): UpdateTripFiguresRequest {
  const original = quickDraftFromTrip(trip);
  const fuelLiters = parseLitersDraft(draft.fuelLiters);
  const roadAllowance = moneyInputToNumber(draft.roadAllowance);
  const driverSalary = moneyInputToNumber(draft.driverSalary);
  const revenue = moneyInputToNumber(draft.revenue);
  const fuelLitersChanged = draft.fuelLiters !== original.fuelLiters;
  const roadAllowanceChanged = draft.roadAllowance !== original.roadAllowance;

  return {
    legs: (trip.legs ?? []).map((leg) => ({
      sequence: leg.sequence,
      origin: leg.origin,
      destination: leg.destination,
      km: Number(leg.km),
      loadingType: leg.loadingType,
    })),
    version: trip.version,
    departureDate: trip.departureDate,
    routeId: trip.routeId,
    fuelMode: fuelLitersChanged ? FuelMode.FLAT_RATE : trip.fuelMode,
    fuelLitersOverride: fuelLitersChanged ? (fuelLiters ?? null) : (trip.fuelLitersOverride != null ? Number(trip.fuelLitersOverride) : null),
    fuelSupplementLiters: Number(trip.fuelSupplementLiters ?? 0),
    fuelSupplementReason: trip.fuelSupplementReason ?? undefined,
    fuelActualUnitPrice: trip.fuelActualUnitPrice != null ? Number(trip.fuelActualUnitPrice) : null,
    fuelSupplierId: trip.fuelSupplierId ?? null,
    tollsDiscount: Number(trip.tollsDiscount ?? 0),
    tollsAddition: Number(trip.tollsAddition ?? 0),
    tollsStations: trip.tollsStations ?? 0,
    hasReturnCargo: trip.hasReturnCargo ?? false,
    roadAllowanceOverride: roadAllowanceChanged ? (roadAllowance ?? null) : (trip.roadAllowanceOverride != null ? Number(trip.roadAllowanceOverride) : null),
    driverSalary: driverSalary ?? 0,
    revenue: revenue ?? 0,
    customerCommission: Number(trip.customerCommission ?? 0),
    tripWageDays: trip.tripWageDays ?? undefined,
    twoPointDeliveryBonus: Number(trip.twoPointDeliveryBonus ?? 0),
    vehicleShiftAllowance: Number(trip.vehicleShiftAllowance ?? 0),
    notes: trip.notes ?? undefined,
    carrierType: trip.carrierType,
    externalCarrierId: trip.externalCarrierId ?? undefined,
    externalFreightCost: trip.externalFreightCost != null ? Number(trip.externalFreightCost) : undefined,
    externalPlateNumber: trip.externalPlateNumber ?? undefined,
    externalDriverName: trip.externalDriverName ?? undefined,
    externalDriverPhone: trip.externalDriverPhone ?? undefined,
  };
}

export function columnClass(columnId: string): string {
  if (columnId === 'select') return 'col-select center';
  if (columnId === 'truck') return 'col-truck';
  if (columnId === 'route') return 'col-route';
  if (columnId === 'container') return 'col-container';
  if (columnId === 'consumption') return 'col-consumption';
  if (columnId === 'road') return 'col-road right';
  if (columnId === 'revenue') return 'col-revenue right';
  if (columnId === 'driverSalary') return 'col-driver-salary right';
  if (columnId === 'totalCost') return 'col-total-cost right';
  if (columnId === 'grossProfit') return 'col-gross-profit right';
  if (columnId === 'status') return 'col-status center';
  return '';
}
