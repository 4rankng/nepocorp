/**
 * Ensure the standard QA/demo logins exist on the current database.
 *
 * A database restored from a production dump never ran src/seed.ts, so the
 * documented QA accounts (ketoan, giaonhan, laixe, giamdoc) are missing and
 * the manual test batches die at the login step (batches 2-6, 2026-10-12).
 *
 * This upserts ONLY missing accounts (a soft-deleted old row is left as
 * history; a fresh active row is inserted). It never touches an existing
 * active account or its password. The password matches src/seed.ts (admin123).
 */
import bcrypt from 'bcryptjs';
import { and, eq, isNull } from 'drizzle-orm';
import { Role } from '@tingting/shared';
import { db, client } from '../src/db';
import * as s from '../src/db/schema';

const QA_ACCOUNTS = [
  { username: 'ketoan', fullName: 'Kế toán QA', role: Role.ACCOUNTANT },
  { username: 'giamdoc', fullName: 'Giám đốc QA', role: Role.MANAGER },
  { username: 'giaonhan', fullName: 'Giao nhận QA', role: Role.FORWARDER },
  { username: 'laixe', fullName: 'Lái xe QA', role: Role.DRIVER },
] as const;

const main = async () => {
  const passwordHash = await bcrypt.hash('admin123', 10);
  for (const account of QA_ACCOUNTS) {
    const [existing] = await db.select({ id: s.users.id }).from(s.users)
      .where(and(eq(s.users.username, account.username), isNull(s.users.deletedAt)))
      .limit(1);
    if (existing) {
      console.log(`= ${account.username} đã tồn tại — bỏ qua`);
      continue;
    }
    await db.insert(s.users).values({
      username: account.username,
      fullName: account.fullName,
      role: account.role,
      passwordHash,
      status: 'ACTIVE',
    });
    console.log(`+ ${account.username} (${account.role}) — mật khẩu admin123`);
  }
  await client.end();
};

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
