/**
 * Receipt-group edit/delete ROUTES (NEPO-52) — HTTP behavior of
 * PUT/DELETE /payments/by-receipt/:customerId/:receiptId, the endpoints the
 * sổ chi tiết's receipted payment rows call (their synthetic display ids can
 * never satisfy the per-entry /payments/:id validation).
 *
 * Pins: param validation (bad customerId → the same 400 message the
 * accountant saw), the ADMIN role gate, the collapse/delete response
 * (collapsed_count, ids, new_balance), and the audit trail carrying the
 * receipt total + FIFO-collapse note.
 *
 * Integration-tier: needs the local dev Postgres (docker, :5440) — the
 * ledger, the recompute and the audit_logs write are the behavior under
 * test.
 */
import assert from 'node:assert/strict';
import http from 'http';
import type { AddressInfo } from 'net';
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { and, eq, gte, inArray, like } from 'drizzle-orm';
import { db, client } from '../db';
import * as s from '../db/schema';
import { Role } from '@tingting/shared';
import { config } from '../config';
import { initEnforcer } from '../casbin/enforcer';
import { initAuditService } from '../services/audit.service';
import { disconnectRedis } from '../lib/redis';
import financialRoutes from '../routes/financial';
import { authMiddleware } from '../middleware/auth';
import { casbinAuthz } from '../middleware/casbin';
import { auditLogMiddleware } from '../middleware/audit';
import { globalErrorHandler } from '../middleware/errorHandler';
import { recordPayment } from '../services/financial.service';
import { describe, paymentRows, seedCustomerWithDebt, test, testSuffix, after, before } from './payment-ledger-test-utils';

const app = express();
app.use(express.json());
app.use(auditLogMiddleware);
app.use('/api', authMiddleware, casbinAuthz('financial'), financialRoutes);
app.use(globalErrorHandler);

let server: http.Server;
let baseUrl = '';
let adminToken = '';

const createdCustomerIds: number[] = [];
const createdTripIds: number[] = [];
const createdRouteIds: number[] = [];
const createdCargoTypeIds: number[] = [];
const createdUserIds: number[] = [];
const testStartedAt = new Date();

async function testFetch(urlPath: string, options: { method?: string; body?: string; token?: string } = {}) {
  const res = await fetch(`${baseUrl}${urlPath}`, {
    method: options.method,
    body: options.body,
    headers: {
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

before(async () => {
  await initAuditService();
  await initEnforcer();

  // Executor form: server.listen signals via a callback, and the backend's
  // TS lib predates Promise.withResolvers (es2024).
  await new Promise<void>((resolve) => {
    server = http.createServer(app);
    server.listen(0, () => {
      baseUrl = `http://localhost:${(server.address() as AddressInfo).port}`;
      resolve();
    });
  });

  // Same seeded admin the E2E suite logs in as (create when a fresh CI DB).
  let [adm] = await db.select().from(s.users)
    .where(and(eq(s.users.username, 'admin'), eq(s.users.role, Role.ADMIN)))
    .limit(1);
  if (!adm) {
    [adm] = await db.insert(s.users).values({
      username: 'admin', passwordHash: await bcrypt.hash('admin123', 10), role: Role.ADMIN,
    }).returning();
    createdUserIds.push(adm.id);
  }
  // Sign with the SAME secret the auth middleware verifies against
  // (config.jwtSecret) — a runner env without JWT_SECRET used to diverge
  // from the config fallback and 401 every request.
  adminToken = jwt.sign({ id: adm.id, role: adm.role, username: adm.username }, config.jwtSecret, { expiresIn: '1h' });
});

after(async () => {
  server?.close();
  if (createdCustomerIds.length > 0) {
    await db.delete(s.ledger).where(and(
      eq(s.ledger.entityType, 'CUSTOMER'),
      inArray(s.ledger.entityId, createdCustomerIds),
    ));
    await db.delete(s.auditLogs).where(gte(s.auditLogs.timestamp, testStartedAt));
  }
  if (createdTripIds.length > 0) await db.delete(s.trips).where(inArray(s.trips.id, createdTripIds));
  if (createdRouteIds.length > 0) await db.delete(s.routes).where(inArray(s.routes.id, createdRouteIds));
  if (createdCargoTypeIds.length > 0) await db.delete(s.cargoTypes).where(inArray(s.cargoTypes.id, createdCargoTypeIds));
  if (createdCustomerIds.length > 0) await db.delete(s.customers).where(inArray(s.customers.id, createdCustomerIds));
  if (createdUserIds.length > 0) await db.delete(s.users).where(inArray(s.users.id, createdUserIds));
  await disconnectRedis();
  await client.end();
});

const trackers = {
  customerIds: createdCustomerIds,
  tripIds: createdTripIds,
  routeIds: createdRouteIds,
  cargoTypeIds: createdCargoTypeIds,
};

describe('receipt-group edit/delete routes (NEPO-52)', () => {
  test('PUT edits the whole receipt through HTTP and leaves an audit row with the collapse note', async () => {
    const suffix = testSuffix();
    const { customerId, tripA } = await seedCustomerWithDebt(suffix, trackers);
    const receiptId = `PT-RT-${suffix}`;
    await recordPayment({
      paymentMethod: 'BANK',
      customerId,
      receiptId,
      payments: [{ tripId: tripA, amount: 12_000_000 }],   // splits into 2 slices
    });
    assert.equal((await paymentRows(customerId)).length, 2);
    const today = new Date().toISOString().slice(0, 10);

    const res = await testFetch(`/api/payments/by-receipt/${customerId}/${encodeURIComponent(receiptId)}`, {
      method: 'PUT',
      token: adminToken,
      body: JSON.stringify({ amount: 1_772_400, receiptId, receivedDate: today, paymentMethod: 'BANK' }),
    });

    assert.equal(res.status, 200);
    assert.equal(res.data.ok, true);
    assert.equal(res.data.updated.amount, 1_772_400);
    assert.equal(res.data.updated.collapsed_count, 1, 'sibling FIFO slice collapsed');
    assert.equal(res.data.new_balance, 13_227_600);
    const afterRows = await paymentRows(customerId);
    assert.equal(afterRows.length, 1, 'the receipt sits on the books as ONE slice');

    // Audit trail: the collapse lands with amount + receipt + FIFO note.
    // The write is fire-and-forget (private event bus, no completion
    // handle), so the test polls the DB with a bounded deadline instead of
    // guessing a fixed delay — awaiting the real row IS the awaited signal.
    const auditDeadline = Date.now() + 5_000;
    let auditRow: typeof s.auditLogs.$inferSelect | undefined;
    while (Date.now() < auditDeadline) {
      const [row] = await db.select().from(s.auditLogs)
        .where(and(
          eq(s.auditLogs.entityType, 'payments'),
          like(s.auditLogs.message, `%${receiptId}%`),
          gte(s.auditLogs.timestamp, testStartedAt),
        ))
        .limit(1);
      if (row) { auditRow = row; break; }
      await new Promise(r => setTimeout(r, 50));  // bounded poll, ~ms scale
    }
    assert.ok(auditRow, 'an audit row for the receipt edit exists');
    assert.ok(auditRow.message.includes('1.772.400'), 'audit message carries the corrected total');
    assert.ok(auditRow.message.includes('gộp 2 dòng FIFO'), 'audit message notes the collapse (2 slices → 1)');
    assert.equal(auditRow.entityId, afterRows[0].id);
  });

  test('DELETE removes every slice through HTTP; a repeat 404s; bad params 400', async () => {
    const suffix = testSuffix();
    const { customerId, tripA } = await seedCustomerWithDebt(suffix, trackers);
    const receiptId = `PT-RT2-${suffix}`;
    await recordPayment({
      paymentMethod: 'CASH',
      customerId,
      receiptId,
      payments: [{ tripId: tripA, amount: 12_000_000 }],
    });

    const del = await testFetch(`/api/payments/by-receipt/${customerId}/${encodeURIComponent(receiptId)}`, {
      method: 'DELETE',
      token: adminToken,
    });
    assert.equal(del.status, 200);
    assert.equal(del.data.deleted.ids.length, 2, 'both FIFO slices go');
    assert.equal(del.data.deleted.amount, 12_000_000);
    assert.equal(del.data.new_balance, 15_000_000);
    assert.equal((await paymentRows(customerId)).length, 0);

    const repeat = await testFetch(`/api/payments/by-receipt/${customerId}/${encodeURIComponent(receiptId)}`, {
      method: 'DELETE',
      token: adminToken,
    });
    assert.equal(repeat.status, 404);

    // Non-numeric customerId → the 400 the accountant must never see from a
    // healthy row (this was the old per-entry failure mode).
    const bad = await testFetch(`/api/payments/by-receipt/abc/${encodeURIComponent(receiptId)}`, {
      method: 'DELETE',
      token: adminToken,
    });
    assert.equal(bad.status, 400);
    assert.equal(bad.data.error, 'ID bản ghi thanh toán không hợp lệ');
  });
});
