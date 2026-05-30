import { useQuery } from "@tanstack/react-query";
import { tripClient } from "../api/tripClient";

export interface CatalogData {
  customers: Array<{ id: number; name: string; contact_person: string | null; phone: string | null }>;
  trucks: Array<{ id: number; license_plate: string }>;
  drivers: Array<{ id: number; name: string; assigned_truck_id: number | null }>;
  trailers: Array<{ id: number; license_plate: string; type: string }>;
  routes: Array<{ id: number; name: string; distance_km: number | null; is_mountain: boolean; fixed_fuel_allowance: string | null }>;
  cargoTypes: Array<{ id: number; name: string; requires_photos: boolean }>;
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
