import { useQuery } from "@tanstack/react-query";
import { tripClient } from "../api/tripClient";
import { qk } from "../api/keys";

export const BOOTSTRAP_QUERY_KEY = qk.catalogs.all;

export interface CatalogData {
  customers: Array<{ id: number; name: string; contactPerson: string | null; phone: string | null; isCarrier: boolean; linkedSupplierId: number | null }>;
  trucks: Array<{ id: number; licensePlate: string; trailerPlateNumber: string | null; trailerType: '20FT' | '40FT' | null; currentTrailerId: number | null }>;
  drivers: Array<{ id: number; name: string; assignedTruckId: number | null }>;
  routes: Array<{ id: number; name: string; distanceKm: number | null; isMountain: boolean; fixedFuelAllowance: string | null; tollsStations: number | null; driverSalary: string | null }>;
  cargoTypes: Array<{ id: number; name: string; requiresPhotos: boolean }>;
  trailers: Array<{ id: number; licensePlate: string; type: string; status: string }>;
  containerTypes: Array<{ id: number; code: string; name: string }>;
  ports: Array<{ id: number; name: string; code: string | null; city: string | null }>;
  forwarderExpenseTypes: Array<{ id: number; code: string; name: string; defaultMarkup?: boolean; billingLabel?: string | null; vatRate?: string | null }>;
  suppliers: Array<{ id: number; name: string; status: string }>;
}

export function useCatalogs() {
  return useQuery<CatalogData>({
    queryKey: BOOTSTRAP_QUERY_KEY,
    queryFn: () => tripClient.getBootstrap(),
    staleTime: 5 * 60 * 1000,
  });
}
