import { useState, useEffect, useCallback } from "react";
import { api } from "../lib/api";
import type { PricingTable, PaginatedResponse } from "@nepocorp/shared";

export interface SelectOption {
  id: number;
  label: string;
}

export interface RouteOption extends SelectOption {
  name: string;
  distance_km?: number;
}

export interface TripOptions {
  customers: SelectOption[];
  routes: RouteOption[];
  trucks: SelectOption[];
  trailers: SelectOption[];
  drivers: SelectOption[];
  cargoTypes: SelectOption[];
  pricingTables: PricingTable[];
  loading: boolean;
}

const unwrap = (d: unknown) =>
  Array.isArray(d) ? d : (d as any)?.items ?? [];

export function useTripOptions(): TripOptions {
  const [customers, setCustomers] = useState<SelectOption[]>([]);
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [trucks, setTrucks] = useState<SelectOption[]>([]);
  const [trailers, setTrailers] = useState<SelectOption[]>([]);
  const [drivers, setDrivers] = useState<SelectOption[]>([]);
  const [cargoTypes, setCargoTypes] = useState<SelectOption[]>([]);
  const [pricingTables, setPricingTables] = useState<PricingTable[]>([]);
  const [loading, setLoading] = useState(true);

  const loadOptions = useCallback(async () => {
    setLoading(true);
    try {
      const [
        custRes,
        routeRes,
        truckRes,
        trailerRes,
        driverRes,
        cargoRes,
        pricingRes,
      ] = await Promise.all([
        api.get<unknown>("/customers"),
        api.get<unknown>("/routes"),
        api.get<unknown>("/trucks"),
        api.get<unknown>("/trailers"),
        api.get<unknown>("/drivers"),
        api.get<unknown>("/cargo-types"),
        api.get<PaginatedResponse<PricingTable>>("/pricing-tables"),
      ]);

      setCustomers(
        unwrap(custRes).map((c: any) => ({ id: c.id, label: c.name })),
      );
      const routeItems = unwrap(routeRes);
      setRoutes(
        routeItems.map((r: any) => ({
          id: r.id,
          label: `${r.name}${r.distance_km ? ` (${r.distance_km} km)` : ""}`,
          name: r.name,
          distance_km: r.distance_km,
        })),
      );
      setTrucks(
        unwrap(truckRes).map((t: any) => ({ id: t.id, label: t.license_plate })),
      );
      setTrailers(
        unwrap(trailerRes).map((t: any) => ({
          id: t.id,
          label: `${t.license_plate} (${t.type})`,
        })),
      );
      setDrivers(
        unwrap(driverRes).map((d: any) => ({ id: d.id, label: d.name })),
      );
      setCargoTypes(
        unwrap(cargoRes).map((c: any) => ({ id: c.id, label: c.name })),
      );
      setPricingTables(pricingRes.items ?? []);
    } catch {
      // Empty arrays on failure — page shows loading placeholders
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOptions();
  }, [loadOptions]);

  return {
    customers,
    routes,
    trucks,
    trailers,
    drivers,
    cargoTypes,
    pricingTables,
    loading,
  };
}
