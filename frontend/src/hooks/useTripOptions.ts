import { useQuery } from "@tanstack/react-query";
import { tripClient } from "../api/tripClient";
import { api } from "../lib/api";
import type { PricingTable, PaginatedResponse } from "@nepocorp/shared";

export interface SelectOption {
  id: number;
  label: string;
}

export interface RouteOption extends SelectOption {
  name: string;
  distanceKm?: number;
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

interface CatalogData {
  customers: Array<{ id: number; name: string; contactPerson: string | null; phone: string | null }>;
  trucks: Array<{ id: number; licensePlate: string }>;
  drivers: Array<{ id: number; name: string; assignedTruckId: number | null }>;
  trailers: Array<{ id: number; licensePlate: string; type: string }>;
  routes: Array<{ id: number; name: string; distanceKm: number | null; isMountain: boolean; fixedFuelAllowance: string | null }>;
  cargoTypes: Array<{ id: number; name: string; requiresPhotos: boolean }>;
}

export function useTripOptions(): TripOptions {
  const { data, isLoading } = useQuery({
    queryKey: ["trip-options"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const [catalog, pricingRes] = await Promise.all([
        tripClient.getBootstrap() as Promise<CatalogData>,
        api.get<PaginatedResponse<PricingTable>>("/pricing-tables"),
      ]);

      return {
        customers: catalog.customers.map((c) => ({ id: c.id, label: c.name })),
        routes: catalog.routes.map((r) => ({
          id: r.id,
          label: `${r.name}${r.distanceKm ? ` (${r.distanceKm} km)` : ""}`,
          name: r.name,
          distanceKm: r.distanceKm ?? undefined,
        })),
        trucks: catalog.trucks.map((t) => ({ id: t.id, label: t.licensePlate })),
        trailers: catalog.trailers.map((t) => ({
          id: t.id,
          label: `${t.licensePlate} (${t.type})`,
        })),
        drivers: catalog.drivers.map((d) => ({ id: d.id, label: d.name })),
        cargoTypes: catalog.cargoTypes.map((c) => ({ id: c.id, label: c.name })),
        pricingTables: pricingRes.items ?? [],
      };
    },
  });

  return {
    customers: data?.customers ?? [],
    routes: data?.routes ?? [],
    trucks: data?.trucks ?? [],
    trailers: data?.trailers ?? [],
    drivers: data?.drivers ?? [],
    cargoTypes: data?.cargoTypes ?? [],
    pricingTables: data?.pricingTables ?? [],
    loading: isLoading,
  };
}
