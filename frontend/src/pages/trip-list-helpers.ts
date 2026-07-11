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
import { FuelMode, TripStatus, type CreateTripRequest, type TripDetail, type UpdateTripFiguresRequest } from '@tingting/shared';
import type { TripListRow, TripQuickEditDraft } from '../features/trips';

export function draftNumber(value: unknown): string {
  if (value === null || value === undefined || value === '') return '';
  const n = Number(value);
  if (!Number.isFinite(n) || n === 0) return '';
  return String(n).replace(/\.00$/, '');
}

export function parseDraftNumber(value: string): number | undefined {
  const normalized = value.replace(/[^\d.,]/g, '').replace(',', '.');
  if (!normalized) return undefined;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : undefined;
}

export function quickDraftFromTrip(trip: TripDetail): TripQuickEditDraft {
  return {
    fuelLiters: draftNumber(trip.fuelLitersOverride ?? trip.fuelLiters),
    roadAllowance: draftNumber(trip.roadAllowanceOverride ?? trip.totalRoadAllowance),
    driverSalary: draftNumber(trip.driverSalary),
    revenue: draftNumber(trip.revenue),
  };
}

export function copyPlanPayloadFromTrip(trip: TripListRow): CreateTripRequest {
  if (!trip.customerId || !trip.routeId || !trip.cargoTypeId || !trip.departureDate) {
    throw new Error('Dòng này thiếu thông tin bắt buộc nên chưa thể copy kế hoạch.');
  }
  const containerTypeId = trip.containers?.find(c => c.containerTypeId)?.containerTypeId;
  if (!containerTypeId) {
    throw new Error('Chuyến này chưa có loại container nên chưa thể copy kế hoạch.');
  }

  const payload: CreateTripRequest = {
    customerId: trip.customerId,
    routeId: trip.routeId,
    cargoTypeId: trip.cargoTypeId,
    departureDate: trip.departureDate,
    containerCount: trip.containerCount ?? 1,
    containerTypeId,
    fuelMode: trip.fuelMode,
    fuelSupplierId: trip.fuelSupplierId ?? null,
    vatRate: trip.vatRate != null ? Number(trip.vatRate) : 0,
    carrierType: trip.carrierType ?? 'OWN',
  };

  if (trip.customerReference?.trim()) {
    payload.customerReference = trip.customerReference.trim();
  }

  if (trip.carrierType === 'EXTERNAL') {
    payload.truckId = null;
    payload.driverId = null;
    payload.externalCarrierId = trip.externalCarrierId ?? null;
    payload.externalFreightCost = trip.externalFreightCost != null ? Number(trip.externalFreightCost) : null;
    payload.externalPlateNumber = trip.externalPlateNumber ?? null;
    payload.externalDriverName = trip.externalDriverName ?? null;
    payload.externalDriverPhone = trip.externalDriverPhone ?? null;
    return payload;
  }

  if (!trip.truckId || !trip.driverId) {
    throw new Error('Chuyến nội bộ cần có xe và lái xe trước khi copy kế hoạch.');
  }

  payload.truckId = trip.truckId;
  payload.driverId = trip.driverId;
  return payload;
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
  const fuelLiters = parseDraftNumber(draft.fuelLiters);
  const roadAllowance = parseDraftNumber(draft.roadAllowance);
  const driverSalary = parseDraftNumber(draft.driverSalary);
  const revenue = parseDraftNumber(draft.revenue);
  const fuelLitersChanged = draft.fuelLiters !== original.fuelLiters;

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
    roadAllowanceOverride: roadAllowance ?? null,
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
