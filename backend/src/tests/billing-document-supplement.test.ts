/**
 * Bổ sung -BS01 regression (NEPO-62): a supplement bills ONLY the lot's
 * source rows that are not already on any live document of the chain.
 *
 * The shipped bug filtered covered keys to SHIPMENT_COST lines only, so the
 * draft's TRIP freight lines leaked through the filter and every -BS01
 * re-billed the whole lot on top of the issued main note (QA: BS01 = 22.5M
 * instead of 500k). This suite pins the full chain behavior: TRIP/EXPENSE
 * rows count as billed, awaiting-invoice rows ride along amount-less, and
 * successive supplements number -BS01/-BS02 from the live chain only.
 *
 * Integration-tier: needs the local dev Postgres (docker, :5440).
 */
import assert from 'node:assert/strict';
import { and, eq, inArray } from 'drizzle-orm';
import { TxnType } from '@tingting/shared';
import { db, client } from '../db';
import { disconnectRedis } from '../lib/redis';
import { ApiError } from '../errors';
import * as s from '../db/schema';
import { createLotSupplement, deleteDocument } from '../services/billingDocument.service';
import { describe, test, after } from './payment-ledger-test-utils';

const customerIds: number[] = [];
const shipmentIds: number[] = [];
const tripIds: number[] = [];
const shipmentCostIds: number[] = [];
const docIds: number[] = [];

describe('lot debit note supplement (-BS01)', () => {
  let mainDocId = 0;
  let mainNumber = '';
  let billedCostId = 0;   // already on the main note
  let afterCostId = 0;    // collectible fee arising after phát hành
  let blankCostId = 0;    // Chờ hóa đơn — rides along amount-less

  // before() lives inside the first test's setup via lazy init — see seed().
  const seed = async () => {
    if (mainDocId) return;
    const suffix = `sup${Date.now()}`;
    const [customer] = await db.insert(s.customers)
      .values({ name: `Supplement customer ${suffix}` })
      .returning();
    customerIds.push(customer.id);

    const [shipment] = await db.insert(s.shipments)
      .values({
        shipmentCode: `SUP26${String(Date.now()).slice(-6)}`,
        customerId: customer.id,
        cutoffDate: '2026-11-20',
      })
      .returning();
    shipmentIds.push(shipment.id);

    const [route] = await db.insert(s.routes).values({ name: `Supplement route ${suffix}` }).returning();
    const [cargo] = await db.insert(s.cargoTypes).values({ name: `Supplement cargo ${suffix}` }).returning();

    const trip = async (code: string, revenue: string, departureDate: string) => {
      const [row] = await db.insert(s.trips).values({
        tripCode: code,
        customerId: customer.id,
        routeId: route.id,
        cargoTypeId: cargo.id,
        shipmentId: shipment.id,
        carrierType: 'OWN',
        totalCost: '1000000',
        revenue,
        status: 'LOCKED',
        departureDate,
      }).returning({ id: s.trips.id });
      tripIds.push(row.id);
      return row.id;
    };
    const tripA = await trip(`SUP-A-${suffix}`, '10000000', '2026-11-12');
    const tripB = await trip(`SUP-B-${suffix}`, '12000000', '2026-11-18');

    const costs = await db.insert(s.shipmentCosts).values([
      { shipmentId: shipment.id, costType: 'DOCUMENT_SERVICE', direction: 'CUSTOMER', description: 'Phí chứng từ (đã lên báo nợ chính)', amount: '1000000', incurredDate: '2026-11-10' },
      { shipmentId: shipment.id, costType: 'OTHER', direction: 'CUSTOMER', description: 'Thu khách phát sinh sau phát hành', amount: '500000', incurredDate: '2026-11-21' },
      { shipmentId: shipment.id, costType: 'HANDLING', direction: 'CUSTOMER', description: 'Chờ hóa đơn', amount: '2000000', awaitingInvoice: true, incurredDate: '2026-11-21' },
    ]).returning({ id: s.shipmentCosts.id });
    [billedCostId, afterCostId, blankCostId] = costs.map((c) => c.id);
    shipmentCostIds.push(...costs.map((c) => c.id));

    // The issued main note, exactly as QA had it: freight + the first fee.
    mainNumber = `DNTST${String(Date.now()).slice(-8)}`;
    const [main] = await db.insert(s.billingDocuments).values({
      type: 'DEBIT_NOTE', entityType: 'CUSTOMER', entityId: customer.id,
      shipmentId: shipment.id,
      documentNumber: mainNumber,
      issuedAt: new Date(),
      rangeFrom: '2026-11-01', rangeTo: '2026-11-30',
      note: 'Báo nợ chính',
      totalInclVat: '11000000',
      ledgerAdjustmentAmount: '1000000',
    }).returning({ id: s.billingDocuments.id });
    mainDocId = main.id;
    docIds.push(mainDocId);
    await db.insert(s.billingDocumentLines).values([
      { documentId: mainDocId, sourceType: 'TRIP', sourceId: tripA, lineType: 'FREIGHT', typeLabel: 'Cước bộ', unit: 'lần', description: 'Cước vận chuyển', baseAmount: '10000000', sortOrder: 0 },
      { documentId: mainDocId, sourceType: 'TRIP', sourceId: tripB, lineType: 'FREIGHT', typeLabel: 'Cước bộ', unit: 'lần', description: 'Cước vận chuyển', baseAmount: '12000000', sortOrder: 1 },
      { documentId: mainDocId, sourceType: 'SHIPMENT_COST', sourceId: billedCostId, lineType: 'SERVICE_FEE', typeLabel: 'Phí DV Chứng từ', unit: 'lần', description: 'Phí chứng từ (đã lên báo nợ chính)', baseAmount: '1000000', sortOrder: 2 },
    ]);
  };

  test('supplement bills only post-issuance rows, freight never re-billed', async () => {
    await seed();

    const supp = await createLotSupplement(mainDocId, null);
    docIds.push(supp.id);

    assert.equal(supp.documentNumber, `${mainNumber}-BS01`);
    assert.equal(supp.parentDocumentId, mainDocId);
    const costIds = supp.lines.filter((l) => l.sourceType === 'SHIPMENT_COST').map((l) => l.sourceId);
    assert.deepEqual(costIds.sort(), [afterCostId, blankCostId].sort(), 'only the two new fee rows');
    assert.equal(supp.lines.some((l) => l.sourceType === 'TRIP'), false, 'freight already billed on the main note');
    // NEPO-62 VAT — 500k × 1.08 (fee seeds with the DB-default 8% rate);
    // the Chờ hóa đơn row rides along amount-less.
    assert.equal(supp.totalInclVat, 540000, 'Chờ hóa đơn rides along amount-less');
    assert.equal(supp.ledgerAdjustmentAmount, 540000);

    const [adj] = await db.select().from(s.ledger).where(and(
      eq(s.ledger.txnType, TxnType.ADJUSTMENT),
      eq(s.ledger.txnId, supp.id),
      eq(s.ledger.txnTable, 'billing_documents'),
    ));
    assert.ok(adj, 'supplement posts its AR delta');
    assert.equal(adj.debit, '540000');
    assert.match(adj.note ?? '', new RegExp(`#${supp.id}\\b`));
  });

  test('second supplement numbers -BS02 from the live chain and stays incremental', async () => {
    await seed();
    const [first] = await db.select({ id: s.billingDocuments.id })
      .from(s.billingDocuments)
      .where(eq(s.billingDocuments.parentDocumentId, mainDocId));
    assert.ok(first, 'BS01 from the previous test');

    const [lateCost] = await db.insert(s.shipmentCosts).values({
      shipmentId: shipmentIds[0], costType: 'OTHER', direction: 'CUSTOMER',
      description: 'Phí phát sinh muộn', amount: '300000', incurredDate: '2026-11-22',
    }).returning({ id: s.shipmentCosts.id });
    shipmentCostIds.push(lateCost.id);

    const supp2 = await createLotSupplement(mainDocId, null);
    docIds.push(supp2.id);

    assert.equal(supp2.documentNumber, `${mainNumber}-BS02`);
    assert.deepEqual(
      supp2.lines.filter((l) => l.sourceType === 'SHIPMENT_COST').map((l) => l.sourceId),
      [lateCost.id],
      'BS02 covers only rows no live document carries — BS01 rows stay put',
    );
    assert.equal(supp2.totalInclVat, 324000); // NEPO-62 VAT — 300k × 1.08
  });

  test('deleting an un-issued supplement reverses the AR delta and frees its fee rows', async () => {
    await seed();
    // BS01/BS02 from the earlier tests carry the seeded fee rows, so two fresh
    // post-issuance rows give this test its own supplement.
    const late = await db.insert(s.shipmentCosts).values([
      { shipmentId: shipmentIds[0], costType: 'OTHER', direction: 'CUSTOMER', description: 'Thu khách xóa BS', amount: '400000', incurredDate: '2026-11-22' },
      { shipmentId: shipmentIds[0], costType: 'HANDLING', direction: 'CUSTOMER', description: 'Chờ hóa đơn xóa BS', amount: '100000', awaitingInvoice: true, incurredDate: '2026-11-22' },
    ]).returning({ id: s.shipmentCosts.id });
    shipmentCostIds.push(...late.map((c) => c.id));

    const supp = await createLotSupplement(mainDocId, null);
    docIds.push(supp.id);
    assert.equal(supp.documentNumber, `${mainNumber}-BS03`);
    assert.equal(supp.totalInclVat, 432000, 'Chờ hóa đơn rides along amount-less'); // NEPO-62 VAT — 400k × 1.08

    const deleted = await deleteDocument(supp.id);
    assert.equal(deleted.documentNumber, `${mainNumber}-BS03`);
    assert.equal(Number(deleted.totalInclVat), 432000);

    const [row] = await db.select({ deletedAt: s.billingDocuments.deletedAt })
      .from(s.billingDocuments).where(eq(s.billingDocuments.id, supp.id));
    assert.ok(row?.deletedAt, 'supplement soft-deleted');

    const [rev] = await db.select().from(s.ledger).where(and(
      eq(s.ledger.txnType, TxnType.ADJUSTMENT),
      eq(s.ledger.txnId, supp.id),
      eq(s.ledger.credit, '432000'),
    ));
    assert.ok(rev, 'deletion posts the reversal credit');

    // Trả lại trạng thái như trước khi tạo: the fee rows are billable again
    // and the next supplement re-numbers -BS03 from the live chain.
    const reborn = await createLotSupplement(mainDocId, null);
    docIds.push(reborn.id);
    assert.equal(reborn.documentNumber, `${mainNumber}-BS03`);
    assert.deepEqual(
      reborn.lines.filter((l) => l.sourceType === 'SHIPMENT_COST').map((l) => l.sourceId).sort(),
      late.map((c) => c.id).sort(),
      'exactly the freed rows, none of the live BS01/BS02 rows',
    );
  });

  test('an ISSUED note refuses deletion and the ledger stays untouched', async () => {
    await seed();
    await assert.rejects(
      () => deleteDocument(mainDocId),
      (err: unknown) => {
        assert.ok(err instanceof ApiError);
        assert.equal((err as ApiError).statusCode, 409);
        return true;
      },
    );
    const [row] = await db.select({ deletedAt: s.billingDocuments.deletedAt })
      .from(s.billingDocuments).where(eq(s.billingDocuments.id, mainDocId));
    assert.ok(row && !row.deletedAt, 'issued note survives');
    const entries = await db.select().from(s.ledger).where(and(
      eq(s.ledger.txnType, TxnType.ADJUSTMENT),
      eq(s.ledger.txnId, mainDocId),
    ));
    assert.equal(entries.length, 0, 'no reversal entry for a refused delete');
  });
});

after(async () => {
  if (docIds.length) {
    const lineDocs = await db.select({ id: s.billingDocumentLines.documentId })
      .from(s.billingDocumentLines)
      .where(inArray(s.billingDocumentLines.documentId, docIds));
    if (lineDocs.length) {
      await db.delete(s.billingDocumentLines).where(inArray(s.billingDocumentLines.documentId, docIds));
    }
    await db.delete(s.ledger).where(and(
      eq(s.ledger.txnTable, 'billing_documents'),
      inArray(s.ledger.txnId, docIds),
    ));
    await db.delete(s.billingDocuments).where(inArray(s.billingDocuments.id, docIds));
  }
  if (shipmentCostIds.length) await db.delete(s.shipmentCosts).where(inArray(s.shipmentCosts.id, shipmentCostIds));
  if (tripIds.length) await db.delete(s.trips).where(inArray(s.trips.id, tripIds));
  if (shipmentIds.length) await db.delete(s.shipments).where(inArray(s.shipments.id, shipmentIds));
  if (customerIds.length) await db.delete(s.customers).where(inArray(s.customers.id, customerIds));
  await disconnectRedis();
  await client.end({ timeout: 1 });
});
