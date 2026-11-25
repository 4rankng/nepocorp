/**
 * NEPO-70 regression: the per-lot debit-note duplicate scope is the LOT, not
 * the (customer, month) period.
 *
 * The shipped bug: billing_documents_active_period_unique still covered lot
 * notes, so billing a second lot of the same customer in the same month died
 * on 409 "Dữ liệu đã tồn tại"; moving the period to another month "fixed" it —
 * proving the constraint was keyed by (khách hàng, tháng) instead of the lô.
 *
 * Pinned behavior:
 *  - two different lots of one customer, same month → both main notes save;
 *  - a second main-note save for the SAME lot → 409 "Dữ liệu đã tồn tại"
 *    (kept message parity with the 23505 handler) and the stored note is not
 *    replaced by the second payload;
 *  - the per-lot guard stays: the monthly-doc period unique index now applies
 *    to non-lot notes only (shipment_id IS NULL) — enforced by migration
 *    0135 + the service-level same-lot check in saveDocument.
 *
 * Integration-tier: needs the local dev Postgres (docker, :5440).
 */
import assert from 'node:assert/strict';
import { and, eq, inArray } from 'drizzle-orm';
import { db, client } from '../db';
import { disconnectRedis } from '../lib/redis';
import { ApiError } from '../errors';
import * as s from '../db/schema';
import { saveDocument } from '../services/billingDocument.service';
import type { SaveBillingDocumentInput } from '@tingting/shared';
import { describe, test, after } from './payment-ledger-test-utils';

type BillingLineInput = SaveBillingDocumentInput['lines'][number];

const customerIds: number[] = [];
const routeIds: number[] = [];
const cargoTypeIds: number[] = [];
const shipmentIds: number[] = [];
const tripIds: number[] = [];
const docIds: number[] = [];

describe('per-lot duplicate scope (NEPO-70)', () => {
  let customerId = 0;
  let shipmentA = 0;
  let shipmentB = 0;
  let tripA = 0;
  let tripB = 0;

  const seed = async () => {
    if (customerId) return;
    const suffix = `luniq${Date.now()}`;
    const [customer] = await db.insert(s.customers)
      .values({ name: `Lot-unique customer ${suffix}` })
      .returning();
    customerIds.push(customer.id);
    customerId = customer.id;
    const [route] = await db.insert(s.routes).values({ name: `Lot-unique route ${suffix}` }).returning({ id: s.routes.id });
    routeIds.push(route.id);
    const [cargo] = await db.insert(s.cargoTypes).values({ name: `Lot-unique cargo ${suffix}` }).returning({ id: s.cargoTypes.id });
    cargoTypeIds.push(cargo.id);

    const mkLot = async (code: string, tripCode: string, revenue: string) => {
      const [shipment] = await db.insert(s.shipments)
        .values({ shipmentCode: code, customerId: customer.id, cutoffDate: '2026-11-20' })
        .returning();
      shipmentIds.push(shipment.id);
      const [trip] = await db.insert(s.trips).values({
        tripCode,
        customerId: customer.id,
        routeId: route.id,
        cargoTypeId: cargo.id,
        shipmentId: shipment.id,
        carrierType: 'OWN',
        totalCost: '1000000',
        revenue,
        status: 'LOCKED',
        departureDate: '2026-11-05',
      }).returning({ id: s.trips.id });
      tripIds.push(trip.id);
      return { shipmentId: shipment.id, tripId: trip.id };
    };
    ({ shipmentId: shipmentA, tripId: tripA } = await mkLot(`LQA26${String(Date.now()).slice(-6)}`, `LQA-T-${suffix}`, '5000000'));
    ({ shipmentId: shipmentB, tripId: tripB } = await mkLot(`LQB26${String(Date.now()).slice(-6)}`, `LQB-T-${suffix}`, '6000000'));
  };

  const freightLine = (tripId: number, amount: number): BillingLineInput => ({
    sourceType: 'TRIP', sourceId: tripId, lineType: 'FREIGHT',
    typeLabel: 'Cước bộ', unit: 'lần', description: 'Cước vận chuyển',
    baseAmount: amount, amountOverride: null, excluded: false, sortOrder: 0,
  });

  const saveLot = (shipmentId: number, tripId: number, amount: number) =>
    saveDocument({
      type: 'DEBIT_NOTE',
      entityType: 'CUSTOMER',
      entityId: customerId,
      shipmentId,
      // Same month for both lots — the exact scenario the old constraint broke.
      rangeFrom: '2026-11-01',
      rangeTo: '2026-11-30',
      lines: [freightLine(tripId, amount)],
    }, null);

  test('two lots of the same customer in the same month both get a main note', async () => {
    await seed();
    const docA = await saveLot(shipmentA, tripA, 5_000_000);
    const docB = await saveLot(shipmentB, tripB, 6_000_000);
    docIds.push(docA.id, docB.id);

    assert.notEqual(docA.id, docB.id, 'two separate main notes');
    assert.equal(docA.shipmentId, shipmentA);
    assert.equal(docB.shipmentId, shipmentB);
    assert.match(docA.documentNumber ?? '', /^DN\d{8}$/, 'DN + yy + mm + seq4');
    assert.match(docB.documentNumber ?? '', /^DN\d{8}$/, 'DN + yy + mm + seq4');
    assert.notEqual(docA.documentNumber, docB.documentNumber, 'distinct DN numbers');
    assert.equal(docA.totalInclVat, 5_000_000);
    assert.equal(docB.totalInclVat, 6_000_000);

    const liveMains = await db.select({ id: s.billingDocuments.id, shipmentId: s.billingDocuments.shipmentId })
      .from(s.billingDocuments)
      .where(and(
        eq(s.billingDocuments.entityId, customerId),
        eq(s.billingDocuments.type, 'DEBIT_NOTE'),
        eq(s.billingDocuments.rangeFrom, '2026-11-01'),
        eq(s.billingDocuments.rangeTo, '2026-11-30'),
      ));
    assert.equal(liveMains.length, 2, 'same customer + same month hosts both lot notes');
  });

  test('a second main-note save for the same lot is refused without replacing the note', async () => {
    await seed();
    const [original] = await db.select().from(s.billingDocuments).where(eq(s.billingDocuments.shipmentId, shipmentA));

    // Different payload — proves the refusal is not a silent replace.
    await assert.rejects(
      saveLot(shipmentA, tripA, 9_999_000),
      (error: unknown) => error instanceof ApiError
        && error.statusCode === 409
        && error.message === 'Dữ liệu đã tồn tại',
    );

    const [afterRefusal] = await db.select().from(s.billingDocuments).where(eq(s.billingDocuments.id, original.id));
    assert.equal(afterRefusal.totalInclVat, '5000000', 'stored total untouched');
    const lines = await db.select().from(s.billingDocumentLines)
      .where(eq(s.billingDocumentLines.documentId, original.id));
    assert.equal(lines.length, 1);
    assert.equal(lines[0]!.sourceId, tripA);
    assert.equal(lines[0]!.baseAmount, '5000000', 'stored lines untouched');
    const mains = await db.select({ id: s.billingDocuments.id })
      .from(s.billingDocuments)
      .where(and(
        eq(s.billingDocuments.shipmentId, shipmentA),
        eq(s.billingDocuments.type, 'DEBIT_NOTE'),
      ));
    assert.equal(mains.length, 1, 'still exactly one main note for the lot');
  });
});

after(async () => {
  if (docIds.length) {
    await db.delete(s.billingDocumentLines).where(inArray(s.billingDocumentLines.documentId, docIds));
    await db.delete(s.ledger).where(and(
      eq(s.ledger.txnTable, 'billing_documents'),
      inArray(s.ledger.txnId, docIds),
    ));
    await db.delete(s.billingDocuments).where(inArray(s.billingDocuments.id, docIds));
  }
  if (tripIds.length) await db.delete(s.trips).where(inArray(s.trips.id, tripIds));
  if (shipmentIds.length) await db.delete(s.shipments).where(inArray(s.shipments.id, shipmentIds));
  if (customerIds.length) await db.delete(s.customers).where(inArray(s.customers.id, customerIds));
  if (routeIds.length) await db.delete(s.routes).where(inArray(s.routes.id, routeIds));
  if (cargoTypeIds.length) await db.delete(s.cargoTypes).where(inArray(s.cargoTypes.id, cargoTypeIds));
  await disconnectRedis();
  await client.end({ timeout: 1 });
});
