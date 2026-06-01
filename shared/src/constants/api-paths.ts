/**
 * Shared API path constants — single source of truth for frontend ↔ backend routing.
 * Frontend prepends `/api` via the ApiClient; backend mounts routers at these paths.
 */

// ─── Auth ──────────────────────────────────────────────────────────────────────
export const AUTH = {
  LOGIN: '/auth/login',
  ME: '/auth/me',
  USERS: '/auth/users',
  USER: (id: number) => `/auth/users/${id}`,
} as const;

// ─── Trips ─────────────────────────────────────────────────────────────────────
export const TRIPS = {
  LIST: '/trips',
  DETAIL: (id: number) => `/trips/${id}`,
  CREATE: '/trips',
  PRE_DEPARTURE: (id: number) => `/trips/${id}/pre-departure`,
  ACTUALS: (id: number) => `/trips/${id}/actuals`,
  DISPATCH: (id: number) => `/trips/${id}/dispatch`,
  LOCK: (id: number) => `/trips/${id}/lock`,
  CANCEL: (id: number) => `/trips/${id}/cancel`,
  REASSIGN: (id: number) => `/trips/${id}/reassign`,
  ADJUSTMENTS: (id: number) => `/trips/${id}/adjustments`,
  ADJUSTMENT: (id: number) => `/trips/${id}/adjustment`,
} as const;

// ─── Catalogs & Pricing ────────────────────────────────────────────────────────
export const CATALOGS = {
  BOOTSTRAP: '/catalogs/bootstrap',
  PRICING: '/pricing',
} as const;

// ─── Config entities (CRUD) ────────────────────────────────────────────────────
export const CONFIG = {
  CUSTOMERS: '/customers',
  CUSTOMER: (id: number) => `/customers/${id}`,
  TRUCKS: '/trucks',
  TRUCK: (id: number) => `/trucks/${id}`,
  TRAILERS: '/trailers',
  TRAILER: (id: number) => `/trailers/${id}`,
  ROUTES: '/routes',
  ROUTE: (id: number) => `/routes/${id}`,
  CARGO_TYPES: '/cargo-types',
  CARGO_TYPE: (id: number) => `/cargo-types/${id}`,
  PRICING_TABLES: '/pricing-tables',
  PRICING_TABLE: (id: number) => `/pricing-tables/${id}`,
  ROAD_ALLOWANCES: '/road-allowances',
  ROAD_ALLOWANCE: (id: number) => `/road-allowances/${id}`,
  PENALTY_REASONS: '/penalty-reasons',
  PENALTY_REASON: (id: number) => `/penalty-reasons/${id}`,
  MANAGEMENT_FEES: '/management-fees',
  MANAGEMENT_FEE: (id: number) => `/management-fees/${id}`,
  CAP_TABLE: '/cap-table',
  CAP_TABLE_ENTRY: (id: number) => `/cap-table/${id}`,
  DRIVERS: '/drivers',
  DRIVER: (id: number) => `/drivers/${id}`,
  FUEL_CONFIG: '/fuel-config',
  SALARY_PERIODS: '/salary-periods',
  SALARY_PERIOD_DEFAULT: '/salary-periods/default',
  SALARY_PERIOD_RESOLVE: '/salary-periods/resolve',
  SUPPLIERS: '/suppliers',
  SUPPLIER: (id: number) => `/suppliers/${id}`,
  EXPENSE_CATEGORIES: '/expense-categories',
  EXPENSE_CATEGORY: (id: number) => `/expense-categories/${id}`,
} as const;

// ─── Financial ──────────────────────────────────────────────────────────────────
export const FINANCIAL = {
  LEDGER: '/ledger',
  CUSTOMER_STATEMENT: (id: number) => `/ledger/customers/${id}/statement`,
  SUPPLIER_STATEMENT: (id: number) => `/ledger/suppliers/${id}/statement`,
  SUPPLIER_STATEMENT_EXPORT: (id: number) => `/ledger/suppliers/${id}/statement/export`,
  PAYMENTS_RECEIVE: '/payments/receive',
  PAYMENTS_VENDOR: '/payments/vendor',
  ADJUSTMENTS: '/adjustments',
  PENALTIES: '/penalties',
  PENALTY_CANCEL: (id: number) => `/penalties/${id}/cancel`,
  EXPENSES: '/expenses',
  EXPENSE: (id: number) => `/expenses/${id}`,
} as const;

// ─── Reports ────────────────────────────────────────────────────────────────────
export const REPORTS = {
  DASHBOARD: '/reports/dashboard',
  PNL: '/reports/pnl',
  RECEIVABLES_SUMMARY: '/reports/receivables-summary',
  RECEIVABLES_AGING: '/reports/receivables-aging',
  PAYABLES_SUMMARY: '/reports/payables-summary',
  RENEWALS: '/expenses/reports/renewals',
  DISTRIBUTE_PROFIT: '/reports/distribute-profit',
} as const;

// ─── Driver portal ─────────────────────────────────────────────────────────────
export const DRIVER = {
  TRIPS: '/driver/me/trips',
  TRIP_DETAIL: (id: number) => `/driver/me/trips/${id}`,
  EARNINGS: '/driver/me/earnings',
  PENALTIES: '/driver/me/penalties',
} as const;

// ─── Forwarder portal ───────────────────────────────────────────────────────────
export const FORWARDER = {
  TRIPS: '/forwarder/me/trips',
  TRIP_DETAIL: (id: number) => `/forwarder/me/trips/${id}`,
  CONTAINERS: (tripId: number) => `/forwarder/me/trips/${tripId}/containers`,
  EXPENSES: '/forwarder/me/expenses',
  EXPENSE: (id: number) => `/forwarder/me/expenses/${id}`,
  FORWARDER_EXPENSES: '/forwarder-expenses',
} as const;

// ─── Notifications ──────────────────────────────────────────────────────────────
export const NOTIFICATIONS = {
  LIST: '/notifications',
  UNREAD_COUNT: '/notifications/unread-count',
  MARK_READ: (id: number) => `/notifications/${id}/read`,
  MARK_ALL_READ: '/notifications/read-all',
} as const;

// ─── System ─────────────────────────────────────────────────────────────────────
export const SYSTEM = {
  UPLOAD: '/upload',
  PHOTOS: '/photos',
  AUDIT_LOGS: '/audit-logs',
  MAPS_AUTOCOMPLETE: '/maps/autocomplete',
  MAPS_DISTANCE: '/maps/distance',
  HEALTH: '/health',
} as const;
