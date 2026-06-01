import { useQuery } from "@tanstack/react-query";
import { tripClient } from "../api/tripClient";
import { api } from "../lib/api";
import type { PricingTable, PaginatedResponse } from "@nepocorp/shared";
import { BOOTSTRAP_QUERY_KEY } from "./useCatalogs";

export interface SelectOption {
  id: number;
  label: string;
}

export interface RouteOption extends SelectOption {
  name: string;
  distanceKm?: number;
  isMountain?: boolean;
  fixedFuelAllowance?: string | null;
}

export interface TruckOption extends SelectOption {
  currentTrailerId: number | null;
}

export interface TrailerOption extends SelectOption {
  type: string;
}

export interface TrailerTypeOption {
  value: string;
  label: string;
}

export interface TripOptions {
  customers: SelectOption[];
  routes: RouteOption[];
  trucks: TruckOption[];
  trailerTypes: TrailerTypeOption[];
  drivers: SelectOption[];
  trailers: TrailerOption[];
  cargoTypes: SelectOption[];
  pricingTables: PricingTable[];
  loading: boolean;
}

interface CatalogData {
  customers: Array<{ id: number; name: string; contactPerson: string | null; phone: string | null }>;
  trucks: Array<{ id: number; licensePlate: string; currentTrailerId: number | null }>;
  drivers: Array<{ id: number; name: string; assignedTruckId: number | null }>;
  routes: Array<{ id: number; name: string; distanceKm: number | null; isMountain: boolean; fixedFuelAllowance: string | null }>;
  cargoTypes: Array<{ id: number; name: string; requiresPhotos: boolean }>;
  trailers: Array<{ id: number; licensePlate: string; type: string; status: string }>;
}

export function useTripOptions(): TripOptions {
  const bootstrapQuery = useQuery<CatalogData>({
    queryKey: BOOTSTRAP_QUERY_KEY,
    queryFn: () => tripClient.getBootstrap(),
    staleTime: 5 * 60 * 1000,
  });

  const pricingQuery = useQuery<PricingTable[]>({
    queryKey: ["pricing-tables"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<PricingTable>>("/pricing-tables");
      return res.items ?? [];
    },
  });

  const catalog = bootstrapQuery.data;

  return {
    customers: catalog?.customers.map((c) => ({ id: c.id, label: c.name })) ?? [],
    routes:
      catalog?.routes.map((r) => ({
        id: r.id,
        label: `${r.name}${r.distanceKm ? ` (${r.distanceKm} km)` : ""}`,
        name: r.name,
        distanceKm: r.distanceKm ?? undefined,
        isMountain: r.isMountain,
        fixedFuelAllowance: r.fixedFuelAllowance,
      })) ?? [],
    trucks: catalog?.trucks.map((t) => ({ id: t.id, label: t.licensePlate, currentTrailerId: t.currentTrailerId ?? null })) ?? [],
    trailerTypes: [{ value: '20FT', label: '20FT' }, { value: '40FT', label: '40FT' }],
    drivers: catalog?.drivers.map((d) => ({ id: d.id, label: d.name })) ?? [],
    trailers: catalog?.trailers?.map((t) => ({ id: t.id, label: t.licensePlate, type: t.type })) ?? [],
    cargoTypes: catalog?.cargoTypes.map((c) => ({ id: c.id, label: c.name })) ?? [],
    pricingTables: pricingQuery.data ?? [],
    loading: bootstrapQuery.isLoading || pricingQuery.isLoading,
  };
}
