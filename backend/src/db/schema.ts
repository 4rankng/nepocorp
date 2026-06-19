import {
  pgTable, serial, varchar, text, integer, boolean, timestamp,
  jsonb, numeric, date, pgEnum, uniqueIndex, index, check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// Enums
export const tripStatusEnum = pgEnum('trip_status', ['CREATED', 'IN_TRANSIT', 'COMPLETED', 'LOCKED', 'CANCELED']);
export const fuelModeEnum = pgEnum('fuel_mode', ['AUTO', 'FLAT_RATE']);
export const loadingTypeEnum = pgEnum('loading_type', ['HANG', 'VO']);
export const roleEnum = pgEnum('role', ['ADMIN', 'MANAGER', 'ACCOUNTANT', 'DRIVER', 'FORWARDER']);
export const txnTypeEnum = pgEnum('txn_type', ['TRIP_REVENUE', 'PAYMENT_RECEIVED', 'PENALTY', 'MANAGEMENT_FEE', 'ADJUSTMENT', 'DRIVER_SALARY', 'VENDOR_EXPENSE', 'VENDOR_PAYMENT', 'FORWARDER_ADVANCE', 'FORWARDER_SETTLEMENT', 'EXTERNAL_CARRIER_COST', 'FUEL_EXPENSE', 'UNLOCK_REVERSAL', 'COMMISSION', 'DRIVER_PAYOUT']);
export const trailerTypeEnum = pgEnum('trailer_type', ['20FT', '40FT']);
export const truckStatusEnum = pgEnum('truck_status', ['ACTIVE', 'MAINTENANCE', 'INACTIVE']);
export const driverStatusEnum = pgEnum('driver_status', ['ACTIVE', 'INACTIVE']);
export const customerStatusEnum = pgEnum('customer_status', ['ACTIVE', 'LOCKED']);
export const tripPhotoTypeEnum = pgEnum('trip_photo_type', ['CONTAINER', 'SEAL', 'OTHER']);
export const penaltyStatusEnum = pgEnum('penalty_status', ['ACTIVE', 'CANCELED']);
export const vehicleComponentEnum = pgEnum('vehicle_component', ['TRUCK', 'TRAILER']);
export const trailerStatusEnum = pgEnum('trailer_status', ['ACTIVE', 'MAINTENANCE', 'INACTIVE']);
// NOTE: forwarder_expense_type pgEnum removed — replaced by forwarder_expense_types config table.
// trip_expenses.expense_type is now varchar(50) referencing config codes.
export const advanceRequestStatusEnum = pgEnum('advance_request_status', ['PENDING', 'APPROVED', 'REJECTED']);
export const advanceSettlementStatusEnum = pgEnum('advance_settlement_status', ['PENDING', 'CHECKED_BY_ACCOUNTANT', 'APPROVED', 'REJECTED']);
export const notificationTypeEnum = pgEnum('notification_type', [
  'TRIP_CREATED', 'TRIP_DISPATCHED', 'TRIP_IN_TRANSIT', 'TRIP_COMPLETED',
  'TRIP_LOCKED', 'TRIP_UNLOCKED', 'TRIP_CANCELED', 'PAYMENT_RECEIVED', 'PENALTY_CREATED',
  'PENALTY_CANCELED', 'OVERDUE_PAYMENT', 'SALARY_PERIOD_CLOSING', 'SYSTEM_ANNOUNCEMENT',
]);
export const workDayStatusEnum = pgEnum('work_day_status', ['TRIP_DAY', 'STANDBY', 'PERSONAL_LEAVE', 'WEEKLY_OFF']);
// N1 — tire management: position is free text because fleets use different axle layouts.
export const tireStatusEnum = pgEnum('tire_status', ['IN_STOCK', 'IN_USE', 'RETIRED']);


// ─── Config tables ───────────────────────────────────────────────────────────

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: varchar('username', { length: 100 }).unique(),
  email: varchar('email', { length: 255 }).unique(),
  phone: varchar('phone', { length: 20 }).unique(),
  // Human-readable full name (e.g. "Lê Văn Tài"). Used as the actor label in
  // audit log messages so users see "Quản lý Lê Văn Tài khóa chuyến" instead
  // of the email "Quản lý giamdoc@nepo.vn khóa chuyến #76".
  fullName: varchar('full_name', { length: 255 }),
  passwordHash: text('password_hash').notNull(),
  role: roleEnum('role').notNull().default('DRIVER'),
  status: varchar('status', { length: 20 }).notNull().default('ACTIVE'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});

export const trucks = pgTable('trucks', {
  id: serial('id').primaryKey(),
  licensePlate: varchar('license_plate', { length: 20 }).unique().notNull(),
  trailerPlateNumber: varchar('trailer_plate_number', { length: 20 }),
  trailerType: trailerTypeEnum('trailer_type'),
  currentTrailerId: integer('current_trailer_id').references(() => trailers.id),
  status: truckStatusEnum('status').default('ACTIVE'),
  // N5 / A12 + B4: user-keyed compliance/service dates for alerts.
  nextInspectionDate: date('next_inspection_date'),
  insuranceExpiryDate: date('insurance_expiry_date'),
  // NEXT oil-service due date (YYYY-MM-DD). The form lets a manager set it
  // directly OR compute it from "last change + N months"; only the resolved
  // next-due is persisted. Legacy column name retained (deployed in 0049).
  lastOilServiceDate: date('last_oil_service_date'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});

export const trailers = pgTable('trailers', {
  id: serial('id').primaryKey(),
  licensePlate: varchar('license_plate', { length: 20 }).notNull().unique(),
  type: trailerTypeEnum('type').notNull(),
  status: trailerStatusEnum('status').default('ACTIVE').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});

export const drivers = pgTable('drivers', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  name: varchar('name', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 20 }),
  assignedTruckId: integer('assigned_truck_id').references(() => trucks.id),
  baseSalary: numeric('base_salary', { precision: 15, scale: 0 }),
  // BHXH/BHYT monthly contribution — tracked SEPARATELY for cost allocation; NOT part of daily_rate
  // or trip-salary auto-fill (Pete 2026-06: baseSalary only — base/std_days, no socialInsurance)
  socialInsurance: numeric('social_insurance', { precision: 15, scale: 0 }).default('0'),
  status: driverStatusEnum('status').default('ACTIVE'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});

// Defined before customers to allow customers.linkedSupplierId to reference suppliers.id directly.
// suppliers.linkedCustomerId intentionally omits .references() to break the mutual circular
// forward-reference that causes TS7022. The FK constraint is enforced at the DB level via migration.
export const suppliers = pgTable('suppliers', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  contactPerson: varchar('contact_person', { length: 255 }),
  phone: varchar('phone', { length: 20 }),
  taxCode: varchar('tax_code', { length: 20 }),
  note: text('note'),
  status: varchar('status', { length: 20 }).notNull().default('ACTIVE'),
  linkedCustomerId: integer('linked_customer_id'), // FK → customers(id), enforced at DB level
  isFuelSupplier: boolean('is_fuel_supplier').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});

// ─── N1 — Tires ──────────────────────────────────────────────────────────────
// Tracks individual tires by serial across their lifecycle (stock → in-use on
// a truck → retired). `serial` is the immutable identity; install/remove just
// flip truck_id + status + installed_at/removed_at. Soft-deleted via deletedAt
// (the CRUD factory relies on it).
export const tires = pgTable('tires', {
  id: serial('id').primaryKey(),
  serial: varchar('serial', { length: 64 }).notNull().unique(),
  truckId: integer('truck_id').references(() => trucks.id),
  position: varchar('position', { length: 64 }),
  size: varchar('size', { length: 32 }),
  installedAt: date('installed_at'),
  removedAt: date('removed_at'),
  supplierId: integer('supplier_id').references(() => suppliers.id),
  cost: numeric('cost', { precision: 15, scale: 0 }).default('0'),
  warrantyUntil: date('warranty_until'),
  status: tireStatusEnum('status').default('IN_STOCK'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
}, (t) => ({
  truckIdx: index('tires_truck_id_idx').on(t.truckId),
}));

export const customers = pgTable('customers', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  taxCode: varchar('tax_code', { length: 20 }),
  contactPerson: varchar('contact_person', { length: 255 }),
  phone: varchar('phone', { length: 20 }),
  contactInfo: text('contact_info'),
  creditLimit: numeric('credit_limit', { precision: 15, scale: 0 }),
  status: customerStatusEnum('status').default('ACTIVE'),
  isCarrier: boolean('is_carrier').notNull().default(false),
  debitNoteMode: varchar('debit_note_mode', { length: 20 }).notNull().default('MONTHLY'),
  linkedSupplierId: integer('linked_supplier_id').references(() => suppliers.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});

export const routes = pgTable('routes', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  distanceKm: integer('distance_km'),
  isMountain: boolean('is_mountain').default(false),
  fixedFuelAllowance: numeric('fixed_fuel_allowance', { precision: 10, scale: 2 }),
  tollsStations: integer('tolls_stations'),
  driverSalary: numeric('driver_salary', { precision: 15, scale: 0 }),
  defaultLegs: jsonb('default_legs').$type<Array<{ origin: string, destination: string, km: number, loadingType: 'HANG' | 'VO' }>>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});

export const cargoTypes = pgTable('cargo_types', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  requiresPhotos: boolean('requires_photos').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});

export const pricingTables = pgTable('pricing_tables', {
  id: serial('id').primaryKey(),
  customerId: integer('customer_id').references(() => customers.id).notNull(),
  routeId: integer('route_id').references(() => routes.id).notNull(),
  price: numeric('price', { precision: 15, scale: 0 }).notNull(),
  effectiveDate: date('effective_date').notNull().defaultNow(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
}, (table) => [
  uniqueIndex('pricing_tables_customer_route_date_idx').on(table.customerId, table.routeId, table.effectiveDate),
]);

export const roadAllowances = pgTable('road_allowances', {
  id: serial('id').primaryKey(),
  routeId: integer('route_id').references(() => routes.id).notNull(),
  trailerType: trailerTypeEnum('trailer_type').notNull(),
  baseAmount: numeric('base_amount', { precision: 15, scale: 0 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
}, (table) => [
  uniqueIndex('road_allowances_route_type_idx').on(table.routeId, table.trailerType),
]);

export const fuelConfig = pgTable('fuel_config', {
  id: serial('id').primaryKey(),
  loadedNorm: numeric('loaded_norm', { precision: 6, scale: 2 }).notNull(),
  emptyNorm: numeric('empty_norm', { precision: 6, scale: 2 }).notNull(),
  supplement: numeric('supplement', { precision: 6, scale: 2 }).default('3'),
  unitPrice: numeric('unit_price', { precision: 10, scale: 0 }).notNull(),
  warningThreshold: numeric('warning_threshold', { precision: 6, scale: 2 }).default('37'),
  criticalThreshold: numeric('critical_threshold', { precision: 6, scale: 2 }).default('40'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});

export const fuelPriceHistory = pgTable('fuel_price_history', {
  id: serial('id').primaryKey(),
  unitPrice: numeric('unit_price', { precision: 10, scale: 0 }).notNull(),
  effectiveDate: timestamp('effective_date').notNull(),
  changedBy: integer('changed_by').references(() => users.id),
  note: text('note'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const penaltyReasons = pgTable('penalty_reasons', {
  id: serial('id').primaryKey(),
  reasonText: text('reason_text').notNull(),
  defaultAmount: numeric('default_amount', { precision: 15, scale: 0 }).notNull(),
  severity: text('severity').notNull().default('mid'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});

// ─── Operations ──────────────────────────────────────────────────────────────

export const trips = pgTable('trips', {
  id: serial('id').primaryKey(),
  tripCode: varchar('trip_code', { length: 50 }).unique(),
  version: integer('version').default(1).notNull(),
  createdBy: integer('created_by').references(() => users.id),
  customerId: integer('customer_id').references(() => customers.id).notNull(),
  customerReference: text('customer_reference'),
  truckId: integer('truck_id').references(() => trucks.id),
  driverId: integer('driver_id').references(() => drivers.id),
  routeId: integer('route_id').references(() => routes.id).notNull(),
  trailerId: integer('trailer_id').references(() => trailers.id),
  trailerType: trailerTypeEnum('trailer_type'),
  cargoTypeId: integer('cargo_type_id').references(() => cargoTypes.id).notNull(),
  containerCount: integer('container_count').default(1),
  status: tripStatusEnum('status').default('CREATED'),
  departureDate: date('departure_date').notNull(),
  fuelMode: fuelModeEnum('fuel_mode').default('AUTO'),
  fuelLitersOverride: numeric('fuel_liters_override', { precision: 10, scale: 2 }),
  fuelSupplementLiters: numeric('fuel_supplement_liters', { precision: 10, scale: 2 }).default('0'),
  fuelSupplementReason: text('fuel_supplement_reason'),
  tollsDiscount: numeric('tolls_discount', { precision: 15, scale: 0 }).default('0'),
  tollsAddition: numeric('tolls_addition', { precision: 15, scale: 0 }).default('0'),
  tollsStations: integer('tolls_stations').default(0),
  hasReturnCargo: boolean('has_return_cargo').default(false),
  driverSalary: numeric('driver_salary', { precision: 15, scale: 0 }),
  // Rate Snapshots
  fuelPriceApplied: numeric('fuel_price_applied', { precision: 10, scale: 0 }),
  fuelActualUnitPrice: numeric('fuel_actual_unit_price', { precision: 10, scale: 0 }),
  roadAllowanceBaseApplied: numeric('road_allowance_base_applied', { precision: 15, scale: 0 }),
  fuelLoadedNormApplied: numeric('fuel_loaded_norm_applied', { precision: 6, scale: 2 }),
  fuelEmptyNormApplied: numeric('fuel_empty_norm_applied', { precision: 6, scale: 2 }),
  fuelFixedAllowanceApplied: numeric('fuel_fixed_allowance_applied', { precision: 10, scale: 2 }),
  fuelSupplementNormApplied: numeric('fuel_supplement_norm_applied', { precision: 6, scale: 2 }),
  tollPerStationApplied: numeric('toll_per_station_applied', { precision: 15, scale: 0 }),
  returnCargoBonusApplied: numeric('return_cargo_bonus_applied', { precision: 15, scale: 0 }),
  // Derived Fields
  fuelLiters: numeric('fuel_liters', { precision: 10, scale: 2 }),
  totalFuelCost: numeric('total_fuel_cost', { precision: 15, scale: 0 }),
  totalRoadAllowance: numeric('total_road_allowance', { precision: 15, scale: 0 }),
  tollCost: numeric('toll_cost', { precision: 15, scale: 0 }),
  roadAllowanceOverride: numeric('road_allowance_override', { precision: 15, scale: 0 }),
  totalCost: numeric('total_cost', { precision: 15, scale: 0 }),
  revenue: numeric('revenue', { precision: 15, scale: 0 }),
  revenueEmptyReturn: numeric('revenue_empty_return', { precision: 15, scale: 0 }).default('0'),
  revenueCombine: numeric('revenue_combine', { precision: 15, scale: 0 }).default('0'),
  twoPointDeliveryBonus: numeric('two_point_delivery_bonus', { precision: 15, scale: 0 }).default('0'),
  vehicleShiftAllowance: numeric('vehicle_shift_allowance', { precision: 15, scale: 0 }).default('0'),
  grossProfit: numeric('gross_profit', { precision: 15, scale: 0 }),
  revenueOriginal: numeric('revenue_original', { precision: 15, scale: 0 }),
  revenueOverriddenBy: integer('revenue_overridden_by'),
  revenueOverriddenAt: timestamp('revenue_overridden_at'),
  notes: text('notes'),
  // Per-trip customer commission (hoa hồng). Deducted from freightExVat to produce recordedRevenue.
  // Recorded immediately on data entry (not at lock). Default 0 = no commission.
  customerCommission: numeric('customer_commission', { precision: 15, scale: 0 }).default('0'),
  tripWageDays: integer('trip_wage_days'), // optional override for days to count for this trip
  fuelSupplierId: integer('fuel_supplier_id').references(() => suppliers.id),
  vatRate: numeric('vat_rate', { precision: 5, scale: 3 }).notNull().default('0.000'),
  carrierType: varchar('carrier_type', { length: 20 }).notNull().default('OWN'),
  // D-E decision: external carrier references customers table, NOT suppliers
  externalCarrierId: integer('external_carrier_id').references(() => customers.id),
  externalFreightCost: numeric('external_freight_cost', { precision: 15, scale: 0 }),
  externalPlateNumber: varchar('external_plate_number', { length: 20 }),
  externalDriverName: varchar('external_driver_name', { length: 100 }),
  externalDriverPhone: varchar('external_driver_phone', { length: 20 }),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
}, (table) => [
  index('trips_trailer_id_idx').on(table.trailerId),
  // Trip list and report queries filter heavily on status and date
  index('trips_status_idx').on(table.status),
  index('trips_departure_date_idx').on(table.departureDate),
  index('trips_customer_departure_idx').on(table.customerId, table.departureDate),
]);

export const tripLegs = pgTable('trip_legs', {
  id: serial('id').primaryKey(),
  tripId: integer('trip_id').references(() => trips.id).notNull(),
  sequence: integer('sequence').notNull(),
  origin: text('origin').notNull(),
  destination: text('destination').notNull(),
  km: integer('km').notNull(),
  loadingType: loadingTypeEnum('loading_type').notNull(),
  calculatedLiters: numeric('calculated_liters', { precision: 10, scale: 2 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ─── Financials ──────────────────────────────────────────────────────────────

export const ledger = pgTable('ledger', {
  id: serial('id').primaryKey(),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  txnType: txnTypeEnum('txn_type').notNull(),
  txnId: integer('txn_id'),
  receiptId: varchar('receipt_id', { length: 100 }),
  entityType: varchar('entity_type', { length: 50 }).notNull(),
  entityId: integer('entity_id').notNull(),
  credit: numeric('credit', { precision: 15, scale: 0 }).default('0'),
  debit: numeric('debit', { precision: 15, scale: 0 }).default('0'),
  balance: numeric('balance', { precision: 15, scale: 0 }).notNull(),
  note: text('note'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  // Hottest query path: every getBalance/postEntry does WHERE entity_type = ? AND entity_id = ? ORDER BY id DESC LIMIT 1
  index('ledger_entity_entity_idx').on(table.entityType, table.entityId),
]);

export const penalties = pgTable('penalties', {
  id: serial('id').primaryKey(),
  driverId: integer('driver_id').references(() => drivers.id).notNull(),
  tripId: integer('trip_id').references(() => trips.id),
  reasonId: integer('reason_id').references(() => penaltyReasons.id),
  customReason: text('custom_reason'),
  amount: numeric('amount', { precision: 15, scale: 0 }).notNull(),
  date: date('date').notNull(),
  status: penaltyStatusEnum('status').default('ACTIVE').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
}, (table) => [
  index('penalties_date_idx').on(table.date),
]);

export const capTableHistory = pgTable('cap_table_history', {
  id: serial('id').primaryKey(),
  partnerName: varchar('partner_name', { length: 255 }).notNull(),
  // Optional — application drives cap-table ownership via percentage; this
  // column is reserved for future amount-based book-keeping.
  contributionAmount: numeric('contribution_amount', { precision: 15, scale: 0 }).default('0').notNull(),
  // Snapshot ownership percentage (0–100). Distribution math reads this
  // directly; contributionAmount is a separate book-keeping field.
  percentage: numeric('percentage', { precision: 5, scale: 2 }).notNull().default('0'),
  effectiveDate: date('effective_date').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ─── Per-vehicle ownership (F3) ─────────────────────────────────────────────
// History-based mirrors of `cap_table_history`, but scoped per truck. Each row
// is a snapshot of one partner's stake at an `effectiveDate` for a truck; the
// latest effectiveDate ≤ cutoff (deduped by partner) resolves the active
// owners whose % share that truck's profit. `percentage` is explicit (0–100);
// contribution amount is not tracked per-vehicle.
export const truckCapTable = pgTable('truck_cap_table', {
  id: serial('id').primaryKey(),
  truckId: integer('truck_id').references(() => trucks.id).notNull(),
  partnerName: varchar('partner_name', { length: 255 }).notNull(),
  percentage: numeric('percentage', { precision: 5, scale: 2 }).notNull().default('0'),
  // B2 (feedback202606 GAP 7) — role of the partner: INVESTOR (capital partner,
  // default) or DRIVER (driver-contributor modeled as a per-truck profit
  // participant by %). TEXT + CHECK (not a pgEnum) to avoid enum-migration
  // hassle and the name collision with the user-role pgEnum.
  role: text('role').notNull().default('INVESTOR'),
  effectiveDate: date('effective_date').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('truck_cap_table_truck_effective_idx').on(table.truckId, table.effectiveDate),
  check('truck_cap_role_check', sql`${table.role} IN ('INVESTOR', 'DRIVER')`),
]);

export const distributions = pgTable('distributions', {
  id: serial('id').primaryKey(),
  quarter: integer('quarter').notNull(),
  year: integer('year').notNull(),
  partnerName: varchar('partner_name', { length: 255 }).notNull(),
  amount: numeric('amount', { precision: 15, scale: 0 }).notNull(),
  // F3 — per-vehicle attribution. NULL on legacy entity-wide rows; set to the
  // owning truck's id on new per-vehicle distribution rows.
  truckId: integer('truck_id').references(() => trucks.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const debtOffsets = pgTable('debt_offsets', {
  id: serial('id').primaryKey(),
  customerId: integer('customer_id').references(() => customers.id).notNull(),
  supplierId: integer('supplier_id').references(() => suppliers.id).notNull(),
  amount: numeric('amount', { precision: 15, scale: 0 }).notNull(),
  offsetDate: date('offset_date').notNull(),
  note: text('note'),
  approvalStatus: varchar('approval_status', { length: 20 }).notNull().default('PENDING'),
  createdBy: integer('created_by').references(() => users.id),
  approvedBy: integer('approved_by').references(() => users.id),
  approvedAt: timestamp('approved_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('debt_offsets_customer_idx').on(table.customerId),
  index('debt_offsets_supplier_idx').on(table.supplierId),
]);

export const managementFees = pgTable('management_fees', {
  id: serial('id').primaryKey(),
  month: integer('month').notNull(),
  year: integer('year').notNull(),
  amount: numeric('amount', { precision: 15, scale: 0 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const salaryConfirmationStatusEnum = pgEnum('salary_confirmation_status', ['DRAFT', 'CONFIRMED']);

export const salaryConfirmations = pgTable('salary_confirmations', {
  id: serial('id').primaryKey(),
  driverId: integer('driver_id').references(() => drivers.id).notNull(),
  year: integer('year').notNull(),
  month: integer('month').notNull(),
  status: salaryConfirmationStatusEnum('status').default('DRAFT').notNull(),
  confirmedBy: integer('confirmed_by').references(() => users.id),
  confirmedAt: timestamp('confirmed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('salary_confirmations_driver_period_idx').on(table.driverId, table.year, table.month),
]);

export const salaryPeriods = pgTable('salary_periods', {
  id: serial('id').primaryKey(),
  // null for the global default row; 1-12 for per-month overrides
  month: integer('month'),
  year: integer('year'),
  // Explicit dates for per-month overrides; null for global default (derived)
  startDate: date('start_date'),
  endDate: date('end_date'),
  label: varchar('label', { length: 100 }),
  // Only set on the global default row (isDefault = true)
  defaultStartDay: integer('default_start_day'),
  defaultEndDay: integer('default_end_day'),
  isDefault: boolean('is_default').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});

// ─── Vendor & Expense ────────────────────────────────────────────────────────────
// suppliers is declared above customers (before routes) to avoid circular forward-ref.

export const expenseCategories = pgTable('expense_categories', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  isRenewable: boolean('is_renewable').default(false),
  reminderLeadDays: integer('reminder_lead_days').default(30),
  status: varchar('status', { length: 20 }).notNull().default('ACTIVE'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});

export const expenses = pgTable('expenses', {
  id: serial('id').primaryKey(),
  expenseDate: date('expense_date').notNull(),
  supplierId: integer('supplier_id').references(() => suppliers.id).notNull(),
  categoryId: integer('category_id').references(() => expenseCategories.id).notNull(),
  // `truck_id` is polymorphic — holds either `trucks.id` (when vehicle_component='TRUCK'),
  // `trailers.id` (when vehicle_component='TRAILER'), or null (company-wide expense).
  // No FK constraint because Postgres can't enforce a polymorphic reference; integrity
  // is maintained by the create/update service paths.
  truckId: integer('truck_id'),
  vehicleComponent: vehicleComponentEnum('vehicle_component').default('TRUCK'),
  amount: numeric('amount', { precision: 15, scale: 0 }).notNull(),
  paymentStatus: varchar('payment_status', { length: 20 }).notNull(),
  validFrom: timestamp('valid_from'),
  validTo: timestamp('valid_to'),
  receiptId: varchar('receipt_id', { length: 100 }),
  note: text('note'),
  createdBy: integer('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});

export const expensePhotos = pgTable('expense_photos', {
  id: serial('id').primaryKey(),
  expenseId: integer('expense_id').references(() => expenses.id).notNull(),
  storageKey: varchar('storage_key', { length: 255 }).notNull(),
  uploadedBy: integer('uploaded_by'),
  uploadedAt: timestamp('uploaded_at').defaultNow().notNull(),
}, (table) => [
  // Receipt-photo serving (/api/photos) resolves ownership by exact storage_key
  // lookup; this index makes that O(log n) instead of a seq scan. See ADR 0042.
  index('expense_photos_storage_key_idx').on(table.storageKey),
]);

// ─── Forwarder catalogs ──────────────────────────────────────────────────────────

export const containerTypes = pgTable('container_types', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 20 }).notNull().unique(), // e.g. "20DC", "40HC"
  name: varchar('name', { length: 50 }).notNull(),          // e.g. "20'DC", "40'HC"
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});

export const sealTypes = pgTable('seal_types', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 50 }).notNull(),          // e.g. "Customs", "Carrier"
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});

export const ports = pgTable('ports', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),   // e.g. "Cảng Hải Phòng"
  code: varchar('code', { length: 20 }).unique(),     // e.g. "HPH"
  address: text('address'),
  city: varchar('city', { length: 100 }).default('Hải Phòng'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});

export const forwarderExpenseTypes = pgTable('forwarder_expense_types', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 50 }).notNull().unique(), // e.g. "LIFTING", "CUSTOMS"
  name: varchar('name', { length: 100 }).notNull(),         // Vietnamese label e.g. "Nâng hạ"
  status: varchar('status', { length: 20 }).notNull().default('ACTIVE'),
  defaultMarkup: boolean('default_markup').notNull().default(false),
  billingLabel: varchar('billing_label', { length: 120 }),
  vatRate: numeric('vat_rate', { precision: 5, scale: 3 }).notNull().default('0.080'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});

// ─── Forwarder ──────────────────────────────────────────────────────────────────

export const tripContainers = pgTable('trip_containers', {
  id: serial('id').primaryKey(),
  tripId: integer('trip_id').references(() => trips.id).notNull(),
  containerTypeId: integer('container_type_id').references(() => containerTypes.id),
  containerNumber: varchar('container_number', { length: 50 }).notNull(),
  // Kept for back-compat during the Phase 2 multi-seal migration. New writes
  // also maintain this as the "primary seal" mirror (= first child row in
  // trip_container_seals). To be dropped in a follow-up once no client reads it.
  sealNumber: varchar('seal_number', { length: 50 }),
  // Cargo weight in kilograms. Added 2026-06 per Pete's request to capture
  // trọng lượng hàng per container; report aggregations can sum/avg as needed.
  cargoWeightKg: numeric('cargo_weight_kg', { precision: 10, scale: 2 }),
  notes: text('notes'),
  // createdBy is nullable now because the row may also be filled in by
  // accountant/manager via the trip edit form (not just forwarder during receipt).
  createdBy: integer('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('trip_containers_trip_id_idx').on(table.tripId),
]);

// ─── Multi-seal per container (Phase 2) ───────────────────────────────────
// A container may carry multiple seals (customs seal, carrier seal, …).
// Each row is one seal. Cascade on delete so removing a container row also
// cleans up its seals — never leaves orphans.
export const tripContainerSeals = pgTable('trip_container_seals', {
  id: serial('id').primaryKey(),
  tripContainerId: integer('trip_container_id')
    .references(() => tripContainers.id, { onDelete: 'cascade' }).notNull(),
  sealNumber: varchar('seal_number', { length: 50 }).notNull(),
  // Free-form string ("Customs", "Carrier", …). No enum — drivers may label
  // however makes sense in the field.
  sealType: varchar('seal_type', { length: 30 }),
  notes: text('notes'),
  createdBy: integer('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('trip_container_seals_container_idx').on(table.tripContainerId),
]);

// ─── Trip instructions (N2 / B1.3) ─────────────────────────────────────────
// Manager-authored contact + free-text guidance for a trip. Manager writes via
// TripEdit; driver reads read-only via DriverTripDetailPage. One row per trip.
export const tripInstructions = pgTable('trip_instructions', {
  id: serial('id').primaryKey(),
  tripId: integer('trip_id').references(() => trips.id, { onDelete: 'cascade' }).notNull(),
  contactName: varchar('contact_name', { length: 100 }),
  contactPhone: varchar('contact_phone', { length: 20 }),
  notes: text('notes'),
  updatedBy: integer('updated_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('trip_instructions_trip_id_unq').on(table.tripId),
]);

export const tripExpenses = pgTable('trip_expenses', {
  id: serial('id').primaryKey(),
  tripId: integer('trip_id').references(() => trips.id).notNull(),
  forwarderId: integer('forwarder_id').references(() => users.id),  // nullable — accountants also create
  expenseType: varchar('expense_type', { length: 50 }).notNull(),   // FK to forwarder_expense_types.code
  buyAmount: numeric('buy_amount', { precision: 15, scale: 0 }).notNull(),
  sellAmount: numeric('sell_amount', { precision: 15, scale: 0 }).notNull().default('0'),
  settlementMethod: varchar('settlement_method', { length: 20 }).notNull().default('FORWARDER_ADVANCE'),
  supplierId: integer('supplier_id').references(() => suppliers.id),
  invoiceNumber: varchar('invoice_number', { length: 50 }),
  invoiceDate: date('invoice_date'),
  declarationNumber: varchar('declaration_number', { length: 50 }),
  // Free-text container label (DEPRECATED for B5). Kept for back-compat with
  // rows written before the FK existed and as a denormalised mirror; new writes
  // should set `tripContainerId` so the label always matches a real container.
  containerNumber: varchar('container_number', { length: 20 }),
  // B5: authoritative link to the trip's container row. ON DELETE SET NULL so
  // deleting a container row downgrades the expense to trip-level (loose
  // containerNumber still present) instead of orphaning or failing the delete.
  tripContainerId: integer('trip_container_id').references(() => tripContainers.id, { onDelete: 'set null' }),
  approvalStatus: varchar('approval_status', { length: 20 }).notNull().default('APPROVED'),
  note: text('note'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('trip_expenses_trip_id_idx').on(table.tripId),
  index('trip_expenses_container_idx').on(table.containerNumber),
  index('trip_expenses_trip_container_id_idx').on(table.tripContainerId),
]);

export const tripExpensePhotos = pgTable('trip_expense_photos', {
  id: serial('id').primaryKey(),
  tripExpenseId: integer('trip_expense_id').references(() => tripExpenses.id).notNull(),
  storageKey: varchar('storage_key', { length: 255 }).notNull(),
  uploadedBy: integer('uploaded_by'),
  uploadedAt: timestamp('uploaded_at').defaultNow().notNull(),
}, (table) => [
  // Receipt-photo serving (/api/photos) resolves ownership by exact storage_key
  // lookup; this index makes that O(log n) instead of a seq scan. See ADR 0042.
  index('trip_expense_photos_storage_key_idx').on(table.storageKey),
]);

export const advanceRequests = pgTable('advance_requests', {
  id: serial('id').primaryKey(),
  requesterId: integer('requester_id').references(() => users.id).notNull(),
  amount: numeric('amount', { precision: 15, scale: 0 }).notNull(),
  reason: text('reason').notNull(),
  status: advanceRequestStatusEnum('status').default('PENDING').notNull(),
  approvedBy: integer('approved_by').references(() => users.id),
  approvedAt: timestamp('approved_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const advanceSettlements = pgTable('advance_settlements', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 20 }).notNull(),
  forwarderId: integer('forwarder_id').references(() => users.id).notNull(),
  totalExpenseAmount: numeric('total_expense_amount', { precision: 15, scale: 0 }).notNull(),
  refundAmount: numeric('refund_amount', { precision: 15, scale: 0 }).default('0').notNull(),
  status: advanceSettlementStatusEnum('status').default('PENDING').notNull(),
  checkedBy: integer('checked_by').references(() => users.id),
  checkedAt: timestamp('checked_at'),
  approvedBy: integer('approved_by').references(() => users.id),
  approvedAt: timestamp('approved_at'),
  note: text('note'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('advance_settlements_code_unique_idx').on(table.code),
]);

export const advanceSettlementRequests = pgTable('advance_settlement_requests', {
  id: serial('id').primaryKey(),
  settlementId: integer('settlement_id').references(() => advanceSettlements.id).notNull(),
  advanceRequestId: integer('advance_request_id').references(() => advanceRequests.id).notNull(),
}, (table) => [
  uniqueIndex('adv_settlement_req_unique_idx').on(table.settlementId, table.advanceRequestId),
]);

export const settlementExpenses = pgTable('settlement_expenses', {
  id: serial('id').primaryKey(),
  settlementId: integer('settlement_id').references(() => advanceSettlements.id).notNull(),
  tripExpenseId: integer('trip_expense_id').references(() => tripExpenses.id).notNull(),
}, (table) => [
  uniqueIndex('settlement_expense_unique_idx').on(table.settlementId, table.tripExpenseId),
  uniqueIndex('settlement_expense_trip_expense_uniq_idx').on(table.tripExpenseId),
]);

// ─── Attendance ──────────────────────────────────────────────────────────────

export const driverWorkDays = pgTable('driver_work_days', {
  id: serial('id').primaryKey(),
  driverId: integer('driver_id').references(() => drivers.id).notNull(),
  date: date('date').notNull(),
  status: workDayStatusEnum('status').notNull(),
  tripId: integer('trip_id').references(() => trips.id),
  note: text('note'),
  createdBy: integer('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('driver_work_days_driver_date_idx').on(table.driverId, table.date),
  index('driver_work_days_driver_idx').on(table.driverId),
]);

// ─── Audit ───────────────────────────────────────────────────────────────────

export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  userId: integer('user_id'),
  actorName: varchar('actor_name', { length: 255 }),
  message: text('message').notNull(),
  entityType: varchar('entity_type', { length: 50 }),
  entityId: integer('entity_id'),
  payload: jsonb('payload').$type<Record<string, unknown>>(),
  ipAddress: varchar('ip_address', { length: 45 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ─── E2E Epic Extensions ──────────────────────────────────────────────────────

export const roadConfig = pgTable('road_config', {
  id: serial('id').primaryKey(),
  tollPerStation: numeric('toll_per_station', { precision: 15, scale: 0 }).notNull(),
  returnCargoBonus: numeric('return_cargo_bonus', { precision: 15, scale: 0 }).notNull(),
  defaultDriverSalary: numeric('default_driver_salary', { precision: 15, scale: 0 }).default('400000'),
  twoPointDeliveryBonus: numeric('two_point_delivery_bonus', { precision: 15, scale: 0 }).default('200000'),
  vehicleShiftDefault: numeric('vehicle_shift_default', { precision: 15, scale: 0 }).default('200000'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const tripCodeCounters = pgTable('trip_code_counters', {
  yearMonth: varchar('year_month', { length: 10 }).primaryKey(),
  counter: integer('counter').notNull(),
});

export const tripPhotos = pgTable('trip_photos', {
  id: serial('id').primaryKey(),
  tripId: integer('trip_id').references(() => trips.id).notNull(),
  type: tripPhotoTypeEnum('type').notNull(),
  storageKey: varchar('storage_key', { length: 255 }).notNull(),
  uploadedBy: integer('uploaded_by').references(() => users.id).notNull(),
  uploadedAt: timestamp('uploaded_at').defaultNow().notNull(),
  // Phase 2: optional link to a specific container row, so each container's
  // cont/seal photo(s) can be displayed under that container. ON DELETE SET
  // NULL so deleting a container row keeps the photo as trip-level evidence
  // (rather than destroying the file reference).
  tripContainerId: integer('trip_container_id').references(() => tripContainers.id, { onDelete: 'set null' }),
}, (table) => [
  // Phase 2: index the per-container photo lookups (listTripContainers joins
  // trip_photos by trip_container_id; container-scoped deletes filter by it).
  index('trip_photos_trip_container_id_idx').on(table.tripContainerId),
]);

export const routeDistanceCache = pgTable('route_distance_cache', {
  id: serial('id').primaryKey(),
  originCleaned: varchar('origin_cleaned', { length: 255 }).notNull(),
  destinationCleaned: varchar('destination_cleaned', { length: 255 }).notNull(),
  distanceKm: numeric('distance_km', { precision: 10, scale: 2 }).notNull(),
  durationSeconds: integer('duration_seconds'),
  polylinePath: text('polyline_path'),
  allRoutesJson: text('all_routes_json'),
  routeSummary: varchar('route_summary', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('route_distance_cache_uniq_idx').on(table.originCleaned, table.destinationCleaned),
]);

// ─── Notifications ──────────────────────────────────────────────────────────

export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  type: notificationTypeEnum('type').notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message').notNull(),
  relatedEntityType: varchar('related_entity_type', { length: 50 }),
  relatedEntityId: integer('related_entity_id'),
  isRead: boolean('is_read').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('notifications_user_unread_idx').on(table.userId, table.isRead),
  index('notifications_user_created_idx').on(table.userId, table.createdAt),
]);

// ─── Push subscriptions (Web Push) ──────────────────────────────────────────
// One row per (user, browser endpoint). Upserted on subscribe; auto-removed
// when the push service returns 410/404 (stale endpoint). device_type is
// sniffed client-side (ios/android/web) for reporting only.

export const pushSubscriptions = pgTable('push_subscriptions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  endpoint: varchar('endpoint', { length: 500 }).notNull(),
  keysP256dh: varchar('keys_p256dh', { length: 200 }).notNull(),
  keysAuth: varchar('keys_auth', { length: 100 }).notNull(),
  deviceType: varchar('device_type', { length: 20 }).default('web').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('push_sub_user_endpoint_idx').on(table.userId, table.endpoint),
  index('push_sub_user_idx').on(table.userId),
]);
