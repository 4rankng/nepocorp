# Files

- [Admin and agent](admin-and-agent.md)
- [REST API Surface](api-routes.md) - REST endpoints mounted under /api/v1 grouped by domain, with auth/RBAC posture, request/response contract pointers, and links to schema and service pages.
- [Authentication & RBAC](auth-rbac.md) - JWT authentication (HTTP middleware and the socket.io handshake), the Redis jti blacklist, the Casbin model/policy with the ADMIN wildcard pattern, casbinAuthz + requireRoles gating, mount-order rules in index.ts, and portal scoping for DRIVER/FORWARDER.
- [Database Schema (Drizzle)](database-schema.md) - Drizzle ORM schema organization — pgEnums mirroring shared enums, table groups, the FK-free ledger reference pattern, pgvector FAQ embeddings, soft-delete conventions, and the dev/prod migration workflow.
- [Ledger & Financial Domain](ledger.md) - Immutable ledger, running-balance semantics, adjustment-as-new-row pattern, receivables/payables, P&L, salary periods, profit distribution, and the penalty-as-salary-deduction rule.
- [Service Layer](services.md) - Business logic services — trip-lifecycle state machine, fuel/road allowance calculations, ledger, financial/reporting, storage, audit, RBAC/user, GPS/OCR/agent, and the createCrudRouter() factory for catalogs.
