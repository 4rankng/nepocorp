/**
 * useTripFormDispatch — derived values, effects, and submit logic for the trip form.
 *
 * Extracted from useTripForm.ts during M3 decomposition (T3.1.3).
 * Receives state from useTripFormState, computes derived values (fuel cost,
 * toll cost, profit, completion), orchestrates effects (route auto-fill,
 * pricing, driver salary), and exposes the submit handler.
 */
import { useEffect, useMemo, useCallback, useRef } from 'react';
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

import type { TripOptions, RouteOption } from './useTripOptions';
import { useTripFormLegs } from './useTripFormLegs';
import type { FormLeg } from './useTripFormLegs';
import { useTripFormPhotos } from './useTripFormPhotos';
import type { UseTripFormStateReturn, CompletionStatus } from './useTripFormState';

const FUEL_PRICE_PER_LITER = FUEL_PRICE_PER_LITER_FALLBACK;
const LOADED_RATE = FUEL_LOADED_NORM_FALLBACK;
const EMPTY_RATE = FUEL_EMPTY_NORM_FALLBACK;

function resolveContainerCount(raw: string): number {
  return Math.min(10, Math.max(1, Number(raw) || 1));
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
  suggestedPrice: number | null;
  estimatedFuelCost: number;
  estimatedTollCost: number;
  estimatedProfit: number;
  completionStatus: CompletionStatus;
  completedSections: number;
  requiredFieldsFilled: number;
  totalRequiredFields: number;
  uploading: boolean;
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
  const lastPopulatedTripId = useRef<number | undefined>(undefined);

  const { data: roadConfig } = useQuery({
    queryKey: qk.catalogs.roadConfig,
    queryFn: () => configClient.getRoadConfig(),
    staleTime: 10 * 60 * 1000,
  });

  useEffect(() => {
    const emptyReturn = Number(s.revenueEmptyReturn) || 0;
    const combine = Number(s.revenueCombine) || 0;
    s.setRevenue(String(emptyReturn + combine));
  }, [s.revenueEmptyReturn, s.revenueCombine]);

  const { legs, setLegs, addLeg, removeLeg, updateLeg } = useTripFormLegs(options.routes, s.routeId, isEditMode);
  const { photoUrls, uploading, uploadPhotos, removePhoto } = useTripFormPhotos(s.setError);

  useEffect(() => {
    if (!isEditMode || !existingTrip) return;
    if (existingTrip.id === lastPopulatedTripId.current) return;

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
    s.setRevenueCombine(existingTrip.revenueCombine ? String(existingTrip.revenueCombine) : '0');
    s.setCustomerCommission(existingTrip.customerCommission ? String(existingTrip.customerCommission) : '0');
    s.setTripWageDays(existingTrip.tripWageDays ? String(existingTrip.tripWageDays) : '');
    s.setNotes(existingTrip.notes || '');
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
      const parts = (existingTrip.route?.name || '').split(/\s*[-→]\s*/).filter(Boolean);
      const originGuess = parts[0]?.trim() || '';
      const destGuess = parts.length > 1 ? parts[parts.length - 1].trim() : '';
      setLegs([
        {
          id: Math.random().toString(),
          sequence: 1,
          origin: originGuess,
          destination: destGuess,
          km: '',
          loadingType: LoadingType.HANG,
        },
        {
          id: Math.random().toString(),
          sequence: 2,
          origin: destGuess,
          destination: originGuess,
          km: '',
          loadingType: LoadingType.VO,
        },
      ]);
    }

    lastPopulatedTripId.current = existingTrip.id;
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
      count += 3;
    } else {
      if (s.truckId) count++;
      if (s.trailerType) count++;
      if (s.driverId) count++;
    }
    if (s.cargoTypeId) count++;
    if (s.departureDate) count++;
    return count;
  }, [s.customerId, s.routeId, s.carrierType, s.truckId, s.trailerType, s.driverId, s.cargoTypeId, s.departureDate]);

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

      if (!isEditMode && requiredFieldsFilled < 7) {
        s.setError("Vui lòng điền đầy đủ các trường bắt buộc.");
        return;
      }

      if (isEditMode) {
        if (legs.length === 0) {
          s.setError('Cần có ít nhất 1 chặng đường.');
          return;
        }
        for (const leg of legs) {
          if (!leg.origin.trim() || !leg.destination.trim()) {
            s.setError(`Chặng số ${leg.sequence}: cần điền cả điểm đi và điểm đến.`);
            return;
          }
          const kmRaw = (leg.km ?? '').toString().trim();
          if (kmRaw !== '' && (isNaN(Number(kmRaw)) || Number(kmRaw) < 0)) {
            s.setError(`Chặng số ${leg.sequence}: Số km phải là số không âm.`);
            return;
          }
        }
        const supplementNum = Number(s.fuelSupplementLiters);
        if (supplementNum > 0 && !s.fuelSupplementReason.trim()) {
          s.setError('Vui lòng điền lý do bổ sung dầu.');
          return;
        }
      }

      s.setSubmitting(true);
      try {
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
            revenue: s.revenue ? Number(s.revenue) : undefined,
            revenueEmptyReturn: s.revenueEmptyReturn ? Number(s.revenueEmptyReturn) : 0,
            revenueCombine: s.revenueCombine ? Number(s.revenueCombine) : 0,
            notes: s.notes.trim() || undefined,
            roadAllowanceOverride: s.roadAllowanceOverride !== '' ? Number(s.roadAllowanceOverride) : null,
            fuelActualUnitPrice: s.fuelActualUnitPrice !== '' ? Number(s.fuelActualUnitPrice) : null,
            fuelSupplierId: s.fuelSupplierId !== null ? s.fuelSupplierId : null,
            customerCommission: Number(s.customerCommission) || 0,
            tripWageDays: s.tripWageDays ? Number(s.tripWageDays) : undefined,
          };

          const endpoint = existingTrip.status === TripStatus.CREATED ? `/trips/${existingTrip.id}/pre-departure` : `/trips/${existingTrip.id}/actuals`;
          const updatedTrip = await api.put<Record<string, unknown>>(endpoint, payload);
          queryClient.invalidateQueries({ queryKey: qk.trips.all });
          queryClient.setQueryData(qk.trips.detail(existingTrip.id), updatedTrip);
          queryClient.invalidateQueries({ queryKey: qk.trips.detail(existingTrip.id) });
          queryClient.invalidateQueries({ queryKey: qk.trips.adjustments(existingTrip.id) });
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
                `Chặng số ${leg.sequence} chưa hợp lệ (cần Điểm đi + Điểm đến; Km phải là số không âm).`,
              );
            }
          }

          const supplementNum = Number(s.fuelSupplementLiters);
          if (supplementNum > 0 && !s.fuelSupplementReason.trim()) {
            throw new Error("Vui lòng điền lý do bổ sung dầu.");
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
            revenue: s.revenue ? Number(s.revenue) : undefined,
            revenueEmptyReturn: s.revenueEmptyReturn ? Number(s.revenueEmptyReturn) : 0,
            revenueCombine: s.revenueCombine ? Number(s.revenueCombine) : 0,
            notes: s.notes.trim() || undefined,
            photoUrls,
            fuelActualUnitPrice: s.fuelActualUnitPrice !== '' ? Number(s.fuelActualUnitPrice) : null,
            fuelSupplierId: s.fuelSupplierId !== null ? s.fuelSupplierId : null,
            customerCommission: Number(s.customerCommission) || 0,
            tripWageDays: s.tripWageDays ? Number(s.tripWageDays) : undefined,
          };
          await api.put(`/trips/${trip.id}/pre-departure`, preDeparturePayload);
        }
        await queryClient.invalidateQueries({ queryKey: qk.trips.all });
        return trip.id;
      } catch (err) {
        if (isEditMode && err instanceof ApiError && err.status === 409) {
          s.setError("Xung đột phiên bản: số liệu của bạn đã cũ so với hệ thống.");
          throw err;
        }
        if (err instanceof ApiError) {
          s.setError(err.message);
        } else if (err instanceof Error) {
          s.setError(err.message);
        } else {
          s.setError("Có lỗi xảy ra. Vui lòng thử lại.");
        }
        return undefined;
      } finally {
        s.setSubmitting(false);
      }
    },
    [
      isEditMode, existingTrip, requiredFieldsFilled,
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
      s.carrierType, s.vatRate, s.externalCarrierId, s.externalFreightCost,
      s.externalPlateNumber, s.externalDriverName, s.externalDriverPhone,
      queryClient,
    ],
  );

  return {
    legs, addLeg, removeLeg, updateLeg,
    photoUrls, uploading, uploadPhotos, removePhoto,
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
