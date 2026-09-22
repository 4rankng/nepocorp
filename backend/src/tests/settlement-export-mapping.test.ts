import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { PassThrough } from 'node:stream';
import { eq } from 'drizzle-orm';
import ExcelJS from 'exceljs';
import { db, client } from '../db';
import * as s from '../db/schema';
import { disconnectRedis } from '../lib/redis';
import { buildSettlementExportData, exportSettlementHtml, exportSettlementXlsx } from '../services/settlement-export.service';

after(async () => { await disconnectRedis(); await client.end(); });

test('saved settlement exports use the accepted expense snapshot in HTML and Excel', async (t) => {
  const ids: { user?: number; customer?: number; route?: number; cargo?: number; trip?: number; expense?: number; request?: number; settlement?: number } = {};
  t.after(async () => {
    if (ids.settlement) {
      await db.delete(s.settlementExpenses).where(eq(s.settlementExpenses.settlementId, ids.settlement));
      await db.delete(s.advanceSettlementRequests).where(eq(s.advanceSettlementRequests.settlementId, ids.settlement));
      await db.delete(s.advanceSettlements).where(eq(s.advanceSettlements.id, ids.settlement));
    }
    if (ids.request) await db.delete(s.advanceRequests).where(eq(s.advanceRequests.id, ids.request));
    if (ids.expense) await db.delete(s.tripExpenses).where(eq(s.tripExpenses.id, ids.expense));
    if (ids.trip) await db.delete(s.trips).where(eq(s.trips.id, ids.trip));
    if (ids.cargo) await db.delete(s.cargoTypes).where(eq(s.cargoTypes.id, ids.cargo));
    if (ids.route) await db.delete(s.routes).where(eq(s.routes.id, ids.route));
    if (ids.customer) await db.delete(s.customers).where(eq(s.customers.id, ids.customer));
    if (ids.user) await db.delete(s.users).where(eq(s.users.id, ids.user));
  });
  const suffix = `${Date.now()}${Math.random().toString(36).slice(2, 5)}`;
  const [user] = await db.insert(s.users).values({ username: `export-${suffix}`, passwordHash: 'test-only', role: 'FORWARDER', fullName: 'QA export forwarder' }).returning(); ids.user = user.id;
  const [customer] = await db.insert(s.customers).values({ name: `QA export customer ${suffix}` }).returning(); ids.customer = customer.id;
  const [route] = await db.insert(s.routes).values({ name: `QA export route ${suffix}` }).returning(); ids.route = route.id;
  const [cargo] = await db.insert(s.cargoTypes).values({ name: `QA export cargo ${suffix}` }).returning(); ids.cargo = cargo.id;
  const [trip] = await db.insert(s.trips).values({ tripCode: `QA-EXP-${suffix}`, customerId: customer.id, routeId: route.id, cargoTypeId: cargo.id, departureDate: '2026-09-22' }).returning(); ids.trip = trip.id;
  // The live expense differs from the approved settlement snapshot. Historical
  // documents must use the accepted amount, never this later source value.
  const [expense] = await db.insert(s.tripExpenses).values({ tripId: trip.id, forwarderId: user.id, expenseType: 'LIFTING', buyAmount: '999000', containerNumber: 'QA-CONT' }).returning(); ids.expense = expense.id;
  const [request] = await db.insert(s.advanceRequests).values({ requesterId: user.id, amount: '300000', reason: 'QA export advance', status: 'APPROVED' }).returning(); ids.request = request.id;
  const [settlement] = await db.insert(s.advanceSettlements).values({ code: `QE-${suffix}`, forwarderId: user.id, totalExpenseAmount: '125000', refundAmount: '175000', status: 'APPROVED' }).returning(); ids.settlement = settlement.id;
  await db.insert(s.advanceSettlementRequests).values({ settlementId: settlement.id, advanceRequestId: request.id });
  await db.insert(s.settlementExpenses).values({ settlementId: settlement.id, tripExpenseId: expense.id, originalBuyAmount: '120000', adjustedBuyAmount: '125000', originalSnapshot: { buyAmount: '120000' }, adjustedSnapshot: { buyAmount: '125000' } });

  const data = await buildSettlementExportData(settlement.id);
  assert.ok(data);
  assert.equal(Number(data.linkedExpenses[0].amount), 125000);
  assert.equal(data.linkedExpenses[0].containerNumber, 'QA-CONT');
  assert.equal(data.linkedExpenses[0].customerName, customer.name);
  assert.equal(data.forwarderName, user.fullName);
  const html = await exportSettlementHtml(settlement.id);
  assert.ok(html);
  assert.match(html, /class="num">125\.000<\/td>/);
  assert.match(html, /<strong>125\.000 ₫<\/strong>/);
  assert.match(html, /175\.000 ₫/);
  assert.doesNotMatch(html, /999\.000|NaN/);

  const chunks: Buffer[] = [];
  const sink = new PassThrough();
  sink.on('data', chunk => chunks.push(Buffer.from(chunk)));
  assert.equal(await exportSettlementXlsx(settlement.id, sink), true);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(Uint8Array.from(Buffer.concat(chunks)).buffer);
  const numericValues: number[] = [];
  workbook.eachSheet(sheet => sheet.eachRow(row => row.eachCell(cell => {
    if (typeof cell.value === 'number') numericValues.push(cell.value);
  })));
  assert.ok(numericValues.includes(125000), 'Excel retains the accepted expense amount');
  assert.ok(numericValues.includes(175000), 'Excel retains the carry-forward advance');
  assert.ok(!numericValues.includes(999000), 'Excel does not read a later live expense value');
});

test('missing settlement still produces no export', async () => {
  assert.equal(await buildSettlementExportData(-1), null);
  assert.equal(await exportSettlementHtml(-1), null);
});
