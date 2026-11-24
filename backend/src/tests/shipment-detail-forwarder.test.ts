/**
 * NEPO-63 (QA 3b fail, build eb668fd 24/11) — GET /api/shipments/:id must not
 * hand the per-lô Báo nợ to roles outside the billing-documents policy:
 * Giao nhận (FORWARDER) gets billingDocuments: [] from the server itself (not
 * just a UI hide) while Kế toán still sees the full embedded list (3a kept).
 * r4 (QA 14:47 24/11): GET /:id/costs/register likewise strips the per-row
 * billing status ('Chưa lên/Đã lên Báo nợ') to null for those roles.
 *
 * Integration-tier: needs the local dev Postgres (docker, :5440).
 */
import assert from 'node:assert/strict';
import { inArray } from 'drizzle-orm';
import { LotFeeStatus, Role } from '@tingting/shared';
import { db, client } from '../db';
import * as s from '../db/schema';
import { getLotCostRegister, getShipmentDetail } from '../services/shipment.service';
import { disconnectRedis } from '../lib/redis';
import { describe, test, after, before } from './payment-ledger-test-utils';

const customerIds: number[] = [];
const shipmentIds: number[] = [];
const billingDocIds: number[] = [];
const shipmentCostIds: number[] = [];
let costOnNoteId = 0;   // rides the seeded note → ON_DEBIT_NOTE for billing roles
let costPendingId = 0;  // no note line → PENDING for billing roles

describe('shipment detail strips Báo nợ for Giao nhận (NEPO-63 QA 3b)', () => {
  before(async () => {
    const suffix = `fwd63${Date.now()}`;
    const [customer] = await db.insert(s.customers)
      .values({ name: `Forwarder scoping customer ${suffix}` })
      .returning();
    customerIds.push(customer.id);

    const [shipment] = await db.insert(s.shipments)
      .values({
        shipmentCode: `FWD63${String(Date.now()).slice(-6)}`,
        customerId: customer.id,
        cutoffDate: '2026-11-20',
      })
      .returning();
    shipmentIds.push(shipment.id);

    const [doc] = await db.insert(s.billingDocuments)
      .values({
        type: 'DEBIT_NOTE',
        entityType: 'CUSTOMER',
        entityId: customer.id,
        entityName: customer.name,
        shipmentId: shipment.id,
        documentNumber: `DNFWD63${String(Date.now()).slice(-6)}`,
        rangeFrom: '2026-11-01',
        rangeTo: '2026-11-30',
        totalInclVat: '12345000',
      })
      .returning({ id: s.billingDocuments.id });
    billingDocIds.push(doc.id);

    // Two cost rows for the r4 register check: one already on the note
    // (ON_DEBIT_NOTE), one untouched (PENDING) — both must read as null for
    // Giao nhận while Kế toán keeps the derived vocabulary.
    const costs = await db.insert(s.shipmentCosts).values([
      { shipmentId: shipment.id, costType: 'DOCUMENT_SERVICE', direction: 'CUSTOMER', description: 'Phí chứng từ B/L và C/O', amount: '1200000', incurredDate: '2026-11-18' },
      { shipmentId: shipment.id, costType: 'OTHER', direction: 'CUSTOMER', description: 'Phí chờ tại cảng Hải Phòng (2 ngày)', amount: '3500000', incurredDate: '2026-11-18' },
    ]).returning({ id: s.shipmentCosts.id });
    costOnNoteId = costs[0].id;
    costPendingId = costs[1].id;
    shipmentCostIds.push(...costs.map((c) => c.id));

    await db.insert(s.billingDocumentLines).values({
      documentId: doc.id,
      sourceType: 'SHIPMENT_COST',
      sourceId: costOnNoteId,
      lineType: 'SERVICE_FEE',
      typeLabel: 'Phí DV Chứng từ',
      unit: 'lần',
      description: 'Phí chứng từ (đã lên báo nợ chính)',
      baseAmount: '1200000',
      sortOrder: 0,
    });
  });

  after(async () => {
    if (billingDocIds.length) {
      await db.delete(s.billingDocumentLines).where(inArray(s.billingDocumentLines.documentId, billingDocIds));
      await db.delete(s.billingDocuments).where(inArray(s.billingDocuments.id, billingDocIds));
    }
    if (shipmentCostIds.length) await db.delete(s.shipmentCosts).where(inArray(s.shipmentCosts.id, shipmentCostIds));
    if (shipmentIds.length) await db.delete(s.shipments).where(inArray(s.shipments.id, shipmentIds));
    if (customerIds.length) await db.delete(s.customers).where(inArray(s.customers.id, customerIds));
    await disconnectRedis();
    await client.end();
  });

  test('FORWARDER payload carries no embedded Báo nợ (lô itself stays visible)', async () => {
    const detail = await getShipmentDetail(shipmentIds[0], Role.FORWARDER);
    assert.equal(detail.id, shipmentIds[0]);
    assert.equal(detail.billingDocuments.length, 0);
  });

  test('DISPATCHER is denied too — deny-by-default outside the policy set', async () => {
    const detail = await getShipmentDetail(shipmentIds[0], Role.DISPATCHER);
    assert.equal(detail.billingDocuments.length, 0);
  });

  test('ACCOUNTANT still sees the embedded notes (3a unchanged)', async () => {
    const detail = await getShipmentDetail(shipmentIds[0], Role.ACCOUNTANT);
    assert.equal(detail.billingDocuments.length, 1);
    assert.equal(detail.billingDocuments[0].totalInclVat, 12345000);
  });

  test('r4 — FORWARDER gets null per-row billing status from the cost register', async () => {
    const register = await getLotCostRegister(shipmentIds[0], Role.FORWARDER);
    const rows = register.groups.flatMap((g) => g.rows);
    assert.equal(rows.length, 2, 'cost rows stay visible — only the status is stripped');
    for (const row of rows) assert.equal(row.status, null);
  });

  test('r4 — deny-by-default: no role (internal callers) gets no billing status either', async () => {
    const register = await getLotCostRegister(shipmentIds[0]);
    for (const row of register.groups.flatMap((g) => g.rows)) assert.equal(row.status, null);
  });

  test('r4 — ACCOUNTANT keeps the derived status vocabulary (3a unchanged)', async () => {
    const register = await getLotCostRegister(shipmentIds[0], Role.ACCOUNTANT);
    const rows = register.groups.flatMap((g) => g.rows);
    assert.equal(rows.find((r) => r.id === costOnNoteId)?.status, LotFeeStatus.ON_DEBIT_NOTE);
    assert.equal(rows.find((r) => r.id === costPendingId)?.status, LotFeeStatus.PENDING);
  });
});
