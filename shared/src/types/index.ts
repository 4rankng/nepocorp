import type {
  TripStatus, FuelMode, LoadingType, Role, TxnType,
  TrailerType, TruckStatus, DriverStatus, TrailerStatus, CustomerStatus,
} from '../constants';

// ─── Config ──────────────────────────────────────────────────────────────────

export interface User {
  id: number;
  email: string;
  password_hash: string;
  role: Role;
  status: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}
export type UserPublic = Omit<User, 'password_hash' | 'deleted_at'>;

export interface Driver {
  id: number;
  user_id: number;
  name: string;
  phone: string | null;
  assigned_truck_id: number | null;
  base_salary: string | null;
  status: DriverStatus;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Customer {
  id: number;
  name: string;
  tax_code: string | null;
  contact_person: string | null;
  phone: string | null;
  contact_info: string | null;
  credit_limit: string | null;
  status: CustomerStatus;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Truck {
  id: number;
  license_plate: string;
  status: TruckStatus;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Trailer {
  id: number;
  license_plate: string;
  type: TrailerType;
  status: TrailerStatus;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Route {
  id: number;
  name: string;
  distance_km: number | null;
  is_mountain: boolean;
  fixed_fuel_allowance: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CargoType {
  id: number;
  name: string;
  requires_photos: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface PricingTable {
  id: number;
  customer_id: number;
  route_id: number;
  price: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface RoadAllowance {
  id: number;
  route_id: number;
  trailer_type: TrailerType;
  base_amount: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface FuelConfig {
  id: number;
  loaded_norm: string;
  empty_norm: string;
  supplement: string;
  unit_price: string;
  warning_threshold: string;
  critical_threshold: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface PenaltyReason {
  id: number;
  reason_text: string;
  default_amount: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

// ─── Operations ──────────────────────────────────────────────────────────────

export interface Trip {
  id: number;
  customer_id: number;
  customer_reference: string | null;
  truck_id: number;
  driver_id: number;
  route_id: number;
  trailer_id: number;
  cargo_type_id: number;
  status: TripStatus;
  departure_date: string;
  fuel_mode: FuelMode;
  fuel_liters_override: string | null;
  fuel_supplement_liters: string | null;
  fuel_supplement_reason: string | null;
  fuel_price_applied: string | null;
  tolls_discount: string;
  tolls_addition: string;
  tolls_stations: number;
  has_return_cargo: boolean;
  driver_salary: string | null;
  fuel_liters: string | null;
  total_fuel_cost: string | null;
  total_road_allowance: string | null;
  total_cost: string | null;
  revenue: string | null;
  gross_profit: string | null;
  revenue_original: string | null;
  revenue_overridden_by: number | null;
  revenue_overridden_at: string | null;
  photo_urls: string[] | null;
  notes: string | null;
  trip_code: string | null;
  version: number;
  created_by: number | null;
  road_allowance_base_applied: string | null;
  fuel_loaded_norm_applied: string | null;
  fuel_empty_norm_applied: string | null;
  fuel_fixed_allowance_applied: string | null;
  toll_per_station_applied: string | null;
  return_cargo_bonus_applied: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface TripLeg {
  id: number;
  trip_id: number;
  sequence: number;
  origin: string;
  destination: string;
  km: number;
  loading_type: LoadingType;
  calculated_liters: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Financials ──────────────────────────────────────────────────────────────

export interface LedgerEntry {
  id: number;
  timestamp: string;
  txn_type: TxnType;
  txn_id: number | null;
  receipt_id: string | null;
  entity_type: string;
  entity_id: number;
  credit: string;
  debit: string;
  balance: string;
  note: string | null;
  created_at: string;
}

export interface Penalty {
  id: number;
  driver_id: number;
  trip_id: number | null;
  reason_id: number | null;
  custom_reason: string | null;
  amount: string;
  date: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CapTableHistory {
  id: number;
  partnerName: string;
  contributionAmount: string;
  effectiveDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface Distribution {
  id: number;
  quarter: number;
  year: number;
  partner_name: string;
  amount: string;
  created_at: string;
  updated_at: string;
}

export interface ManagementFee {
  id: number;
  month: number;
  year: number;
  amount: string;
  created_at: string;
  updated_at: string;
}

// ─── Audit ───────────────────────────────────────────────────────────────────

export interface AuditLog {
  id: number;
  timestamp: string;
  user_id: number | null;
  message: string;
  entity_type: string | null;
  entity_id: number | null;
  payload: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

// ─── API types ───────────────────────────────────────────────────────────────

export interface TripDetail extends Trip {
  legs: TripLeg[];
  driver?: Driver;
  truck?: Truck;
  trailer?: Trailer;
  route?: Route;
  customer?: Customer;
  cargoType?: CargoType;
}

export interface CreateTripRequest {
  customer_id: number;
  route_id: number;
  trailer_id: number;
  truck_id: number;
  driver_id: number;
  cargo_type_id: number;
  departure_date: string;
  customer_reference?: string;
}

export interface TripLegInput {
  sequence: number;
  origin: string;
  destination: string;
  km: number;
  loading_type: LoadingType;
}

export interface UpdateTripFiguresRequest {
  legs: TripLegInput[];
  fuel_mode: FuelMode;
  fuel_liters_override?: number;
  fuel_supplement_liters?: number;
  fuel_supplement_reason?: string;
  tolls_discount?: number;
  tolls_addition?: number;
  tolls_stations?: number;
  has_return_cargo?: boolean;
  driver_salary?: number;
  revenue?: number;
  notes?: string;
  photo_urls?: string[];
}

export interface CreatePaymentRequest {
  customer_id: number;
  receipt_id: string;
  payments: { trip_id: number; amount: number }[];
}

export interface CreatePenaltyRequest {
  driver_id: number;
  trip_id?: number;
  reason_id?: number;
  custom_reason?: string;
  amount: number;
  date: string;
}

export interface CreateAdjustmentRequest {
  trip_id: number;
  amount: number;
  note: string;
  signed_agreement_ref: string;
}

export interface LoginResponse {
  token: string;
  user: UserPublic;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface DashboardStats {
  revenue: number;
  costs: number;
  grossProfit: number;
  tripCount: number;
  completedTrips: number;
  inTransitTrips: number;
  totalTrucks?: number;
  totalDrivers?: number;
  fleetStatus?: Record<string, number>;
  topOverdueCustomer?: { name: string; balance: number; days: number } | null;
  topShareholder?: { name: string; percentage: number } | null;
}

/** Parse a threshold value safely — returns fallback for NaN/null/undefined */
export function parseThreshold(raw: string | number | null | undefined, fallback: number): number {
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

export interface AgingBucket {
  range: string;
  amount: number;
}

export interface UnpaidTrip {
  tripId: number;
  date: string;
  outstanding: number;
  note: string;
}

export interface CustomerStatement {
  customer: Pick<Customer, 'id' | 'name' | 'contact_info'>;
  ledgerRows: LedgerEntry[];
  agingBuckets: AgingBucket[];
  totalOutstanding: number;
  unpaidTrips: UnpaidTrip[];
}

// ─── Salary Period ─────────────────────────────────────────────────────────────

export interface SalaryPeriod {
  id: number;
  month: number | null;           // null for global default row
  year: number | null;            // null for global default row
  start_date: string | null;      // null for global default (derived)
  end_date: string | null;        // null for global default (derived)
  label: string | null;
  default_start_day: number | null; // only set on global default
  default_end_day: number | null;   // only set on global default
  is_default: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/** Resolved salary period date range returned by the resolve endpoint */
export interface SalaryPeriodRange {
  month: number;
  year: number;
  start: string;  // YYYY-MM-DD inclusive
  end: string;    // YYYY-MM-DD inclusive
  label: string;
}
