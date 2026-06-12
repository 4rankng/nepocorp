/**
 * Centralized TanStack Query key factory.
 *
 * Why this exists:
 *   1. The codebase had 170+ raw `queryKey: ['foo', ...]` strings scattered
 *      across 40 files. Adding a filter required grepping for the key.
 *   2. `useCRUD` invalidated `['catalogs']` but mutations elsewhere
 *      invalidated `['trucks-drivers']` — the two caches drifted and pages
 *      saw stale data.
 *   3. Two deprecated/duplicate keys (`['fleet']` and `['trucks-drivers']`)
 *      for the same data caused double-fetches.
 *
 * Convention:
 *   - Each domain gets an object with `all` (used for broad invalidation),
 *     `lists()` (paginated/filtered), and `detail(id)` accessors.
 *   - Hierarchical keys so `invalidateQueries({ queryKey: qk.trips.all })`
 *     matches every trips-prefixed query.
 *   - Frozen `as const` tuples so the keys are type-narrowed and
 *     serializable for DevTools.
 *
 * The `as` casts are deliberate: the factory returns a tuple of
 * `string | number | boolean | undefined` which TanStack's `queryKey` type
 * happily widens.
 */

export const qk = {
  auth: {
    me: ['auth', 'me'],
  },

  /* ── Catalog (the big bootstrap + individual lookup tables) ─────────── */

  catalogs: {
    /** The single bootstrap blob — used by trip form, dispatch, etc. */
    all: ['catalogs'],
    trucksDrivers: ['trucks-drivers'],
    routesDropdown: ['routes-dropdown'],
    roadAllowances: ['road-allowances'],
    roadConfig: ['road-config'],
    fuelConfig: ['fuel-config'],
    salaryPeriod: (month: number, year: number) =>
      ['salary-period', month, year] as const,
    suppliers: (page?: number, search?: string) =>
      ['suppliers', page, search] as const,
    expenseCategories: (page?: number, search?: string) =>
      ['expense-categories', page, search] as const,
    customers: (page: number, search: string) =>
      ['customers', page, search] as const,
    allCustomers: ['all-customers'],
    users: ['users'],
    ports: ['ports'],
    portsCatalog: ['ports-catalog'],
    containerTypes: ['container-types'],
    trailers: ['trailers'],
    pricingTables: ['pricing-tables'],
    allSuppliers: ['all-suppliers'],
    allExpenseCategories: ['all-expense-categories'],
    capTable: ['cap-table'],
  },

  /** All catalog-shaped keys, for one-shot invalidation after a config CRUD. */
  allCatalogKeys: [
    'catalogs',
    'trucks-drivers',
    'routes-dropdown',
    'road-allowances',
    'road-config',
    'fuel-config',
    'cap-table',
    'suppliers',
    'expense-categories',
    'customers',
    'all-customers',
    'users',
    'ports',
    'ports-catalog',
    'container-types',
    'trailers',
    'pricing-tables',
    'all-suppliers',
    'all-expense-categories',
    'salary-period',
  ] as const,

  /* ── Trips ──────────────────────────────────────────────────────────── */

  trips: {
    all: ['trips'],
    detail: (id: number | string | undefined) => ['trip', id] as const,
    adjustments: (id: number) => ['trip-adjustments', id] as const,
    summary: (dateFrom: string | undefined, dateTo: string | undefined) =>
      ['trips-summary', dateFrom, dateTo] as const,
    /** List view — invalidates any paged/filtered list. */
    list: (...args: unknown[]) => ['trips', ...args] as const,
    monthly: (year: number, month: number, salaryStart: string | undefined) =>
      ['trips', 'monthly', year, month, salaryStart] as const,
    created: ['trips', 'created'],
    costs: (month: number, year: number, salaryStart: string | undefined) =>
      ['trip-costs', month, year, salaryStart] as const,
    dispatch: ['dispatch'],
    badgeCounts: ['badge-counts'],
    suggestedPrice: (customerId: number, routeId: number, date?: string) =>
      ['suggested-price', customerId, routeId, date] as const,
    tripDetail: (id: number) => ['trip-detail', String(id)] as const,
  },

  /* ── Driver portal ──────────────────────────────────────────────────── */

  driver: {
    trips: ['driver-trips'],
    earnings: (month: number, year: number) =>
      ['driver-earnings', month, year] as const,
    penalties: (params: { dateFrom: string; dateTo: string } | undefined) =>
      ['driver-penalties', params] as const,
  },

  /* ── Forwarder portal ──────────────────────────────────────────────── */

  forwarder: {
    trips: (status?: string) => ['forwarder-trips', status] as const,
    tripDetail: (id: number) => ['forwarder-trip-detail', id] as const,
    suppliers: ['forwarder-suppliers'],
    advanceRequests: (status?: string) =>
      ['forwarder-advance-requests', status] as const,
    settlements: ['forwarder-settlements'],
    settlementDetail: (id: number) =>
      ['forwarder-settlement-detail', id] as const,
    unlinkedExpenses: ['forwarder-unlinked-expenses'],
  },

  /* ── Admin forwarder views ─────────────────────────────────────────── */

  adminForwarder: {
    advanceRequests: (filters?: { status?: string }) =>
      ['admin-advance-requests', filters] as const,
    settlements: (filters?: { status?: string }) =>
      ['admin-settlements', filters] as const,
    settlementDetail: (id: number) =>
      ['admin-settlement-detail', id] as const,
  },

  /* ── Dashboard / reports ────────────────────────────────────────────── */

  dashboard: {
    main: ['dashboard'],
    pnl: (month: number, year: number) => ['pnl', month, year] as const,
    yearlyPnl: (year: number) => ['yearly-pnl', year] as const,
    renewalReminders: ['renewal-reminders'],
    distributionHistory: ['distribution-history'],
    receivablesSummary: ['receivables-summary'],
    auditRecent: ['dashboard-audit-recent'],
    approvalQueue: (role: string | undefined, userId: number | undefined) =>
      ['approval-queue', role, userId] as const,
  },

  /* ── Financial ──────────────────────────────────────────────────────── */

  financial: {
    customerAging: (search: string | undefined) =>
      ['customer-aging', search ?? ''] as const,
    customerStatement: (id: string | number | undefined) =>
      ['customer-statement', id] as const,
    customerLedgerEntries: ['customer-ledger-entries'],
    payablesSummary: ['payables-summary'],
    supplierStatement: (supplierId: number | undefined) =>
      ['supplier-statement', supplierId] as const,
    expenses: (filters: unknown) => ['expenses', filters] as const,
    debtOffsets: (customerId: number | string) =>
      ['debt-offsets', customerId] as const,
    debt: ['debt'],
  },

  /* ── Penalties ──────────────────────────────────────────────────────── */

  penalties: {
    list: ['penalties'],
    catalogs: ['penalty-catalogs'],
    stats: ['/penalty-reasons/stats'],
  },

  /* ── Salary ─────────────────────────────────────────────────────────── */

  salary: {
    list: (year: number, month: number) =>
      ['salary-list', year, month] as const,
    driverSalary: (driverId: number | null, year: number, month: number) =>
      ['driver-salary', driverId, year, month] as const,
    driverWorkdays: (driverId: number | null, year: number, month: number) =>
      ['driver-workdays', driverId, year, month] as const,
    periodDefault: ['salary-period-default'],
    periodResolve: (year: number, month: number) =>
      ['salary-period-resolve', year, month] as const,
  },

  /* ── Notifications ──────────────────────────────────────────────────── */

  notifications: {
    unreadCount: ['notifications', 'unread-count'],
    list: (page = 1, limit = 20) =>
      ['notifications', 'list', page, limit] as const,
    all: ['notifications'],
  },

  /* ── Audit logs ─────────────────────────────────────────────────────── */

  auditLogs: {
    list: (pageSize: number, filter: unknown, search: string) =>
      ['audit-logs', pageSize, filter, search] as const,
  },

  /* ── Trip-form catalogs (loaded on demand by the create/edit form) ── */

  tripForm: {
    expenseFormCatalogs: ['expense-form-catalogs'],
    expense: (id: number | string) => ['expense', id] as const,
    tripContainers: (tripId: number) => ['trip-containers', tripId] as const,
    tripExpenses: (tripId: number) => ['trip-expenses', tripId] as const,
    customersConfig: (search: string) =>
      ['customers-config', search] as const,
    trucksForDrivers: ['trucks-for-drivers-config'],
    routesConfig: (search: string) => ['routes-config', search] as const,
    dualEntities: ['dual-entities'],
  },

  /* ── Generic config-page counts (used by ConfigPage sidebar badges) ─ */

  configCounts: {
    base: 'cfg-count',
    penaltyReasons: ['cfg-count', 'penalty-reasons'],
    roadAllowances: ['cfg-count', 'road-allowances'],
    drivers: ['cfg-count', 'drivers'],
    capTable: ['cfg-count', 'cap-table'],
    customers: ['cfg-count', 'customers'],
    routes: ['cfg-count', 'routes'],
    trucks: ['cfg-count', 'trucks'],
    trailers: ['cfg-count', 'trailers'],
    cargoTypes: ['cfg-count', 'cargo-types'],
    pricingTables: ['cfg-count', 'pricing-tables'],
    managementFees: ['cfg-count', 'management-fees'],
    salaryDefault: ['cfg-count', 'salary-default'],
    expenseCategories: ['cfg-count', 'expense-categories'],
    fuelConfig: ['cfg-count', 'fuel-config'],
    containerTypes: ['cfg-count', 'container-types'],
    ports: ['cfg-count', 'ports'],
    forwarderExpenseTypes: ['cfg-count', 'forwarder-expense-types'],
  },

  /* ── Generic CRUD page (CrudTable uses [endpoint] as key) ──────────── */

  crud: {
    entity: (endpoint: string) => [endpoint] as const,
  },
} as const;

// ── Compile-time guard: allCatalogKeys must cover every qk.catalogs prefix ────
// If this errors, a catalog key was added to qk.catalogs but not allCatalogKeys.
type _CatVal = typeof qk.catalogs;
type _ExtractPrefix<T> = T extends readonly [infer F, ...any[]] ? F
  : T extends (...a: any[]) => readonly [infer F, ...any[]] ? F
  : never;
type _CatalogPrefixes = _ExtractPrefix<_CatVal[keyof _CatVal]>;
// Compile-time guard: allCatalogKeys must cover every qk.catalogs prefix.
// The runtime `void` is required so TypeScript actually evaluates the
// conditional type instead of erasing it as unused.
type _AssertCatalogs = _CatalogPrefixes extends typeof qk.allCatalogKeys[number] ? true : never;
const _catalogTypeGuard: _AssertCatalogs = true;
void _catalogTypeGuard;

/**
 * Invalidate every cache key that depends on catalog data. Used by the
 * generic `useCRUD` / CrudTable after create/update/delete so dependent
 * pages (dispatch, trip form, search dropdowns) all refresh in one shot.
 */
export function invalidateAllCatalogs(qc: {
  invalidateQueries: (opts: { queryKey: readonly unknown[] }) => Promise<void>;
}): Promise<void[]> {
  return Promise.all(
    qk.allCatalogKeys.map((key) =>
      qc.invalidateQueries({ queryKey: [key] }),
    ),
  );
}
