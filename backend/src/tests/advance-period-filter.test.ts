import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { eq, inArray } from 'drizzle-orm';
import { db, client } from '../db';
import * as s from '../db/schema';
import {
  getAdvanceRequestCounts,
  listAdvanceRequests,
  listAdvanceSettlements,
} from '../services/advance.service';

describe('advance and settlement calendar-month filtering', () => {
  let forwarderId: number;
  const requestIds: number[] = [];
  const settlementIds: number[] = [];

  before(async () => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const codePrefix = `${Date.now()}${Math.random().toString(36).slice(2)}`.slice(-14);
    const [forwarder] = await db.insert(s.users).values({
      username: `advance-period-${suffix}`,
      passwordHash: 'x',
      fullName: 'Ops period test',
      role: 'DRIVER',
    }).returning();
    forwarderId = forwarder.id;

    const requests = await db.insert(s.advanceRequests).values([
      { requesterId: forwarderId, amount: '100000', reason: 'Tháng 7', status: 'PENDING', createdAt: new Date('2026-07-31T10:00:00Z') },
      { requesterId: forwarderId, amount: '200000', reason: 'Tháng 8', status: 'APPROVED', createdAt: new Date('2026-08-01T10:00:00Z') },
      { requesterId: forwarderId, amount: '300000', reason: 'Tháng 9', status: 'PENDING', createdAt: new Date('2026-09-01T10:00:00Z') },
    ]).returning();
    requestIds.push(...requests.map(request => request.id));

    const settlements = await db.insert(s.advanceSettlements).values([
      { code: `PF-${codePrefix}-7`, forwarderId, totalExpenseAmount: '100000', createdAt: new Date('2026-07-31T10:00:00Z') },
      { code: `PF-${codePrefix}-8`, forwarderId, totalExpenseAmount: '200000', createdAt: new Date('2026-08-01T10:00:00Z') },
      { code: `PF-${codePrefix}-9`, forwarderId, totalExpenseAmount: '300000', createdAt: new Date('2026-09-01T10:00:00Z') },
    ]).returning();
    settlementIds.push(...settlements.map(settlement => settlement.id));
  });

  after(async () => {
    if (settlementIds.length) await db.delete(s.advanceSettlements).where(inArray(s.advanceSettlements.id, settlementIds));
    if (requestIds.length) await db.delete(s.advanceRequests).where(inArray(s.advanceRequests.id, requestIds));
    await db.delete(s.users).where(eq(s.users.id, forwarderId));
    await client.end();
  });

  test('includes only records created inside the selected calendar month', async () => {
    const period = { dateFrom: '2026-08-01', dateTo: '2026-08-31' };
    const [requests, counts, settlements] = await Promise.all([
      listAdvanceRequests({ requesterId: forwarderId, ...period }),
      getAdvanceRequestCounts({ requesterId: forwarderId, ...period }),
      listAdvanceSettlements({ forwarderId, ...period }),
    ]);

    assert.deepEqual(requests.map(request => request.reason), ['Tháng 8']);
    assert.deepEqual(counts, { APPROVED: 1 });
    assert.deepEqual(settlements.map(settlement => Number(settlement.totalExpenseAmount)), [200000]);
  });
});
