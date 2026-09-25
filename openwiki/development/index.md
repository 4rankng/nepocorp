# Files

- [Coding Conventions](conventions.md) - Repository conventions every PR must satisfy — TypeScript strict mode with shared-first types, Vietnamese user-facing and audit strings, camelCase request bodies over snake_case database columns with parsePagination on every list endpoint, immutable financial ledger, and the manual UI/brand contract gates.
- [Local Setup](setup.md) - First-time environment setup for the NEPO pnpm monorepo — prerequisites, pinned dev ports, backend/.env requirements, the make setup → make dev sequence with the seeded admin login, build order across shared/backend/frontend, database tooling, and manual quality gates.
- [Testing & Quality Gates](testing.md) - Backend tests via tsx --test, frontend Vitest suites colocated with sources, shared package math tests, and a Python Playwright e2e suite against the running dev stack — all manual gates, with no build/test CI.
