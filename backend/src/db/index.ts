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
    name: 'seed_cap_thuong',
    sql: `INSERT INTO "cap_table_history" ("partner_name", "contribution_amount", "percentage", "effective_date") SELECT 'Ông Thương', 500000000, 50, '2025-01-01' WHERE NOT EXISTS (SELECT 1 FROM "cap_table_history" WHERE "partner_name" = 'Ông Thương')`,
  },
  {
    name: 'seed_cap_phung',
    sql: `INSERT INTO "cap_table_history" ("partner_name", "contribution_amount", "percentage", "effective_date") SELECT 'Ông Phụng', 500000000, 50, '2025-01-01' WHERE NOT EXISTS (SELECT 1 FROM "cap_table_history" WHERE "partner_name" = 'Ông Phụng')`,
  },
  {
    name: 'backfill_full_name_from_drivers',
    sql: `UPDATE "users" u SET "full_name" = d."name" FROM "drivers" d WHERE d."user_id" = u."id" AND u."full_name" IS NULL`,
  },
  {
    name: 'seed_admin_full_name',
    sql: `UPDATE "users" SET "full_name" = 'Phạm Anh Tuấn' WHERE "username" = 'admin' AND "full_name" IS NULL`,
  },
  {
    name: 'seed_giamdoc_full_name',
    sql: `UPDATE "users" SET "full_name" = 'Lê Văn Tỉnh' WHERE "username" = 'giamdoc' AND "full_name" IS NULL`,
  },
  {
    name: 'seed_ketoan_full_name',
    sql: `UPDATE "users" SET "full_name" = 'Trần Thị Hương' WHERE "username" = 'ketoan' AND "full_name" IS NULL`,
  },
  {
    name: 'fix_admin_role_label',
    sql: `UPDATE "users" SET "full_name" = 'Phạm Anh Tuấn' WHERE "username" = 'admin' AND "full_name" = 'Quản trị viên'`,
  },
  {
    name: 'audit_admin_name_v1',
    sql: `UPDATE "audit_logs" SET "message" = REPLACE("message", 'Quản trị viên admin ', 'Quản trị viên Phạm Anh Tuấn ') WHERE "message" LIKE '%Quản trị viên admin %'`,
  },
  {
    name: 'audit_admin_name_v2',
    sql: `UPDATE "audit_logs" SET "message" = REPLACE("message", 'Quản trị admin ', 'Quản trị viên Phạm Anh Tuấn ') WHERE "message" LIKE '%Quản trị admin %'`,
  },
  {
    name: 'audit_double_role_fix',
    sql: `UPDATE "audit_logs" SET "message" = REPLACE("message", 'Quản trị Quản trị viên ', 'Quản trị viên Phạm Anh Tuấn ') WHERE "message" LIKE '%Quản trị Quản trị viên %'`,
  },
  {
    name: 'audit_giamdoc_name',
    sql: `UPDATE "audit_logs" SET "message" = REPLACE("message", 'Quản lý giamdoc ', 'Quản lý Lê Văn Tỉnh ') WHERE "message" LIKE '%Quản lý giamdoc %'`,
  },
  {
    name: 'audit_ketoan_name',
    sql: `UPDATE "audit_logs" SET "message" = REPLACE("message", 'Kế toán ketoan ', 'Kế toán Trần Thị Hương ') WHERE "message" LIKE '%Kế toán ketoan %'`,
  },
  {
    name: 'audit_laixe_name',
    sql: `UPDATE "audit_logs" SET "message" = REPLACE("message", 'Tài xế laixe ', 'Tài xế Lê Văn Tài ') WHERE "message" LIKE '%Tài xế laixe %'`,
  },
  {
    name: 'audit_strip_email_domain',
    sql: `UPDATE "audit_logs" SET "message" = REPLACE("message", '@nepo.vn', '') WHERE "message" LIKE '%@nepo.vn%'`,
  },
  {
    name: 'audit_strip_enum_tail',
    sql: `UPDATE "audit_logs" SET "message" = REGEXP_REPLACE("message", ' từ [A-Z_]+ sang [A-Z_]+$', '') WHERE "message" ~ ' từ [A-Z_]+ sang [A-Z_]+$'`,
  },
  {
    name: 'audit_normalize_chuyen_di',
    sql: `UPDATE "audit_logs" SET "message" = REPLACE("message", 'chuyến đi ', 'chuyến ') WHERE "message" LIKE '%chuyến đi %'`,
  },
  {
    name: 'audit_normalize_chuyen_xe',
    sql: `UPDATE "audit_logs" SET "message" = REPLACE("message", 'chuyến xe ', 'chuyến ') WHERE "message" LIKE '%chuyến xe %'`,
  },
  {
    name: 'audit_strip_trip_hash',
    sql: `UPDATE "audit_logs" SET "message" = REGEXP_REPLACE("message", '#\\d+(\\s|$)', '\\1', 'g') WHERE "message" ~ '#\\d+'`,
  },
  {
    name: 'backfill_remaining_full_names',
    sql: `UPDATE "users" SET "full_name" = COALESCE("username", 'Người dùng') WHERE "full_name" IS NULL`,
  },
];

export async function applyRuntimePatches(): Promise<void> {
  await client.unsafe(`
    CREATE TABLE IF NOT EXISTS "_applied_patches" (
      name  varchar(255) PRIMARY KEY,
      applied_at timestamp NOT NULL DEFAULT now()
    )
  `);

  const rows = await client.unsafe(`SELECT name FROM "_applied_patches"`).catch(() => ({ rows: [] as { name: string }[] }));
  const applied: Set<string> = new Set((rows as any).map?.((r: any) => r.name as string) ?? []);

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
