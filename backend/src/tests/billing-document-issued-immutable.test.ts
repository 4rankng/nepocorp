/**
 * NEPO-69 regression: an issued lot debit note is immutable.
 *
 * The shipped bug let "Lập Báo nợ lô" (POST /api/finance/billing-documents)
 * replace an ISSUED main note in place: the matched-period save updated the
 * doc's total, swapped its lines, and kept issuedAt — so a fee that had also
 * landed on a -BS01 supplement existed on BOTH documents (double count) and
 * the lot revenue was wrong.
 *
 * Pinned behavior:
 *  - saving a draft for a lot whose main note is issued → 409, and the issued
 *    note is byte-identical before/after (total, lines, issuedAt, ledger);
 *  - generate previews only the not-yet-billed rows ('Đã lên Báo nợ' rows are
 *    left out — same predicate as the lô cost register);
 *  - the -BS01 supplement flow keeps working for post-issuance fees.
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
import {
  createLotSupplement,
  generateDraft,
  saveDocument,
} from '../services/billingDocument.service';
import type { SaveBillingDocumentInput } from '@tingting/shared';
import { describe, test, after } from './payment-ledger-test-utils';

type BillingLineInput = SaveBillingDocumentInput['lines'][number];

const customerIds: number[] = [];
const routeIds: number[] = [];
const cargoTypeIds: number[] = [];
const shipmentIds: number[] = [];
const tripIds: number[] = [];
const shipmentCostIds: number[] = [];
const docIds: number[] = [];
let mainDocId = 0;
let mainNumber = '';

describe('issued lot debit note is immutable (NEPO-69)', () => {
  let billedCostId = 0;   // fee already on the issued main note
  let afterCostId = 0;    // 400k fee arising after phát hành (the repro)
  let tripA = 0;
  let tripB = 0;

  const seed = async () => {
    if (mainDocId) return;
    const suffix = `imm${Date.now()}`;
    const [customer] = await db.insert(s.customers)
      .values({ name: `Immutable issued customer ${suffix}` })
      .returning();
    customerIds.push(customer.id);
    const [route] = await db.insert(s.routes).values({ name: `Immutable issued route ${suffix}` }).returning({ id: s.routes.id });
    routeIds.push(route.id);
    const [cargo] = await db.insert(s.cargoTypes).values({ name: `Immutable issued cargo ${suffix}` }).returning({ id: s.cargoTypes.id });
    cargoTypeIds.push(cargo.id);

    const [shipment] = await db.insert(s.shipments)
      .values({
        shipmentCode: `IMM26${String(Date.now()).slice(-6)}`,
        customerId: customer.id,
        cutoffDate: '2026-11-20',
      })
      .returning();
    shipmentIds.push(shipment.id);

    const mkTrip = async (code: string, revenue: string, departureDate: string) => {
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
    tripA = await mkTrip(`IMM-A-${suffix}`, '10000000', '2026-11-12');
    tripB = await mkTrip(`IMM-B-${suffix}`, '12000000', '2026-11-18');

    const costs = await db.insert(s.shipmentCosts).values([
      { shipmentId: shipment.id, costType: 'DOCUMENT_SERVICE', direction: 'CUSTOMER', description: 'Phí chứng từ (đã lên báo nợ chính)', amount: '1000000', incurredDate: '2026-11-10' },
      { shipmentId: shipment.id, costType: 'OTHER', direction: 'CUSTOMER', description: 'Phí phát sinh sau phát hành', amount: '400000', incurredDate: '2026-11-21' },
    ]).returning({ id: s.shipmentCosts.id });
    [billedCostId, afterCostId] = costs.map((c) => c.id);
    shipmentCostIds.push(...costs.map((c) => c.id));

    // The issued main note, exactly as QA had it: freight 10M + 12M + fee 1M.
    mainNumber = `DNTST${String(Date.now()).slice(-8)}`;
    const [main] = await db.insert(s.billingDocuments).values({
      type: 'DEBIT_NOTE', entityType: 'CUSTOMER', entityId: customer.id,
      shipmentId: shipment.id,
      documentNumber: mainNumber,
      issuedAt: new Date(),
      rangeFrom: '2026-11-01', rangeTo: '2026-11-30',
      note: 'Báo nợ chính',
      totalInclVat: '23000000',
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

  const freightLine = (tripId: number, amount: number, sortOrder: number): BillingLineInput => ({
    sourceType: 'TRIP', sourceId: tripId, lineType: 'FREIGHT',
    typeLabel: 'Cước bộ', unit: 'lần', description: 'Cước vận chuyển',
    baseAmount: amount, amountOverride: null, excluded: false, sortOrder,
  });

  const feeLine = (costId: number, amount: number, sortOrder: number): BillingLineInput => ({
    sourceType: 'SHIPMENT_COST', sourceId: costId, lineType: 'SERVICE_FEE',
    typeLabel: 'Khác', unit: 'lần', description: 'Phí',
    baseAmount: amount, amountOverride: null, excluded: false, sortOrder,
  });

  test('saving a draft for a lot with an issued main note is refused and mutates nothing', async () => {
    await seed();
    const [shipment] = await db.select({ customerId: s.shipments.customerId })
      .from(s.shipments).where(eq(s.shipments.id, shipmentIds[0]!));

    const before = await db.select().from(s.billingDocuments).where(eq(s.billingDocuments.id, mainDocId));
    const beforeLines = await db.select().from(s.billingDocumentLines)
      .where(eq(s.billingDocumentLines.documentId, mainDocId))
      .orderBy(s.billingDocumentLines.sortOrder);

    // What the UI sends for "Lập Báo nợ lô": the full rebuilt draft including
    // already-billed rows plus the new fee — the exact overwrite payload.
    await assert.rejects(
      saveDocument({
        type: 'DEBIT_NOTE',
        entityType: 'CUSTOMER',
        entityId: shipment.customerId,
        shipmentId: shipmentIds[0]!,
        rangeFrom: '2026-11-01',
        rangeTo: '2026-11-30',
        lines: [
          freightLine(tripA, 10_000_000, 0),
          freightLine(tripB, 12_000_000, 1),
          feeLine(billedCostId, 1_000_000, 2),
          feeLine(afterCostId, 400_000, 3),
        ],
      }, null),
      (error: unknown) => error instanceof ApiError
        && error.statusCode === 409
        && /Lô đã có Báo nợ chính đã phát hành/.test(error.message)
        && /-BS01/.test(error.message)
        && error.message.includes(mainNumber),
    );

    const [afterDoc] = await db.select().from(s.billingDocuments).where(eq(s.billingDocuments.id, mainDocId));
    assert.equal(afterDoc.totalInclVat, before[0]!.totalInclVat, 'total untouched');
    assert.equal(afterDoc.issuedAt?.toISOString(), before[0]!.issuedAt?.toISOString(), 'issue stamp untouched');
    assert.equal(afterDoc.updatedAt?.toISOString(), before[0]!.updatedAt?.toISOString(), 'row not even touched');
    const afterLines = await db.select().from(s.billingDocumentLines)
      .where(eq(s.billingDocumentLines.documentId, mainDocId))
      .orderBy(s.billingDocumentLines.sortOrder);
    assert.deepEqual(
      afterLines.map((l) => [l.sourceType, l.sourceId, l.baseAmount]),
      beforeLines.map((l) => [l.sourceType, l.sourceId, l.baseAmount]),
      'lines identical before/after',
    );
    const liveDocs = await db.select({ id: s.billingDocuments.id })
      .from(s.billingDocuments)
      .where(and(eq(s.billingDocuments.shipmentId, shipmentIds[0]!), eq(s.billingDocuments.type, 'DEBIT_NOTE')));
    assert.equal(liveDocs.length, 1, 'no second document was created — still exactly one main note');
    const ledgerRows = await db.select().from(s.ledger).where(and(
      eq(s.ledger.txnType, TxnType.ADJUSTMENT),
      eq(s.ledger.txnId, mainDocId),
      eq(s.ledger.txnTable, 'billing_documents'),
    ));
    assert.equal(ledgerRows.length, 0, 'no AR delta was posted by the refused save');
  });

  test('generate previews only the not-yet-billed rows', async () => {
    await seed();
    const [shipment] = await db.select({ customerId: s.shipments.customerId })
      .from(s.shipments).where(eq(s.shipments.id, shipmentIds[0]!));

    const draft = await generateDraft({
      type: 'DEBIT_NOTE',
      entityType: 'CUSTOMER',
      entityId: shipment.customerId,
      shipmentId: shipmentIds[0]!,
      rangeFrom: '2026-11-01',
      rangeTo: '2026-11-30',
    });

    const keys = draft.lines.map((l) => `${l.sourceType}:${l.sourceId}`);
    assert.equal(keys.some((k) => k === `TRIP:${tripA}`), false, 'billed freight A excluded');
    assert.equal(keys.some((k) => k === `TRIP:${tripB}`), false, 'billed freight B excluded');
    assert.equal(keys.some((k) => k === `SHIPMENT_COST:${billedCostId}`), false, 'billed fee excluded');
    assert.deepEqual(keys, [`SHIPMENT_COST:${afterCostId}`], 'only the post-issuance fee remains');
    // NEPO-62 VAT — fee seeds without an explicit vatRate → DB default 8%:
    // the draft total bills VAT-inclusive (400k × 1.08).
    assert.equal(draft.totalInclVat, 432_000);
  });

  test('the -BS01 supplement flow still works for post-issuance fees', async () => {
    await seed();
    const supp = await createLotSupplement(mainDocId, null);
    docIds.push(supp.id);

    assert.equal(supp.documentNumber, `${mainNumber}-BS01`);
    assert.equal(supp.parentDocumentId, mainDocId);
    const keys = supp.lines.map((l) => `${l.sourceType}:${l.sourceId}`);
    assert.deepEqual(keys, [`SHIPMENT_COST:${afterCostId}`], 'only the new fee rides the supplement');
    // NEPO-62 VAT — VAT-inclusive total and matching AR delta (400k × 1.08).
    assert.equal(supp.totalInclVat, 432_000);
    assert.equal(supp.ledgerAdjustmentAmount, 432_000);
  });
});

after(async () => {
  if (docIds.length) {
    const suppRows = await db.select({ id: s.billingDocuments.id })
      .from(s.billingDocuments)
      .where(eq(s.billingDocuments.parentDocumentId, mainDocId));
    const allDocIds = [mainDocId, ...suppRows.map((r) => r.id)];
    await db.delete(s.billingDocumentLines).where(inArray(s.billingDocumentLines.documentId, allDocIds));
    await db.delete(s.ledger).where(and(
      eq(s.ledger.txnTable, 'billing_documents'),
      inArray(s.ledger.txnId, allDocIds),
    ));
    await db.delete(s.billingDocuments).where(inArray(s.billingDocuments.id, allDocIds));
  }
  if (shipmentCostIds.length) await db.delete(s.shipmentCosts).where(inArray(s.shipmentCosts.id, shipmentCostIds));
  if (tripIds.length) await db.delete(s.trips).where(inArray(s.trips.id, tripIds));
  if (shipmentIds.length) await db.delete(s.shipments).where(inArray(s.shipments.id, shipmentIds));
  if (customerIds.length) await db.delete(s.customers).where(inArray(s.customers.id, customerIds));
  if (routeIds.length) await db.delete(s.routes).where(inArray(s.routes.id, routeIds));
  if (cargoTypeIds.length) await db.delete(s.cargoTypes).where(inArray(s.cargoTypes.id, cargoTypeIds));
  await disconnectRedis();
  await client.end({ timeout: 1 });
});
