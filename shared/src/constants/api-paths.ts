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
  COPY: (id: number) => `/trips/${id}/copy`,
  BULK_FIGURES: '/trips/bulk-figures',
  PRE_DEPARTURE: (id: number) => `/trips/${id}/pre-departure`,
  ACTUALS: (id: number) => `/trips/${id}/actuals`,
  DISPATCH: (id: number) => `/trips/${id}/dispatch`,
  LOCK: (id: number) => `/trips/${id}/lock`,
  UNLOCK: (id: number) => `/trips/${id}/unlock`,
  CANCEL: (id: number) => `/trips/${id}/cancel`,
  REASSIGN: (id: number) => `/trips/${id}/reassign`,
  ADJUSTMENTS: (id: number) => `/trips/${id}/adjustments`,
  ADJUSTMENT: (id: number) => `/trips/${id}/adjustment`,
  DEPARTURE_DATE: (id: number) => `/trips/${id}/departure-date`,
  CONTAINERS: (id: number) => `/trips/${id}/containers`,
  INSTRUCTIONS: (id: number) => `/trips/${id}/instructions`,
  EXPENSES: (id: number) => `/trips/${id}/expenses`,
  EXPENSE: (tripId: number, eid: number) => `/trips/${tripId}/expenses/${eid}`,
  EXPENSE_APPROVE: (tripId: number, eid: number) => `/trips/${tripId}/expenses/${eid}/approve`,
  EXPENSE_REJECT: (tripId: number, eid: number) => `/trips/${tripId}/expenses/${eid}/reject`,
  // NEPO-61 — attach/detach a trip to a lô biển (shipment link).
  SHIPMENT: (id: number) => `/trips/${id}/shipment`,
} as const;

// ─── Shipments / Lô hàng (NEPO-61) ──────────────────────────────────────────
// Sea-shipment master (lô) + its documents (chứng từ) and costs (chi phí).
// Mounted under casbinAuthz('shipments') + requireRoles(SHIPMENT_WRITE_ROLES).
export const SHIPMENTS = {
  LIST: '/shipments',
  DETAIL: (id: number) => `/shipments/${id}`,
  DOCUMENTS: (id: number) => `/shipments/${id}/documents`,
  DOCUMENT: (id: number, docId: number) => `/shipments/${id}/documents/${docId}`,
  DOCUMENT_FILE: (id: number, docId: number) => `/shipments/${id}/documents/${docId}/file`,
  COSTS: (id: number) => `/shipments/${id}/costs`,
  COST: (id: number, costId: number) => `/shipments/${id}/costs/${costId}`,
  COSTS_REGISTER: (id: number) => `/shipments/${id}/costs/register`,
} as const;

// ─── Tracking (live GPS vehicle positions) ────────────────────────────────────
// Live fleet positions joined to active IN_TRANSIT trips. Mounted on the trips
// router so it inherits trips-read RBAC; cached server-side via Redis and the
// Bách Khoa provider credentials never reach the client.
export const TRACKING = {
  LIVE_FLEET: '/trips/live-fleet',
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
  COMPANY_INFO: '/company-info',
  ROAD_CONFIG: '/road-config',
  SALARY_PERIODS: '/salary-periods',
  SALARY_PERIOD_DEFAULT: '/salary-periods/default',
  SALARY_PERIOD_RESOLVE: '/salary-periods/resolve',
  SUPPLIERS: '/suppliers',
  SUPPLIER: (id: number) => `/suppliers/${id}`,
  EXPENSE_CATEGORIES: '/expense-categories',
  EXPENSE_CATEGORY: (id: number) => `/expense-categories/${id}`,
  PORTS: '/ports',
  TIRE_POSITIONS: '/tire-positions',
  TIRE_POSITION: (id: number) => `/tire-positions/${id}`,
  CONTAINER_TYPES: '/container-types',
  SEAL_TYPES: '/seal-types',
  FUEL_PRICE_HISTORY: '/fuel-price-history',
  DEBIT_NOTE_TEMPLATES: '/debit-note-templates',
  DEBIT_NOTE_TEMPLATE: (id: number) => `/debit-note-templates/${id}`,
} as const;

// ─── Fleet / Tires (N1) ──────────────────────────────────────────────────────
// Tire CRUD + lifecycle (install/remove/dispose). Mounted under the config
// catch-all so existing config Casbin gating applies; writes additionally
// requireRoles MANAGER/ACCOUNTANT/ADMIN.
export const TIRES = {
  LIST: '/fleet/tires',
  IMPORT: '/fleet/tires/import',
  DETAIL: (id: number) => `/fleet/tires/${id}`,
  INSTALL: (id: number) => `/fleet/tires/${id}/install`,
  REMOVE: (id: number) => `/fleet/tires/${id}/remove`,
  DISPOSE: (id: number) => `/fleet/tires/${id}/dispose`,
  TRANSFER: (id: number) => `/fleet/tires/${id}/transfer`,
} as const;

// ─── Fleet / Tyre board (NEPO-49) ────────────────────────────────────────────
// Bảng theo dõi lốp per truck: 22 numbered slots, inline serial edits, and
// the "Thay lốp" replacement flow with history. Mounted like the tire
// lifecycle router (config Casbin gate + MANAGER/ACCOUNTANT/ADMIN writes).
export const TYRE_BOARD = {
  GET: (truckId: number) => `/fleet/tyre-board/${truckId}`,
  CHANGES: (truckId: number) => `/fleet/tyre-board/${truckId}/changes`,
  SET_SERIAL: (truckId: number, position: number) => `/fleet/tyre-board/${truckId}/${position}`,
  CHANGE: (truckId: number, position: number) => `/fleet/tyre-board/${truckId}/${position}/change`,
} as const;

export const VEHICLE_SCHEDULES = {
  LIST: '/vehicle-schedules',
  DETAIL: (id: number) => `/vehicle-schedules/${id}`,
  CREATE: '/vehicle-schedules',
  UPDATE: (id: number) => `/vehicle-schedules/${id}`,
  COMPLETE: (id: number) => `/vehicle-schedules/${id}/complete`,
  CANCEL: (id: number) => `/vehicle-schedules/${id}/cancel`,
} as const;

// ─── Financial ──────────────────────────────────────────────────────────────────
export const FINANCIAL = {
  LEDGER: '/ledger',
  CUSTOMER_STATEMENT: (id: number) => `/ledger/customers/${id}/statement`,
  SUPPLIER_STATEMENT: (id: number) => `/ledger/suppliers/${id}/statement`,
  CARRIER_PAYABLE_STATEMENT: (id: number) => `/ledger/carriers/${id}/statement`,
  SUPPLIER_STATEMENT_EXPORT: (id: number) => `/ledger/suppliers/${id}/statement/export`,
  PAYMENTS_RECEIVE: '/payments/receive',
  PAYMENTS_VENDOR: '/payments/vendor',
  PAYMENTS_CARRIER: '/payments/carrier',
  ADJUSTMENTS: '/adjustments',
  PENALTIES: '/penalties',
  PENALTY_CANCEL: (id: number) => `/penalties/${id}/cancel`,
  EXPENSES: '/expenses',
  EXPENSE: (id: number) => `/expenses/${id}`,
  ADVANCE_REQUESTS: '/advance-requests',
  ADVANCE_REQUEST_APPROVE: (id: number) => `/advance-requests/${id}/approve`,
  ADVANCE_REQUEST_REJECT: (id: number) => `/advance-requests/${id}/reject`,
  ADVANCE_REQUEST_RESTORE: (id: number) => `/advance-requests/${id}/restore`,
  ADVANCE_SETTLEMENTS: '/advance-settlements',
  ADVANCE_SETTLEMENT_CHECK: (id: number) => `/advance-settlements/${id}/check`,
  ADVANCE_SETTLEMENT_APPROVE: (id: number) => `/advance-settlements/${id}/approve`,
  ADVANCE_SETTLEMENT_REJECT: (id: number) => `/advance-settlements/${id}/reject`,
  ADVANCE_SETTLEMENT_DETAIL: (id: number) => `/advance-settlements/${id}`,
  ADVANCE_SETTLEMENT_EXPORT: (id: number, format: string) => `/advance-settlements/${id}/export?format=${format}`,
  ADVANCE_BALANCES: '/advance-balances',
  DASHBOARD_APPROVAL_QUEUE: '/dashboard/approval-queue',
  LEDGER_BALANCES: '/ledger/balances',
  COMMISSIONS: '/commissions',
  DRIVER_PAYOUT: (driverId: number) => `/drivers/${driverId}/payouts`,
  BILLING_DOCUMENTS: '/finance/billing-documents',
  BILLING_DOCUMENT_GENERATE: '/finance/billing-documents/generate',
  BILLING_DOCUMENT: (id: number) => `/finance/billing-documents/${id}`,
  BILLING_DOCUMENT_EXPORT: (id: number) => `/finance/billing-documents/${id}/export`,
  // NEPO-62 — per-lot debit note chain: phát hành + bổ sung -BS01.
  BILLING_DOCUMENT_ISSUE: (id: number) => `/finance/billing-documents/${id}/issue`,
  BILLING_DOCUMENT_SUPPLEMENT: (id: number) => `/finance/billing-documents/${id}/supplement`,
  // NEPO-62 — Bảng Tổng hợp Công nợ Tháng (SOA) theo khách hàng (ledger mount).
  CUSTOMER_SOA: '/ledger/customers/soa',
  CUSTOMER_SOA_EXPORT: '/ledger/customers/soa/export',
} as const;

// ─── Reports ────────────────────────────────────────────────────────────────────
export const REPORTS = {
  DASHBOARD: '/reports/dashboard',
  PNL: '/reports/pnl',
  SHIPMENT_PROFIT: '/reports/shipment-profit',
  RECEIVABLES_SUMMARY: '/reports/receivables-summary',
  RECEIVABLES_AGING: '/reports/receivables-aging',
  PAYABLES_SUMMARY: '/reports/payables-summary',
  RENEWALS: '/expenses/reports/renewals',
  DISTRIBUTE_PROFIT: '/reports/distribute-profit',
  DISTRIBUTION_HISTORY: '/reports/distribution-history',
  DISTRIBUTE_PROFIT_PREVIEW: '/reports/distribute-profit/preview',
} as const;

// ─── Driver portal ─────────────────────────────────────────────────────────────
export const DRIVER = {
  TRIPS: '/driver/me/trips',
  TRIP_DETAIL: (id: number) => `/driver/me/trips/${id}`,
  EARNINGS: '/driver/me/earnings',
  PENALTIES: '/driver/me/penalties',
  VEHICLE_ALERTS: '/driver/me/vehicle-alerts',
} as const;

// ─── Forwarder portal ───────────────────────────────────────────────────────────
export const FORWARDER = {
  TRIPS: '/forwarder/me/trips',
  TRIP_DETAIL: (id: number) => `/forwarder/me/trips/${id}`,
  CONTAINERS: (tripId: number) => `/forwarder/me/trips/${tripId}/containers`,
  EXPENSES: '/forwarder/me/expenses',
  EXPENSE: (id: number) => `/forwarder/me/expenses/${id}`,
  FORWARDER_EXPENSES: '/forwarder-expenses',
  ADVANCE_REQUESTS: '/forwarder/me/advance-requests',
  ADVANCE_REQUEST: (id: number) => `/forwarder/me/advance-requests/${id}`,
  ADVANCE_SETTLEMENTS: '/forwarder/me/advance-settlements',
  ADVANCE_SETTLEMENT_PREVIEW: '/forwarder/me/advance-settlements/preview',
  ADVANCE_SETTLEMENT_DETAIL: (id: number) => `/forwarder/me/advance-settlements/${id}`,
  ADVANCE_BALANCE: '/forwarder/me/advance-balance',
  UNLINKED_EXPENSES: '/forwarder/me/unlinked-expenses',
  SUPPLIERS: '/forwarder/me/suppliers',
} as const;

// ─── Notifications ──────────────────────────────────────────────────────────────
export const NOTIFICATIONS = {
  LIST: '/notifications',
  UNREAD_COUNT: '/notifications/unread-count',
  MARK_READ: (id: number) => `/notifications/${id}/read`,
  MARK_ALL_READ: '/notifications/read-all',
  VAPID_KEY: '/notifications/vapid-key',
  SUBSCRIBE: '/notifications/subscribe',
  UNSUBSCRIBE: '/notifications/unsubscribe',
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

// ─── Salary ─────────────────────────────────────────────────────────────────────
export const SALARY = {
  LIST: '/salary',
  DRIVER_MONTH: (driverId: number, year: number, month: number) => `/salary/${driverId}/${year}/${month}`,
  WORK_DAYS: (driverId: number, year: number, month: number) => `/salary/${driverId}/${year}/${month}/workdays`,
  CONFIRM: (driverId: number, year: number, month: number) => `/salary/${driverId}/${year}/${month}/confirm`,
  UNCONFIRM: (driverId: number, year: number, month: number) => `/salary/${driverId}/${year}/${month}/unconfirm`,
} as const;
