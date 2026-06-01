import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, ApiError } from "../lib/api";
import { FuelMode, LoadingType } from "@nepocorp/shared";
export type { FuelMode } from "@nepocorp/shared";
import type { PricingTable } from "@nepocorp/shared";
import { tripClient } from "../api/tripClient";

import type { TripOptions, RouteOption } from "./useTripOptions";
import { calculateRoute } from "../lib/maps";

const FUEL_PRICE_PER_LITER = 25000;
const LOADED_RATE = 43; // L/100km
const EMPTY_RATE = 25; // L/100km

function resolveContainerCount(raw: string): number {
  return Math.min(10, Math.max(1, Number(raw) || 1));
}

export interface FormLeg {
  id: string;
  sequence: number;
  origin: string;
  destination: string;
  km: string;
  loadingType: LoadingType;
  polylinePath?: string | null;
}

export interface CompletionStatus {
  mainInfo: number;
  journey: number;
  fuelRevenue: number;
  images: number;
}

export interface UseTripFormReturn {
  // Required fields
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
  customerReference: string;
  setCustomerReference: (v: string) => void;
  containerCount: string;
  setContainerCount: (v: string) => void;

  // Legs
  legs: FormLeg[];
  addLeg: () => void;
  removeLeg: (idx: number) => void;
  updateLeg: (idx: number, field: keyof FormLeg, value: string) => void;

  // Fuel & financials
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
  revenue: string;
  setRevenue: (v: string) => void;

  // Attachments
  notes: string;
  setNotes: (v: string) => void;
  photoUrls: string[];
  uploadPhotos: (files: FileList) => Promise<void>;
  removePhoto: (idx: number) => void;

  // Derived
  suggestedPrice: number | null;
  estimatedFuelCost: number;
  estimatedTollCost: number;
  estimatedProfit: number;
  completionStatus: CompletionStatus;
  completedSections: number;
  requiredFieldsFilled: number;
  totalRequiredFields: number;

  // UI
  submitting: boolean;
  uploading: boolean;
  error: string;
  setError: (v: string) => void;
  handleSubmit: (e?: React.FormEvent) => Promise<number | undefined>;
}

// ─── Sub-hook: Leg management ────────────────────────────────────────────

function useTripLegs(routes: RouteOption[], routeId: string) {
  const [legs, setLegs] = useState<FormLeg[]>([]);

  const selectedRoute = useMemo(
    () => routes.find((r) => r.id === Number(routeId)),
    [routes, routeId],
  );

  useEffect(() => {
    if (!selectedRoute || legs.length > 0) return;
    const parts = selectedRoute.name.split(/\s*[-→]\s*/).filter(Boolean);
    setLegs([
      {
        id: Math.random().toString(),
        sequence: 1,
        origin: parts[0]?.trim() || "",
        destination: parts.length > 1 ? parts[parts.length - 1].trim() : "",
        km: selectedRoute.distanceKm ? String(selectedRoute.distanceKm) : "",
        loadingType: LoadingType.HANG,
      },
    ]);
  }, [selectedRoute, legs.length]);

  const addLeg = useCallback(() => {
    setLegs((prev) => {
      const lastLeg = prev[prev.length - 1];
      return [
        ...prev,
        {
          id: Math.random().toString(),
          sequence: prev.length + 1,
          origin: lastLeg ? lastLeg.destination : "",
          destination: "",
          km: "",
          loadingType: LoadingType.HANG,
        },
      ];
    });
  }, []);

  const removeLeg = useCallback((idx: number) => {
    setLegs((prev) =>
      prev
        .filter((_, i) => i !== idx)
        .map((leg, i) => ({ ...leg, sequence: i + 1 })),
    );
  }, []);

  const updateLeg = useCallback(
    async (idx: number, field: keyof FormLeg, value: string) => {
      setLegs((prev) =>
        prev.map((leg, i) => (i === idx ? { ...leg, [field]: value } : leg)),
      );

      if (field === 'origin' || field === 'destination') {
        const currentLeg = legs[idx];
        if (!currentLeg) return;
        const origin = field === 'origin' ? value : currentLeg.origin;
        const destination = field === 'destination' ? value : currentLeg.destination;

        if (origin && destination) {
          const { km, polylinePath } = await calculateRoute(origin, destination);
          if (km !== null) {
            setLegs(prev => prev.map((leg, i) => {
              if (i === idx) {
                return { 
                  ...leg, 
                  km: String(km),
                  polylinePath
                };
              }
              return leg;
            }));
          } else {
            setLegs(prev => prev.map((l, i) => i === idx ? { ...l, polylinePath: undefined } : l));
          }
        }
      }
    },
    [legs],
  );

  return { legs, setLegs, addLeg, removeLeg, updateLeg };
}

// ─── Sub-hook: Photo upload ──────────────────────────────────────────────

function useTripUpload(onError: (msg: string) => void) {
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const uploadPhotos = useCallback(async (files: FileList, tripId?: number, type: 'CONTAINER' | 'SEAL' | 'OTHER' = 'OTHER') => {
    setUploading(true);
    try {
      const token = localStorage.getItem("token");
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);
        if (tripId) formData.append("trip_id", String(tripId));
        formData.append("type", type);
        const response = await fetch("/api/upload", {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        });
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || "Lỗi tải ảnh lên");
        }
        const result = await response.json();
        setPhotoUrls((prev) => [...prev, result.url]);
      }
    } catch (err: any) {
      onError(err.message || "Lỗi khi tải ảnh.");
    } finally {
      setUploading(false);
    }
  }, [onError]);

  const removePhoto = useCallback((idx: number) => {
    setPhotoUrls((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  return { photoUrls, uploading, uploadPhotos, removePhoto };
}

// ─── Main hook ───────────────────────────────────────────────────────────

export function useTripForm(options: TripOptions): UseTripFormReturn {
  // Required fields
  const [customerId, setCustomerId] = useState("");
  const [routeId, setRouteId] = useState("");
  const [truckId, setTruckId] = useState("");
  const [trailerType, setTrailerType] = useState("");
  const [driverId, setDriverId] = useState("");
  const [cargoTypeId, setCargoTypeId] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [customerReference, setCustomerReference] = useState("");
  const [containerCount, setContainerCount] = useState("1");

  // Legs sub-hook
  const { legs, addLeg, removeLeg, updateLeg } = useTripLegs(options.routes, routeId);

  // Fuel & financials
  const [fuelMode, setFuelMode] = useState<FuelMode>(FuelMode.AUTO);
  const [fuelLitersOverride, setFuelLitersOverride] = useState("");
  const [fuelSupplementLiters, setFuelSupplementLiters] = useState("");
  const [fuelSupplementReason, setFuelSupplementReason] = useState("");
  const [tollsDiscount, setTollsDiscount] = useState("");
  const [tollsAddition, setTollsAddition] = useState("");
  const [tollsStations, setTollsStations] = useState("");
  const [hasReturnCargo, setHasReturnCargo] = useState(false);
  const [driverSalary, setDriverSalary] = useState("");
  const [revenue, setRevenue] = useState("");

  // Attachments
  const [notes, setNotes] = useState("");

  // UI
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Upload sub-hook
  const { photoUrls, uploading, uploadPhotos, removePhoto } = useTripUpload(setError);

  const pricingQuery = useQuery({
    queryKey: ["suggested-price", customerId, routeId, departureDate],
    queryFn: async () => {
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
    if (pricingQuery.data !== undefined) {
      const count = resolveContainerCount(containerCount);
      setRevenue((prev) => {
        if (!prev || prev === "0") return String(pricingQuery.data!.price * count);
        if (Number(prev) === pricingQuery.data!.price) return String(pricingQuery.data!.price * count);
        return prev;
      });
    }
  }, [pricingQuery.data, containerCount]);

  // Derived calculations
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

  const estimatedTollCost = useMemo(
    () => (Number(tollsAddition) || 0) - (Number(tollsDiscount) || 0),
    [tollsAddition, tollsDiscount],
  );

  const estimatedProfit = useMemo(
    () =>
      (Number(revenue) || 0) -
      estimatedFuelCost -
      estimatedTollCost -
      (Number(driverSalary) || 0),
    [revenue, estimatedFuelCost, estimatedTollCost, driverSalary],
  );

  const requiredFieldsFilled = useMemo(() => {
    let count = 0;
    if (customerId) count++;
    if (routeId) count++;
    if (truckId) count++;
    if (trailerType) count++;
    if (driverId) count++;
    if (cargoTypeId) count++;
    if (departureDate) count++;
    return count;
  }, [customerId, routeId, truckId, trailerType, driverId, cargoTypeId, departureDate]);

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

  const handleSubmit = useCallback(
    async (e?: React.FormEvent): Promise<number | undefined> => {
      e?.preventDefault();
      setError("");

      if (requiredFieldsFilled < 7) {
        setError("Vui lòng điền đầy đủ các trường bắt buộc.");
        return;
      }

      setSubmitting(true);
      try {
        const createPayload: Record<string, unknown> = {
          customerId: Number(customerId),
          routeId: Number(routeId),
          truckId: Number(truckId),
          trailerType: trailerType || undefined,
          driverId: Number(driverId),
          cargoTypeId: Number(cargoTypeId),
          departureDate: departureDate,
          fuelMode,
        };
        if (customerReference.trim()) {
          createPayload.customerReference = customerReference.trim();
        }
        const count = resolveContainerCount(containerCount);
        createPayload.containerCount = count;
        const trip = await api.post<{ id: number }>("/trips", createPayload);

        if (hasOptionalData) {
          const legsToSubmit = legs.filter((leg) => leg.km.trim() !== "");
          for (const leg of legsToSubmit) {
            if (
              !leg.origin.trim() ||
              !leg.destination.trim() ||
              !leg.km ||
              Number.isNaN(Number(leg.km)) ||
              Number(leg.km) <= 0
            ) {
              throw new Error(
                `Chặng số ${leg.sequence} chưa hợp lệ (Km phải lớn hơn 0).`,
              );
            }
          }

          const supplementNum = Number(fuelSupplementLiters);
          if (supplementNum > 0 && !fuelSupplementReason.trim()) {
            throw new Error("Vui lòng điền lý do bổ sung dầu.");
          }

          // The /pre-departure endpoint requires at least one leg. If the user
          // expanded the optional sections but never filled in any km, skip
          // the pre-departure call entirely — otherwise the create succeeds,
          // the pre-departure 400s, and the user sees a scary "Hành trình:
          // Array must contain at least 1" error even though the trip exists.
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
            driverSalary: driverSalary ? Number(driverSalary) : 0,
            revenue: revenue ? Number(revenue) : undefined,
            notes: notes.trim() || undefined,
            photoUrls,
          };
          await api.put(`/trips/${trip.id}/pre-departure`, preDeparturePayload);
        }
        return trip.id;
      } catch (err) {
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
      requiredFieldsFilled, customerId, routeId, truckId, trailerType,
      driverId, cargoTypeId, departureDate, customerReference, containerCount,
      hasOptionalData, legs, fuelMode, fuelLitersOverride,
      fuelSupplementLiters, fuelSupplementReason, tollsDiscount,
      tollsAddition, tollsStations, hasReturnCargo, driverSalary,
      revenue, notes, photoUrls,
    ],
  );

  return {
    // Required
    customerId, setCustomerId,
    routeId, setRouteId,
    truckId, setTruckId,
    trailerType, setTrailerType,
    driverId, setDriverId,
    cargoTypeId, setCargoTypeId,
    departureDate, setDepartureDate,
    customerReference, setCustomerReference,
    containerCount, setContainerCount,
    // Legs
    legs, addLeg, removeLeg, updateLeg,
    // Fuel & financials
    fuelMode, setFuelMode,
    fuelLitersOverride, setFuelLitersOverride,
    fuelSupplementLiters, setFuelSupplementLiters,
    fuelSupplementReason, setFuelSupplementReason,
    tollsDiscount, setTollsDiscount,
    tollsAddition, setTollsAddition,
    tollsStations, setTollsStations,
    hasReturnCargo, setHasReturnCargo,
    driverSalary, setDriverSalary,
    revenue, setRevenue,
    // Attachments
    notes, setNotes,
    photoUrls, uploadPhotos, removePhoto,
    // Derived
    suggestedPrice,
    estimatedFuelCost,
    estimatedTollCost,
    estimatedProfit,
    completionStatus,
    completedSections,
    requiredFieldsFilled,
    totalRequiredFields: 7,
    // UI
    submitting, uploading, error, setError, handleSubmit,
  };
}
