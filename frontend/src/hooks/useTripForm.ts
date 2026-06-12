import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "../lib/api";
import {
  FuelMode, LoadingType, TripStatus,
  FUEL_PRICE_PER_LITER_FALLBACK, FUEL_LOADED_NORM_FALLBACK, FUEL_EMPTY_NORM_FALLBACK,
} from "@tingting/shared";
export type { FuelMode } from "@tingting/shared";
import type { PricingTable, TripDetail, PaginatedResponse } from "@tingting/shared";
import { tripClient } from "../api/tripClient";
import { configClient } from "../api/configClient";
import { qk } from "../api/keys";

import type { TripOptions, RouteOption } from "./useTripOptions";
import { useTripFormLegs } from "./useTripFormLegs";
import type { FormLeg } from "./useTripFormLegs";
export type { FormLeg } from "./useTripFormLegs";
import { useTripFormPhotos } from "./useTripFormPhotos";

const FUEL_PRICE_PER_LITER = FUEL_PRICE_PER_LITER_FALLBACK;
const LOADED_RATE = FUEL_LOADED_NORM_FALLBACK;
const EMPTY_RATE = FUEL_EMPTY_NORM_FALLBACK;

function resolveContainerCount(raw: string): number {
  return Math.min(10, Math.max(1, Number(raw) || 1));
}

export interface CompletionStatus {
  mainInfo: number;
  journey: number;
  fuelRevenue: number;
  images: number;
}

export interface UseTripFormParams {
  options: TripOptions;
  mode?: 'create' | 'edit';
  existingTrip?: TripDetail;
}

export interface UseTripFormReturn {
  customerId: string;
  setCustomerId: (v: string) => void;
  routeId: string;
  setRouteId: (v: string) => void;
  truckId: string;
  setTruckId: (v: string) => void;
  trailerType: string;
  setTrailerType: (v: string) => void;
  driverId: string;
  setDriverId: (v: string) => void;
  cargoTypeId: string;
  setCargoTypeId: (v: string) => void;
  departureDate: string;
  setDepartureDate: (v: string) => void;
  completedAt: string;
  setCompletedAt: (v: string) => void;
  customerReference: string;
  setCustomerReference: (v: string) => void;
  containerCount: string;
  setContainerCount: (v: string) => void;

  carrierType: 'OWN' | 'EXTERNAL';
  setCarrierType: (v: 'OWN' | 'EXTERNAL') => void;
  vatRate: number;
  setVatRate: (v: number) => void;
  externalCarrierId: number | null;
  setExternalCarrierId: (v: number | null) => void;
  externalFreightCost: string;
  setExternalFreightCost: (v: string) => void;
  externalPlateNumber: string;
  setExternalPlateNumber: (v: string) => void;
  externalDriverName: string;
  setExternalDriverName: (v: string) => void;
  externalDriverPhone: string;
  setExternalDriverPhone: (v: string) => void;

  legs: FormLeg[];
  addLeg: () => void;
  removeLeg: (idx: number) => void;
  updateLeg: (idx: number, field: keyof FormLeg, value: string) => void;

  fuelMode: FuelMode;
  setFuelMode: (v: FuelMode) => void;
  fuelLitersOverride: string;
  setFuelLitersOverride: (v: string) => void;
  fuelSupplementLiters: string;
  setFuelSupplementLiters: (v: string) => void;
  fuelSupplementReason: string;
  setFuelSupplementReason: (v: string) => void;
  tollsDiscount: string;
  setTollsDiscount: (v: string) => void;
  tollsAddition: string;
  setTollsAddition: (v: string) => void;
  tollsStations: string;
  setTollsStations: (v: string) => void;
  hasReturnCargo: boolean;
  setHasReturnCargo: (v: boolean) => void;
  driverSalary: string;
  setDriverSalary: (v: string) => void;
  twoPointDeliveryBonus: string;
  setTwoPointDeliveryBonus: (v: string) => void;
  vehicleShiftAllowance: string;
  setVehicleShiftAllowance: (v: string) => void;
  roadAllowanceOverride: string;
  setRoadAllowanceOverride: (v: string) => void;
  fuelActualUnitPrice: string;
  setFuelActualUnitPrice: (v: string) => void;
  fuelSupplierId: number | null;
  setFuelSupplierId: (v: number | null) => void;
  customerCommission: string;
  setCustomerCommission: (v: string) => void;
  tripWageDays: string;
  setTripWageDays: (v: string) => void;
  revenue: string;
  setRevenue: (v: string) => void;
  revenueEmptyReturn: string;
  setRevenueEmptyReturn: (v: string) => void;
  revenueCombine: string;
  setRevenueCombine: (v: string) => void;

  notes: string;
  setNotes: (v: string) => void;
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

  submitting: boolean;
  uploading: boolean;
  error: string;
  setError: (v: string) => void;
  handleSubmit: (e?: React.FormEvent) => Promise<number | undefined>;

  tripId?: number;
  tripStatus?: TripStatus;
  version?: string;
  roadAllowanceBaseApplied?: number;
  tollPerStationApplied?: number;
  returnCargoBonusApplied?: number;
  twoPointDeliveryDefault?: number;
  vehicleShiftDefault?: number;
  isEditMode: boolean;
  selectedRouteData: RouteOption | null;
  resetForm?: () => void;
}

function isParamsObject(arg: TripOptions | UseTripFormParams): arg is UseTripFormParams {
  return 'options' in arg;
}

// ─── Main hook ───────────────────────────────────────────────────────────

export function useTripForm(arg: TripOptions | UseTripFormParams): UseTripFormReturn {
  const params = isParamsObject(arg) ? arg : { options: arg, mode: 'create' as const };
  const { options, mode = 'create', existingTrip } = params;
  const isEditMode = mode === 'edit';
  const queryClient = useQueryClient();

  const { data: roadConfig } = useQuery({
    queryKey: qk.catalogs.roadConfig,
    queryFn: () => configClient.getRoadConfig(),
    staleTime: 10 * 60 * 1000,
  });

  const lastTripId = useRef<number | null>(null);
  const [resetToggle, setResetToggle] = useState(0);
  const resetForm = useCallback(() => {
    lastTripId.current = null;
    setResetToggle((prev) => prev + 1);
  }, []);

  const [customerId, setCustomerId] = useState(isEditMode && existingTrip ? String(existingTrip.customerId) : "");
  const [routeId, setRouteId] = useState(isEditMode && existingTrip ? String(existingTrip.routeId) : "");
  const [truckId, setTruckId] = useState(isEditMode && existingTrip ? String(existingTrip.truckId) : "");
  const [trailerType, setTrailerType] = useState(isEditMode && existingTrip?.trailerType ? existingTrip.trailerType : "");
  const [driverId, setDriverId] = useState(isEditMode && existingTrip ? String(existingTrip.driverId) : "");
  const [cargoTypeId, setCargoTypeId] = useState(isEditMode && existingTrip ? String(existingTrip.cargoTypeId) : "");
  const [departureDate, setDepartureDate] = useState(isEditMode && existingTrip ? existingTrip.departureDate : "");
  const [completedAt, setCompletedAt] = useState(isEditMode && existingTrip?.completedAt ? existingTrip.completedAt.slice(0, 10) : "");
  const [customerReference, setCustomerReference] = useState(isEditMode && existingTrip?.customerReference ? existingTrip.customerReference : "");
  const [containerCount, setContainerCount] = useState(isEditMode && existingTrip?.containerCount ? String(existingTrip.containerCount) : "1");

  const [carrierType, setCarrierType] = useState<'OWN' | 'EXTERNAL'>(
    isEditMode && existingTrip ? existingTrip.carrierType : 'OWN'
  );
  const [vatRate, setVatRate] = useState<number>(
    isEditMode && existingTrip ? Number(existingTrip.vatRate) : 0.08
  );
  const [externalCarrierId, setExternalCarrierId] = useState<number | null>(
    isEditMode && existingTrip ? existingTrip.externalCarrierId : null
  );
  const [externalFreightCost, setExternalFreightCost] = useState(
    isEditMode && existingTrip?.externalFreightCost ? String(existingTrip.externalFreightCost) : ""
  );
  const [externalPlateNumber, setExternalPlateNumber] = useState(
    isEditMode && existingTrip?.externalPlateNumber ? existingTrip.externalPlateNumber : ""
  );
  const [externalDriverName, setExternalDriverName] = useState(
    isEditMode && existingTrip?.externalDriverName ? existingTrip.externalDriverName : ""
  );
  const [externalDriverPhone, setExternalDriverPhone] = useState(
    isEditMode && existingTrip?.externalDriverPhone ? existingTrip.externalDriverPhone : ""
  );

  const [fuelSupplierId, setFuelSupplierId] = useState<number | null>(
    isEditMode && existingTrip ? existingTrip.fuelSupplierId : null
  );

  const [fuelMode, setFuelMode] = useState<FuelMode>(isEditMode && existingTrip ? existingTrip.fuelMode : FuelMode.AUTO);
  const [fuelLitersOverride, setFuelLitersOverride] = useState(isEditMode && existingTrip?.fuelLitersOverride ? String(existingTrip.fuelLitersOverride) : "");
  const [fuelSupplementLiters, setFuelSupplementLiters] = useState(isEditMode && existingTrip?.fuelSupplementLiters ? String(existingTrip.fuelSupplementLiters) : "");
  const [fuelSupplementReason, setFuelSupplementReason] = useState(isEditMode && existingTrip?.fuelSupplementReason ? existingTrip.fuelSupplementReason : "");
  const [tollsDiscount, setTollsDiscount] = useState(isEditMode && existingTrip?.tollsDiscount ? String(existingTrip.tollsDiscount) : "");
  const [tollsAddition, setTollsAddition] = useState(isEditMode && existingTrip?.tollsAddition ? String(existingTrip.tollsAddition) : "");
  const [tollsStations, setTollsStations] = useState(isEditMode && existingTrip?.tollsStations != null ? String(existingTrip.tollsStations) : "");
  const [hasReturnCargo, setHasReturnCargo] = useState(isEditMode && existingTrip ? !!existingTrip.hasReturnCargo : false);
  const [driverSalary, setDriverSalary] = useState(isEditMode && existingTrip?.driverSalary ? String(existingTrip.driverSalary) : "");
  const [twoPointDeliveryBonus, setTwoPointDeliveryBonus] = useState(isEditMode && existingTrip?.twoPointDeliveryBonus && Number(existingTrip.twoPointDeliveryBonus) > 0 ? String(existingTrip.twoPointDeliveryBonus) : "");
  const [vehicleShiftAllowance, setVehicleShiftAllowance] = useState(isEditMode && existingTrip?.vehicleShiftAllowance && Number(existingTrip.vehicleShiftAllowance) > 0 ? String(existingTrip.vehicleShiftAllowance) : "");
  const [roadAllowanceOverride, setRoadAllowanceOverride] = useState(
    isEditMode && existingTrip?.roadAllowanceOverride != null ? String(existingTrip.roadAllowanceOverride) : ""
  );
  const [fuelActualUnitPrice, setFuelActualUnitPrice] = useState(
    isEditMode && existingTrip && existingTrip.fuelActualUnitPrice != null
      ? String(existingTrip.fuelActualUnitPrice) : ""
  );
  const [revenueEmptyReturn, setRevenueEmptyReturn] = useState(() => {
    if (isEditMode && existingTrip) {
      if (existingTrip.revenueEmptyReturn) return String(existingTrip.revenueEmptyReturn);
      if (existingTrip.revenue && (!existingTrip.revenueCombine || Number(existingTrip.revenueCombine) === 0)) {
        return String(existingTrip.revenue);
      }
    }
    return "";
  });
  const [revenueCombine, setRevenueCombine] = useState(() => {
    if (isEditMode && existingTrip) {
      return existingTrip.revenueCombine ? String(existingTrip.revenueCombine) : "0";
    }
    return "0";
  });
  const [customerCommission, setCustomerCommission] = useState(isEditMode && existingTrip?.customerCommission ? String(existingTrip.customerCommission) : "0");
  const [tripWageDays, setTripWageDays] = useState(isEditMode && existingTrip?.tripWageDays ? String(existingTrip.tripWageDays) : "");
  const [revenue, setRevenue] = useState("");

  useEffect(() => {
    const emptyReturn = Number(revenueEmptyReturn) || 0;
    const combine = Number(revenueCombine) || 0;
    setRevenue(String(emptyReturn + combine));
  }, [revenueEmptyReturn, revenueCombine]);
  const [notes, setNotes] = useState(isEditMode && existingTrip?.notes ? existingTrip.notes : "");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // ── Sub-hooks ──
  const { legs, setLegs, addLeg, removeLeg, updateLeg } = useTripFormLegs(options.routes, routeId);
  const { photoUrls, setPhotoUrls, uploading, uploadPhotos, removePhoto } = useTripFormPhotos(setError);

  // ── Edit mode: populate form from existing trip ──
  useEffect(() => {
    if (!isEditMode || !existingTrip) return;
    if (lastTripId.current === existingTrip.id) return;
    lastTripId.current = existingTrip.id;

    setRouteId(String(existingTrip.routeId));
    setFuelMode(existingTrip.fuelMode);
    setFuelLitersOverride(existingTrip.fuelLitersOverride ? String(existingTrip.fuelLitersOverride) : '');
    setFuelSupplementLiters(existingTrip.fuelSupplementLiters ? String(existingTrip.fuelSupplementLiters) : '');
    setFuelSupplementReason(existingTrip.fuelSupplementReason || '');
    setTollsDiscount(existingTrip.tollsDiscount ? String(existingTrip.tollsDiscount) : '');
    setTollsAddition(existingTrip.tollsAddition ? String(existingTrip.tollsAddition) : '');
    setTollsStations(existingTrip.tollsStations != null ? String(existingTrip.tollsStations) : '');
    setHasReturnCargo(!!existingTrip.hasReturnCargo);
    setDriverSalary(existingTrip.driverSalary ? String(existingTrip.driverSalary) : '');
    setTwoPointDeliveryBonus(existingTrip.twoPointDeliveryBonus && Number(existingTrip.twoPointDeliveryBonus) > 0 ? String(existingTrip.twoPointDeliveryBonus) : '');
    setVehicleShiftAllowance(existingTrip.vehicleShiftAllowance && Number(existingTrip.vehicleShiftAllowance) > 0 ? String(existingTrip.vehicleShiftAllowance) : '');
    if (existingTrip.revenueEmptyReturn) {
      setRevenueEmptyReturn(String(existingTrip.revenueEmptyReturn));
    } else if (existingTrip.revenue && (!existingTrip.revenueCombine || Number(existingTrip.revenueCombine) === 0)) {
      setRevenueEmptyReturn(String(existingTrip.revenue));
    } else {
      setRevenueEmptyReturn('');
    }
    setRevenueCombine(existingTrip.revenueCombine ? String(existingTrip.revenueCombine) : '0');
    setCustomerCommission(existingTrip.customerCommission ? String(existingTrip.customerCommission) : '0');
    setTripWageDays(existingTrip.tripWageDays ? String(existingTrip.tripWageDays) : '');
    setNotes(existingTrip.notes || '');
    setFuelActualUnitPrice(existingTrip.fuelActualUnitPrice != null ? String(existingTrip.fuelActualUnitPrice) : '');
    setFuelSupplierId(existingTrip.fuelSupplierId ?? null);
    setPhotoUrls(existingTrip.photoUrls || []);
    setCarrierType(existingTrip.carrierType ?? 'OWN');
    setVatRate(existingTrip.vatRate != null ? Number(existingTrip.vatRate) : 0.08);
    setExternalCarrierId(existingTrip.externalCarrierId ?? null);
    setExternalFreightCost(existingTrip.externalFreightCost ? String(existingTrip.externalFreightCost) : '');
    setExternalPlateNumber(existingTrip.externalPlateNumber ?? '');
    setExternalDriverName(existingTrip.externalDriverName ?? '');
    setExternalDriverPhone(existingTrip.externalDriverPhone ?? '');

    if (existingTrip.legs && existingTrip.legs.length > 0) {
      setLegs(existingTrip.legs.map((leg: any) => ({
        id: String(leg.id || Math.random()),
        sequence: leg.sequence,
        origin: leg.origin,
        destination: leg.destination,
        km: String(leg.km),
        loadingType: leg.loadingType,
      })));
    } else {
      const parts = (existingTrip.route?.name || '').split(/\s*[-→]\s*/).filter(Boolean);
      const originGuess = parts[0]?.trim() || '';
      const destGuess = parts.length > 1 ? parts[parts.length - 1].trim() : '';
      setLegs([{
        id: Math.random().toString(),
        sequence: 1,
        origin: originGuess,
        destination: destGuess,
        km: '',
        loadingType: LoadingType.HANG,
      }]);
    }
  }, [isEditMode, existingTrip, resetToggle]);

  // Auto-set trailer type from truck's current trailer
  useEffect(() => {
    if (truckId && options?.trucks && options?.trailers) {
      const selectedTruck = options.trucks.find(t => t.id === Number(truckId));
      if (selectedTruck?.currentTrailerId) {
        const trailer = options.trailers.find(t => t.id === selectedTruck.currentTrailerId);
        if (trailer) {
          setTrailerType(trailer.type === '20FT' ? '20FT' : '40FT');
        }
      }
    }
  }, [truckId, options?.trucks, options?.trailers]);

  // ── Pricing query ──
  const pricingQuery = useQuery({
    queryKey: qk.trips.suggestedPrice(Number(customerId) || 0, Number(routeId) || 0, departureDate),
    queryFn: async () => {
      if (isEditMode && existingTrip?.customerId && existingTrip?.routeId) {
        const ptRes = await api.get<PaginatedResponse<PricingTable>>('/pricing-tables');
        const match = (ptRes.items || []).find(
          (pt: PricingTable) => pt.customerId === existingTrip.customerId && pt.routeId === existingTrip.routeId
        );
        if (match) return { price: Number(match.price) };
      }
      const res = await tripClient.getPricing(
        Number(customerId),
        Number(routeId),
        departureDate || undefined,
      );
      return res;
    },
    enabled: !!customerId && !!routeId,
    staleTime: 5 * 60 * 1000,
  });

  const suggestedPrice = pricingQuery.data?.price ?? null;

  useEffect(() => {
    if (pricingQuery.data !== undefined && !isEditMode) {
      const count = resolveContainerCount(containerCount);
      setRevenueEmptyReturn((prev) => {
        if (!prev || prev === "0") return String(pricingQuery.data!.price * count);
        if (Number(prev) === pricingQuery.data!.price) return String(pricingQuery.data!.price * count);
        return prev;
      });
      setRevenueCombine("0");
    }
  }, [pricingQuery.data, containerCount, isEditMode]);

  const selectedRouteData = useMemo((): RouteOption | null => {
    if (routeId) {
      const found = options.routes.find(r => r.id === Number(routeId));
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
  }, [routeId, options.routes, isEditMode, existingTrip]);

  // Auto-fill route-based defaults
  useEffect(() => {
    if (!selectedRouteData) return;
    if (isEditMode && existingTrip && existingTrip.routeId === selectedRouteData.id) {
      return;
    }
    if (selectedRouteData.tollsStations != null) {
      setTollsStations(String(selectedRouteData.tollsStations));
    }
    if (selectedRouteData.fixedFuelAllowance != null) {
      setFuelLitersOverride(String(selectedRouteData.fixedFuelAllowance));
    }
    if (selectedRouteData.driverSalary != null) {
      setDriverSalary(String(selectedRouteData.driverSalary));
    } else if (roadConfig?.defaultDriverSalary && Number(roadConfig.defaultDriverSalary) > 0) {
      setDriverSalary(String(roadConfig.defaultDriverSalary));
    }
    if (roadConfig?.twoPointDeliveryBonus && Number(roadConfig.twoPointDeliveryBonus) > 0) {
      setTwoPointDeliveryBonus(String(roadConfig.twoPointDeliveryBonus));
    }
    if (roadConfig?.vehicleShiftDefault && Number(roadConfig.vehicleShiftDefault) > 0) {
      setVehicleShiftAllowance(String(roadConfig.vehicleShiftDefault));
    }
  }, [selectedRouteData, isEditMode, existingTrip]);

  // ── Auto-fill salary from driver baseSalary when no route default exists ──
  useEffect(() => {
    if (isEditMode) return;
    if (!driverId || !departureDate) return;
    // Skip if route already provides a salary
    if (selectedRouteData?.driverSalary != null) return;
    if (roadConfig?.defaultDriverSalary && Number(roadConfig.defaultDriverSalary) > 0) return;

    const driver = options?.drivers?.find((d: any) => d.id === Number(driverId));
    if (!driver) return;

    const baseSalary = Number((driver as any).baseSalary) || 0;
    const socialInsurance = Number((driver as any).socialInsurance) || 0;
    if (baseSalary <= 0) return;

    // Calculate tripWageDays from date range
    const startDate = new Date(departureDate);
    const days = completedAt
      ? Math.max(1, Math.ceil((new Date(completedAt).getTime() - startDate.getTime()) / (86400000)) + 1)
      : 1;

    // Only auto-fill tripWageDays if user hasn't manually set it
    setTripWageDays(prev => prev || String(days));

    // Per spec §4.5.3: dailyRate = (baseSalary + socialInsurance) / standardWorkDays
    // standardWorkDays = days in month - sundays for the departure month
    const [y, m] = departureDate.split('-').map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    let sundays = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      if (new Date(y, m - 1, d).getDay() === 0) sundays++;
    }
    const standardWorkDays = daysInMonth - sundays;
    const dailyRate = Math.round((baseSalary + socialInsurance) / standardWorkDays);
    setDriverSalary(String(dailyRate * days));
  }, [driverId, departureDate, completedAt, selectedRouteData, roadConfig, isEditMode, options?.drivers]);

  // ── Derived values ──
  const estimatedFuelCost = useMemo(() => {
    if (fuelMode === FuelMode.FLAT_RATE) {
      const liters = Number(fuelLitersOverride) || 0;
      return liters * FUEL_PRICE_PER_LITER;
    }
    return legs.reduce((acc, leg) => {
      const km = Number(leg.km) || 0;
      const rate = leg.loadingType === LoadingType.HANG ? LOADED_RATE : EMPTY_RATE;
      return acc + (km / 100) * rate * FUEL_PRICE_PER_LITER;
    }, 0);
  }, [fuelMode, fuelLitersOverride, legs]);

  const estimatedTollCost = useMemo(() => {
    const base = isEditMode && existingTrip?.roadAllowanceBaseApplied ? Number(existingTrip.roadAllowanceBaseApplied) : 0;
    const discount = Number(tollsDiscount) || 0;
    const addition = Number(tollsAddition) || 0;
    const stations = Number(tollsStations) || 0;

    const perStation = isEditMode && existingTrip?.tollPerStationApplied
      ? Number(existingTrip.tollPerStationApplied)
      : (roadConfig ? Number(roadConfig.tollPerStation) : 55000);

    const returnBonus = hasReturnCargo
      ? (isEditMode && existingTrip?.returnCargoBonusApplied
          ? Number(existingTrip.returnCargoBonusApplied)
          : (roadConfig ? Number(roadConfig.returnCargoBonus) : 300000))
      : 0;

    const tongTienDiDuong = addition > 0
      ? addition
      : (base - (stations * perStation) + returnBonus);

    return Math.max(0, tongTienDiDuong - discount);
  }, [isEditMode, existingTrip, roadConfig, tollsDiscount, tollsAddition, tollsStations, hasReturnCargo]);

  const estimatedProfit = useMemo(
    () =>
      (Number(revenue) || 0) -
      estimatedFuelCost -
      estimatedTollCost -
      (Number(driverSalary) || 0) -
      (Number(twoPointDeliveryBonus) || 0) -
      (Number(vehicleShiftAllowance) || 0),
    [revenue, estimatedFuelCost, estimatedTollCost, driverSalary, twoPointDeliveryBonus, vehicleShiftAllowance],
  );

  const requiredFieldsFilled = useMemo(() => {
    let count = 0;
    if (customerId) count++;
    if (routeId) count++;
    if (carrierType === 'EXTERNAL') {
      count += 3;
    } else {
      if (truckId) count++;
      if (trailerType) count++;
      if (driverId) count++;
    }
    if (cargoTypeId) count++;
    if (departureDate) count++;
    return count;
  }, [customerId, routeId, carrierType, truckId, trailerType, driverId, cargoTypeId, departureDate]);

  const completionStatus = useMemo((): CompletionStatus => {
    let fuelRevenue = 0;
    if (fuelMode) fuelRevenue++;
    if (fuelSupplementLiters) fuelRevenue++;
    if (fuelSupplementReason) fuelRevenue++;
    if (tollsAddition) fuelRevenue++;
    if (tollsDiscount) fuelRevenue++;
    if (tollsStations) fuelRevenue++;
    if (driverSalary) fuelRevenue++;
    if (revenue) fuelRevenue++;

    let images = 0;
    if (notes.trim()) images++;
    if (photoUrls.length > 0) images++;

    return {
      mainInfo: requiredFieldsFilled + (customerReference.trim() ? 1 : 0),
      journey: legs.length,
      fuelRevenue,
      images,
    };
  }, [
    requiredFieldsFilled,
    customerReference,
    legs.length,
    fuelMode,
    fuelSupplementLiters,
    fuelSupplementReason,
    tollsAddition,
    tollsDiscount,
    tollsStations,
    driverSalary,
    revenue,
    notes,
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
      (fuelMode === FuelMode.FLAT_RATE && fuelLitersOverride.trim() !== "") ||
      fuelSupplementLiters.trim() !== "" ||
      fuelSupplementReason.trim() !== "" ||
      tollsDiscount.trim() !== "" ||
      tollsAddition.trim() !== "" ||
      tollsStations.trim() !== "" ||
      hasReturnCargo ||
      driverSalary.trim() !== "" ||
      revenue.trim() !== "" ||
      notes.trim() !== "" ||
      photoUrls.length > 0,
    [
      legs, fuelMode, fuelLitersOverride, fuelSupplementLiters,
      fuelSupplementReason, tollsDiscount, tollsAddition, tollsStations,
      hasReturnCargo, driverSalary, revenue, notes, photoUrls,
    ],
  );

  // ── Submit handler ──
  const handleSubmit = useCallback(
    async (e?: React.FormEvent): Promise<number | undefined> => {
      e?.preventDefault();
      setError("");

      if (!isEditMode && requiredFieldsFilled < 7) {
        setError("Vui lòng điền đầy đủ các trường bắt buộc.");
        return;
      }

      if (isEditMode) {
        if (legs.length === 0) {
          setError('Cần có ít nhất 1 chặng đường.');
          return;
        }
        for (const leg of legs) {
          if (!leg.origin.trim() || !leg.destination.trim()) {
            setError(`Chặng số ${leg.sequence}: cần điền cả điểm đi và điểm đến.`);
            return;
          }
          const kmRaw = (leg.km ?? '').toString().trim();
          if (kmRaw !== '' && (isNaN(Number(kmRaw)) || Number(kmRaw) < 0)) {
            setError(`Chặng số ${leg.sequence}: Số km phải là số không âm.`);
            return;
          }
        }
        const supplementNum = Number(fuelSupplementLiters);
        if (supplementNum > 0 && !fuelSupplementReason.trim()) {
          setError('Vui lòng điền lý do bổ sung dầu.');
          return;
        }
      }

      setSubmitting(true);
      try {
        if (isEditMode && existingTrip) {
          const payload = {
            routeId: routeId ? Number(routeId) : undefined,
            departureDate: departureDate || undefined,
            completedAt: completedAt || undefined,
            legs: legs.map(l => ({
              sequence: l.sequence,
              origin: l.origin.trim(),
              destination: l.destination.trim(),
              km: Number(l.km),
              loadingType: l.loadingType,
            })),
            version: existingTrip.version,
            fuelMode: fuelMode,
            fuelLitersOverride: fuelMode === FuelMode.FLAT_RATE ? (fuelLitersOverride ? Number(fuelLitersOverride) : 0) : undefined,
            fuelSupplementLiters: fuelSupplementLiters ? Number(fuelSupplementLiters) : 0,
            fuelSupplementReason: fuelSupplementReason.trim() || undefined,
            tollsDiscount: tollsDiscount ? Number(tollsDiscount) : 0,
            tollsAddition: tollsAddition ? Number(tollsAddition) : 0,
            tollsStations: tollsStations ? Number(tollsStations) : 0,
            hasReturnCargo: hasReturnCargo,
            driverSalary: driverSalary ? Number(driverSalary) : undefined,
            twoPointDeliveryBonus: twoPointDeliveryBonus ? Number(twoPointDeliveryBonus) : 0,
            vehicleShiftAllowance: vehicleShiftAllowance ? Number(vehicleShiftAllowance) : 0,
            revenue: revenue ? Number(revenue) : undefined,
            revenueEmptyReturn: revenueEmptyReturn ? Number(revenueEmptyReturn) : 0,
            revenueCombine: revenueCombine ? Number(revenueCombine) : 0,
            notes: notes.trim() || undefined,
            roadAllowanceOverride: roadAllowanceOverride !== '' ? Number(roadAllowanceOverride) : null,
            fuelActualUnitPrice: fuelActualUnitPrice !== '' ? Number(fuelActualUnitPrice) : null,
            fuelSupplierId: fuelSupplierId !== null ? fuelSupplierId : null,
            customerCommission: Number(customerCommission) || 0,
            tripWageDays: tripWageDays ? Number(tripWageDays) : undefined,
          };

          const endpoint = existingTrip.status === TripStatus.CREATED ? `/trips/${existingTrip.id}/pre-departure` : `/trips/${existingTrip.id}/actuals`;
          const updatedTrip = await api.put<any>(endpoint, payload);
          queryClient.invalidateQueries({ queryKey: ['trips'] });
          queryClient.setQueryData(['trip', String(existingTrip.id)], updatedTrip);
          queryClient.invalidateQueries({ queryKey: ['trip', String(existingTrip.id)] });
          queryClient.invalidateQueries({ queryKey: ['trip-adjustments'] });
          return existingTrip.id;
        }

        const createPayload: Record<string, unknown> = {
          customerId: Number(customerId),
          routeId: Number(routeId),
          cargoTypeId: Number(cargoTypeId),
          departureDate: departureDate,
          fuelMode,
          carrierType,
          vatRate,
          fuelSupplierId: carrierType === 'OWN' ? (fuelSupplierId ?? null) : null,
        };
        if (carrierType === 'OWN') {
          createPayload.truckId = Number(truckId);
          createPayload.trailerType = trailerType || undefined;
          createPayload.driverId = Number(driverId);
        } else {
          createPayload.truckId = null;
          createPayload.driverId = null;
          createPayload.externalCarrierId = externalCarrierId ?? undefined;
          createPayload.externalFreightCost = externalFreightCost ? Number(externalFreightCost) : undefined;
          createPayload.externalPlateNumber = externalPlateNumber.trim() || undefined;
          createPayload.externalDriverName = externalDriverName.trim() || undefined;
          createPayload.externalDriverPhone = externalDriverPhone.trim() || undefined;
        }
        if (customerReference.trim()) {
          createPayload.customerReference = customerReference.trim();
        }
        const count = resolveContainerCount(containerCount);
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

          const supplementNum = Number(fuelSupplementLiters);
          if (supplementNum > 0 && !fuelSupplementReason.trim()) {
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
            fuelMode,
            fuelLitersOverride:
              fuelMode === FuelMode.FLAT_RATE
                ? fuelLitersOverride
                  ? Number(fuelLitersOverride)
                  : 0
                : undefined,
            fuelSupplementLiters: fuelSupplementLiters
              ? Number(fuelSupplementLiters)
              : 0,
            fuelSupplementReason: fuelSupplementReason.trim() || undefined,
            tollsDiscount: tollsDiscount ? Number(tollsDiscount) : 0,
            tollsAddition: tollsAddition ? Number(tollsAddition) : 0,
            tollsStations: tollsStations ? Number(tollsStations) : 0,
            hasReturnCargo: hasReturnCargo,
            driverSalary: driverSalary ? Number(driverSalary) : undefined,
            twoPointDeliveryBonus: twoPointDeliveryBonus ? Number(twoPointDeliveryBonus) : 0,
            vehicleShiftAllowance: vehicleShiftAllowance ? Number(vehicleShiftAllowance) : 0,
            revenue: revenue ? Number(revenue) : undefined,
            revenueEmptyReturn: revenueEmptyReturn ? Number(revenueEmptyReturn) : 0,
            revenueCombine: revenueCombine ? Number(revenueCombine) : 0,
            notes: notes.trim() || undefined,
            photoUrls,
            fuelActualUnitPrice: fuelActualUnitPrice !== '' ? Number(fuelActualUnitPrice) : null,
            fuelSupplierId: fuelSupplierId !== null ? fuelSupplierId : null,
            customerCommission: Number(customerCommission) || 0,
            tripWageDays: tripWageDays ? Number(tripWageDays) : undefined,
          };
          await api.put(`/trips/${trip.id}/pre-departure`, preDeparturePayload);
        }
        await queryClient.invalidateQueries({ queryKey: ['trips'] });
        return trip.id;
      } catch (err) {
        if (isEditMode && err instanceof ApiError && err.status === 409) {
          setError("Xung đột phiên bản: số liệu của bạn đã cũ so với hệ thống.");
          throw err;
        }
        if (err instanceof ApiError) {
          setError(err.message);
        } else if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Có lỗi xảy ra. Vui lòng thử lại.");
        }
        return undefined;
      } finally {
        setSubmitting(false);
      }
    },
    [
      isEditMode, existingTrip, requiredFieldsFilled, customerId, routeId, truckId, trailerType,
      driverId, cargoTypeId, departureDate, customerReference, containerCount,
      hasOptionalData, legs, fuelMode, fuelLitersOverride,
      fuelSupplementLiters, fuelSupplementReason, tollsDiscount,
      tollsAddition, tollsStations, hasReturnCargo, driverSalary,
      roadAllowanceOverride,
      fuelActualUnitPrice,
      fuelSupplierId,
      customerCommission, tripWageDays,
      revenue, revenueEmptyReturn, revenueCombine, notes, photoUrls,
      carrierType, vatRate, externalCarrierId, externalFreightCost,
      externalPlateNumber, externalDriverName, externalDriverPhone,
      queryClient,
    ],
  );

  return {
    customerId, setCustomerId,
    routeId, setRouteId,
    truckId, setTruckId,
    trailerType, setTrailerType,
    driverId, setDriverId,
    cargoTypeId, setCargoTypeId,
    departureDate, setDepartureDate,
    customerReference, setCustomerReference,
    completedAt, setCompletedAt,
    containerCount, setContainerCount,
    carrierType, setCarrierType,
    vatRate, setVatRate,
    externalCarrierId, setExternalCarrierId,
    externalFreightCost, setExternalFreightCost,
    externalPlateNumber, setExternalPlateNumber,
    externalDriverName, setExternalDriverName,
    externalDriverPhone, setExternalDriverPhone,
    legs, addLeg, removeLeg, updateLeg,
    fuelMode, setFuelMode,
    fuelLitersOverride, setFuelLitersOverride,
    fuelSupplementLiters, setFuelSupplementLiters,
    fuelSupplementReason, setFuelSupplementReason,
    tollsDiscount, setTollsDiscount,
    tollsAddition, setTollsAddition,
    tollsStations, setTollsStations,
    hasReturnCargo, setHasReturnCargo,
    driverSalary, setDriverSalary,
    twoPointDeliveryBonus, setTwoPointDeliveryBonus,
    vehicleShiftAllowance, setVehicleShiftAllowance,
    roadAllowanceOverride, setRoadAllowanceOverride,
    fuelActualUnitPrice, setFuelActualUnitPrice,
    fuelSupplierId, setFuelSupplierId,
    customerCommission, setCustomerCommission,
    tripWageDays, setTripWageDays,
    revenue, setRevenue,
    revenueEmptyReturn, setRevenueEmptyReturn,
    revenueCombine, setRevenueCombine,
    notes, setNotes,
    photoUrls, uploadPhotos, removePhoto,
    suggestedPrice,
    estimatedFuelCost,
    estimatedTollCost,
    estimatedProfit,
    completionStatus,
    completedSections,
    requiredFieldsFilled,
    totalRequiredFields: 7,
    submitting, uploading, error, setError, handleSubmit,
    tripId: isEditMode ? existingTrip?.id : undefined,
    tripStatus: isEditMode ? existingTrip?.status : undefined,
    version: isEditMode && existingTrip ? String(existingTrip.version) : undefined,
    roadAllowanceBaseApplied: isEditMode && existingTrip?.roadAllowanceBaseApplied ? Number(existingTrip.roadAllowanceBaseApplied) : undefined,
    tollPerStationApplied: isEditMode && existingTrip?.tollPerStationApplied
      ? Number(existingTrip.tollPerStationApplied)
      : roadConfig ? Number(roadConfig.tollPerStation) : undefined,
    returnCargoBonusApplied: isEditMode && existingTrip?.returnCargoBonusApplied
      ? Number(existingTrip.returnCargoBonusApplied)
      : roadConfig ? Number(roadConfig.returnCargoBonus) : undefined,
    twoPointDeliveryDefault: roadConfig?.twoPointDeliveryBonus ? Number(roadConfig.twoPointDeliveryBonus) : undefined,
    vehicleShiftDefault: roadConfig?.vehicleShiftDefault ? Number(roadConfig.vehicleShiftDefault) : undefined,
    isEditMode,
    selectedRouteData,
    resetForm,
  };
}
