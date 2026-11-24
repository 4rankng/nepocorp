/**
 * NEPO-63 (QA 3b fail, build eb668fd 24/11) — GET /api/shipments/:id must not
 * hand the per-lô Báo nợ to roles outside the billing-documents policy:
 * Giao nhận (FORWARDER) gets billingDocuments: [] from the server itself (not
 * just a UI hide) while Kế toán still sees the full embedded list (3a kept).
 *
 * Integration-tier: needs the local dev Postgres (docker, :5440).
 */
import assert from 'node:assert/strict';
import { inArray } from 'drizzle-orm';
import { Role } from '@tingting/shared';
import { db, client } from '../db';
import * as s from '../db/schema';
import { getShipmentDetail } from '../services/shipment.service';
import { disconnectRedis } from '../lib/redis';
import { describe, test, after, before } from './payment-ledger-test-utils';

const customerIds: number[] = [];
const shipmentIds: number[] = [];
const billingDocIds: number[] = [];

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
  });

  after(async () => {
    if (billingDocIds.length) await db.delete(s.billingDocuments).where(inArray(s.billingDocuments.id, billingDocIds));
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
});
