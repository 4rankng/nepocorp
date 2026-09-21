# Files

- [Admin and agent](admin-and-agent.md)
- [REST API Surface](api-routes.md) - REST endpoints mounted under /api/v1 grouped by domain, with auth/RBAC posture, request/response contract pointers, and links to schema and service pages.
- [Authentication & RBAC](auth-rbac.md) - JWT authentication, Casbin RBAC roles and policy, the dual-layer pattern that combines casbinAuthz('resource') with requireRoles(...), and the audit middleware that records all mutations in Vietnamese.
- [Database Schema (Drizzle)](database-schema.md) - Drizzle ORM schema overview — pgEnum usage, table groups, the loosely-coupled entity_type/entity_id ledger pattern, indexes, and the migration workflow.
- [Ledger & Financial Domain](ledger.md) - Immutable ledger, running-balance semantics, adjustment-as-new-row pattern, receivables/payables, P&L, salary periods, profit distribution, and the penalty-as-salary-deduction rule.
- [Service Layer](services.md) - Business logic services — trip-lifecycle state machine, fuel/road allowance calculations, ledger, financial/reporting, storage, audit, RBAC/user, GPS/OCR/agent, and the createCrudRouter() factory for catalogs.
