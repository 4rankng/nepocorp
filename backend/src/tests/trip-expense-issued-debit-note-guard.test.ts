/**
 * NEPO-72: a fee (dịch vụ đi kèm) referenced by a live issued Báo nợ is frozen.
 *
 * Pinned behavior:
 *  - updateTripExpense on a fee whose id rides an issued DEBIT_NOTE as an
 *    EXPENSE line → ApiError 409 naming the note (NEPO-69 immutability);
 *  - deleteTripExpenseGuarded on the same fee → 409 error, same message;
 *  - getTripExpenses exposes issuedDebitNoteNumber (documentNumber) only for
 *    fees on live issued notes, so the UI can block Sửa/Xóa with an
 *    explanation;
 *  - a fee not on any note still updates and deletes freely.
 *
 * Integration-tier: needs the local dev Postgres (docker, :5440).
 */
import assert from 'node:assert/strict';
import { eq, inArray } from 'drizzle-orm';
import { db, client } from '../db';
import { disconnectRedis } from '../lib/redis';
import { ApiError } from '../errors';
import * as s from '../db/schema';
import {
  deleteTripExpenseGuarded,
  getTripExpenses,
  updateTripExpense,
} from '../services/forwarder.service';
import { describe, test, after } from './payment-ledger-test-utils';

const customerIds: number[] = [];
const routeIds: number[] = [];
const cargoTypeIds: number[] = [];
const shipmentIds: number[] = [];
const tripIds: number[] = [];
const expenseIds: number[] = [];
const docIds: number[] = [];
let mainDocId = 0;
let mainNumber = '';
let tripId = 0;
let onNoteFeeId = 0;
let freeFeeId = 0;

describe('fee on an issued Báo nợ is frozen (NEPO-72)', () => {
  const seed = async () => {
    if (mainDocId) return;
    const suffix = `fee72${Date.now()}`;
    const [customer] = await db.insert(s.customers)
      .values({ name: `Issued note fee customer ${suffix}` })
      .returning();
    customerIds.push(customer.id);
    const [route] = await db.insert(s.routes)
      .values({ name: `Issued note fee route ${suffix}` })
      .returning({ id: s.routes.id });
    routeIds.push(route.id);
    const [cargo] = await db.insert(s.cargoTypes)
      .values({ name: `Issued note fee cargo ${suffix}` })
      .returning({ id: s.cargoTypes.id });
    cargoTypeIds.push(cargo.id);
    const [shipment] = await db.insert(s.shipments)
      .values({
        shipmentCode: `FEE72${String(Date.now()).slice(-6)}`,
        customerId: customer.id,
        cutoffDate: '2026-11-20',
      })
      .returning({ id: s.shipments.id });
    shipmentIds.push(shipment.id);
    const [trip] = await db.insert(s.trips)
      .values({
        tripCode: `FEE72-${suffix}`,
        customerId: customer.id,
        routeId: route.id,
        cargoTypeId: cargo.id,
        shipmentId: shipment.id,
        carrierType: 'OWN',
        totalCost: '1000000',
        revenue: '5000000',
        status: 'CREATED',
        departureDate: '2026-11-18',
      })
      .returning({ id: s.trips.id });
    tripIds.push(trip.id);
    tripId = trip.id;

    const fees = await db.insert(s.tripExpenses).values([
      {
        tripId: trip.id, expenseType: 'LIFTING', buyAmount: '350000',
        sellAmount: '400000', settlementMethod: 'COMPANY_DIRECT',
        approvalStatus: 'APPROVED',
      },
      {
        tripId: trip.id, expenseType: 'WEIGHING', buyAmount: '200000',
        sellAmount: '250000', settlementMethod: 'COMPANY_DIRECT',
        approvalStatus: 'APPROVED',
      },
    ]).returning({ id: s.tripExpenses.id });
    expenseIds.push(...fees.map((f) => f.id));
    [onNoteFeeId, freeFeeId] = fees.map((f) => f.id);

    // Live issued note holding the LIFTING fee.
    mainNumber = `DNFEE72${String(Date.now()).slice(-6)}`;
    const [doc] = await db.insert(s.billingDocuments).values({
      type: 'DEBIT_NOTE', entityType: 'CUSTOMER', entityId: customer.id,
      shipmentId: shipment.id,
      documentNumber: mainNumber,
      issuedAt: new Date(),
      rangeFrom: '2026-11-01', rangeTo: '2026-11-30',
      note: 'Báo nợ chính',
      totalInclVat: '400000',
    }).returning({ id: s.billingDocuments.id });
    mainDocId = doc.id;
    docIds.push(mainDocId);
    await db.insert(s.billingDocumentLines).values({
      documentId: mainDocId, sourceType: 'EXPENSE', sourceId: onNoteFeeId,
      lineType: 'SERVICE_FEE', typeLabel: 'Khác', unit: 'lần',
      description: 'Phí nâng hạ (đã lên Báo nợ)', baseAmount: '400000', sortOrder: 0,
    });
  };

  test('updateTripExpense refuses a fee on an issued Báo nợ and names it', async () => {
    await seed();
    await assert.rejects(
      updateTripExpense(db, onNoteFeeId, { buyAmount: '999000' }),
      (error: unknown) => error instanceof ApiError
        && error.statusCode === 409
        && /Báo nợ/.test(error.message)
        && error.message.includes(mainNumber),
    );
    const [after] = await db.select({ buyAmount: s.tripExpenses.buyAmount })
      .from(s.tripExpenses).where(eq(s.tripExpenses.id, onNoteFeeId));
    assert.equal(after.buyAmount, '350000', 'fee row untouched');
  });

  test('deleteTripExpenseGuarded refuses a fee on an issued Báo nợ', async () => {
    await seed();
    const result = await deleteTripExpenseGuarded(tripId, onNoteFeeId);
    assert.ok('error' in result && result.status === 409);
    assert.match(result.error, /Báo nợ/);
    assert.match(result.error, new RegExp(mainNumber));
    const [still] = await db.select({ id: s.tripExpenses.id })
      .from(s.tripExpenses).where(eq(s.tripExpenses.id, onNoteFeeId));
    assert.ok(still, 'fee row still exists');
  });

  test('getTripExpenses exposes issuedDebitNoteNumber only for issued-note fees', async () => {
    await seed();
    const rows = await getTripExpenses(db, tripId);
    const byId = new Map(rows.map((r) => [r.id, r]));
    assert.equal(byId.get(onNoteFeeId)!.issuedDebitNoteNumber, mainNumber);
    assert.equal(byId.get(freeFeeId)!.issuedDebitNoteNumber ?? null, null);
  });

  test('a fee not on any note still updates and deletes freely', async () => {
    await seed();
    const updated = await updateTripExpense(db, freeFeeId, { note: 'chỉnh sửa tự do' });
    assert.ok(updated, 'update returns the row');
    assert.equal(updated.note, 'chỉnh sửa tự do');
    const deleted = await deleteTripExpenseGuarded(tripId, freeFeeId);
    assert.ok(!('error' in deleted));
    const [gone] = await db.select({ id: s.tripExpenses.id })
      .from(s.tripExpenses).where(eq(s.tripExpenses.id, freeFeeId));
    assert.equal(gone, undefined);
    expenseIds.splice(expenseIds.indexOf(freeFeeId), 1);
  });

  test('a draft (not yet issued) note does not freeze its fee', async () => {
    await seed();
    const [extra] = await db.insert(s.tripExpenses).values({
      tripId, expenseType: 'INSPECTION', buyAmount: '150000',
      sellAmount: '180000', settlementMethod: 'COMPANY_DIRECT',
      approvalStatus: 'APPROVED',
    }).returning({ id: s.tripExpenses.id });
    expenseIds.push(extra.id);
    const [draft] = await db.insert(s.billingDocuments).values({
      type: 'DEBIT_NOTE', entityType: 'CUSTOMER', entityId: customerIds[0]!,
      documentNumber: `DNDRAFT${String(Date.now()).slice(-6)}`,
      rangeFrom: '2026-11-01', rangeTo: '2026-11-30',
      totalInclVat: '0',
    }).returning({ id: s.billingDocuments.id });
    docIds.push(draft.id);
    await db.insert(s.billingDocumentLines).values({
      documentId: draft.id, sourceType: 'EXPENSE', sourceId: extra.id,
      lineType: 'SERVICE_FEE', typeLabel: 'Khác', unit: 'lần',
      description: 'Phí kiểm định (bản nháp)', baseAmount: '180000', sortOrder: 0,
    });
    const rows = await getTripExpenses(db, tripId);
    const byId = new Map(rows.map((r) => [r.id, r]));
    assert.equal(byId.get(extra.id)!.issuedDebitNoteNumber ?? null, null, 'draft note does not freeze');
    const updated = await updateTripExpense(db, extra.id, { note: 'vẫn sửa được' });
    assert.ok(updated, 'update returns the row');
    assert.equal(updated.note, 'vẫn sửa được');
  });
});

after(async () => {
  if (docIds.length) {
    await db.delete(s.billingDocumentLines).where(inArray(s.billingDocumentLines.documentId, docIds));
    await db.delete(s.billingDocuments).where(inArray(s.billingDocuments.id, docIds));
  }
  if (expenseIds.length) await db.delete(s.tripExpenses).where(inArray(s.tripExpenses.id, expenseIds));
  if (tripIds.length) await db.delete(s.trips).where(inArray(s.trips.id, tripIds));
  if (shipmentIds.length) await db.delete(s.shipments).where(inArray(s.shipments.id, shipmentIds));
  if (customerIds.length) await db.delete(s.customers).where(inArray(s.customers.id, customerIds));
  if (routeIds.length) await db.delete(s.routes).where(inArray(s.routes.id, routeIds));
  if (cargoTypeIds.length) await db.delete(s.cargoTypes).where(inArray(s.cargoTypes.id, cargoTypeIds));
  await disconnectRedis();
  await client.end({ timeout: 1 });
});
