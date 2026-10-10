import { after, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { inArray } from 'drizzle-orm';
import { client, db } from '../db';
import * as s from '../db/schema';
import { getOutstandingAdvanceBalances } from '../services/advance.service';

/**
 * TỒN TẠM ỨNG must be reconcilable on screen: the card publishes
 *
 *   outstanding = Σ APPROVED requests − Σ APPROVED requests linked to an
 *                 APPROVED settlement
 *
 * These tests pin that identity against the real queries, including the
 * conservative rule that a request linked ONLY to a PENDING settlement is still
 * outstanding (kanban 101026203110).
 */

const createdUserIds: number[] = [];
const createdRequestIds: number[] = [];
const createdSettlementIds: number[] = [];

after(async () => {
  if (createdSettlementIds.length > 0) {
    await db.delete(s.advanceSettlementRequests)
      .where(inArray(s.advanceSettlementRequests.settlementId, createdSettlementIds));
    await db.delete(s.advanceSettlements).where(inArray(s.advanceSettlements.id, createdSettlementIds));
  }
  if (createdRequestIds.length > 0) {
    await db.delete(s.advanceRequests).where(inArray(s.advanceRequests.id, createdRequestIds));
  }
  if (createdUserIds.length > 0) {
    await db.delete(s.users).where(inArray(s.users.id, createdUserIds));
  }
  await client.end();
});

async function fixtureForwarder(label: string): Promise<number> {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const [user] = await db.insert(s.users).values({
    username: `qa-balance-${label}-${suffix}`,
    fullName: `QA balance ${label} ${suffix}`,
    passwordHash: 'x',
    role: 'FORWARDER',
  }).returning();
  createdUserIds.push(user.id);
  return user.id;
}

async function fixtureRequest(
  requesterId: number,
  amount: number,
  status: 'APPROVED' | 'PENDING',
): Promise<number> {
  const [row] = await db.insert(s.advanceRequests).values({
    requesterId,
    amount: String(amount),
    reason: 'QA balance fixture',
    status,
  }).returning();
  createdRequestIds.push(row.id);
  return row.id;
}

async function fixtureSettlement(
  forwarderId: number,
  amount: number,
  status: 'APPROVED' | 'PENDING',
): Promise<number> {
  const suffix = `${Date.now()}${Math.random().toString(36).slice(2, 6)}`;
  const [row] = await db.insert(s.advanceSettlements).values({
    code: `QA-${suffix}`.slice(0, 20),
    forwarderId,
    totalExpenseAmount: String(amount),
    status,
  }).returning();
  createdSettlementIds.push(row.id);
  return row.id;
}

async function link(settlementId: number, advanceRequestId: number): Promise<void> {
  await db.insert(s.advanceSettlementRequests).values({ settlementId, advanceRequestId });
}

describe('advance balance figures (kanban 101026203110)', () => {
  test('approved − settled equals the outstanding total, and a PENDING settlement does not settle anything', async () => {
    const before = await getOutstandingAdvanceBalances();

    const forwarderId = await fixtureForwarder('main');
    const settledRequest = await fixtureRequest(forwarderId, 1_000_000, 'APPROVED');
    const pendingOnlyRequest = await fixtureRequest(forwarderId, 2_000_000, 'APPROVED');
    const untouchedRequest = await fixtureRequest(forwarderId, 3_000_000, 'APPROVED');
    const unreviewedRequest = await fixtureRequest(forwarderId, 7_000_000, 'PENDING');

    const approvedSettlement = await fixtureSettlement(forwarderId, 1_000_000, 'APPROVED');
    await link(approvedSettlement, settledRequest);
    const pendingSettlement = await fixtureSettlement(forwarderId, 2_000_000, 'PENDING');
    await link(pendingSettlement, pendingOnlyRequest);

    const after = await getOutstandingAdvanceBalances();

    // Fixture deltas — immune to whatever else the shared dev DB holds.
    assert.strictEqual(after.approvedTotal - before.approvedTotal, 6_000_000, 'PENDING requests do not count as approved');
    assert.strictEqual(after.settledTotal - before.settledTotal, 1_000_000, 'only the APPROVED settlement settles its request');
    assert.strictEqual(after.totalOutstanding - before.totalOutstanding, 5_000_000, 'the PENDING-linked request stays outstanding');

    // The identity the UI publishes, on the FULL totals (not just the deltas).
    assert.strictEqual(
      after.totalOutstanding,
      after.approvedTotal - after.settledTotal,
      'outstanding must equal approved minus settled',
    );

    // The per-forwarder rows must add up to the same total.
    const rowSum = after.items.reduce((sum, item) => sum + item.outstanding, 0);
    assert.strictEqual(rowSum, after.totalOutstanding);
    const fixtureRow = after.items.find(item => item.forwarderId === forwarderId);
    assert.strictEqual(fixtureRow?.outstanding, 5_000_000, 'settled request leaves the row; the other two stay');

    // Untouched fixtures: 2M (pending settlement) + 3M (unlinked) stay; 7M is PENDING.
    assert.ok(untouchedRequest > 0 && unreviewedRequest > 0);
  });

  test('always reports finite figures with settled never above approved', async () => {
    const snapshot = await getOutstandingAdvanceBalances();
    for (const value of [snapshot.totalOutstanding, snapshot.approvedTotal, snapshot.settledTotal]) {
      assert.ok(Number.isFinite(value), 'every figure must be a finite number');
    }
    assert.ok(snapshot.settledTotal <= snapshot.approvedTotal);
  });

  test('a request linked to a REJECTED settlement is still outstanding', async () => {
    const before = await getOutstandingAdvanceBalances();

    const forwarderId = await fixtureForwarder('rejected');
    const requestId = await fixtureRequest(forwarderId, 4_000_000, 'APPROVED');
    const rejectedSettlement = await (async () => {
      const suffix = `${Date.now()}${Math.random().toString(36).slice(2, 6)}`;
      const [row] = await db.insert(s.advanceSettlements).values({
        code: `QR-${suffix}`.slice(0, 20),
        forwarderId,
        totalExpenseAmount: '4000000',
        status: 'REJECTED',
      }).returning();
      createdSettlementIds.push(row.id);
      return row.id;
    })();
    await link(rejectedSettlement, requestId);

    const after = await getOutstandingAdvanceBalances();
    assert.strictEqual(after.settledTotal - before.settledTotal, 0, 'REJECTED settlements settle nothing');
    assert.strictEqual(after.totalOutstanding - before.totalOutstanding, 4_000_000);
    assert.strictEqual(after.totalOutstanding, after.approvedTotal - after.settledTotal);
  });
});
