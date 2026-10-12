/**
 * Role-escalation regression for the /users write paths (kanban 101026003220).
 *
 * A MANAGER must never be able to put an account into the ADMIN role — neither
 * when creating one nor when editing an existing account — while an ADMIN may
 * do both. The rule lives in user.service (where the role is written), so these
 * tests drive createUser/updateUser with real actor accounts, exactly as the
 * API does. They also pin the non-blocking side: a MANAGER still assigns roles
 * strictly below ADMIN.
 */
import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { eq, inArray } from 'drizzle-orm';
import { Role } from '@tingting/shared';
import { client, db } from '../db';
import * as s from '../db/schema';
import { ApiError } from '../errors';
import { disconnectRedis } from '../lib/redis';
import { createUser, updateUser } from '../services/user.service';

const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`.slice(-14);
const createdIds: number[] = [];
let managerId = 0;
let adminId = 0;

/** Asserts the promise rejects with the 403 role-grant refusal. */
async function rejectsGrant(promise: Promise<unknown>) {
  await assert.rejects(promise, (err: unknown) => {
    assert.ok(err instanceof ApiError, `expected ApiError, got ${String(err)}`);
    assert.equal(err.statusCode, 403);
    assert.match(err.message, /Chỉ quản trị viên mới có thể gán vai trò ADMIN/);
    return true;
  });
}

before(async () => {
  const actors = await db.insert(s.users).values([
    { username: `esc-mgr-${suffix}`.slice(0, 50), passwordHash: 'x', fullName: 'QA quản lý', role: 'MANAGER' },
    { username: `esc-adm-${suffix}`.slice(0, 50), passwordHash: 'x', fullName: 'QA quản trị', role: 'ADMIN' },
  ]).returning({ id: s.users.id, role: s.users.role });
  managerId = actors.find(a => a.role === 'MANAGER')!.id;
  adminId = actors.find(a => a.role === 'ADMIN')!.id;
});

after(async () => {
  const actorIds = [managerId, adminId].filter(id => id > 0);
  await db.delete(s.users).where(inArray(s.users.id, [...createdIds, ...actorIds]));
  await disconnectRedis();
  await client.end();
});

describe('only ADMIN may grant the ADMIN role', () => {
  test('a MANAGER cannot create an ADMIN account', async () => {
    const username = `esc-no-${suffix}`.slice(0, 50);
    await rejectsGrant(createUser({ username, password: 'secret1', role: Role.ADMIN }, managerId));

    const rows = await db.select({ id: s.users.id }).from(s.users).where(eq(s.users.username, username));
    assert.equal(rows.length, 0, 'the refused account must not be persisted');
  });

  test('a MANAGER can still create accounts strictly below ADMIN', async () => {
    const created = await createUser(
      { username: `esc-ok-${suffix}`.slice(0, 50), password: 'secret1', role: Role.ACCOUNTANT },
      managerId,
    );
    createdIds.push(created.id);
    assert.equal(created.role, Role.ACCOUNTANT);
  });

  test('an ADMIN can create an ADMIN account', async () => {
    const created = await createUser(
      { username: `esc-yes-${suffix}`.slice(0, 50), password: 'secret1', role: Role.ADMIN },
      adminId,
    );
    createdIds.push(created.id);
    assert.equal(created.role, Role.ADMIN);
  });

  test('a MANAGER cannot promote an existing account to ADMIN', async () => {
    const target = await createUser(
      { username: `esc-tgt-${suffix}`.slice(0, 50), password: 'secret1', role: Role.ACCOUNTANT },
      adminId,
    );
    createdIds.push(target.id);

    await rejectsGrant(updateUser(target.id, { role: Role.ADMIN }, managerId));

    const [kept] = await db.select({ role: s.users.role }).from(s.users).where(eq(s.users.id, target.id));
    assert.equal(kept.role, Role.ACCOUNTANT, 'the refused promotion must not change the stored role');
  });

  test('an ADMIN can promote an existing account to ADMIN', async () => {
    const target = await createUser(
      { username: `esc-prom-${suffix}`.slice(0, 50), password: 'secret1', role: Role.ACCOUNTANT },
      adminId,
    );
    createdIds.push(target.id);

    const updated = await updateUser(target.id, { role: Role.ADMIN }, adminId);
    assert.equal(updated.role, Role.ADMIN);
  });
});
