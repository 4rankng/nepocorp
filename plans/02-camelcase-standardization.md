# Implementation Plan: camelCase Standardization & Bug Fixes

## Problem Statement

The Nepocorp monorepo currently employs a double-conversion pipeline for key casing:
1. **Backend Database Mapping**: Drizzle ORM returns camelCase objects (e.g., `tripCode`, `customerId`, `grossProfit`) mapping from snake_case columns in PostgreSQL.
2. **Serialization Layer**: The `snakeCaseSerializer` Express middleware intercepts all response payloads and converts all keys recursively to `snake_case` (e.g., `trip_code`, `customer_id`, `gross_profit`).
3. **Frontend Deserialization**: The frontend `ApiClient` wraps responses with `addCamelCaseAliases()`, creating duplicate properties so that code can access both `.gross_profit` and `.grossProfit`.

This architecture introduces unnecessary runtime overhead, duplicate types, and led directly to a high-severity bug: **Login Audit Log Bug**. Because the serializer converts `fullName` to `full_name` inside `res.json`, the audit interceptor (running after the serializer) fails to read `respUser?.fullName`, falling back to `username` or showing `undefined`.

Additionally, there are 7 other active bugs, UX deficiencies, and data anomalies in the system that must be resolved in tandem with this refactor.

## Scope

This plan covers:
- Complete removal of the backend `snakeCaseSerializer` and frontend `addCamelCaseAliases()`.
- Migration of all shared types, schemas, and queries to camelCase.
- Refactoring of backend routes and services to handle camelCase natively.
- Refactoring of frontend hooks, components, and ~25+ pages to consume and send camelCase exclusively.
- Resolving the 8 target issues (including the login audit bug, debt list balance mismatch, negative balance labeling, negative-profit chart rendering, YoY calculation improvements, stale React Query cache on failure, and database cleanup).

---

## Phase 1: Shared types & schemas (foundation)

Updating the shared packages establishes a strict TypeScript compilation boundary that will guide the subsequent backend and frontend refactoring.

### Tasks

1. **Update Shared Entity Types (`shared/src/types/index.ts`)**
   - Convert all entity fields using snake_case to camelCase:
     - `users`: `password_hash` → `passwordHash`, `created_at` → `createdAt`, `updated_at` → `updatedAt`, `deleted_at` → `deletedAt`, `full_name` → `fullName`.
     - `trucks`: `license_plate` → `licensePlate`, `created_at` → `createdAt`.
     - `drivers`: `user_id` → `userId`, `assigned_truck_id` → `assignedTruckId`, `base_salary` → `baseSalary`.
     - `customers`: `tax_code` → `taxCode`, `contact_person` → `contactPerson`, `contact_info` → `contactInfo`, `credit_limit` → `creditLimit`.
     - `routes`: `distance_km` → `distanceKm`, `is_mountain` → `isMountain`, `fixed_fuel_allowance` → `fixedFuelAllowance`.
     - `trips`: `trip_code` → `tripCode`, `departure_date` → `departureDate`, `loading_type` → `loadingType`, `photo_urls` → `photoUrls`, `license_plate` → `licensePlate`, `trailer_id` → `trailerId`, `driver_id` → `driverId`, `truck_id` → `truckId`, `route_id` → `routeId`, `cargo_type_id` → `cargoTypeId`.
   - Ensure the exceptions already using camelCase (`CapTableHistory`, `DashboardStats`, `CustomerStatement`, `UnpaidTrip`, `PaginatedResponse`) remain unchanged.

2. **Update Shared Zod Validation Schemas (`shared/src/schemas/index.ts`)**
   - Modify all request/input validation schemas to validate camelCase keys instead of snake_case:
     - `CustomerSchema`: `tax_code` → `taxCode`, `contact_person` → `contactPerson`, `contact_info` → `contactInfo`, `credit_limit` → `creditLimit`.
     - `TruckSchema`: `license_plate` → `licensePlate`.
     - `DriverSchema`: `user_id` → `userId`, `assigned_truck_id` → `assignedTruckId`, `base_salary` → `baseSalary`.
     - `RouteSchema`: `distance_km` → `distanceKm`, `is_mountain` → `isMountain`, `fixed_fuel_allowance` → `fixedFuelAllowance`.
     - `TripSchema` & `TripLegSchema`: `loading_type` → `loadingType`, `cargo_type_id` → `cargoTypeId`, `departure_date` → `departureDate`.
   - Leave authentication schemas (`currentPassword`, `newPassword`) as camelCase.

3. **Verify Foundation**
   - Run `pnpm build` in the `shared` workspace directory. Verify that types and schemas compile successfully.

---

## Phase 2: Backend refactoring & serializer removal

Once the shared layer exposes camelCase interfaces, the backend API routes and services must be updated to process these camelCase request bodies and return Drizzle camelCase outputs directly without serialization.

### Tasks

1. **Create Customer Balances Endpoint (`backend/src/routes/financial.ts`)**
   - To resolve **Issue 2 (Debt list vs detail balance mismatch)**, we will implement a new endpoint `GET /api/financial/ledger/balances?entity_type=CUSTOMER` in the backend.
   - This endpoint will query the PostgreSQL database utilizing the high-performance `DISTINCT ON` query to obtain the absolute newest balance row for each active entity:
     ```typescript
     router.get('/ledger/balances', async (req: Request, res: Response) => {
       try {
         const entityType = req.query.entity_type as string;
         if (!entityType) return res.status(400).json({ error: 'entity_type is required' });
         const rows = await db.selectDistinctOn([s.ledger.entityId], {
           entityId: s.ledger.entityId,
           balance: s.ledger.balance,
           timestamp: s.ledger.timestamp,
         })
         .from(s.ledger)
         .where(eq(s.ledger.entityType, entityType))
         .orderBy(s.ledger.entityId, desc(s.ledger.id));
         
         res.json(rows.map(r => ({
           entityId: r.entityId,
           balance: parseFloat(r.balance),
           timestamp: r.timestamp,
         })));
       } catch (err: any) {
         res.status(500).json({ error: err.message });
       }
     });
     ```
   - This prevents fetching large collections of historical rows on the list page and resolves the 2000-row limit mismatch.

2. **Remove Serializer Middleware (`backend/src/middleware/serializer.ts`)**
   - Delete `backend/src/middleware/serializer.ts` completely.
   - Remove the import and middleware registrations in `backend/src/index.ts`:
     ```diff
     - import { snakeCaseSerializer } from './middleware/serializer';
     ...
     - app.use(snakeCaseSerializer);
     ```

3. **Remove `snakeToCamelKeys` in CRUD Factory (`backend/src/services/config.service.ts`)**
   - In `createCrudRouter()`, eliminate `snakeToCamelKeys()` recursive conversion. Request payloads sent by the frontend will already be in camelCase, matching the Zod schemas and Drizzle column insert expectations:
     ```diff
     - const camelData = snakeToCamelKeys(req.body);
     - const [inserted] = await db.insert(table).values(camelData).returning();
     + const [inserted] = await db.insert(table).values(req.body).returning();
     ```

4. **Update Routes & Parameter Destructuring**
   - **`trips.ts`**: Replace manual property mappings such as `customerId: data.customer_id` with direct pass-throughs or camelCase keys: `customerId: data.customerId`.
   - **`config.ts`**: Update parsing keys: `loadedNorm: String(data.loadedNorm)`.
   - **`financial.ts`**: Convert request parameters to camelCase (`data.customerId`, `data.tripId`, `data.driverId`).
   - **`driver.ts`**: Update queries to read camelCase parameters: `req.query.dateFrom` instead of `req.query.date_from`.

5. **Update Services Destructuring & Types**
   - **`trip.service.ts`**: Change input structures to camelCase. Update destructuring parameters (e.g. `const { driverId, truckId, routeId } = data`).
   - **`statement.service.ts`**: Update the `CustomerStatementData` interface, renaming `contact_info` to `contactInfo`. Modify occurrences inside statement templates and exports.
   - **`driver.service.ts`**, **`reporting.service.ts`**: Review and adjust to use the standard camelCase values returned by Drizzle queries.

6. **Simplify Audit Middleware (`backend/src/middleware/audit.ts`)**
   - In `extractEntityKey()`, remove snake_case fallback checks. Search only for camelCase keys:
     ```typescript
     // Simplify key lookups after removing the serializer layer
     if (entityType === 'trip') return capturedBody?.tripCode || reqBody?.tripCode;
     ```
   - This natively resolves **Issue 1 (Login Audit Log Bug)** since `res.json` results are no longer modified to snake_case, making `respUser?.fullName` fully readable at line 171.

---

## Phase 3: Frontend api client & hooks migration

With the backend exclusively returning and receiving camelCase, the frontend communication layer and custom data hooks must be adjusted.

### Tasks

1. **Refactor API Client (`frontend/src/lib/api.ts`)**
   - Remove the `addCamelCaseAliases()` runtime helper and all references to snake_case transformation in the HTTP wire handler.
   - Ensure the API client passes request bodies to the server as-is.

2. **Migrate Frontend Hooks**
   - **`useQueries.ts`**:
     - Simplify `normalizeTrip(t)` to access `t.customerId`, `t.tripCode`, `t.grossProfit` directly without fallback checks (e.g. `t.customer_id ?? t.customerId` → `t.customerId`).
     - Update `useCustomerDebts()` to call the new `/api/financial/ledger/balances?entity_type=CUSTOMER` endpoint to fetch exact balances, rather than retrieving 2000 ledger rows:
       ```typescript
       export function useCustomerDebts() {
         return useQuery<{ customers: Customer[]; balances: { entityId: number; balance: number; timestamp: string }[] }>({
           queryKey: ['customer-debts'],
           queryFn: async () => {
             const [customersRes, balancesRes] = await Promise.all([
               api.get<PaginatedResponse<Customer>>(CONFIG.CUSTOMERS),
               api.get<{ entityId: number; balance: number; timestamp: string }[]>(`${FINANCIAL.LEDGER}/balances?entity_type=CUSTOMER`),
             ]);
             return {
               customers: customersRes.items,
               balances: balancesRes,
             };
           },
         });
       }
       ```
     - **Issue 6 (Dashboard cache on failure)**: Update `useDashboardStats` to disable excessive retries and enable refetching on focus to recover from transient 500 errors:
       ```typescript
       export function useDashboardStats() {
         return useQuery<ExtendedDashboardStats>({
           queryKey: ['dashboard'],
           queryFn: () => api.get<ExtendedDashboardStats>(REPORTS.DASHBOARD),
           staleTime: 2 * 60 * 1000,
           retry: false,
           refetchOnWindowFocus: true,
         });
       }
       ```
   - **`useTripForm.ts`**: Change the structure of output form payloads to utilize camelCase keys.
   - **`useTripOptions.ts`**: Refactor lookups to read `distanceKm` and `licensePlate` instead of `distance_km` and `license_plate`.
   - **`useCatalogs.ts`**: Convert the internal `CatalogData` interface to use camelCase.
   - **`usePenalties.ts`**: Convert the `PenaltyRow` interface properties to camelCase.
   - **`useAuditLogs.ts`**: Convert properties inside `AuditEntry` (`userEmail`, `userName` instead of `user_email`, `user_name`).

---

## Phase 4: Frontend pages & components migration

Refactor all application pages and layout components to access camelCase properties exclusively.

### Tasks

1. **Refactor Page Views (~25+ pages)**
   - **`TripListPage.tsx`**: Update table accessors and list items: `tripCode`, `departureDate`, `grossProfit`, etc.
   - **`TripDetailPage.tsx`**: Rename variables and photo accessors: `photoUrls`, `licensePlate`. Clean up helpers.
   - **`DispatchPage.tsx`**: Update truck model reads: `licensePlate`, `driverName`.
   - **`DashboardPage.tsx`**: Update analytics KPI keys: `grossProfit`, `fuelLiters`, etc.
   - **`FinancePage.tsx` YoY Fix (Issue 5)**:
     - Update YoY percentage calculation logic in `yoyPct()`:
       ```typescript
       function yoyPct(current: number, previous: number): string {
         if (previous == null || previous === 0) return current > 0 ? 'Mới' : '—';
         const pct = ((current - previous) / previous * 100).toFixed(1);
         return `${Number(pct) >= 0 ? '+' : ''}${pct}%`;
       }
       ```
   - **`FinancePage.tsx` Chart Negative-Profit Fix (Issue 4)**:
     - Update the SVG bar rendering logic. Calculate dynamic baseline (`zeroX`) to represent negative values (losses) as red bars growing leftward:
       ```typescript
       const maxProfit = Math.max(...topTrucks.map(t => t['LN gộp']), 1);
       const minProfit = Math.min(...topTrucks.map(t => t['LN gộp']), 0);
       const totalRange = maxProfit - minProfit;
       const zeroX = minProfit < 0 ? plateW + (Math.abs(minProfit) / totalRange) * barTrackW : plateW;
       
       // In loop rendering:
       const val = t['LN gộp'];
       const isNegative = val < 0;
       const w = (Math.abs(val) / totalRange) * barTrackW;
       const barX = isNegative ? zeroX - w : zeroX;
       const fill = isNegative ? 'var(--danger)' : '#6366f1';
       ```
   - **`DebtListPage.tsx` Outstanding Balance & Subtitle Fix (Issue 2 & Issue 3)**:
     - Map over the actual balances list obtained from the new `/ledger/balances` endpoint. Match customers to their specific balance row:
       ```typescript
       const totalOutstanding = balanceMap.get(c.id) ?? 0;
       ```
     - Dynamicize the subtitle instead of the hardcoded `"Nợ quá hạn"` label:
       ```typescript
       const statusText = d.totalOutstanding > 0 
         ? (d.maxOverdueDays > 0 ? "Nợ quá hạn" : "Trong hạn") 
         : (d.totalOutstanding < 0 ? "Trả trước" : "Cân bằng");
       ```
   - **`PenaltyPage.tsx`**: Change `driver_id` → `driverId`, `custom_reason` → `customReason`.
   - **`CustomersPage.tsx`**: Simplify checks: `(c as any).tax_code` → `c.taxCode`.
   - **`AuditLogPage.tsx`**: Convert keys: `userName` → `actorName`, etc.
   - **`FleetPage.tsx`**: Update fleet properties: `licensePlate`, `baseSalary`.
   - **Config pages (CargoTypes, Trucks, etc.)**: Change `loaded_norm` → `loadedNorm`, `distance_km` → `distanceKm`.

2. **Refactor Shared Components**
   - **`TotalsPanel.tsx`**: `leg.loading_type` → `leg.loadingType`
   - **`TripLegFields.tsx`**: `leg.loading_type` → `leg.loadingType`
   - **`JourneyLegRow.tsx`**: `leg.loading_type` → `leg.loadingType`

3. **Update API Client Payload Keys**
   - **`tripClient.ts`**: Update keys inside create and update payloads to camelCase: `truckId`, `trailerId`, `driverId`.

---

## Phase 5: Verification & database cleanup

A final rigorous validation phase ensures no residual snake_case references exist and cleans up legacy development noise.

### Tasks

1. **Database Purge Checklist (Issue 8)**
   - Execute a database cleanup script or run a migration action on the database instance to delete QA-polluting and SQL-injection test data:
     ```sql
     -- Purge malicious SQL-injection QA tests
     DELETE FROM customers WHERE name LIKE '%DROP TABLE%' OR name LIKE '%Test%';
     
     -- Purge QA trucks and duplicate parameters
     DELETE FROM trucks WHERE license_plate LIKE '%TEST%';
     ```

2. **TypeScript Compilation Verification**
   - Run `npx tsc --noEmit` in both backend/ and frontend/ folders to verify that strict TypeScript builds compile cleanly with zero errors.
   - Confirm that the monorepo passes all builds by executing `pnpm build` or `make build`.

3. **Integration Test Suite Validation**
   - Execute `pnpm test` inside the `backend` package directory to ensure the automated test suite executes fully and returns positive results.

---

## Verification & Recovery Matrix

| Target State | Verification Method | Rollback / Correction Procedure |
|--------------|---------------------|---------------------------------|
| Types & Schemas | Shared `pnpm build` output | Revert changes in `shared/src/types/index.ts` to restore previous definitions. |
| API Casing | Request via curl: `curl http://localhost:3090/api/trips` contains camelCase properties | Re-introduce `snakeCaseSerializer` temporarily in `index.ts`. |
| Audit Logs | Verify `actorName` contains full name for login events | Verify Casbin / User contexts are successfully resolved from token payloads. |
| Debt Balances | Compare balance shown on `/debt` with details on `/debt/:id` | Restore previous frontend FIFO aging logic over raw limited ledger entries. |
| Visual Charts | View `/finance` P&L chart with negative-profit trucks | Clamp width back to `Math.max(0, raw)`. |
| Compilation | Strict type checking succeeds on frontend and backend | Re-introduce temporary interfaces with properties mapping both casings. |
