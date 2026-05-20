# NEPO Logistics - Pending Tasks & Open Questions

## Backend

### High Priority
- [ ] **Seed script**: Create a database seed script with sample data (admin user, drivers, customers, routes, etc.) for development and testing
- [ ] **Migration generation**: Run `drizzle-kit generate` and verify the generated SQL migration matches the schema
- [ ] **Password reset flow**: Currently no endpoint for password reset or user management beyond login
- [ ] **User CRUD**: Admin should be able to create/edit/deactivate users (currently only login + list exists)

### Medium Priority
- [ ] **Trip completion endpoint**: Separate the "actuals update + status change to COMPLETED" into a dedicated endpoint instead of combining in PUT /:id/actuals
- [ ] **Fuel config validation**: Add server-side validation that fuel norms are positive numbers
- [ ] **P&L per-truck optimization**: The P&L report does N+1 queries for truck plates (fetches truck per trip in a loop). Should batch or join.
- [ ] **Payment FIFO suggestion**: Context mentions suggesting oldest unpaid trips first - not implemented in the payment endpoint
- [ ] **Duplicate penalty detection**: Context mentions custom penalty reasons with duplicate detection - not implemented

### Low Priority
- [ ] **Revenue override audit trail**: `revenueOverriddenBy` is set to null instead of the actual user ID in `updateTripFigures` - needs to receive userId from the route handler
- [ ] **Ledger idempotency**: No protection against double-locking a trip (race condition on the lockTrip endpoint)
- [ ] **Soft delete for trips**: No endpoint to soft-delete a trip (only cancel exists)
- [ ] **Rate limiting**: No rate limiting on API endpoints
- [ ] **Input sanitization**: User input is validated via Zod but not sanitized for XSS in string fields

## Frontend

### High Priority
- [ ] **DashboardPage**: Real implementation with stats cards, recent trips, charts
- [ ] **TripListPage**: Trip table with filters (status, date range, truck, driver, customer), pagination
- [ ] **TripCreatePage**: Form with customer, route, truck, trailer, driver, cargo type, departure date
- [ ] **TripDetailPage**: Full trip detail with legs, fuel calculation, road allowance, status actions (dispatch, lock, cancel)
- [ ] **FinancePage**: P&L report view, monthly filter
- [ ] **DebtListPage**: Customer debt list with aging buckets
- [ ] **DebtDetailPage**: Customer statement with ledger rows, payment recording
- [ ] **PenaltyPage**: Penalty list + create form
- [ ] **ConfigPage**: CRUD for all config entities (customers, trucks, trailers, routes, etc.)
- [ ] **DriverTripsPage**: Driver's assigned trip list
- [ ] **DriverEarningsPage**: Earnings summary for driver

### Medium Priority
- [ ] **AuditLogPage**: View audit log entries with filtering
- [ ] **Responsive layout**: Mobile-friendly sidebar behavior is scaffolded but pages need responsive design
- [ ] **File upload integration**: Photo upload for trips (chuyến chè) - wire up the upload API
- [ ] **Search/Command palette**: The topbar has a search input (Cmd+K) - not functional yet
- [ ] **Notification bell**: Topbar has bell icon - no notification system implemented

## Design Decisions Needed
- [ ] Confirm whether the Driver mobile view uses a completely different layout or shares the admin sidebar
- [ ] Confirm trip leg entry UX: inline add or modal for adding legs
- [ ] Confirm chart library for dashboard (Recharts is common with React)
- [ ] Confirm whether config pages use tabs, separate routes, or a single page with sections
