import { defineConfig } from 'vitest/config';

/**
 * Backend vitest wiring (kanban 141026163910 / 141026163920 follow-up).
 *
 * The canonical backend gate remains `pnpm test` (tsx --test / node:test) —
 * all suites under src/tests are node:test files. A growing subset is
 * runner-agnostic (see payment-ledger-test-utils.ts) and can ALSO be run
 * directly with `pnpm exec vitest run src/tests/<file>.test.ts`. Only those
 * files are included here: vitest does not register node:test definitions, so
 * pointing it at the node:test-only suites reports "No test suite found".
 *
 * The DB-backed suites need the local docker dev DB (Makefile: PostgreSQL
 * 5440, Redis 6390). `make dev` normally gets these from backend/.env; a bare
 * vitest invocation gets the same dev defaults here. Real env vars win.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: [
      'src/tests/payment-intake-dedupe.test.ts',
      'src/tests/payment-delete-recompute.test.ts',
      'src/tests/payment-fifo-skip.test.ts',
      'src/tests/payment-received-date.test.ts',
      'src/tests/payment-edit-recompute.test.ts',
    ],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    env: {
      DATABASE_URL: process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5440/tingting',
      REDIS_URL: process.env.REDIS_URL ?? 'redis://localhost:6390',
    },
  },
});
