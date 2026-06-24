/**
 * useTripFormDispatch — derived values, effects, and submit logic for the trip form.
 *
 * Extracted from useTripForm.ts during M3 decomposition (T3.1.3).
 * Receives state from useTripFormState, computes derived values (fuel cost,
 * toll cost, profit, completion), orchestrates effects (route auto-fill,
 * pricing, driver salary), and exposes the submit handler.
 */
import { useEffect, useMemo, useCallback, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '../lib/api';
import {
  FuelMode, LoadingType, TripStatus,
  FUEL_PRICE_PER_LITER_FALLBACK, FUEL_LOADED_NORM_FALLBACK, FUEL_EMPTY_NORM_FALLBACK,
} from '@tingting/shared';
import type { PricingTable, TripDetail, TripLeg, PaginatedResponse } from '@tingting/shared';
import { tripClient } from '../api/tripClient';
import { configClient } from '../api/configClient';
import { qk } from '../api/keys';
import { useToast } from '../components/shared/Toast';

import type { TripOptions, RouteOption } from './useTripOptions';
import { useTripFormLegs } from './useTripFormLegs';
import type { FormLeg } from './useTripFormLegs';
import { useTripFormPhotos } from './useTripFormPhotos';
import type { OcrResultHandler, UploadingState, ContainerPhotoUploadResult } from './useTripFormPhotos';
import type { UseTripFormStateReturn, CompletionStatus } from './useTripFormState';
import type { ContainerFormRow, SealFormRow } from './useTripFormState';
import { createFallbackLegsFromRouteName, resolveContainerCount } from './tripFormDispatchUtils';

const FUEL_PRICE_PER_LITER = FUEL_PRICE_PER_LITER_FALLBACK;
const LOADED_RATE = FUEL_LOADED_NORM_FALLBACK;
const EMPTY_RATE = FUEL_EMPTY_NORM_FALLBACK;

/** Shape returned by PUT /api/trips/:id/containers — same as Phase 2
 *  `TripContainer` with the new `seals[]` and `photos[]` sub-collections. */
type ServerContainerAfterSave = {
  id: number;
  containerTypeId?: number | null;
  containerNumber?: string | null;
  sealNumber?: string | null;
  cargoWeightKg?: string | number | null;
  notes?: string | null;
  seals?: Array<{ id: number; sealNumber: string; sealType?: string | null; notes?: string | null }>;
  photos?: Array<{ id: number; type: 'CONTAINER' | 'SEAL'; storageKey: string; uploadedAt: string }>;
};

/** OCR recognition result broadcast to container-aware components (e.g. the
 *  container instances card) via the trip-form context. `nonce` lets consumers
 *  detect a fresh result even when the values are identical. */
export interface OcrSignal {
  containerNumbers: string[];
  sealNumber: string | null;
  type: 'CONTAINER' | 'SEAL';
  nonce: number;
}

export interface UseTripFormDispatchParams {
  state: UseTripFormStateReturn;
  options: TripOptions;
  isEditMode: boolean;
  existingTrip: TripDetail | undefined;
}

export interface UseTripFormDispatchReturn {
  legs: FormLeg[];
  addLeg: () => void;
  removeLeg: (idx: number) => void;
  updateLeg: (idx: number, field: keyof FormLeg, value: string) => void;
  photoUrls: string[];
  uploadPhotos: (files: FileList, tripId?: number, type?: 'CONTAINER' | 'SEAL' | 'OTHER') => Promise<void>;
  removePhoto: (idx: number) => void;
  uploadContainerPhoto: (file: File, tripId: number | undefined, rowKey: string, type: 'CONTAINER' | 'SEAL', containerId?: number) => Promise<ContainerPhotoUploadResult>;
  revokeRowPhotos: (rowKey: string) => void;
  suggestedPrice: number | null;
  estimatedFuelCost: number;
  estimatedTollCost: number;
  estimatedProfit: number;
  completionStatus: CompletionStatus;
  completedSections: number;
  requiredFieldsFilled: number;
  totalRequiredFields: number;
  uploading: UploadingState;
  ocrResult: OcrSignal | null;
  handleSubmit: (e?: React.FormEvent) => Promise<number | undefined>;
  selectedRouteData: RouteOption | null;
  roadAllowanceBaseApplied?: number;
  tollPerStationApplied?: number;
  returnCargoBonusApplied?: number;
  twoPointDeliveryDefault?: number;
  vehicleShiftDefault?: number;
}

export function useTripFormDispatch(params: UseTripFormDispatchParams): UseTripFormDispatchReturn {
  const { state: s, options, isEditMode, existingTrip } = params;
  const queryClient = useQueryClient();
  const { toast: showToast } = useToast();
  const lastPopulatedTripId = useRef<number | undefined>(undefined);

  // Broadcast OCR results to container-aware components via context.
  const [ocrResult, setOcrResult] = useState<OcrSignal | null>(null);
  const onOcrResult = useCallback<OcrResultHandler>((containerNumbers, sealNumber, type) => {
    setOcrResult({ containerNumbers, sealNumber, type, nonce: Math.random() });
  }, []);

  const { data: roadConfig } = useQuery({
    queryKey: qk.catalogs.roadConfig,
    queryFn: () => configClient.getRoadConfig(),
    staleTime: 10 * 60 * 1000,
  });

  useEffect(() => {
    // Only derive revenue from splits when at least one split is populated.
    // When both are blank, leave the seeded stored value intact so an untouched
    // form neither displays nor serializes a misleading 0. The persisted value
    // is resolved server-side from whatever splits are actually sent
    // (undefined = not-provided; feedback202606 A3 §9).
    if (!s.revenueEmptyReturn.trim() && !s.revenueCombine.trim()) return;
    const emptyReturn = Number(s.revenueEmptyReturn) || 0;
    const combine = Number(s.revenueCombine) || 0;
    s.setRevenue(String(emptyReturn + combine));
    // 's' object omitted: individual s.* fields listed are the correct granularity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.revenueEmptyReturn, s.revenueCombine]);

  const { legs, setLegs, addLeg, removeLeg, updateLeg } = useTripFormLegs(options.routes, s.routeId, isEditMode);
  const { photoUrls, uploading, uploadPhotos, removePhoto, flushPendingPhotos,
    uploadContainerPhoto, flushPendingContainerPhotos, revokeRowPhotos } = useTripFormPhotos(s.setError, onOcrResult);

  useEffect(() => {
    if (!isEditMode || !existingTrip) return;
    // resetForm() (called on the 409 silent-retry path) bumps s.resetToggle.
    // Clear the populate-guard so the form re-syncs from the freshly-refetched
    // trip data — without this the same trip id would short-circuit the
    // re-population and leave the fields blank after a 409 reset.
    if (s.resetToggle) lastPopulatedTripId.current = undefined;
    if (existingTrip.id === lastPopulatedTripId.current) return;

    // Main info fields — useState initializers run once before the query
    // resolves, so any field read at mount time ends up empty when
    // existingTrip arrives after first render. Mirror every main-info setter
    // here so the form repopulates correctly on mount, on 409 refetch, and on
    // navigating between two edit trips. Same pattern as the instructions
    // sync below.
    s.setDepartureDate(existingTrip.departureDate || '');
    s.setCustomerId(existingTrip.customerId != null ? String(existingTrip.customerId) : '');
    s.setTruckId(existingTrip.truckId != null ? String(existingTrip.truckId) : '');
    s.setTrailerType(existingTrip.trailerType ?? '');
    s.setDriverId(existingTrip.driverId != null ? String(existingTrip.driverId) : '');
    s.setCargoTypeId(existingTrip.cargoTypeId != null ? String(existingTrip.cargoTypeId) : '');
    s.setCustomerReference(existingTrip.customerReference ?? '');
    s.setContainerCount(existingTrip.containerCount != null ? String(existingTrip.containerCount) : '1');
    s.setCompletedAt(existingTrip.completedAt ? existingTrip.completedAt.slice(0, 10) : '');

    s.setRouteId(String(existingTrip.routeId));
    s.setFuelMode(existingTrip.fuelMode);
    s.setFuelLitersOverride(existingTrip.fuelLitersOverride ? String(existingTrip.fuelLitersOverride) : '');
    s.setFuelSupplementLiters(existingTrip.fuelSupplementLiters ? String(existingTrip.fuelSupplementLiters) : '');
    s.setFuelSupplementReason(existingTrip.fuelSupplementReason || '');
    s.setTollsDiscount(existingTrip.tollsDiscount ? String(existingTrip.tollsDiscount) : '');
    s.setTollsAddition(existingTrip.tollsAddition ? String(existingTrip.tollsAddition) : '');
    s.setTollsStations(existingTrip.tollsStations != null ? String(existingTrip.tollsStations) : '');
    s.setHasReturnCargo(!!existingTrip.hasReturnCargo);
    s.setDriverSalary(existingTrip.driverSalary ? String(existingTrip.driverSalary) : '');
    s.setTwoPointDeliveryBonus(existingTrip.twoPointDeliveryBonus && Number(existingTrip.twoPointDeliveryBonus) > 0 ? String(existingTrip.twoPointDeliveryBonus) : '');
    s.setVehicleShiftAllowance(existingTrip.vehicleShiftAllowance && Number(existingTrip.vehicleShiftAllowance) > 0 ? String(existingTrip.vehicleShiftAllowance) : '');
    if (existingTrip.revenueEmptyReturn) {
      s.setRevenueEmptyReturn(String(existingTrip.revenueEmptyReturn));
    } else if (existingTrip.revenue && (!existingTrip.revenueCombine || Number(existingTrip.revenueCombine) === 0)) {
      s.setRevenueEmptyReturn(String(existingTrip.revenue));
    } else {
      s.setRevenueEmptyReturn('');
    }
    s.setRevenueCombine(existingTrip.revenueCombine ? String(existingTrip.revenueCombine) : '');
    s.setCustomerCommission(existingTrip.customerCommission ? String(existingTrip.customerCommission) : '0');
    s.setTripWageDays(existingTrip.tripWageDays ? String(existingTrip.tripWageDays) : '');
    s.setNotes(existingTrip.notes || '');
    // Instructions (N2 / B1.3) arrive on the same detail payload as the rest of
    // the trip. Set them here — NOT just in useState — so the fields repopulate
    // when existingTrip resolves after mount (useState initializers run once,
    // before the query returns) and when navigating between two edit trips or
    // retrying after a 409 refetch. Without this the inputs stay blank and the
    // next save would overwrite the stored row with nulls.
    const inst = existingTrip.instructions;
    s.setContactName(inst?.contactName ?? '');
    s.setContactPhone(inst?.contactPhone ?? '');
    s.setInstructionsNotes(inst?.notes ?? '');
    s.setFuelActualUnitPrice(existingTrip.fuelActualUnitPrice != null ? String(existingTrip.fuelActualUnitPrice) : '');
    s.setFuelSupplierId(existingTrip.fuelSupplierId ?? null);
    s.setPhotoUrls(existingTrip.photoUrls || []);

    s.setCarrierType(existingTrip.carrierType ?? 'OWN');
    s.setVatRate(existingTrip.vatRate != null ? Number(existingTrip.vatRate) : 0.08);
    s.setExternalCarrierId(existingTrip.externalCarrierId ?? null);
    s.setExternalFreightCost(existingTrip.externalFreightCost ? String(existingTrip.externalFreightCost) : '');
    s.setExternalPlateNumber(existingTrip.externalPlateNumber ?? '');
    s.setExternalDriverName(existingTrip.externalDriverName ?? '');
    s.setExternalDriverPhone(existingTrip.externalDriverPhone ?? '');

    if (existingTrip.legs && existingTrip.legs.length > 0) {
      setLegs(existingTrip.legs.map((leg: TripLeg) => ({
        id: String(leg.id || Math.random()),
        sequence: leg.sequence,
        origin: leg.origin,
        destination: leg.destination,
        km: String(leg.km),
        loadingType: leg.loadingType as LoadingType,
      })));
    } else {
      setLegs(createFallbackLegsFromRouteName(existingTrip.route?.name));
    }

    lastPopulatedTripId.current = existingTrip.id;
    // 's' and 'setLegs' omitted: this effect populates form fields once when
    // existingTrip changes (guarded by lastPopulatedTripId ref); setters are stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode, existingTrip, s.resetToggle]);

  useEffect(() => {
    if (s.truckId && options?.trucks && options?.trailers) {
      const selectedTruck = options.trucks.find(t => t.id === Number(s.truckId));
      if (selectedTruck?.currentTrailerId) {
        const trailer = options.trailers.find(t => t.id === selectedTruck.currentTrailerId);
        if (trailer) {
          s.setTrailerType(trailer.type === '20FT' ? '20FT' : '40FT');
        }
      }
    }
    // 's' omitted: individual s.* fields listed are the correct granularity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.truckId, options?.trucks, options?.trailers]);

  const pricingQuery = useQuery({
    queryKey: qk.trips.suggestedPrice(Number(s.customerId) || 0, Number(s.routeId) || 0, s.departureDate),
    queryFn: async () => {
      if (isEditMode && existingTrip?.customerId && existingTrip?.routeId) {
        const ptRes = await api.get<PaginatedResponse<PricingTable>>('/pricing-tables');
        const match = (ptRes.items || []).find(
          (pt: PricingTable) => pt.customerId === existingTrip.customerId && pt.routeId === existingTrip.routeId
        );
        if (match) return { price: Number(match.price) };
      }
      const res = await tripClient.getPricing(
        Number(s.customerId),
        Number(s.routeId),
        s.departureDate || undefined,
      );
      return res;
    },
    enabled: !!s.customerId && !!s.routeId,
    staleTime: 5 * 60 * 1000,
  });

  const suggestedPrice = pricingQuery.data?.price ?? null;

  useEffect(() => {
    if (pricingQuery.data !== undefined && !isEditMode) {
      const count = resolveContainerCount(s.containerCount);
      {
        const prev = s.revenueEmptyReturn;
        if (!prev || prev === "0") s.setRevenueEmptyReturn(String(pricingQuery.data!.price * count));
        else if (Number(prev) === pricingQuery.data!.price) s.setRevenueEmptyReturn(String(pricingQuery.data!.price * count));
      }
      s.setRevenueCombine("0");
    }
    // 's' omitted: individual s.* fields listed are the correct granularity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pricingQuery.data, s.containerCount, isEditMode]);

  const selectedRouteData = useMemo((): RouteOption | null => {
    if (s.routeId) {
      const found = options.routes.find(r => r.id === Number(s.routeId));
      if (found) return found;
    }
    if (isEditMode && existingTrip?.route) {
      return {
        id: existingTrip.route.id,
        label: existingTrip.route.name,
        name: existingTrip.route.name,
        distanceKm: existingTrip.route.distanceKm ?? undefined,
        isMountain: existingTrip.route.isMountain,
        fixedFuelAllowance: existingTrip.route.fixedFuelAllowance,
        tollsStations: existingTrip.route.tollsStations ?? undefined,
        driverSalary: existingTrip.route.driverSalary ?? undefined,
      };
    }
    return null;
  }, [s.routeId, options.routes, isEditMode, existingTrip]);

  useEffect(() => {
    if (!selectedRouteData) return;
    if (isEditMode && existingTrip && existingTrip.routeId === selectedRouteData.id) {
      return;
    }
    if (selectedRouteData.tollsStations != null) {
      s.setTollsStations(String(selectedRouteData.tollsStations));
    }
    if (selectedRouteData.fixedFuelAllowance != null) {
      s.setFuelLitersOverride(String(selectedRouteData.fixedFuelAllowance));
    }
    if (selectedRouteData.driverSalary != null) {
      s.setDriverSalary(String(selectedRouteData.driverSalary));
    } else if (roadConfig?.defaultDriverSalary && Number(roadConfig.defaultDriverSalary) > 0) {
      s.setDriverSalary(String(roadConfig.defaultDriverSalary));
    }
    if (roadConfig?.twoPointDeliveryBonus && Number(roadConfig.twoPointDeliveryBonus) > 0) {
      s.setTwoPointDeliveryBonus(String(roadConfig.twoPointDeliveryBonus));
    }
    if (roadConfig?.vehicleShiftDefault && Number(roadConfig.vehicleShiftDefault) > 0) {
      s.setVehicleShiftAllowance(String(roadConfig.vehicleShiftDefault));
    }
    // 's' and roadConfig fields omitted: this effect applies road-config defaults
    // only when the route changes; adding roadConfig deps would re-fire and
    // overwrite user edits on every config refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRouteData, isEditMode, existingTrip]);

  useEffect(() => {
    if (isEditMode) return;
    if (!s.driverId || !s.departureDate) return;
    if (selectedRouteData?.driverSalary != null) return;
    if (roadConfig?.defaultDriverSalary && Number(roadConfig.defaultDriverSalary) > 0) return;

    const driver = options?.drivers?.find((d: { id: number; baseSalary?: number | string }) => d.id === Number(s.driverId));
    if (!driver) return;

    const baseSalary = Number((driver as { id: number; baseSalary?: number | string }).baseSalary) || 0;
    if (baseSalary <= 0) return;

    const startDate = new Date(s.departureDate);
    const days = s.completedAt
      ? Math.max(1, Math.ceil((new Date(s.completedAt).getTime() - startDate.getTime()) / (86400000)) + 1)
      : 1;

    s.setTripWageDays(s.tripWageDays || String(days));

    const [y, m] = s.departureDate.split('-').map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    let sundays = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      if (new Date(y, m - 1, d).getDay() === 0) sundays++;
    }
    const standardWorkDays = daysInMonth - sundays;
    const dailyRate = Math.round(baseSalary / standardWorkDays);
    s.setDriverSalary(String(dailyRate * days));
    // 's' omitted: individual s.* fields listed are the correct granularity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.driverId, s.departureDate, s.completedAt, selectedRouteData, roadConfig, isEditMode, options?.drivers]);

  const estimatedFuelCost = useMemo(() => {
    if (s.fuelMode === FuelMode.FLAT_RATE) {
      const liters = Number(s.fuelLitersOverride) || 0;
      return liters * FUEL_PRICE_PER_LITER;
    }
    return legs.reduce((acc, leg) => {
      const km = Number(leg.km) || 0;
      const rate = leg.loadingType === LoadingType.HANG ? LOADED_RATE : EMPTY_RATE;
      return acc + (km / 100) * rate * FUEL_PRICE_PER_LITER;
    }, 0);
  }, [s.fuelMode, s.fuelLitersOverride, legs]);

  const estimatedTollCost = useMemo(() => {
    const base = isEditMode && existingTrip?.roadAllowanceBaseApplied ? Number(existingTrip.roadAllowanceBaseApplied) : 0;
    const discount = Number(s.tollsDiscount) || 0;
    const addition = Number(s.tollsAddition) || 0;
    const stations = Number(s.tollsStations) || 0;

    const perStation = isEditMode && existingTrip?.tollPerStationApplied
      ? Number(existingTrip.tollPerStationApplied)
      : (roadConfig ? Number(roadConfig.tollPerStation) : 55000);

    const returnBonus = s.hasReturnCargo
      ? (isEditMode && existingTrip?.returnCargoBonusApplied
          ? Number(existingTrip.returnCargoBonusApplied)
          : (roadConfig ? Number(roadConfig.returnCargoBonus) : 300000))
      : 0;

    const tongTienDiDuong = addition > 0
      ? addition
      : (base - (stations * perStation) + returnBonus);

    return Math.max(0, tongTienDiDuong - discount);
  }, [isEditMode, existingTrip, roadConfig, s.tollsDiscount, s.tollsAddition, s.tollsStations, s.hasReturnCargo]);

  const estimatedProfit = useMemo(
    () =>
      (Number(s.revenue) || 0) -
      estimatedFuelCost -
      estimatedTollCost -
      (Number(s.driverSalary) || 0) -
      (Number(s.twoPointDeliveryBonus) || 0) -
      (Number(s.vehicleShiftAllowance) || 0),
    [s.revenue, estimatedFuelCost, estimatedTollCost, s.driverSalary, s.twoPointDeliveryBonus, s.vehicleShiftAllowance],
  );

  const requiredFieldsFilled = useMemo(() => {
    let count = 0;
    if (s.customerId) count++;
    if (s.routeId) count++;
    if (s.carrierType === 'EXTERNAL') {
      if (s.externalFreightCost && s.externalFreightCost.trim()) count++;
      if (s.externalDriverName && s.externalDriverName.trim()) count++;
      if (s.externalDriverPhone && s.externalDriverPhone.trim()) count++;
    } else {
      if (s.truckId) count++;
      if (s.trailerType) count++;
      if (s.driverId) count++;
    }
    if (s.cargoTypeId) count++;
    if (s.departureDate) count++;
    return count;
  }, [
    s.customerId, s.routeId, s.carrierType, s.truckId, s.trailerType, s.driverId,
    s.cargoTypeId, s.departureDate, s.externalFreightCost, s.externalDriverName, s.externalDriverPhone
  ]);

  const completionStatus = useMemo((): CompletionStatus => {
    let fuelRevenue = 0;
    if (s.fuelMode) fuelRevenue++;
    if (s.fuelSupplementLiters) fuelRevenue++;
    if (s.fuelSupplementReason) fuelRevenue++;
    if (s.tollsAddition) fuelRevenue++;
    if (s.tollsDiscount) fuelRevenue++;
    if (s.tollsStations) fuelRevenue++;
    if (s.driverSalary) fuelRevenue++;
    if (s.revenue) fuelRevenue++;

    let images = 0;
    if (s.notes.trim()) images++;
    if (photoUrls.length > 0) images++;

    return {
      mainInfo: requiredFieldsFilled + (s.customerReference.trim() ? 1 : 0),
      journey: legs.length,
      fuelRevenue,
      images,
    };
  }, [
    requiredFieldsFilled,
    s.customerReference,
    legs.length,
    s.fuelMode,
    s.fuelSupplementLiters,
    s.fuelSupplementReason,
    s.tollsAddition,
    s.tollsDiscount,
    s.tollsStations,
    s.driverSalary,
    s.revenue,
    s.notes,
    photoUrls,
  ]);

  const completedSections = useMemo(() => {
    let count = 0;
    if (completionStatus.mainInfo >= 7) count++;
    if (completionStatus.journey >= 1) count++;
    if (completionStatus.fuelRevenue >= 2) count++;
    if (completionStatus.images >= 1) count++;
    return count;
  }, [completionStatus]);

  const hasOptionalData = useMemo(
    () =>
      legs.some((l) => l.km.trim() !== "") ||
      (s.fuelMode === FuelMode.FLAT_RATE && s.fuelLitersOverride.trim() !== "") ||
      s.fuelSupplementLiters.trim() !== "" ||
      s.fuelSupplementReason.trim() !== "" ||
      s.tollsDiscount.trim() !== "" ||
      s.tollsAddition.trim() !== "" ||
      s.tollsStations.trim() !== "" ||
      s.hasReturnCargo ||
      s.driverSalary.trim() !== "" ||
      s.revenue.trim() !== "" ||
      s.notes.trim() !== "" ||
      photoUrls.length > 0,
    [
      legs, s.fuelMode, s.fuelLitersOverride, s.fuelSupplementLiters,
      s.fuelSupplementReason, s.tollsDiscount, s.tollsAddition, s.tollsStations,
      s.hasReturnCargo, s.driverSalary, s.revenue, s.notes, photoUrls,
    ],
  );

  const handleSubmit = useCallback(
    async (e?: React.FormEvent): Promise<number | undefined> => {
      e?.preventDefault();
      s.setError("");

      const focusAndScroll = (id: string) => {
        const el = document.getElementById(id);
        if (el) {
          el.focus();
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      };

      // Compulsory fields check
      if (!s.customerId) {
        const msg = "Customer is required.";
        s.setError(msg);
        showToast({ kind: 'error', message: msg });
        focusAndScroll("customerId");
        return;
      }
      if (!s.routeId) {
        const msg = "Route is required.";
        s.setError(msg);
        showToast({ kind: 'error', message: msg });
        focusAndScroll("routeId");
        return;
      }
      if (!s.cargoTypeId) {
        const msg = "Cargo type is required.";
        s.setError(msg);
        showToast({ kind: 'error', message: msg });
        focusAndScroll("cargoTypeId");
        return;
      }
      if (!s.departureDate) {
        const msg = "Departure date is required.";
        s.setError(msg);
        showToast({ kind: 'error', message: msg });
        focusAndScroll("departureDate");
        return;
      }

      if (s.carrierType === 'OWN') {
        if (!s.truckId) {
          const msg = "Truck is required.";
          s.setError(msg);
          showToast({ kind: 'error', message: msg });
          focusAndScroll("truckId");
          return;
        }
        if (!s.trailerType) {
          const msg = "Trailer type is required.";
          s.setError(msg);
          showToast({ kind: 'error', message: msg });
          focusAndScroll("trailerType");
          return;
        }
        if (!s.driverId) {
          const msg = "Driver is required.";
          s.setError(msg);
          showToast({ kind: 'error', message: msg });
          focusAndScroll("driverId");
          return;
        }
      }
      // EXTERNAL carrier trips: freight cost, plate, driver name and phone are
      // optional at creation — the user may fill them in later. Only the carrier
      // partner identity is required, and that is enforced by the backend schema.

      if (isEditMode) {
        if (legs.length === 0) {
          const msg = 'At least one journey leg is required.';
          s.setError(msg);
          showToast({ kind: 'error', message: msg });
          return;
        }
        for (const leg of legs) {
          if (!leg.origin.trim() || !leg.destination.trim()) {
            const msg = `Leg ${leg.sequence}: Both origin and destination are required.`;
            s.setError(msg);
            showToast({ kind: 'error', message: msg });
            return;
          }
          const kmRaw = (leg.km ?? '').toString().trim();
          if (kmRaw !== '' && (isNaN(Number(kmRaw)) || Number(kmRaw) < 0)) {
            const msg = `Leg ${leg.sequence}: Distance must be a non-negative number.`;
            s.setError(msg);
            showToast({ kind: 'error', message: msg });
            return;
          }
        }
        const supplementNum = Number(s.fuelSupplementLiters);
        if (supplementNum > 0 && !s.fuelSupplementReason.trim()) {
          const msg = 'Please enter a reason for fuel supplement.';
          s.setError(msg);
          showToast({ kind: 'error', message: msg });
          focusAndScroll("fuelSupplementReason");
          return;
        }
      }

      s.setSubmitting(true);
      try {
        // Containers share the unified save; validate up front so a row that
        // has seal/weight/type but no Số container aborts BEFORE any trip
        // figures are written (avoids partial saves + a confusing backend
        // error). Mirrors the old per-card validation.
        for (const r of s.containerRows) {
          const hasAny =
            r.containerNumber.trim() ||
            r.seals.some(sl => sl.sealNumber.trim()) ||
            r.cargoWeightKg ||
            r.containerTypeId;
          if (hasAny && !r.containerNumber.trim()) {
            const msg = 'Each container must have a container number. Delete empty rows if not entered.';
            s.setError(msg);
            showToast({ kind: 'error', message: msg });
            return;
          }
          // No half-filled seal rows: if any seal field is present, the number is required.
          for (const sl of r.seals) {
            const hasPartial = sl.sealNumber.trim() || sl.sealType.trim() || sl.notes.trim();
            if (hasPartial && !sl.sealNumber.trim()) {
              const msg = 'Each seal must have a seal number. Delete empty seals if not entered.';
              s.setError(msg);
              showToast({ kind: 'error', message: msg });
              return;
            }
          }
        }

        // Persist container instances as part of the unified save (the
        // standalone "Lưu danh sách container" button was removed). Full
        // reconcile: insert/update by id, delete rows not in the list.
        const saveContainers = async (id: number) => {
          const containers = s.containerRows
            .filter(r =>
              r.containerNumber.trim() ||
              r.seals.some(sl => sl.sealNumber.trim()) ||
              r.cargoWeightKg ||
              r.containerTypeId,
            )
            .map(r => ({
              id: r.id,
              containerTypeId: r.containerTypeId === '' ? null : Number(r.containerTypeId),
              containerNumber: r.containerNumber.trim(),
              // seals[] is the source of truth; backend mirrors seals[0] into legacy sealNumber.
              seals: r.seals
                .filter(sl => sl.sealNumber.trim())
                .map(sl => ({
                  id: sl.id,
                  sealNumber: sl.sealNumber.trim(),
                  sealType: sl.sealType.trim() || null,
                  notes: sl.notes.trim() || null,
                })),
              cargoWeightKg: r.cargoWeightKg === '' ? null : Number(r.cargoWeightKg),
              notes: r.notes.trim() || null,
            }));
          const result = await api.put<{ items: ServerContainerAfterSave[] }>(`/trips/${id}/containers`, { containers });
          await queryClient.invalidateQueries({ queryKey: qk.tripForm.tripContainers(id) });

          const items = Array.isArray(result?.items) ? result.items : [];
          const usedKeys = new Set<string>();
          const usedSealKeys = new Set<string>();
          // Track `_key` per post-save item so the flush below can build a
          // map from pre-save `_key` → server-assigned container id (needed
          // for create mode where pre-save ids are all undefined).
          const itemToKey: Array<{ key: string; containerId: number }> = [];
          // Match containers by containerNumber (preserve _key + its buffered photos).
          // Match seals within each container by sealNumber (preserve seal _key).
          s.setContainerRows(items.map((c): ContainerFormRow => {
            const match = s.containerRows.find(r =>
              !usedKeys.has(r._key) &&
              r.containerNumber.trim() &&
              r.containerNumber.trim().toUpperCase() === (c.containerNumber ?? '').toUpperCase(),
            );
            const _key = match?._key ?? Math.random().toString(36).slice(2, 9);
            if (match) usedKeys.add(_key);
            itemToKey.push({ key: _key, containerId: c.id });
            // Build seals, matching by sealNumber to preserve client _key.
            const serverSeals = c.seals ?? [];
            const seals: SealFormRow[] = serverSeals.map((sl): SealFormRow => {
              const matchedSeal = match?.seals.find(x =>
                !usedSealKeys.has(x._key) &&
                x.sealNumber.trim().toUpperCase() === (sl.sealNumber ?? '').toUpperCase(),
              );
              const sealKey = matchedSeal?._key ?? Math.random().toString(36).slice(2, 9);
              if (matchedSeal) usedSealKeys.add(sealKey);
              return {
                id: sl.id,
                _key: sealKey,
                sealNumber: sl.sealNumber ?? '',
                sealType: sl.sealType ?? '',
                notes: sl.notes ?? '',
              };
            });
            // Group server photos by type into photoKeys, then carry over any
            // `blob:` previews that were captured before this row was saved.
            // The pre-save `match.photoKeys` still has them (form state is
            // closure-captured at handleSubmit time). Carry-over is safe
            // because `revokeRowPhotos` already removed deleted rows' pending
            // entries from the buffer — so a blob here is still buffered and
            // will be flushed below. Without this, the subsequent swap would
            // miss (post-save rows only have server keys, not the blob keys
            // the swap map uses as lookup keys).
            const photos = c.photos ?? [];
            const pendingBlobsCont = (match?.photoKeys.cont ?? []).filter(u => u.startsWith('blob:'));
            const pendingBlobsSeal = (match?.photoKeys.seal ?? []).filter(u => u.startsWith('blob:'));
            const photoKeys = {
              cont: [
                ...photos.filter(p => p.type === 'CONTAINER').map(p => p.storageKey),
                ...pendingBlobsCont,
              ],
              seal: [
                ...photos.filter(p => p.type === 'SEAL').map(p => p.storageKey),
                ...pendingBlobsSeal,
              ],
            };
            return {
              id: c.id,
              _key,
              containerTypeId: c.containerTypeId ?? '',
              containerNumber: c.containerNumber ?? '',
              sealNumber: seals[0]?.sealNumber ?? '',
              cargoWeightKg: c.cargoWeightKg != null ? String(c.cargoWeightKg) : '',
              notes: c.notes ?? '',
              seals,
              photoKeys,
            };
          }));

          // Flush per-container photos captured before the row had an id.
          // Build the map from the post-save items (which carry the new
          // server-assigned ids) — using the pre-save `s.containerRows`
          // snapshot would miss ids in create mode (where pre-save ids are
          // all undefined).
          const rowKeyToContainerId = new Map<string, number>();
          for (const { key, containerId } of itemToKey) {
            rowKeyToContainerId.set(key, containerId);
          }
          if (rowKeyToContainerId.size > 0) {
            const swaps = await flushPendingContainerPhotos(id, rowKeyToContainerId);
            if (swaps.size > 0) {
              s.setContainerRows(prev => prev.map(r => ({
                ...r,
                photoKeys: {
                  cont: r.photoKeys.cont.map(u => swaps.get(u) ?? u),
                  seal: r.photoKeys.seal.map(u => swaps.get(u) ?? u),
                },
              })));
            }
          }
        };

        if (isEditMode && existingTrip) {
          const payload = {
            routeId: s.routeId ? Number(s.routeId) : undefined,
            departureDate: s.departureDate || undefined,
            completedAt: s.completedAt || undefined,
            legs: legs.map(l => ({
              sequence: l.sequence,
              origin: l.origin.trim(),
              destination: l.destination.trim(),
              km: Number(l.km),
              loadingType: l.loadingType,
            })),
            version: existingTrip.version,
            fuelMode: s.fuelMode,
            fuelLitersOverride: s.fuelMode === FuelMode.FLAT_RATE ? (s.fuelLitersOverride ? Number(s.fuelLitersOverride) : 0) : undefined,
            fuelSupplementLiters: s.fuelSupplementLiters ? Number(s.fuelSupplementLiters) : 0,
            fuelSupplementReason: s.fuelSupplementReason.trim() || undefined,
            tollsDiscount: s.tollsDiscount ? Number(s.tollsDiscount) : 0,
            tollsAddition: s.tollsAddition ? Number(s.tollsAddition) : 0,
            tollsStations: s.tollsStations ? Number(s.tollsStations) : 0,
            hasReturnCargo: s.hasReturnCargo,
            driverSalary: s.driverSalary ? Number(s.driverSalary) : undefined,
            twoPointDeliveryBonus: s.twoPointDeliveryBonus ? Number(s.twoPointDeliveryBonus) : 0,
            vehicleShiftAllowance: s.vehicleShiftAllowance ? Number(s.vehicleShiftAllowance) : 0,
            // Revenue is split-based; `revenue` is derived and recomputed
            // server-side from the splits. Send splits as `undefined` when
            // untouched (NOT 0) so resolveRevenue preserves stored revenue, and
            // omit the derived `revenue` copy — sending it would zero stored
            // revenue whenever both splits are blank. feedback202606 A3 §9.
            revenueEmptyReturn: s.revenueEmptyReturn.trim() ? Number(s.revenueEmptyReturn) : undefined,
            revenueCombine: s.revenueCombine.trim() ? Number(s.revenueCombine) : undefined,
            notes: s.notes.trim() || undefined,
            roadAllowanceOverride: s.roadAllowanceOverride !== '' ? Number(s.roadAllowanceOverride) : null,
            fuelActualUnitPrice: s.fuelActualUnitPrice !== '' ? Number(s.fuelActualUnitPrice) : null,
            fuelSupplierId: s.fuelSupplierId !== null ? s.fuelSupplierId : null,
            customerCommission: Number(s.customerCommission) || 0,
            tripWageDays: s.tripWageDays ? Number(s.tripWageDays) : undefined,
            carrierType: s.carrierType,
            externalCarrierId: s.carrierType === 'EXTERNAL' ? (s.externalCarrierId ?? null) : null,
            externalFreightCost: s.carrierType === 'EXTERNAL' ? (s.externalFreightCost ? Number(s.externalFreightCost) : null) : null,
            externalPlateNumber: s.carrierType === 'EXTERNAL' ? (s.externalPlateNumber.trim() || null) : null,
            externalDriverName: s.carrierType === 'EXTERNAL' ? (s.externalDriverName.trim() || null) : null,
            externalDriverPhone: s.carrierType === 'EXTERNAL' ? (s.externalDriverPhone.trim() || null) : null,
            truckId: s.carrierType === 'OWN' ? (s.truckId ? Number(s.truckId) : null) : null,
            driverId: s.carrierType === 'OWN' ? (s.driverId ? Number(s.driverId) : null) : null,
            trailerType: s.carrierType === 'OWN' ? (s.trailerType || null) : null,
          };

          const endpoint = existingTrip.status === TripStatus.CREATED ? `/trips/${existingTrip.id}/pre-departure` : `/trips/${existingTrip.id}/actuals`;
          const putFigures = (version: number) =>
            api.put<Record<string, unknown>>(endpoint, { ...payload, version });
          let updatedTrip: Record<string, unknown>;
          try {
            updatedTrip = await putFigures(existingTrip.version);
          } catch (err) {
            // Stale client version (e.g. the figures were saved in another
            // tab/session and this tab's cache still holds an older version).
            // Refetch the latest trip and retry once with the fresh version
            // before surfacing a real "changed by someone else" conflict.
            if (!(err instanceof ApiError && err.status === 409)) throw err;
            await queryClient.refetchQueries({ queryKey: qk.trips.detail(existingTrip.id) });
            const fresh = queryClient.getQueryData<TripDetail>(qk.trips.detail(existingTrip.id));
            if (!fresh) throw err;
            updatedTrip = await putFigures(fresh.version);
          }
          queryClient.invalidateQueries({ queryKey: qk.trips.all });
          queryClient.setQueryData(qk.trips.detail(existingTrip.id), updatedTrip);
          queryClient.invalidateQueries({ queryKey: qk.trips.detail(existingTrip.id) });
          queryClient.invalidateQueries({ queryKey: qk.trips.adjustments(existingTrip.id) });

          await saveContainers(existingTrip.id);
          // Manager-authored contact + guidance (N2 / B1.3) — persisted via the
          // existing PUT /api/trips/:id/instructions route. Always called so
          // a manager can blank a previously-typed contact. The trip figures
          // above are already committed, so this is best-effort and must never
          // roll them back — but if it fails we surface the error and stay on
          // the page (return undefined) so the manager actually sees it and can
          // retry. Navigating to the detail page on success would otherwise
          // discard the message before it renders.
          try {
            await tripClient.upsertTripInstructions(existingTrip.id, {
              contactName: s.contactName.trim() || null,
              contactPhone: s.contactPhone.trim() || null,
              notes: s.instructionsNotes.trim() || null,
            });
          } catch (instErr) {
            console.error('Trip instructions upsert failed:', instErr);
            const msg = instErr instanceof ApiError
              ? `Instructions not saved: ${instErr.message}`
              : 'Instructions not saved. Please try again.';
            s.setError(msg);
            showToast({ kind: 'error', message: msg });
            return undefined;
          }
          return existingTrip.id;
        }

        const createPayload: Record<string, unknown> = {
          customerId: Number(s.customerId),
          routeId: Number(s.routeId),
          cargoTypeId: Number(s.cargoTypeId),
          departureDate: s.departureDate,
          fuelMode: s.fuelMode,
          carrierType: s.carrierType,
          vatRate: s.vatRate,
          fuelSupplierId: s.carrierType === 'OWN' ? (s.fuelSupplierId ?? null) : null,
        };
        if (s.carrierType === 'OWN') {
          createPayload.truckId = Number(s.truckId);
          createPayload.trailerType = s.trailerType || undefined;
          createPayload.driverId = Number(s.driverId);
        } else {
          createPayload.truckId = null;
          createPayload.driverId = null;
          createPayload.externalCarrierId = s.externalCarrierId ?? undefined;
          createPayload.externalFreightCost = s.externalFreightCost ? Number(s.externalFreightCost) : undefined;
          createPayload.externalPlateNumber = s.externalPlateNumber.trim() || undefined;
          createPayload.externalDriverName = s.externalDriverName.trim() || undefined;
          createPayload.externalDriverPhone = s.externalDriverPhone.trim() || undefined;
        }
        if (s.customerReference.trim()) {
          createPayload.customerReference = s.customerReference.trim();
        }
        const count = resolveContainerCount(s.containerCount);
        createPayload.containerCount = count;
        const trip = await api.post<{ id: number }>("/trips", createPayload);

        // Upload any create-mode OCR photos now that we have a trip id,
        // replacing their local previews with real server URLs.
        let finalPhotoUrls = photoUrls;
        try {
          finalPhotoUrls = await flushPendingPhotos(trip.id);
        } catch {
          // Photos are optional — don't abort the freshly-created trip.
        }

        if (hasOptionalData) {
          const legsToSubmit = legs.filter(
            (leg) => leg.origin.trim() !== '' || leg.destination.trim() !== '' || leg.km.trim() !== '',
          );
          for (const leg of legsToSubmit) {
            const kmRaw = (leg.km ?? '').toString().trim();
            const kmNum = kmRaw === '' ? 0 : Number(kmRaw);
            if (
              !leg.origin.trim() ||
              !leg.destination.trim() ||
              Number.isNaN(kmNum) ||
              kmNum < 0
            ) {
              throw new Error(
                `Leg ${leg.sequence} is invalid (Both origin and destination are required; Distance must be a non-negative number).`,
              );
            }
          }

          const supplementNum = Number(s.fuelSupplementLiters);
          if (supplementNum > 0 && !s.fuelSupplementReason.trim()) {
            throw new Error("Please enter a reason for fuel supplement.");
          }

          if (legsToSubmit.length === 0) {
            return trip.id;
          }

          const preDeparturePayload = {
            legs: legsToSubmit.map((l) => ({
              sequence: l.sequence,
              origin: l.origin.trim(),
              destination: l.destination.trim(),
              km: Number(l.km),
              loadingType: l.loadingType,
            })),
            fuelMode: s.fuelMode,
            fuelLitersOverride:
              s.fuelMode === FuelMode.FLAT_RATE
                ? s.fuelLitersOverride
                  ? Number(s.fuelLitersOverride)
                  : 0
                : undefined,
            fuelSupplementLiters: s.fuelSupplementLiters
              ? Number(s.fuelSupplementLiters)
              : 0,
            fuelSupplementReason: s.fuelSupplementReason.trim() || undefined,
            tollsDiscount: s.tollsDiscount ? Number(s.tollsDiscount) : 0,
            tollsAddition: s.tollsAddition ? Number(s.tollsAddition) : 0,
            tollsStations: s.tollsStations ? Number(s.tollsStations) : 0,
            hasReturnCargo: s.hasReturnCargo,
            driverSalary: s.driverSalary ? Number(s.driverSalary) : undefined,
            twoPointDeliveryBonus: s.twoPointDeliveryBonus ? Number(s.twoPointDeliveryBonus) : 0,
            vehicleShiftAllowance: s.vehicleShiftAllowance ? Number(s.vehicleShiftAllowance) : 0,
            // Revenue is split-based; `revenue` is derived and recomputed
            // server-side from the splits. Send splits as `undefined` when
            // untouched (NOT 0) so resolveRevenue preserves stored revenue, and
            // omit the derived `revenue` copy — sending it would zero stored
            // revenue whenever both splits are blank. feedback202606 A3 §9.
            revenueEmptyReturn: s.revenueEmptyReturn.trim() ? Number(s.revenueEmptyReturn) : undefined,
            revenueCombine: s.revenueCombine.trim() ? Number(s.revenueCombine) : undefined,
            notes: s.notes.trim() || undefined,
            photoUrls: finalPhotoUrls,
            fuelActualUnitPrice: s.fuelActualUnitPrice !== '' ? Number(s.fuelActualUnitPrice) : null,
            fuelSupplierId: s.fuelSupplierId !== null ? s.fuelSupplierId : null,
            customerCommission: Number(s.customerCommission) || 0,
            tripWageDays: s.tripWageDays ? Number(s.tripWageDays) : undefined,
          };
          await api.put(`/trips/${trip.id}/pre-departure`, preDeparturePayload);
        }
        await saveContainers(trip.id);
        // Skip the instructions upsert in the create flow — TripCreatePage
        // doesn't mount the instructions card, so the fields are guaranteed
        // empty and a no-op upsert would still create an empty row + an
        // audit entry. The user fills the instructions later on the edit
        // page, where the upsert runs.
        await queryClient.invalidateQueries({ queryKey: qk.trips.all });
        return trip.id;
      } catch (err) {
        if (isEditMode && err instanceof ApiError && err.status === 409) {
          const msg = "Version conflict: your local data is stale. Please reload.";
          s.setError(msg);
          showToast({ kind: 'error', message: msg });
          throw err;
        }
        let msg = "An error occurred. Please try again.";
        if (err instanceof ApiError) {
          msg = err.message;
        } else if (err instanceof Error) {
          msg = err.message;
        }
        s.setError(msg);
        showToast({ kind: 'error', message: msg });
        return undefined;
      } finally {
        s.setSubmitting(false);
      }
    },
    // 's' object omitted: individual s.* fields listed below are the correct
    // granularity for this submit handler.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      isEditMode, existingTrip, requiredFieldsFilled, s.containerRows,
      s.customerId, s.routeId, s.truckId, s.trailerType,
      s.driverId, s.cargoTypeId, s.departureDate, s.customerReference, s.containerCount,
      hasOptionalData, legs, s.fuelMode, s.fuelLitersOverride,
      s.fuelSupplementLiters, s.fuelSupplementReason, s.tollsDiscount,
      s.tollsAddition, s.tollsStations, s.hasReturnCargo, s.driverSalary,
      s.roadAllowanceOverride,
      s.fuelActualUnitPrice,
      s.fuelSupplierId,
      s.customerCommission, s.tripWageDays,
      s.revenue, s.revenueEmptyReturn, s.revenueCombine, s.notes, photoUrls,
      s.contactName, s.contactPhone, s.instructionsNotes,
      flushPendingPhotos,
      flushPendingContainerPhotos,
      s.carrierType, s.vatRate, s.externalCarrierId, s.externalFreightCost,
      s.externalPlateNumber, s.externalDriverName, s.externalDriverPhone,
      queryClient,
    ],
  );

  return {
    legs, addLeg, removeLeg, updateLeg,
    photoUrls, uploading, uploadPhotos, removePhoto,
    uploadContainerPhoto, revokeRowPhotos,
    ocrResult,
    suggestedPrice,
    estimatedFuelCost,
    estimatedTollCost,
    estimatedProfit,
    completionStatus,
    completedSections,
    requiredFieldsFilled,
    totalRequiredFields: 7,
    handleSubmit,
    selectedRouteData,
    roadAllowanceBaseApplied: isEditMode && existingTrip?.roadAllowanceBaseApplied ? Number(existingTrip.roadAllowanceBaseApplied) : undefined,
    tollPerStationApplied: isEditMode && existingTrip?.tollPerStationApplied
      ? Number(existingTrip.tollPerStationApplied)
      : roadConfig ? Number(roadConfig.tollPerStation) : undefined,
    returnCargoBonusApplied: isEditMode && existingTrip?.returnCargoBonusApplied
      ? Number(existingTrip.returnCargoBonusApplied)
      : roadConfig ? Number(roadConfig.returnCargoBonus) : undefined,
    twoPointDeliveryDefault: roadConfig?.twoPointDeliveryBonus ? Number(roadConfig.twoPointDeliveryBonus) : undefined,
    vehicleShiftDefault: roadConfig?.vehicleShiftDefault ? Number(roadConfig.vehicleShiftDefault) : undefined,
  };
}
