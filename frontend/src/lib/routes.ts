/**
 * Single source of truth for every URL the SPA navigates to. Two reasons:
 *
 *   1. The original 50+ `<Route path="/...">` declarations in `App.tsx` and
 *      ~120 `navigate('/...')` / `<Link to="/...">` call sites had no
 *      authoritative list. A rename like `/audit-logs` → `/admin/audit`
 *      required grep + manual replacement + a redirect alias for the old
 *      path. Now both the redirect aliases and the live routes live here.
 *
 *   2. Some paths need parameters (`/trips/:id`, `/trips/:id/edit`,
 *      `/debt/:id`). Hard-coding the template in JSX loses type safety —
 *      `routes.tripDetail(undefined)` is now a compile error instead of a
 *      silent `navigate('/trips/undefined')`.
 *
 * Convention:
 *   - Static paths are plain string constants.
 *   - Parameterised paths are functions returning a string; the function
 *     signature requires the param so callers can't forget it.
 *   - The `legacy` object holds the path aliases we accept-and-redirect
 *     for backwards compatibility.
 *
 * Migration is incremental — old call sites with raw string literals
 * continue to work; new code should use the constants.
 */
export const routes = {
  /* ── Top-level admin / manager pages ────────────────────────────────── */

  dashboard: '/dashboard',
  dispatch: '/dispatch',
  fleet: '/fleet',
  fleetTires: (truckId: number | string) => `/fleet/${truckId}/tires`,
  trips: '/trips',
  tripNew: '/trips/new',
  tripDetail: (id: number | string) => `/trips/${id}`,
  tripEdit: (id: number | string) => `/trips/${id}/edit`,
  finance: '/finance',
  profit: '/profit',
  debt: '/debt',
  debtDetail: (id: number | string) => `/debt/${id}`,
  penalties: '/penalties',
  advances: '/advances',
  salary: '/salary',
  users: '/users',
  auditLogs: '/audit-logs',
  customers: '/customers',
  suppliers: '/suppliers',
  expenses: '/expenses',
  expenseNew: '/expenses/new',
  expenseEdit: (id: number | string) => `/expenses/${id}/edit`,
  payables: '/payables',
  payableDetail: (id: number | string) => `/payables/${id}`,
  login: '/login',

  /* ── Config (catalog admin) ─────────────────────────────────────────── */

  config: '/config',
  configTrailers: '/config/trailers',
  configTrucks: '/config/trucks',
  configRoutes: '/config/routes',
  configCargoTypes: '/config/cargo-types',
  configPricingTables: '/config/pricing-tables',
  configRoadAllowances: '/config/road-allowances',
  configPenaltyReasons: '/config/penalty-reasons',
  configFuel: '/config/fuel',
  configTripExpense: '/config/trip-expense',
  configCapTable: '/config/cap-table',
  configCustomers: '/config/customers',
  configManagementFees: '/config/management-fees',
  configSalaryPeriods: '/config/salary-periods',
  configExpenseCategories: '/config/expense-categories',
  configContainerTypes: '/config/container-types',
  configPorts: '/config/ports',
  configForwarderExpenseTypes: '/config/forwarder-expense-types',

  /* ── Driver portal ──────────────────────────────────────────────────── */

  myTrips: '/my-trips',
  myTripDetail: (id: number | string) => `/my-trips/${id}`,
  myEarnings: '/my-earnings',
  myPenalties: '/my-penalties',

  /* ── Forwarder portal ──────────────────────────────────────────────── */

  myForwarderTrips: '/my-forwarder-trips',
  myForwarderTripDetail: (id: number | string) => `/my-forwarder-trips/${id}`,
  myAdvances: '/my-advances',
  mySettlements: '/my-settlements',
  mySettlementNew: '/my-settlements/new',
  mySettlementDetail: (id: number | string) => `/my-settlements/${id}`,

  /* ── Legacy paths that the router redirects from (kept for old links) */

  legacy: {
    routes: '/routes',           // → /config/routes
    trucks: '/trucks',            // → /fleet
    drivers: '/drivers',          // → /fleet
    trailers: '/trailers',        // → /config/trailers
    auditLog: '/audit-log',       // → /audit-logs
    adminAuditLogs: '/admin/audit-logs', // → /audit-logs
    adminAuditLog: '/admin/audit-log',   // → /audit-logs
  },
} as const;

/** Resolve a "home" route for a given role — used after login + on 404. */
export function homeForRole(role: 'DRIVER' | 'FORWARDER' | string): string {
  if (role === 'DRIVER') return routes.myTrips;
  if (role === 'FORWARDER') return routes.myForwarderTrips;
  return routes.dashboard;
}
