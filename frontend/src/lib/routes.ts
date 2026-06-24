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
  fleetTrailerTires: (trailerId: number | string) => `/fleet/trailers/${trailerId}/tires`,
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
  adminAdvanceSettlements: '/admin/advance-settlements',
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
  configTruckOwners: (truckId: number | string) => `/config/trucks/${truckId}/owners`,
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

type TitleRule = {
  test: (pathname: string) => boolean;
  title: string | ((pathname: string) => string);
};

const titleRules: TitleRule[] = [
  { test: p => p === routes.dashboard, title: 'Tổng quan' },
  { test: p => p.startsWith(routes.dispatch), title: 'Điều vận & Phân xe' },
  { test: p => p.startsWith(routes.fleet), title: 'Đội xe' },
  { test: p => /^\/trips\/(\d+)(?:\/edit)?$/.test(p), title: p => p.endsWith('/edit') ? 'Sửa lệnh vận chuyển' : 'Chi tiết lệnh vận chuyển' },
  { test: p => p === routes.tripNew, title: 'Tạo lệnh vận chuyển' },
  { test: p => p.startsWith(routes.trips), title: 'Lệnh vận chuyển' },
  { test: p => p === routes.finance, title: 'Báo cáo lãi lỗ' },
  { test: p => p.startsWith(routes.profit), title: 'Phân chia lợi nhuận' },
  { test: p => p.startsWith(routes.debt), title: 'Công nợ phải thu' },
  { test: p => p.startsWith(routes.payables), title: 'Công nợ phải trả' },
  { test: p => p.startsWith(routes.expenseNew), title: 'Ghi nhận chi phí' },
  { test: p => /^\/expenses\/\d+\/edit$/.test(p), title: 'Sửa chi phí' },
  { test: p => p.startsWith(routes.expenses), title: 'Chi phí phát sinh' },
  { test: p => p.startsWith(routes.suppliers), title: 'Nhà cung cấp' },
  { test: p => p === routes.penalties || p === routes.myPenalties, title: 'Kỷ luật' },
  { test: p => p.startsWith(routes.customers), title: 'Khách hàng' },
  { test: p => p.startsWith(routes.configRoutes) || p.startsWith(routes.legacy.routes), title: 'Tuyến đường' },
  { test: p => p === routes.config, title: 'Cấu hình hệ thống' },
  { test: p => p.startsWith(routes.config), title: 'Cấu hình' },
  { test: p => p === routes.users, title: 'Người dùng' },
  { test: p => p === routes.auditLogs, title: 'Nhật ký người dùng' },
  { test: p => p.startsWith(routes.myTrips), title: 'Hành trình' },
  { test: p => p.startsWith(routes.myEarnings), title: 'Thu nhập' },
  { test: p => p.startsWith(routes.myForwarderTrips), title: 'Chuyến đi' },
  { test: p => p.startsWith(routes.myAdvances), title: 'Tạm ứng' },
  { test: p => /^\/my-settlements\/\d+$/.test(p), title: 'Chi tiết phiếu thanh toán' },
  { test: p => p.startsWith(routes.mySettlements), title: 'Phiếu thanh toán' },
  { test: p => p.startsWith(routes.advances), title: 'Quản lý tạm ứng' },
  { test: p => p.startsWith(routes.adminAdvanceSettlements), title: 'Duyệt hoàn ứng' },
  { test: p => p.startsWith(routes.salary), title: 'Lương & Chấm công' },
];

export function titleForPath(pathname: string): string {
  const match = titleRules.find(rule => rule.test(pathname));
  if (!match) return 'NEPO';
  return typeof match.title === 'function' ? match.title(pathname) : match.title;
}

/**
 * Build an absolute URL (https://host/path) from a SPA path, using the
 * browser's own origin. Used by the share-link feature so a copied URL works
 * on whichever production domain the sharer is on (nepo vs vantai) without
 * any backend/env config.
 *
 * Pure CSR (Vite SPA) — `window` is always defined at call time. Call from
 * event handlers / component bodies, not at module top-level.
 */
export function absoluteUrl(path: string): string {
  return `${window.location.origin}${path}`;
}
