import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { config } from '../config';

export const client = postgres(config.databaseUrl);
export const db = drizzle(client, { schema });
export type Database = typeof db;

interface RuntimePatch {
  name: string;
  sql: string;
}

const RUNTIME_PATCHES: RuntimePatch[] = [
  {
    name: 'users_full_name_col',
    sql: `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "full_name" varchar(255)`,
  },
  {
    name: 'cap_table_contribution_amount_col',
    sql: `ALTER TABLE "cap_table_history" ADD COLUMN IF NOT EXISTS "contribution_amount" numeric(15, 0) DEFAULT 0 NOT NULL`,
  },
  {
    name: 'cap_table_percentage_col',
    sql: `ALTER TABLE "cap_table_history" ADD COLUMN IF NOT EXISTS "percentage" numeric(5, 2) DEFAULT 0 NOT NULL`,
  },
  {
    name: 'create_salary_periods_table',
    sql: `CREATE TABLE IF NOT EXISTS "salary_periods" (
      "id" serial PRIMARY KEY,
      "month" integer,
      "year" integer,
      "start_date" date,
      "end_date" date,
      "label" varchar(100),
      "default_start_day" integer,
      "default_end_day" integer,
      "is_default" boolean NOT NULL DEFAULT false,
      "created_at" timestamp NOT NULL DEFAULT now(),
      "updated_at" timestamp NOT NULL DEFAULT now(),
      "deleted_at" timestamp
    )`,
  },
  {
    name: 'add_fuel_supplement_norm_applied_col',
    sql: `ALTER TABLE "trips" ADD COLUMN IF NOT EXISTS "fuel_supplement_norm_applied" numeric(6,2)`,
  },
];

export async function applyRuntimePatches(): Promise<void> {
  await client.unsafe(`
    CREATE TABLE IF NOT EXISTS "_applied_patches" (
      name  varchar(255) PRIMARY KEY,
      applied_at timestamp NOT NULL DEFAULT now()
    )
  `);

  // Fetch already-applied patches. Only swallow the expected "relation does not
  // not exist" error (code 42P01) that fires on first boot before the table is
  // created. All other errors (permissions, connection) should propagate.
  let rows: { name: string }[] = [];
  try {
    rows = await client.unsafe(`SELECT name FROM "_applied_patches"`);
  } catch (err: any) {
    if (err?.code !== '42P01') throw err; // unexpected — let it crash
  }
  const applied: Set<string> = new Set(rows.map((r: any) => r.name as string));

  let skipped = 0;
  let appliedCount = 0;

  for (const patch of RUNTIME_PATCHES) {
    if (applied.has(patch.name)) {
      skipped++;
      continue;
    }

    try {
      await client.unsafe(patch.sql);
      await client.unsafe(
        `INSERT INTO "_applied_patches" (name) VALUES ($1) ON CONFLICT DO NOTHING`,
        [patch.name],
      );
      appliedCount++;
    } catch (err: any) {
      console.warn('[db] runtime patch failed (continuing):', err.message, '\n  patch:', patch.name, '\n  sql:', patch.sql.slice(0, 100));
    }
  }

  if (skipped > 0 || appliedCount > 0) {
    console.log(`[db] runtime patches: ${appliedCount} applied, ${skipped} skipped`);
  }
}
