import {
  pgTable, serial, varchar, text, integer, boolean, timestamp,
  jsonb, numeric, date, pgEnum, uniqueIndex, index,
} from 'drizzle-orm/pg-core';

// Enums
export const tripStatusEnum = pgEnum('trip_status', ['CREATED', 'IN_TRANSIT', 'COMPLETED', 'LOCKED', 'CANCELED']);
export const fuelModeEnum = pgEnum('fuel_mode', ['AUTO', 'FLAT_RATE']);
export const loadingTypeEnum = pgEnum('loading_type', ['HANG', 'VO']);
export const roleEnum = pgEnum('role', ['ADMIN', 'MANAGER', 'ACCOUNTANT', 'DRIVER']);
export const txnTypeEnum = pgEnum('txn_type', ['TRIP_REVENUE', 'PAYMENT_RECEIVED', 'PENALTY', 'MANAGEMENT_FEE', 'ADJUSTMENT', 'DRIVER_SALARY']);
export const trailerTypeEnum = pgEnum('trailer_type', ['20FT', '40FT']);
export const truckStatusEnum = pgEnum('truck_status', ['ACTIVE', 'MAINTENANCE', 'INACTIVE']);
export const driverStatusEnum = pgEnum('driver_status', ['ACTIVE', 'INACTIVE']);
export const trailerStatusEnum = pgEnum('trailer_status', ['ACTIVE', 'MAINTENANCE', 'INACTIVE']);
export const customerStatusEnum = pgEnum('customer_status', ['ACTIVE', 'LOCKED']);
export const tripPhotoTypeEnum = pgEnum('trip_photo_type', ['CONTAINER', 'SEAL', 'OTHER']);


// ─── Config tables ───────────────────────────────────────────────────────────

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: varchar('username', { length: 100 }).unique(),
  email: varchar('email', { length: 255 }).unique(),
  phone: varchar('phone', { length: 20 }).unique(),
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
  status: truckStatusEnum('status').default('ACTIVE'),
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
  status: driverStatusEnum('status').default('ACTIVE'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});

export const customers = pgTable('customers', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  taxCode: varchar('tax_code', { length: 20 }),
  contactPerson: varchar('contact_person', { length: 255 }),
  phone: varchar('phone', { length: 20 }),
  contactInfo: text('contact_info'),
  creditLimit: numeric('credit_limit', { precision: 15, scale: 0 }),
  status: customerStatusEnum('status').default('ACTIVE'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});

export const trailers = pgTable('trailers', {
  id: serial('id').primaryKey(),
  licensePlate: varchar('license_plate', { length: 20 }).unique().notNull(),
  type: trailerTypeEnum('type').notNull(),
  status: trailerStatusEnum('status').default('ACTIVE'),
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

export const penaltyReasons = pgTable('penalty_reasons', {
  id: serial('id').primaryKey(),
  reasonText: text('reason_text').notNull(),
  defaultAmount: numeric('default_amount', { precision: 15, scale: 0 }).notNull(),
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
  truckId: integer('truck_id').references(() => trucks.id).notNull(),
  driverId: integer('driver_id').references(() => drivers.id).notNull(),
  routeId: integer('route_id').references(() => routes.id).notNull(),
  trailerId: integer('trailer_id').references(() => trailers.id).notNull(),
  cargoTypeId: integer('cargo_type_id').references(() => cargoTypes.id).notNull(),
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
  roadAllowanceBaseApplied: numeric('road_allowance_base_applied', { precision: 15, scale: 0 }),
  fuelLoadedNormApplied: numeric('fuel_loaded_norm_applied', { precision: 6, scale: 2 }),
  fuelEmptyNormApplied: numeric('fuel_empty_norm_applied', { precision: 6, scale: 2 }),
  fuelFixedAllowanceApplied: numeric('fuel_fixed_allowance_applied', { precision: 10, scale: 2 }),
  tollPerStationApplied: numeric('toll_per_station_applied', { precision: 15, scale: 0 }),
  returnCargoBonusApplied: numeric('return_cargo_bonus_applied', { precision: 15, scale: 0 }),
  // Derived Fields
  fuelLiters: numeric('fuel_liters', { precision: 10, scale: 2 }),
  totalFuelCost: numeric('total_fuel_cost', { precision: 15, scale: 0 }),
  totalRoadAllowance: numeric('total_road_allowance', { precision: 15, scale: 0 }),
  totalCost: numeric('total_cost', { precision: 15, scale: 0 }),
  revenue: numeric('revenue', { precision: 15, scale: 0 }),
  grossProfit: numeric('gross_profit', { precision: 15, scale: 0 }),
  revenueOriginal: numeric('revenue_original', { precision: 15, scale: 0 }),
  revenueOverriddenBy: integer('revenue_overridden_by'),
  revenueOverriddenAt: timestamp('revenue_overridden_at'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});

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
});

export const penalties = pgTable('penalties', {
  id: serial('id').primaryKey(),
  driverId: integer('driver_id').references(() => drivers.id).notNull(),
  tripId: integer('trip_id').references(() => trips.id),
  reasonId: integer('reason_id').references(() => penaltyReasons.id),
  customReason: text('custom_reason'),
  amount: numeric('amount', { precision: 15, scale: 0 }).notNull(),
  date: date('date').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
}, (table) => [
  index('penalties_date_idx').on(table.date),
]);

export const capTableHistory = pgTable('cap_table_history', {
  id: serial('id').primaryKey(),
  partnerName: varchar('partner_name', { length: 255 }).notNull(),
  percentage: numeric('percentage', { precision: 5, scale: 2 }).notNull(),
  effectiveDate: date('effective_date').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const distributions = pgTable('distributions', {
  id: serial('id').primaryKey(),
  quarter: integer('quarter').notNull(),
  year: integer('year').notNull(),
  partnerName: varchar('partner_name', { length: 255 }).notNull(),
  amount: numeric('amount', { precision: 15, scale: 0 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const managementFees = pgTable('management_fees', {
  id: serial('id').primaryKey(),
  month: integer('month').notNull(),
  year: integer('year').notNull(),
  amount: numeric('amount', { precision: 15, scale: 0 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ─── Audit ───────────────────────────────────────────────────────────────────

export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  userId: integer('user_id'),
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
  tollPerStation: numeric('toll_per_station', { precision: 15, scale: 0 }).notNull().default('55000'),
  returnCargoBonus: numeric('return_cargo_bonus', { precision: 15, scale: 0 }).notNull().default('300000'),
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
});

