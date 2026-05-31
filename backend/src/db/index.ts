import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { config } from '../config';

export const client = postgres(config.databaseUrl);
export const db = drizzle(client, { schema });
export type Database = typeof db;

/**
 * Idempotent runtime schema patches.
 *
 * These are tiny additive changes that we want applied automatically on
 * boot without requiring the operator to run `npm run db:migrate`. Each
 * statement must be safe to execute repeatedly (e.g. `IF NOT EXISTS`,
 * `UPDATE … WHERE column IS NULL`). Keep this list short — full schema
 * changes still belong in drizzle migrations.
 */
const RUNTIME_PATCHES: string[] = [
  // 2026-05-31 — Add users.full_name so audit log messages can show the actor
  // by real Vietnamese name instead of email ("Quản lý Lê Văn Tỉnh khóa
  // chuyến" vs the older "Quản lý giamdoc@nepo.vn khóa chuyến #76").
  `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "full_name" varchar(255)`,

  // Cap-table moved to amount-based model: each partner has a
  // contribution_amount, and the active snapshot's percentages are derived
  // as amount / sum(amount). This guarantees totals are always 100% by
  // construction so there's no separate "over-allocation" failure mode.
  // Keep `percentage` column for back-compat read-paths but treat it as a
  // cached value. Backfill contribution_amount for existing seed rows so
  // distribution works immediately rather than failing with empty plans.
  `ALTER TABLE "cap_table_history" ADD COLUMN IF NOT EXISTS "contribution_amount" numeric(15, 0) DEFAULT 0 NOT NULL`,
  `ALTER TABLE "cap_table_history" ADD COLUMN IF NOT EXISTS "percentage" numeric(5, 2) DEFAULT 0 NOT NULL`,
  // Seed equal contributions for the two demo partners so the derived
  // percentages are 50/50. Only fires when current amount is 0 (initial run).
  `UPDATE "cap_table_history" SET "contribution_amount" = 500000000 WHERE "partner_name" = 'Ông Thương' AND "contribution_amount" = 0`,
  `UPDATE "cap_table_history" SET "contribution_amount" = 500000000 WHERE "partner_name" = 'Ông Phụng' AND "contribution_amount" = 0`,
  `UPDATE "users" u SET "full_name" = d."name"
    FROM "drivers" d
    WHERE d."user_id" = u."id" AND u."full_name" IS NULL`,
  // Seed default real names so the audit log reads like "Quản trị viên
  // Phạm Anh Tuấn ..." rather than the username "admin".
  `UPDATE "users" SET "full_name" = 'Phạm Anh Tuấn' WHERE "username" = 'admin' AND "full_name" IS NULL`,
  `UPDATE "users" SET "full_name" = 'Lê Văn Tỉnh' WHERE "username" = 'giamdoc' AND "full_name" IS NULL`,
  `UPDATE "users" SET "full_name" = 'Trần Thị Hương' WHERE "username" = 'ketoan' AND "full_name" IS NULL`,
  // One-off fix: replace any user whose full_name accidentally got set to the
  // role label "Quản trị viên" (early bug from the previous migration draft)
  // so the audit log doesn't read "Quản trị Quản trị viên ...".
  `UPDATE "users" SET "full_name" = 'Phạm Anh Tuấn' WHERE "username" = 'admin' AND "full_name" = 'Quản trị viên'`,

  // Backfill historical audit_logs messages that were written before this fix
  // and still contain the raw username "admin" or "giamdoc" / "ketoan" /
  // "laixe". Safe because these are exact substring matches and the
  // replacements are no-ops on already-correct messages.
  `UPDATE "audit_logs" SET "message" = REPLACE("message", 'Quản trị viên admin ', 'Quản trị viên Phạm Anh Tuấn ') WHERE "message" LIKE '%Quản trị viên admin %'`,
  `UPDATE "audit_logs" SET "message" = REPLACE("message", 'Quản trị admin ', 'Quản trị viên Phạm Anh Tuấn ') WHERE "message" LIKE '%Quản trị admin %'`,
  `UPDATE "audit_logs" SET "message" = REPLACE("message", 'Quản trị Quản trị viên ', 'Quản trị viên Phạm Anh Tuấn ') WHERE "message" LIKE '%Quản trị Quản trị viên %'`,
  `UPDATE "audit_logs" SET "message" = REPLACE("message", 'Quản lý giamdoc ', 'Quản lý Lê Văn Tỉnh ') WHERE "message" LIKE '%Quản lý giamdoc %'`,
  `UPDATE "audit_logs" SET "message" = REPLACE("message", 'Kế toán ketoan ', 'Kế toán Trần Thị Hương ') WHERE "message" LIKE '%Kế toán ketoan %'`,
  `UPDATE "audit_logs" SET "message" = REPLACE("message", 'Tài xế laixe ', 'Tài xế Lê Văn Tài ') WHERE "message" LIKE '%Tài xế laixe %'`,
  // Strip the bare "@nepo.vn" tail in old messages that still embed the email.
  `UPDATE "audit_logs" SET "message" = REPLACE("message", '@nepo.vn', '') WHERE "message" LIKE '%@nepo.vn%'`,
  // Drop the old enum-leak "từ <ENUM> sang <ENUM>" tail entirely on historical
  // STATUS_CHANGED rows — the verb-specific row that fired for the same
  // action covers the meaning, so we shorten these to just the actor + verb.
  `UPDATE "audit_logs" SET "message" = REGEXP_REPLACE("message", ' từ [A-Z_]+ sang [A-Z_]+$', '') WHERE "message" ~ ' từ [A-Z_]+ sang [A-Z_]+$'`,
  // Older messages used "chuyến đi" / "chuyến xe" — normalise to "chuyến".
  `UPDATE "audit_logs" SET "message" = REPLACE("message", 'chuyến đi ', 'chuyến ') WHERE "message" LIKE '%chuyến đi %'`,
  `UPDATE "audit_logs" SET "message" = REPLACE("message", 'chuyến xe ', 'chuyến ') WHERE "message" LIKE '%chuyến xe %'`,
  // Strip "#<numeric_id>" trip references from any historical row that still
  // shows the DB id (e.g. "khóa chuyến xe#76") — these leak the DB primary
  // key. Only match "#digits" at word boundaries (end of string or before a
  // space) to avoid stripping legitimate content like "Hợp đồng #123".
  `UPDATE "audit_logs" SET "message" = REGEXP_REPLACE("message", '#\\d+(\\s|$)', '\\1', 'g') WHERE "message" ~ '#\\d+'`,
  `UPDATE "users" SET "full_name" = COALESCE("username", 'Người dùng') WHERE "full_name" IS NULL`,
];

export async function applyRuntimePatches(): Promise<void> {
  for (const sql of RUNTIME_PATCHES) {
    try {
      await client.unsafe(sql);
    } catch (err: any) {
      console.warn('[db] runtime patch failed (continuing):', err.message, '\n  sql:', sql.slice(0, 100));
    }
  }
}
