import { useState, useEffect, useMemo, useCallback } from "react";
import { api, ApiError } from "../lib/api";
import { FuelMode, LoadingType } from "@nepocorp/shared";
export type { FuelMode } from "@nepocorp/shared";
import type { PricingTable } from "@nepocorp/shared";
import { tripClient } from "../api/tripClient";

import type { TripOptions, RouteOption } from "./useTripOptions";
import { calculateDistanceKm } from "../lib/maps";

const FUEL_PRICE_PER_LITER = 25000;
const LOADED_RATE = 43; // L/100km
const EMPTY_RATE = 25; // L/100km

export interface FormLeg {
  id: string;
  sequence: number;
  origin: string;
  destination: string;
  km: string;
  loading_type: LoadingType;
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
  trailerId: string;
  setTrailerId: (v: string) => void;
  driverId: string;
  setDriverId: (v: string) => void;
  cargoTypeId: string;
  setCargoTypeId: (v: string) => void;
  departureDate: string;
  setDepartureDate: (v: string) => void;
  customerReference: string;
  setCustomerReference: (v: string) => void;

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

export function useTripForm(options: TripOptions): UseTripFormReturn {
  // Required fields
  const [customerId, setCustomerId] = useState("");
  const [routeId, setRouteId] = useState("");
  const [truckId, setTruckId] = useState("");
  const [trailerId, setTrailerId] = useState("");
  const [driverId, setDriverId] = useState("");
  const [cargoTypeId, setCargoTypeId] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [customerReference, setCustomerReference] = useState("");

  // Legs
  const [legs, setLegs] = useState<FormLeg[]>([]);

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
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);

  // UI
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  // Auto-create first leg from route name
  const selectedRoute = useMemo(
    () => options.routes.find((r) => r.id === Number(routeId)),
    [options.routes, routeId],
  );

  useEffect(() => {
    if (!selectedRoute || legs.length > 0) return;
    const parts = selectedRoute.name.split("→");
    setLegs([
      {
        id: Math.random().toString(),
        sequence: 1,
        origin: parts[0]?.trim() || "",
        destination: parts[1]?.trim() || "",
        km: selectedRoute.distance_km ? String(selectedRoute.distance_km) : "",
        loading_type: LoadingType.HANG,
      },
    ]);
  }, [selectedRoute, legs.length]);

  // Suggested price from pricing table (fetched on-demand)
  const [suggestedPrice, setSuggestedPrice] = useState<number | null>(null);

  useEffect(() => {
    if (!customerId || !routeId) {
      setSuggestedPrice(null);
      return;
    }
    const fetchSuggestedPrice = async () => {
      try {
        const res = await tripClient.getPricing(
          Number(customerId),
          Number(routeId),
          departureDate || undefined
        );
        setSuggestedPrice(res.price);
        // Auto-fill revenue from suggested price if not overridden
        setRevenue((prev) => {
          if (!prev || prev === "0") return String(res.price);
          return prev;
        });
      } catch (err) {
        console.error("Error fetching live pricing suggestion:", err);
      }
    };
    fetchSuggestedPrice();
  }, [customerId, routeId, departureDate]);

  // Leg actions
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
          loading_type: LoadingType.HANG,
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
          const km = await calculateDistanceKm(origin, destination);
          if (km !== null) {
            setLegs(prev => prev.map((leg, i) => {
              if (i === idx) {
                return { ...leg, km: String(km) };
              }
              return leg;
            }));
          }
        }
      }
    },
    [legs],
  );

  // Photo upload — one file per request to match new backend API
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
      setError(err.message || "Lỗi khi tải ảnh.");
    } finally {
      setUploading(false);
    }
  }, []);

  const removePhoto = useCallback((idx: number) => {
    setPhotoUrls((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  // Derived calculations
  const estimatedFuelCost = useMemo(() => {
    if (fuelMode === FuelMode.FLAT_RATE) {
      const liters = Number(fuelLitersOverride) || 0;
      return liters * FUEL_PRICE_PER_LITER;
    }
    return legs.reduce((acc, leg) => {
      const km = Number(leg.km) || 0;
      const rate = leg.loading_type === LoadingType.HANG ? LOADED_RATE : EMPTY_RATE;
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
    if (trailerId) count++;
    if (driverId) count++;
    if (cargoTypeId) count++;
    if (departureDate) count++;
    return count;
  }, [customerId, routeId, truckId, trailerId, driverId, cargoTypeId, departureDate]);

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

  // Submit
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
          customer_id: Number(customerId),
          route_id: Number(routeId),
          truck_id: Number(truckId),
          trailer_id: Number(trailerId),
          driver_id: Number(driverId),
          cargo_type_id: Number(cargoTypeId),
          departure_date: departureDate,
        };
        if (customerReference.trim()) {
          createPayload.customer_reference = customerReference.trim();
        }
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

          const preDeparturePayload = {
            legs: legsToSubmit.map((l) => ({
              sequence: l.sequence,
              origin: l.origin.trim(),
              destination: l.destination.trim(),
              km: Number(l.km),
              loading_type: l.loading_type,
            })),
            fuel_mode: fuelMode,
            fuel_liters_override:
              fuelMode === FuelMode.FLAT_RATE
                ? fuelLitersOverride
                  ? Number(fuelLitersOverride)
                  : 0
                : undefined,
            fuel_supplement_liters: fuelSupplementLiters
              ? Number(fuelSupplementLiters)
              : 0,
            fuel_supplement_reason: fuelSupplementReason.trim() || undefined,
            tolls_discount: tollsDiscount ? Number(tollsDiscount) : 0,
            tolls_addition: tollsAddition ? Number(tollsAddition) : 0,
            tolls_stations: tollsStations ? Number(tollsStations) : 0,
            has_return_cargo: hasReturnCargo,
            driver_salary: driverSalary ? Number(driverSalary) : 0,
            revenue: revenue ? Number(revenue) : undefined,
            notes: notes.trim() || undefined,
            photo_urls: photoUrls,
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
      requiredFieldsFilled, customerId, routeId, truckId, trailerId,
      driverId, cargoTypeId, departureDate, customerReference,
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
    trailerId, setTrailerId,
    driverId, setDriverId,
    cargoTypeId, setCargoTypeId,
    departureDate, setDepartureDate,
    customerReference, setCustomerReference,
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
