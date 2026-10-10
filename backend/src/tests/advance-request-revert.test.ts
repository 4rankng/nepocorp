import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { eq, inArray } from 'drizzle-orm';
import { db, client } from '../db';
import * as s from '../db/schema';
import { restoreAdvanceRequest, AdvanceError } from '../services/advance.service';

/**
 * REJECTED → PENDING undo (kanban 101026013000). A rejected request used to be
 * a dead end; this guard is the only place that may flip it back, and only from
 * REJECTED.
 */
describe('advance request rejection revert', () => {
  let requesterId: number;
  let managerId: number;
  const requestIds: number[] = [];

  async function insertRequest(status: 'PENDING' | 'APPROVED' | 'REJECTED') {
    const [request] = await db.insert(s.advanceRequests).values({
      requesterId,
      amount: '20000000',
      reason: 'Tạm ứng nâng hạ',
      status,
      approvedBy: status === 'PENDING' ? null : managerId,
      approvedAt: status === 'PENDING' ? null : new Date(),
    }).returning();
    requestIds.push(request.id);
    return request.id;
  }

  before(async () => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const users = await db.insert(s.users).values([
      { username: `revert-req-${suffix}`, passwordHash: 'x', fullName: 'Ops revert test', role: 'DRIVER' },
      { username: `revert-mgr-${suffix}`, passwordHash: 'x', fullName: 'Quản lý revert test', role: 'MANAGER' },
    ]).returning();
    [requesterId, managerId] = users.map((row) => row.id);
  });

  after(async () => {
    if (requestIds.length) await db.delete(s.advanceRequests).where(inArray(s.advanceRequests.id, requestIds));
    await db.delete(s.users).where(inArray(s.users.id, [requesterId, managerId]));
    await client.end();
  });

  test('moves a REJECTED request back to PENDING and clears the decision', async () => {
    const id = await insertRequest('REJECTED');

    const restored = await restoreAdvanceRequest(id);

    assert.equal(restored.status, 'PENDING');
    assert.equal(restored.approvedBy, null);
    assert.equal(restored.approvedAt, null);
    assert.equal(restored.requesterName, 'Ops revert test');

    const [row] = await db.select().from(s.advanceRequests).where(eq(s.advanceRequests.id, id));
    assert.equal(row.status, 'PENDING');
    assert.equal(row.approvedBy, null);
    assert.equal(row.approvedAt, null);
  });

  test('refuses to restore a request that is not REJECTED', async () => {
    const pendingId = await insertRequest('PENDING');
    await assert.rejects(
      () => restoreAdvanceRequest(pendingId),
      (err: unknown) => err instanceof AdvanceError
        && err.status === 400
        && /Cannot restore request with status PENDING/.test(err.message),
    );

    const approvedId = await insertRequest('APPROVED');
    await assert.rejects(
      () => restoreAdvanceRequest(approvedId),
      (err: unknown) => err instanceof AdvanceError
        && err.status === 400
        && /status APPROVED/.test(err.message),
    );
  });

  test('is one-shot — a restored request cannot be restored again', async () => {
    const id = await insertRequest('REJECTED');
    await restoreAdvanceRequest(id);

    await assert.rejects(
      () => restoreAdvanceRequest(id),
      (err: unknown) => err instanceof AdvanceError && err.status === 400,
    );
  });

  test('reports a missing request as not found', async () => {
    await assert.rejects(
      () => restoreAdvanceRequest(-1),
      (err: unknown) => err instanceof AdvanceError && err.status === 404,
    );
  });
});
