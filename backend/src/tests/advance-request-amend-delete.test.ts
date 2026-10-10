import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { eq, inArray } from 'drizzle-orm';
import { db, client } from '../db';
import * as s from '../db/schema';
import {
  updateAdvanceRequest,
  deleteAdvanceRequest,
  getAdvanceRequest,
  AdvanceError,
} from '../services/advance.service';

/**
 * Forwarder self-service amend/delete on an advance request.
 *
 * The guards are the whole point of this suite: an APPROVED request has already
 * been credited to the ledger at its original amount, so it is frozen; and a
 * request consumed by a phiếu hoàn ứng must survive for the outstanding-balance
 * maths even though nothing on it says "approved".
 */
describe('advance request amend / delete', () => {
  let requesterId: number;
  let otherUserId: number;
  const requestIds: number[] = [];
  const settlementIds: number[] = [];

  async function insertRequest(
    status: 'PENDING' | 'APPROVED' | 'REJECTED',
    overrides: Partial<typeof s.advanceRequests.$inferInsert> = {},
  ) {
    const [request] = await db.insert(s.advanceRequests).values({
      requesterId,
      amount: '20000000',
      reason: 'Tạm ứng nâng hạ',
      status,
      ...overrides,
    }).returning();
    requestIds.push(request.id);
    return request.id;
  }

  /** Link a request to a real settlement row so the FK guard has something to bite. */
  async function linkToSettlement(advanceRequestId: number) {
    const [settlement] = await db.insert(s.advanceSettlements).values({
      // `code` is varchar(20) with a unique index — keep the fixture short.
      code: `T${advanceRequestId}-${Math.random().toString(36).slice(2, 8)}`,
      forwarderId: requesterId,
      totalExpenseAmount: '0',
      refundAmount: '0',
      reimbursementAmount: '0',
    }).returning();
    settlementIds.push(settlement.id);
    await db.insert(s.advanceSettlementRequests).values({
      settlementId: settlement.id,
      advanceRequestId,
    });
    return settlement.id;
  }

  before(async () => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const users = await db.insert(s.users).values([
      { username: `amend-req-${suffix}`, passwordHash: 'x', fullName: 'Ops amend test', role: 'DRIVER' },
      { username: `amend-other-${suffix}`, passwordHash: 'x', fullName: 'Người khác amend test', role: 'DRIVER' },
    ]).returning();
    [requesterId, otherUserId] = users.map((row) => row.id);
  });

  after(async () => {
    await db.delete(s.advanceSettlementRequests)
      .where(inArray(s.advanceSettlementRequests.settlementId, settlementIds.length ? settlementIds : [-1]));
    await db.delete(s.advanceSettlements)
      .where(inArray(s.advanceSettlements.id, settlementIds.length ? settlementIds : [-1]));
    if (requestIds.length) await db.delete(s.advanceRequests).where(inArray(s.advanceRequests.id, requestIds));
    await db.delete(s.users).where(inArray(s.users.id, [requesterId, otherUserId]));
    await client.end();
  });

  /* ── update ───────────────────────────────────────────────────────────── */

  test('amends amount and reason on a PENDING request', async () => {
    const id = await insertRequest('PENDING');

    const updated = await updateAdvanceRequest(id, requesterId, {
      amount: 25500000,
      reason: 'Tạm ứng nâng hạ (đã sửa)',
    });

    assert.equal(Number(updated.amount), 25500000);
    assert.equal(updated.reason, 'Tạm ứng nâng hạ (đã sửa)');
    // Status is untouched — an amend never silently re-opens or approves a row.
    assert.equal(updated.status, 'PENDING');

    const row = await getAdvanceRequest(id);
    assert.equal(Number(row?.amount), 25500000);
  });

  test('amends a REJECTED request (rejection posts nothing to the ledger)', async () => {
    const id = await insertRequest('REJECTED');

    const updated = await updateAdvanceRequest(id, requesterId, {
      amount: 18000000,
      reason: 'Sửa lại sau khi bị từ chối',
    });

    assert.equal(Number(updated.amount), 18000000);
    assert.equal(updated.status, 'REJECTED');
  });

  test('refuses to amend an APPROVED request — the ledger already holds its amount', async () => {
    const id = await insertRequest('APPROVED');

    await assert.rejects(
      () => updateAdvanceRequest(id, requesterId, { amount: 999999, reason: 'gian lận' }),
      (err: unknown) => err instanceof AdvanceError
        && err.status === 400
        && /đã duyệt/.test(err.message),
    );

    const row = await getAdvanceRequest(id);
    assert.equal(Number(row?.amount), 20000000);
  });

  test("refuses to amend another user's request", async () => {
    const id = await insertRequest('PENDING');

    await assert.rejects(
      () => updateAdvanceRequest(id, otherUserId, { amount: 1, reason: 'của người khác' }),
      (err: unknown) => err instanceof AdvanceError && err.status === 403,
    );

    const row = await getAdvanceRequest(id);
    assert.equal(Number(row?.amount), 20000000);
  });

  test('reports a missing request as not found', async () => {
    await assert.rejects(
      () => updateAdvanceRequest(-1, requesterId, { amount: 1000, reason: 'x' }),
      (err: unknown) => err instanceof AdvanceError && err.status === 404,
    );
  });

  /* ── delete ───────────────────────────────────────────────────────────── */

  test('deletes a PENDING request outright', async () => {
    const id = await insertRequest('PENDING');

    const deleted = await deleteAdvanceRequest(id, requesterId);
    assert.equal(deleted.id, id);

    assert.equal(await getAdvanceRequest(id), null);
  });

  test('refuses to delete a request consumed by a phiếu hoàn ứng', async () => {
    const id = await insertRequest('PENDING');
    await linkToSettlement(id);

    // Deleting here would drop a row the settlement is settled against, and the
    // non-cascading FK would otherwise blow up as a raw 23503.
    await assert.rejects(
      () => deleteAdvanceRequest(id, requesterId),
      (err: unknown) => err instanceof AdvanceError
        && err.status === 400
        && /phiếu hoàn ứng/.test(err.message),
    );

    assert.notEqual(await getAdvanceRequest(id), null);
  });

  test('refuses to delete an APPROVED request', async () => {
    const id = await insertRequest('APPROVED');

    await assert.rejects(
      () => deleteAdvanceRequest(id, requesterId),
      (err: unknown) => err instanceof AdvanceError
        && err.status === 400
        && /đã duyệt/.test(err.message),
    );

    assert.notEqual(await getAdvanceRequest(id), null);
  });

  test("refuses to delete another user's request", async () => {
    const id = await insertRequest('PENDING');

    await assert.rejects(
      () => deleteAdvanceRequest(id, otherUserId),
      (err: unknown) => err instanceof AdvanceError && err.status === 403,
    );

    assert.notEqual(await getAdvanceRequest(id), null);
  });

  test('deleting twice reports not found the second time', async () => {
    const id = await insertRequest('PENDING');
    await deleteAdvanceRequest(id, requesterId);

    await assert.rejects(
      () => deleteAdvanceRequest(id, requesterId),
      (err: unknown) => err instanceof AdvanceError && err.status === 404,
    );
  });

  test('leaves other requests untouched when one is deleted', async () => {
    const keep = await insertRequest('PENDING');
    const drop = await insertRequest('PENDING');

    await deleteAdvanceRequest(drop, requesterId);

    const kept = await db.select().from(s.advanceRequests).where(eq(s.advanceRequests.id, keep));
    assert.equal(kept.length, 1);
  });
});