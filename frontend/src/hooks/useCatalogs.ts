import { useQuery } from "@tanstack/react-query";
import { tripClient } from "../api/tripClient";

export interface CatalogData {
  customers: Array<{ id: number; name: string; contactPerson: string | null; phone: string | null }>;
  trucks: Array<{ id: number; licensePlate: string }>;
  drivers: Array<{ id: number; name: string; assignedTruckId: number | null }>;
  routes: Array<{ id: number; name: string; distanceKm: number | null; isMountain: boolean; fixedFuelAllowance: string | null }>;
  cargoTypes: Array<{ id: number; name: string; requiresPhotos: boolean }>;
}

export function useCatalogs() {
  return useQuery<CatalogData>({
    queryKey: ["catalogs"],
    queryFn: async () => {
      const res = await tripClient.getBootstrap();
      return res;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes stale time
  });
}
