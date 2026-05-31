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
  `UPDATE "users" u SET "full_name" = d."name"
    FROM "drivers" d
    WHERE d."user_id" = u."id" AND u."full_name" IS NULL`,
  `UPDATE "users" SET "full_name" = 'Quản trị viên' WHERE "username" = 'admin' AND "full_name" IS NULL`,
  `UPDATE "users" SET "full_name" = 'Lê Văn Tỉnh' WHERE "username" = 'giamdoc' AND "full_name" IS NULL`,
  `UPDATE "users" SET "full_name" = 'Trần Thị Hương' WHERE "username" = 'ketoan' AND "full_name" IS NULL`,
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
