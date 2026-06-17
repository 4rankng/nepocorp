import type {
  TripStatus, FuelMode, LoadingType, Role, TxnType,
  TrailerType, TruckStatus, TrailerStatus, DriverStatus, CustomerStatus, PenaltyStatus,
  AdvanceRequestStatus, AdvanceSettlementStatus,
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

/**
 * A user row LEFT-JOINED with its optional linked `drivers` profile
 * (drivers.userId). The driver-* fields are null for non-driver users or for
 * drivers that have no profile row. Returned by GET /api/auth/users so the
 * /users page can render salary/truck inline. baseSalary/socialInsurance are
 * string|null because the numeric(15,0) columns serialize as strings (see Driver).
 */
export interface UserWithDriver extends UserPublic {
  driverId: number | null;
  driverName: string | null;
  driverPhone: string | null;
  assignedTruckId: number | null;
  baseSalary: string | null;
  socialInsurance: string | null;
  driverStatus: DriverStatus | null;
}

export interface Driver {
  id: number;
  userId: number | null;
  name: string;
  phone: string | null;
  assignedTruckId: number | null;
  baseSalary: string | null;
  socialInsurance: string | null;
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
  isCarrier: boolean;
  debitNoteMode: 'MONTHLY' | 'PER_BATCH';
  linkedSupplierId: number | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface Truck {
  id: number;
  licensePlate: string;
  trailerPlateNumber: string | null;
  trailerType: TrailerType | null;
  currentTrailerId: number | null;
  status: TruckStatus;
  // N5 / A12 + B4: user-keyed compliance/service dates (ISO 'YYYY-MM-DD' or null).
  nextInspectionDate: string | null;
  insuranceExpiryDate: string | null;
  // NEXT oil-service due date (legacy name). Set directly or computed by the
  // form from last-change + N months; only next-due is persisted.
  lastOilServiceDate: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

// ─── N5 / A12 + B4: vehicle compliance/service date alerts ───────────────────
// A non-null user-keyed date on a truck that computeVehicleAlerts evaluates.
export type VehicleAlertField =
  | 'nextInspectionDate'
  | 'insuranceExpiryDate'
  | 'lastOilServiceDate';

export type VehicleAlertStatus = 'overdue' | 'due' | 'ok';

export interface VehicleAlert {
  field: VehicleAlertField;
  /** Vietnamese display label for the date field. */
  label: string;
  /** ISO date string 'YYYY-MM-DD'. */
  date: string;
  /** Whole days from `today` until `date` (negative = past). */
  daysUntil: number;
  status: VehicleAlertStatus;
}

export interface Trailer {
  id: number;
  licensePlate: string;
  type: TrailerType;
  status: TrailerStatus;
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
  tollsStations: number | null;
  driverSalary: string | null;
  defaultLegs: Array<{ origin: string; destination: string; km: number; loadingType: 'HANG' | 'VO' }> | null;
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

export interface RoadConfig {
  id: number;
  tollPerStation: string;
  returnCargoBonus: string;
  defaultDriverSalary: string;
  twoPointDeliveryBonus: string;
  vehicleShiftDefault: string;
  createdAt: string;
  updatedAt: string;
}

export interface FuelPriceHistory {
  id: number;
  unitPrice: string;
  effectiveDate: string;
  changedBy: number | null;
  note: string | null;
  createdAt: string;
}

export interface PenaltyReason {
  id: number;
  reasonText: string;
  defaultAmount: string;
  severity: 'low' | 'mid' | 'high';
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
  trailerId: number | null;
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
  fuelActualUnitPrice: string | null;
  fuelSupplierId: number | null;
  tollsDiscount: string;
  tollsAddition: string;
  tollsStations: number;
  hasReturnCargo: boolean;
  driverSalary: string | null;
  fuelLiters: string | null;
  totalFuelCost: string | null;
  totalRoadAllowance: string | null;
  roadAllowanceOverride: string | null;
  totalCost: string | null;
  revenue: string | null;
  revenueEmptyReturn: string | null;
  revenueCombine: string | null;
  customerCommission: string | null;
  tripWageDays: number | null;
  twoPointDeliveryBonus: string;
  vehicleShiftAllowance: string;
  grossProfit: string | null;
  tollCost: string | null;
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
  fuelSupplementNormApplied: string | null;
  tollPerStationApplied: string | null;
  returnCargoBonusApplied: string | null;
  vatRate: string;
  carrierType: 'OWN' | 'EXTERNAL';
  externalCarrierId: number | null;
  externalFreightCost: string | null;
  externalPlateNumber: string | null;
  externalDriverName: string | null;
  externalDriverPhone: string | null;
  fuelSupplier?: { id: number; name: string } | null;
  completedAt: string | null;
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
  polylinePath: string | null;
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
  percentage?: string;
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

// ─── Notifications ──────────────────────────────────────────────────────────

export interface Notification {
  id: number;
  userId: number;
  type: string;
  title: string;
  message: string;
  relatedEntityType: string | null;
  relatedEntityId: number | null;
  isRead: boolean;
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
  linkedCustomerId: number | null;
  isFuelSupplier: boolean;
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
  vehicleComponent: 'TRUCK' | 'TRAILER' | null;
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
  trailer?: { id: number; licensePlate: string; type: string };
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
  /**
   * Origin of the payable row.
   * - 'vendor': a normal supplier (VENDOR ledger) — click-through goes to the
   *   supplier statement page.
   * - 'carrier': an external carrier (CUSTOMER ledger, EXTERNAL_CARRIER_COST) —
   *   click-through goes to the customer debt page.
   * Undefined for legacy responses that did not distinguish the two.
   */
  kind?: 'vendor' | 'carrier';
}

/** Payables category filter — drives the server-side txnType/entityType scoping. */
export type PayablesCategory = 'fuel' | 'ancillary' | 'commission' | 'carrier';

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

// ─── Forwarder catalogs ──────────────────────────────────────────────────────────

export interface ContainerType {
  id: number;
  code: string;   // e.g. "20DC", "40HC"
  name: string;   // e.g. "20'DC", "40'HC"
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface Port {
  id: number;
  name: string;
  code: string | null;
  address: string | null;
  city: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

// ─── Forwarder ────────────────────────────────────────────────────────────────────

export interface TripContainerSeal {
  id: number;
  tripContainerId: number;
  sealNumber: string;
  sealType: string | null;
  notes: string | null;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
}

/** Per-container photo (storage-key + type), grouped under each container. */
export interface TripContainerPhoto {
  id: number;
  type: 'CONTAINER' | 'SEAL';
  storageKey: string;
  uploadedAt: string;
}

export interface TripContainer {
  id: number;
  tripId: number;
  containerTypeId: number | null;
  containerTypeName: string | null; // joined display name
  containerNumber: string;
  sealNumber: string | null;
  cargoWeightKg: number | null;
  notes: string | null;
  createdBy: number;
  createdAt: string;
  /** Phase 2: per-container seals (newest-first by id). The legacy
   *  `sealNumber` field is kept as the "primary" seal (first child row)
   *  for back-compat with older clients. */
  seals?: TripContainerSeal[];
  /** Phase 2: photos explicitly linked to this container via
   *  trip_photos.trip_container_id. Photos with null container_id remain
   *  trip-level (surfaced separately in the response, not here). */
  photos?: TripContainerPhoto[];
}

export interface TripExpense {
  id: number;
  tripId: number;
  forwarderId: number | null;
  expenseType: string;
  buyAmount: string;
  sellAmount: string;
  settlementMethod: 'COMPANY_DIRECT' | 'FORWARDER_ADVANCE';
  supplierId: number | null;
  invoiceNumber: string | null;
  invoiceDate: string | null;
  declarationNumber: string | null;
  containerNumber: string | null;
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TripExpenseWithRefs extends TripExpense {
  forwarderName?: string | null;
  tripCode?: string | null;
}

export interface AdvanceRequest {
  id: number;
  requesterId: number;
  amount: string;
  reason: string;
  status: AdvanceRequestStatus;
  approvedBy: number | null;
  approvedAt: string | null;
  createdAt: string;
}

export interface AdvanceRequestWithRefs extends AdvanceRequest {
  requesterName?: string | null;
  approverName?: string | null;
}

export interface AdvanceSettlement {
  id: number;
  code: string;
  forwarderId: number;
  totalExpenseAmount: string;
  refundAmount: string;
  status: AdvanceSettlementStatus;
  checkedBy: number | null;
  checkedAt: string | null;
  approvedBy: number | null;
  approvedAt: string | null;
  note: string | null;
  createdAt: string;
}

export interface AdvanceSettlementWithRefs extends AdvanceSettlement {
  forwarderName?: string | null;
  checkerName?: string | null;
  approverName?: string | null;
  linkedRequests?: AdvanceRequest[];
}

/** Trip detail projection returned by the forwarder GET /trips/:id endpoint. */
export interface ForwarderTripDetail {
  id: number;
  tripCode: string | null;
  departureDate: string;
  status: TripStatus;
  routeName: string | null;
  truckPlate: string | null;
  customerName: string | null;
  customerReference: string | null;
  containerCount: number | null;
  cargoTypeName: string | null;
  notes: string | null;
  legs: TripLeg[];
  containers: Array<{
    id: number;
    tripId: number;
    containerTypeId: number | null;
    containerTypeName: string | null;
    containerNumber: string;
    sealNumber: string | null;
    notes: string | null;
    createdBy: number;
    createdAt: string;
  }>;
  expenses: Array<{
    id: number;
    tripId: number;
    forwarderId: number | null;
    expenseType: string;
    buyAmount: string;
    sellAmount: string;
    settlementMethod: string;
    supplierId: number | null;
    supplierName: string | null;
    containerNumber: string | null;
    invoiceNumber: string | null;
    invoiceDate: string | null;
    declarationNumber: string | null;
    approvalStatus: string;
    note: string | null;
    createdAt: string;
    forwarderName: string | null;
  }>;
}

/** Trip expense as returned by forwarder unlinked-expenses and financial advance-settlements endpoints. */
export interface TripExpenseWithSupplier extends TripExpense {
  supplierName?: string | null;
  forwarderName?: string | null;
  tripCode?: string | null;
  departureDate?: string | null;
  truckPlate?: string | null;
  containerNumbers?: string | null;
}

// ─── API types ───────────────────────────────────────────────────────────────

/**
 * Manager-authored contact + free-text guidance for a trip (N2 / B1.3).
 * One row per trip. Manager writes via TripEdit; driver reads read-only via
 * DriverTripDetailPage. `instructions` is null when no row exists yet.
 */
export interface TripInstruction {
  id: number;
  tripId: number;
  contactName: string | null;
  contactPhone: string | null;
  notes: string | null;
  updatedAt: string;
}

export interface TripDetail extends Trip {
  legs: TripLeg[];
  driver?: Driver;
  truck?: Truck;
  trailer?: Trailer;
  route?: Route;
  customer?: Customer;
  cargoType?: CargoType;
  fuelSupplier?: { id: number; name: string } | null;
  instructions?: TripInstruction | null;
}

export interface CreateTripRequest {
  customerId: number;
  routeId: number;
  truckId?: number | null;
  driverId?: number | null;
  cargoTypeId: number;
  departureDate: string;
  customerReference?: string;
  containerCount?: number;
  fuelMode?: FuelMode;
  fuelSupplierId?: number | null;
  vatRate?: number;
  carrierType?: 'OWN' | 'EXTERNAL';
  externalCarrierId?: number;
  externalFreightCost?: number;
  externalPlateNumber?: string;
  externalDriverName?: string;
  externalDriverPhone?: string;
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
  departureDate?: string;
  completedAt?: string;
  fuelMode: FuelMode;
  fuelLitersOverride?: number | null;
  fuelSupplementLiters?: number;
  fuelSupplementReason?: string;
  fuelActualUnitPrice?: number | null;
  fuelSupplierId?: number | null;
  tollsDiscount?: number;
  tollsAddition?: number;
  tollsStations?: number;
  hasReturnCargo?: boolean;
  roadAllowanceOverride?: number | null;
  driverSalary?: number;
  revenue?: number;
  revenueEmptyReturn?: number;
  revenueCombine?: number;
  customerCommission?: number;
  tripWageDays?: number;
  twoPointDeliveryBonus?: number;
  vehicleShiftAllowance?: number;
  notes?: string;
  photoUrls?: string[];
  version?: number;
  routeId?: number;
  vatRate?: number;
  carrierType?: 'OWN' | 'EXTERNAL';
  externalCarrierId?: number;
  externalFreightCost?: number;
  externalPlateNumber?: string;
  externalDriverName?: string;
  externalDriverPhone?: string;
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
  /** Count of LOCKED trips — the subset whose revenue/costs contribute to the KPIs. */
  lockedTrips?: number;
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
  customer: Pick<Customer, 'id' | 'name' | 'contactInfo'> & { debitNoteMode?: string | null };
  ledgerRows: LedgerEntry[];
  agingBuckets: AgingBucket[];
  totalOutstanding: number;
  unpaidTrips: UnpaidTrip[];
}

export interface DebtOffset {
  id: number;
  customerId: number;
  supplierId: number;
  amount: string;
  offsetDate: string;
  note: string | null;
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdBy: number | null;
  approvedBy: number | null;
  approvedAt: string | null;
  createdAt: string;
}

// ─── Reports ────────────────────────────────────────────────────────────────────

export interface PnlTruck {
  id: number;
  plate: string;
  revenue: number;
  costs: number;
  profit: number;
  trips: number;
  maintenanceExpenses: number;
  serviceMargin?: number;
  externalMargin?: number;
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
  maintenanceByComponent: Record<number, { truck: number; trailer: number }>;
  companyExpenses: number;
  categoryBreakdown: Array<{ categoryName: string; total: string }>;
  serviceMarginTotal?: number;
  externalMarginTotal?: number;
  externalTripsCount?: number;
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

// ─── Approval Queue ────────────────────────────────────────────────────────────

export type ApprovalItemType =
  | 'ancillaryFees'
  | 'debtOffsets'
  | 'advances'
  | 'advanceSettlementsCheck'
  | 'advanceSettlementsApprove';

/** Resolved salary period date range returned by the resolve endpoint */
export interface SalaryPeriodRange {
  month: number;
  year: number;
  start: string;  // YYYY-MM-DD inclusive
  end: string;    // YYYY-MM-DD inclusive
  label: string;
}
