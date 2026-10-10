import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { and, eq, isNull } from 'drizzle-orm';
import { client, db } from '../db';
import * as s from '../db/schema';
import { ApiError } from '../errors';
import { softDeleteDriver } from '../services/driver.service';

after(async () => client.end());

/**
 * Driver deletion must be a SOFT delete (kanban 101026013020). Trips,
 * driver_work_days, penalties and salary_confirmations hold a FK to
 * `drivers.id`, so a hard delete would orphan settled history — the same
 * reason the truck delete is a soft delete. This asserts the row survives,
 * the profile is hidden from catalog lists (deletedAt + INACTIVE) and the
 * linked login is deactivated in the same transaction.
 */
test('softDeleteDriver retains the profile, hides it and deactivates the linked login', async (t) => {
  const suffix = Date.now();
  const [user] = await db.insert(s.users).values({
    username: `qa-del-${suffix}`,
    passwordHash: 'not-a-real-hash',
    role: 'DRIVER',
    status: 'ACTIVE',
  }).returning();
  const [driver] = await db.insert(s.drivers).values({
    userId: user.id,
    name: `QA Soft Delete ${suffix}`,
    status: 'ACTIVE',
  }).returning();
  t.after(async () => {
    await db.delete(s.drivers).where(eq(s.drivers.id, driver.id));
    await db.delete(s.users).where(eq(s.users.id, user.id));
  });

  await softDeleteDriver(driver.id);

  const [keptDriver] = await db.select().from(s.drivers).where(eq(s.drivers.id, driver.id));
  assert.ok(keptDriver, 'the driver row is retained so trip/salary FKs stay valid');
  assert.ok(keptDriver.deletedAt, 'deletedAt is stamped');
  assert.equal(keptDriver.status, 'INACTIVE');

  const [keptUser] = await db.select().from(s.users).where(eq(s.users.id, user.id));
  assert.ok(keptUser, 'the linked login row is retained, never removed');
  assert.ok(keptUser.deletedAt, 'the linked login is soft-deleted too');
  assert.equal(keptUser.status, 'INACTIVE');

  const visible = await db.select({ id: s.drivers.id }).from(s.drivers)
    .where(and(eq(s.drivers.id, driver.id), isNull(s.drivers.deletedAt)));
  assert.equal(visible.length, 0, 'the row is filtered out of catalog lists (deletedAt IS NULL)');
});

/**
 * Guard: deleting an id that does not exist (or was already deleted) must fail
 * with 404 rather than silently reporting success.
 */
test('softDeleteDriver rejects an unknown driver with 404', async () => {
  await assert.rejects(
    softDeleteDriver(-1),
    (err: unknown) => err instanceof ApiError && err.statusCode === 404,
  );
});
