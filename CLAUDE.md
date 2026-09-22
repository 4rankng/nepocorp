# TingTing — Vietnamese Trucking Logistics Platform

## Identity

Logistics/fleet management platform for a Vietnamese trucking company. Manages trips, drivers, customers, fleet, and financials (ledger, P&L, debt tracking, profit distribution).

## Monorepo Structure

```
backend/     Express v5 + TypeScript API (port 3090)
frontend/    React 19 + Vite + TypeScript (port 7173)
shared/      Shared types, schemas, constants, calculations
```

## Tech Stack

- **Backend:** Node.js, Express v5, TypeScript, Drizzle ORM, PostgreSQL
- **Auth:** JWT + Casbin RBAC
- **Frontend:** React 19, Vite, TanStack Query, React Router, Recharts
- **Testing:** Vitest (unit + integration)
- **Config:** `backend/src/config/index.ts`

## RBAC Roles

| Role | Vietnamese | Scope |
|------|-----------|-------|
| ADMIN | Quản trị | Full access |
| MANAGER | Giám đốc | Trips, financials, fleet, reports |
| ACCOUNTANT | Kế toán | Financials, debt, P&L |
| DRIVER | Lái xe | Own trips, earnings, mobile-optimized pages |

## Conventions

- TypeScript strict mode — no `any` types
- REST API with `/api/v1` prefix
- Drizzle ORM for all database queries — no raw SQL
- Financial precision: use `round2dp()` and `computeTripTotals()` from `shared/src/calculations/`
- Demo mode permanently disabled — frontend uses real API only
- Vietnamese currency (VND) — no decimal places in display formatting

## Key Files

### Backend
- `backend/src/index.ts` — Entry point
- `backend/src/routes/` — auth, trips, financial, driver, fleet, maps, upload, config
- `backend/src/services/` — Business logic layer
- `backend/src/middleware/` — Auth, Casbin enforcement, error handling
- `backend/src/casbin/` — RBAC policy definitions
- `backend/src/db/` — Drizzle schema and migrations
- `backend/src/config/` — Environment configuration

### Frontend
- `frontend/src/App.tsx` — Router + auth provider
- `frontend/src/pages/` — All route pages (Dashboard, Trips, Finance, Fleet, Dispatch, etc.)
- `frontend/src/api/` — API client (tripClient.ts)
- `frontend/src/hooks/` — useAuth, useCRUD, useCatalogs, useTripForm, useObservedWidth
- `frontend/src/components/` — Layout, UI primitives, TripForm, LocationAutocomplete

### Shared
- `shared/src/types/` — Shared TypeScript interfaces
- `shared/src/schemas/` — Zod validation schemas
- `shared/src/calculations/` — Financial math (round2dp, computeTripTotals)
- `shared/src/constants/` — Shared constants

## Task Tracking

`TASKS.md` in project root — two tracks:
- **Track 1:** E2E Trip Lifecycle Epic (Phases 1-4)
- **Track 2:** Feature Backlog (Fuel norms, Receivables, Dashboard, Profit distribution, Tech debt)

## Key Documents

- `docs/flows/DELIVERY_TRIP_LIFECYCLE.md` — Trip lifecycle QA guide + user manual
- `docs/company-files/` — Original Vietnamese business documents (fuel norms, allowances, vehicle data)

<!-- OPENWIKI:START -->

## OpenWiki

See [AGENTS.md](AGENTS.md) for OpenWiki agent instructions.

<!-- OPENWIKI:END -->

<!-- code-review-graph MCP tools -->
## MCP Tools: code-review-graph

**This project has a knowledge graph. Start with the code-review-graph
MCP tools to narrow scope, then read the source.** The graph is cheaper than scanning files and
gives you structural context (callers, dependents, test coverage) that file search cannot.

### When to use graph tools FIRST

- **Exploring code**: `semantic_search_nodes_tool` or `query_graph_tool` instead of Grep
- **Understanding impact**: `get_impact_radius_tool` instead of manually tracing imports
- **Code review**: `detect_changes_tool` + `get_review_context_tool` instead of reading entire files
- **Finding relationships**: `query_graph_tool` with callers_of/callees_of/imports_of/tests_for
- **Architecture questions**: `get_architecture_overview_tool` + `list_communities_tool`

### Verify in the source

- Narrow scope with the graph, then read the source. Do not change code from graph output alone.
- For any non-trivial change, read the implementation and the relevant tests before concluding.
- Verify the exact source when touching behavior, database logic, migrations, retries, fallbacks,
  recovery, or compatibility code.
- When the graph and the source disagree, the source wins. The graph may be stale or may not
  model that relationship.
- An empty graph result can mean "not indexed" or "not statically visible", not "does not exist".

### Key Tools

| Tool | Use when |
| ------ | ---------- |
| `detect_changes_tool` | Reviewing code changes — gives risk-scored analysis |
| `get_review_context_tool` | Need source snippets for review — token-efficient |
| `get_impact_radius_tool` | Understanding blast radius of a change |
| `get_affected_flows_tool` | Finding which execution paths are impacted |
| `query_graph_tool` | Tracing callers, callees, imports, tests, dependencies |
| `semantic_search_nodes_tool` | Finding functions/classes by name or keyword |
| `get_architecture_overview_tool` | Understanding high-level codebase structure |
| `refactor_tool` | Planning renames, finding dead code |

### Workflow

1. The graph auto-updates on file changes (via hooks).
2. Use `detect_changes_tool` for code review.
3. Use `get_affected_flows_tool` to understand impact.
4. Use `query_graph_tool` pattern="tests_for" to check coverage.
<!-- /code-review-graph MCP tools -->
