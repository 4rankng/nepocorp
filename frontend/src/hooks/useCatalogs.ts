import { useQuery } from "@tanstack/react-query";
import { tripClient } from "../api/tripClient";

export const BOOTSTRAP_QUERY_KEY = ["catalogs"] as const;

export interface CatalogData {
  customers: Array<{ id: number; name: string; contactPerson: string | null; phone: string | null }>;
  trucks: Array<{ id: number; licensePlate: string; trailerPlateNumber: string | null; trailerType: '20FT' | '40FT' | null; currentTrailerId: number | null }>;
  drivers: Array<{ id: number; name: string; assignedTruckId: number | null }>;
  routes: Array<{ id: number; name: string; distanceKm: number | null; isMountain: boolean; fixedFuelAllowance: string | null; tollsStations: number | null; driverSalary: string | null }>;
  cargoTypes: Array<{ id: number; name: string; requiresPhotos: boolean }>;
  trailers: Array<{ id: number; licensePlate: string; type: string; status: string }>;
}

export function useCatalogs() {
  return useQuery<CatalogData>({
    queryKey: BOOTSTRAP_QUERY_KEY,
    queryFn: () => tripClient.getBootstrap(),
    staleTime: 5 * 60 * 1000,
  });
}
