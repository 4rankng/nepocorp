import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { tripClient } from "../api/tripClient";
import type { CatalogData } from "../api/tripClient";
import { configClient } from "../api/configClient";
import { shipmentClient } from "../api/shipmentClient";
import { Role, type PricingTable } from "@tingting/shared";
import { BOOTSTRAP_QUERY_KEY } from "./useCatalogs";
import { useAuth } from "./useAuth";
import { qk } from "../api/keys";

// /pricing-tables is Casbin-gated behind `config:read` (ADMIN/MANAGER/
// ACCOUNTANT — backend/src/casbin/policy.csv). Portal roles have no policy
// row: the fetch returned a guaranteed 403 and its retries held the form's
// loading state (NEPO-66). They render no pricing-dependent UI, so skip it.
const PRICING_TABLE_ROLES: readonly Role[] = [Role.ADMIN, Role.MANAGER, Role.ACCOUNTANT];

export interface SelectOption {
  id: number;
  label: string;
}

export interface DriverOption extends SelectOption {
  baseSalary: number;
}

export interface RouteOption extends SelectOption {
  name: string;
  distanceKm?: number;
  isMountain?: boolean;
  fixedFuelAllowance?: string | null;
  tollsStations?: number | null;
  driverSalary?: string | null;
  defaultLegs?: Array<{ origin: string; destination: string; km: number; loadingType: string }> | null;
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
  carrierCustomers: SelectOption[];
  /** Lô biển đang mở (NEPO-63) — chọn khi tạo/sửa chuyến. */
  shipments: SelectOption[];
  routes: RouteOption[];
  trucks: TruckOption[];
  trailerTypes: TrailerTypeOption[];
  drivers: DriverOption[];
  trailers: TrailerOption[];
  cargoTypes: SelectOption[];
  containerTypes: SelectOption[];
  pricingTables: PricingTable[];
  loading: boolean;
}

export function toDriverOption(driver: CatalogData['drivers'][number]): DriverOption {
  return {
    id: driver.id,
    label: driver.name,
    baseSalary: Number(driver.baseSalary) || 0,
  };
}

export function useTripOptions(): TripOptions {
  const { user } = useAuth();
  const bootstrapQuery = useQuery<CatalogData>({
    queryKey: BOOTSTRAP_QUERY_KEY,
    queryFn: () => tripClient.getBootstrap(),
    staleTime: 5 * 60 * 1000,
  });

  const pricingQuery = useQuery<PricingTable[]>({
    queryKey: qk.catalogs.pricingTables,
    staleTime: 5 * 60 * 1000,
    queryFn: () => configClient.getPricingTables(),
    enabled: PRICING_TABLE_ROLES.includes(user?.role as Role),
  });


  const catalog = bootstrapQuery.data;

  // Lô biển đang mở (NEPO-63) — select gắn chuyến vào lô trong form chuyến.
  const shipmentsQuery = useQuery({
    queryKey: ['shipments', 'options'],
    queryFn: () => shipmentClient.list({ pageSize: 300 }),
    staleTime: 2 * 60 * 1000,
    placeholderData: keepPreviousData,
  });

  return {
    shipments: (shipmentsQuery.data?.items ?? []).map((l) => ({
      id: l.id,
      label: `${l.shipmentCode}${l.customerName ? ` — ${l.customerName}` : ''}`,
    })),
    customers: catalog?.customers.map((c) => ({ id: c.id, label: c.name })) ?? [],
    carrierCustomers: catalog?.customers.filter(c => c.isCarrier).map(c => ({ id: c.id, label: c.name })) ?? [],
    routes:
      catalog?.routes.map((r) => ({
        id: r.id,
        label: `${r.name}${r.distanceKm ? ` (${r.distanceKm} km)` : ""}`,
        name: r.name,
        distanceKm: r.distanceKm ?? undefined,
        isMountain: r.isMountain,
        fixedFuelAllowance: r.fixedFuelAllowance,
        tollsStations: r.tollsStations,
        driverSalary: r.driverSalary,
        defaultLegs: r.defaultLegs,
      })) ?? [],
    trucks: catalog?.trucks.map((t) => ({ id: t.id, label: t.licensePlate, currentTrailerId: t.currentTrailerId ?? null })) ?? [],
    trailerTypes: [{ value: '20FT', label: '20FT' }, { value: '40FT', label: '40FT' }],
    drivers: catalog?.drivers.map(toDriverOption) ?? [],
    trailers: catalog?.trailers?.map((t) => ({ id: t.id, label: t.licensePlate, type: t.type })) ?? [],
    cargoTypes: catalog?.cargoTypes.map((c) => ({ id: c.id, label: c.name })) ?? [],
    containerTypes: catalog?.containerTypes.map((c) => ({ id: c.id, label: c.name || c.code || `Loại #${c.id}` })) ?? [],
    pricingTables: pricingQuery.data ?? [],
    loading: bootstrapQuery.isLoading || pricingQuery.isLoading,
  };
}
