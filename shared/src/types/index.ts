import type {
  TripStatus, FuelMode, LoadingType, Role, TxnType,
  TrailerType, TruckStatus, DriverStatus, CustomerStatus, PenaltyStatus,
} from '../constants';

// ─── Config ──────────────────────────────────────────────────────────────────

export interface User {
  id: number;
  username: string;
  email: string;
  phone: string | null;
  fullName: string | null;
  passwordHash: string;
  role: Role;
  status: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}
export type UserPublic = Omit<User, 'passwordHash' | 'deletedAt'>;

export interface Driver {
  id: number;
  userId: number | null;
  name: string;
  phone: string | null;
  assignedTruckId: number | null;
  baseSalary: string | null;
  status: DriverStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface Customer {
  id: number;
  name: string;
  taxCode: string | null;
  contactPerson: string | null;
  phone: string | null;
  contactInfo: string | null;
  creditLimit: string | null;
  status: CustomerStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface Truck {
  id: number;
  licensePlate: string;
  trailerPlateNumber: string | null;
  trailerType: TrailerType | null;
  status: TruckStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface Route {
  id: number;
  name: string;
  distanceKm: number | null;
  isMountain: boolean;
  fixedFuelAllowance: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface CargoType {
  id: number;
  name: string;
  requiresPhotos: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface PricingTable {
  id: number;
  customerId: number;
  routeId: number;
  price: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface RoadAllowance {
  id: number;
  routeId: number;
  trailerType: TrailerType;
  baseAmount: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface FuelConfig {
  id: number;
  loadedNorm: string;
  emptyNorm: string;
  supplement: string;
  unitPrice: string;
  warningThreshold: string;
  criticalThreshold: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface PenaltyReason {
  id: number;
  reasonText: string;
  defaultAmount: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

// ─── Operations ──────────────────────────────────────────────────────────────

export interface Trip {
  id: number;
  customerId: number;
  customerReference: string | null;
  truckId: number;
  driverId: number;
  routeId: number;
  trailerType: TrailerType | null;
  cargoTypeId: number;
  containerCount: number | null;
  status: TripStatus;
  departureDate: string;
  fuelMode: FuelMode;
  fuelLitersOverride: string | null;
  fuelSupplementLiters: string | null;
  fuelSupplementReason: string | null;
  fuelPriceApplied: string | null;
  tollsDiscount: string;
  tollsAddition: string;
  tollsStations: number;
  hasReturnCargo: boolean;
  driverSalary: string | null;
  fuelLiters: string | null;
  totalFuelCost: string | null;
  totalRoadAllowance: string | null;
  totalCost: string | null;
  revenue: string | null;
  grossProfit: string | null;
  revenueOriginal: string | null;
  revenueOverriddenBy: number | null;
  revenueOverriddenAt: string | null;
  photoUrls: string[] | null;
  notes: string | null;
  tripCode: string | null;
  version: number;
  createdBy: number | null;
  roadAllowanceBaseApplied: string | null;
  fuelLoadedNormApplied: string | null;
  fuelEmptyNormApplied: string | null;
  fuelFixedAllowanceApplied: string | null;
  tollPerStationApplied: string | null;
  returnCargoBonusApplied: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface TripLeg {
  id: number;
  tripId: number;
  sequence: number;
  origin: string;
  destination: string;
  km: number;
  loadingType: LoadingType;
  calculatedLiters: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Financials ──────────────────────────────────────────────────────────────

export interface LedgerEntry {
  id: number;
  timestamp: string;
  txnType: TxnType;
  txnId: number | null;
  receiptId: string | null;
  entityType: string;
  entityId: number;
  credit: string;
  debit: string;
  balance: string;
  note: string | null;
  createdAt: string;
}

export interface Penalty {
  id: number;
  driverId: number;
  tripId: number | null;
  reasonId: number | null;
  customReason: string | null;
  amount: string;
  date: string;
  status: PenaltyStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
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
  partnerName: string;
  amount: string;
  createdAt: string;
  updatedAt: string;
}

export interface ManagementFee {
  id: number;
  month: number;
  year: number;
  amount: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Audit ───────────────────────────────────────────────────────────────────

export interface AuditLog {
  id: number;
  timestamp: string;
  userId: number | null;
  message: string;
  entityType: string | null;
  entityId: number | null;
  payload: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}

// ─── Vendor & Expense ───────────────────────────────────────────────────────────

export interface Supplier {
  id: number;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  taxCode: string | null;
  note: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface ExpenseCategory {
  id: number;
  name: string;
  isRenewable: boolean;
  reminderLeadDays: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface Expense {
  id: number;
  expenseDate: string;
  supplierId: number;
  categoryId: number;
  truckId: number | null;
  amount: string;
  paymentStatus: string;
  validFrom: string | null;
  validTo: string | null;
  receiptId: string | null;
  note: string | null;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface ExpenseWithRefs extends Expense {
  supplier?: Supplier;
  category?: ExpenseCategory;
  truck?: { id: number; licensePlate: string };
}

export interface PayableSummary {
  supplier: Supplier;
  totalOutstanding: number;
  aging: {
    current: number;
    d30: number;
    d60: number;
    over90: number;
  };
  maxOverdueDays: number;
}

export interface SupplierStatement {
  supplier: Pick<Supplier, 'id' | 'name' | 'phone' | 'contactPerson'>;
  ledgerRows: LedgerEntry[];
  totalOutstanding: number;
  agingBuckets: AgingBucket[];
}

export interface RenewalReminder {
  id: number;
  expenseId: number;
  categoryId: number;
  categoryName: string;
  truckId: number | null;
  truckPlate: string | null;
  validTo: string;
  reminderLeadDays: number;
  daysRemaining: number;
}

export interface VendorPaymentRequest {
  supplierId: number;
  receiptId: string;
  amount: number;
  date: string;
  confirmOverpay?: boolean;
}

// ─── API types ───────────────────────────────────────────────────────────────

export interface TripDetail extends Trip {
  legs: TripLeg[];
  driver?: Driver;
  truck?: Truck;
  route?: Route;
  customer?: Customer;
  cargoType?: CargoType;
}

export interface CreateTripRequest {
  customerId: number;
  routeId: number;
  truckId: number;
  driverId: number;
  cargoTypeId: number;
  departureDate: string;
  customerReference?: string;
  containerCount?: number;
}

export interface TripLegInput {
  sequence: number;
  origin: string;
  destination: string;
  km: number;
  loadingType: LoadingType;
}

export interface UpdateTripFiguresRequest {
  legs: TripLegInput[];
  fuelMode: FuelMode;
  fuelLitersOverride?: number;
  fuelSupplementLiters?: number;
  fuelSupplementReason?: string;
  tollsDiscount?: number;
  tollsAddition?: number;
  tollsStations?: number;
  hasReturnCargo?: boolean;
  driverSalary?: number;
  revenue?: number;
  notes?: string;
  photoUrls?: string[];
}

export interface CreatePaymentRequest {
  customerId: number;
  receiptId: string;
  payments: { tripId: number; amount: number }[];
}

export interface CreatePenaltyRequest {
  driverId: number;
  tripId?: number;
  reasonId?: number;
  customReason?: string;
  amount: number;
  date: string;
}

export interface CreateAdjustmentRequest {
  tripId: number;
  amount: number;
  note: string;
  signedAgreementRef: string;
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
  customer: Pick<Customer, 'id' | 'name' | 'contactInfo'>;
  ledgerRows: LedgerEntry[];
  agingBuckets: AgingBucket[];
  totalOutstanding: number;
  unpaidTrips: UnpaidTrip[];
}

// ─── Reports ────────────────────────────────────────────────────────────────────

export interface PnlTruck {
  plate: string;
  revenue: number;
  costs: number;
  profit: number;
  trips: number;
  maintenanceExpenses: number;
}

export interface PnlReport {
  period: { month: number; year: number };
  totalRevenue: number;
  totalCosts: number;
  grossProfit: number;
  managementFee: number;
  otherIncome: number;
  netProfit: number;
  tripCount: number;
  trucks: PnlTruck[];
  maintenanceExpensesTotal: number;
  maintenanceExpensesByTruck: Record<number, string>;
  companyExpenses: number;
  categoryBreakdown: Array<{ categoryName: string; total: string }>;
}

// ─── Salary Period ─────────────────────────────────────────────────────────────

export interface SalaryPeriod {
  id: number;
  month: number | null;           // null for global default row
  year: number | null;            // null for global default row
  startDate: string | null;      // null for global default (derived)
  endDate: string | null;        // null for global default (derived)
  label: string | null;
  defaultStartDay: number | null; // only set on global default
  defaultEndDay: number | null;   // only set on global default
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

/** Resolved salary period date range returned by the resolve endpoint */
export interface SalaryPeriodRange {
  month: number;
  year: number;
  start: string;  // YYYY-MM-DD inclusive
  end: string;    // YYYY-MM-DD inclusive
  label: string;
}
