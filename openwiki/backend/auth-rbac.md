---
type: rbac-and-auth
title: Authentication & RBAC
description: JWT authentication, Casbin RBAC roles and policy, the dual-layer pattern that combines casbinAuthz('resource') with requireRoles(...), and the audit middleware that records all mutations in Vietnamese.
tags: [auth, jwt, rbac, casbin, audit, roles]
verified:
  - by: openwiki/0.5.0
    at: 2026-09-21T11:26:37.739Z
sources:
  - id: openwiki-source-d4152f04311d0c8c58c1afbe
    resource: repo://backend/src/casbin/policy.csv
  - id: openwiki-source-2a2dfd1bcd8735843534fafd
    resource: repo://backend/src/index.ts
  - id: openwiki-source-4635521b326b46a9fafb0ce7
    resource: repo://backend/src/lib/redis.ts
  - id: openwiki-source-833cafcf2b0c8db4a21dde31
    resource: repo://backend/src/middleware/audit.ts
  - id: openwiki-source-1e2e94a8c6ca6db2a3a43a64
    resource: repo://backend/src/middleware/auth.ts
  - id: openwiki-source-372d8e351dc2bc9677967d48
    resource: repo://backend/src/middleware/casbin.ts
  - id: openwiki-source-6d80a02487569bcbb7938d4d
    resource: repo://backend/src/services/audit-templates.ts
  - id: openwiki-source-454c9bcdde0b77b35e0fc994
    resource: repo://frontend/src/App.tsx
  - id: openwiki-source-1d8ade489420d496695e0c37
    resource: repo://shared/src/constants/index.ts
generated: { by: "opencode", at: "2026-09-21T11:26:37.739Z" }
---

NEPO uses a two-layer authorization model. Layer 1 verifies the JWT bearer token
(Layer 1a) and re-checks its `jti` against the Redis blacklist (Layer 1b). Layer 2
applies Casbin's resource-level policy, optionally tightened by a per-route role
allow-list. Every mutation also flows through the audit middleware, which writes
a Vietnamese-language row regardless of how many tables the handler touches.

## Login flow

1. **Client** `POST /api/auth/login` with `{ email, password }` validated by
   `loginSchema` from `@tingting/shared`.
2. **Backend** `backend/src/routes/auth.ts` looks up the user by email
   (`backend/src/services/user.service.ts`), verifies the bcrypt hash, and issues
   a JWT containing `{ userId, username, email, fullName, role, jti }`.
3. The browser stores the token (localStorage) and the React `AuthProvider`
   (`frontend/src/hooks/useAuth.ts`) rehydrates `user` from it on page load.
4. Subsequent requests attach the token as `Authorization: Bearer <token>`; the
   API client wrapper (`frontend/src/lib/api.ts`) does this for every fetch.

`authMiddleware` (`backend/src/middleware/auth.ts:25`):

- Strips `Bearer ` from the `Authorization` header.
- Calls `jwt.verify(token, config.jwtSecret)`.
- If the payload includes a `jti`, checks `isTokenBlacklisted(jti)` against Redis
  (revocation).
- On any failure returns 401 with a Vietnamese message
  (`Token không hợp lệ` / `Token đã bị thu hồi` / `Token hết hạn hoặc không hợp lệ`).
- On success attaches `req.user = payload` for downstream middleware.

`assetAuthMiddleware` (`backend/src/middleware/auth.ts:46`) is a sibling used by
`/api/photos` so that `<img>` tags can pass the token via `?token=…` (browsers
cannot set `Authorization` headers on image loads). The comment is explicit:
"use scoped narrowly to avoid exposing tokens in URL logs/Referer on general
API routes."

## Roles

| Role | Vietnamese | Scope |
|---|---|---|
| `ADMIN` | Quản trị | Full access (`p, ADMIN, *, *` wildcard) |
| `MANAGER` | Giám đốc | Office staff; trips/financial/config full + maps/upload/photos/users/salary/agent/ocr |
| `ACCOUNTANT` | Kế toán | Office staff; trips/financial/config/audit read+write, photos read, salary read+write |
| `DRIVER` | Lái xe | `driver_portal` only (own trips/earnings/penalties) + maps/photos/notifications/salary/ocr |
| `FORWARDER` | — | `forwarder_portal` only (own trip expenses, advances, settlements) + maps/photos/notifications |

The labels live in `ROLE_LABELS` (`@tingting/shared/constants`).

## Casbin policy

The policy lives at `backend/src/casbin/policy.csv`. Key invariants:

- **`p, ADMIN, *, *`** — admin wildcard: any role check resolves to allow for
  ADMIN, regardless of resource or action.
- The HTTP method is translated to a Casbin action by `ACTION_MAP`
  (`backend/src/middleware/casbin.ts:5`): `GET → read`, `POST/PUT/PATCH → write`,
  `DELETE → delete`.
- `enforcer.enforce(sub, resource, act)` returns `boolean`. False → 403
  Vietnamese (`Không có quyền truy cập`).

## Dual-layer pattern

Coarse-grained resource access uses `casbinAuthz('resource')` at the route mount
point; fine-grained endpoint gating uses `requireRoles(...)` inside the router or
as a second mount middleware.

```ts
// backend/src/index.ts — ADMIN-only resources combine both gates so a missing
// Casbin policy row denies everyone except the ADMIN wildcard.
app.use(
  '/api/admin/llm-settings',
  authMiddleware,
  casbinAuthz('llm-settings'),     // no policy row → ADMIN-only
  requireRoles(Role.ADMIN),         // belt-and-suspenders
  llmSettingsRoutes,
);
```

```ts
// backend/src/routes/financial/advances.routes.ts — endpoint-level role gate
router.post(
  '/advance-requests/:id/approve',
  requireRoles(Role.ADMIN, Role.MANAGER),
  asyncHandler(async (req, res) => { ... }),
);
```

`requireRoles` (`backend/src/middleware/casbin.ts:19`) is the simple role
allow-list. It runs after `authMiddleware`, reads `req.user.role`, and returns 401
when no user is attached or 403 (`Không có quyền truy cập`) when the role is not
in the list.

## Audit middleware

`auditLogMiddleware` (`backend/src/middleware/audit.ts`) is mounted globally
(`backend/src/index.ts:85`) and intercepts every mutating request before the
route handler. It writes a single Vietnamese-language row to the `audit_logs`
table per API call — regardless of how many tables the handler touches. The
templates in `backend/src/services/audit-templates.ts` translate route + payload
into Vietnamese audit messages.

Mutations therefore always produce one audit row, even when a single API call
issues many DML statements inside a transaction. Coupled with the immutable
ledger, this gives a complete who-did-what-when trace in Vietnamese.

## Frontend mirrors

React guards in `frontend/src/App.tsx:103` (`adminOnly`, `driverOnly`,
`forwarderOnly`, `managerOrAdminOnly`, `officeStaffOnly`, `strictAdminOnly`) keep
unauthorized users from seeing pages in the first place. They are navigation
helpers, not a security boundary — the API still enforces RBAC server-side.

## Failure responses

- Missing/expired/revoked JWT → 401 with Vietnamese message.
- Casbin denial → 403 (`Không có quyền truy cập`).
- `requireRoles` denial → 403 (`Không có quyền truy cập`).
- Enforcer error → 500 (`Lỗi kiểm tra quyền`).

## Where to read more

- Where the gates are mounted — [backend/api-routes.md](api-routes.md), [architecture.md](../architecture.md)
- Schemas (`loginSchema`, `Role`) — [shared/schemas.md](../shared/schemas.md)
- Audit log consumption — [development/conventions.md](../development/conventions.md)
