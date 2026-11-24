import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  effectiveAmount, docTotal, documentLedgerAdjustment, splitContainers, joinContainers,
  counterpartyCatalogForEntityType,
  paymentStatementRenderingPolicy,
  describeBillingDocumentEdit,
} from '../services/billingDocument.service';
import {
  generateBillingDocumentSchema,
  saveBillingDocumentSchema,
  type BillingDocument,
  type BillingDocumentLine,
} from '@tingting/shared';

const line = (over: Partial<BillingDocumentLine>): BillingDocumentLine => ({
  sourceType: 'TRIP', sourceId: 1, lineType: 'FREIGHT', typeLabel: 'Khác', unit: 'lần', description: 'x',
  baseAmount: 1000, amountOverride: null, excluded: false, sortOrder: 0, ...over,
});

test('effectiveAmount — base used when no override', () => {
  assert.equal(effectiveAmount(line({ baseAmount: 1500 })), 1500);
});

test('effectiveAmount — override wins over base', () => {
  assert.equal(effectiveAmount(line({ baseAmount: 1000, amountOverride: 800 })), 800);
});

test('effectiveAmount — excluded always 0 (even with override)', () => {
  assert.equal(effectiveAmount(line({ baseAmount: 1000, amountOverride: 800, excluded: true })), 0);
});

test('effectiveAmount — null override falls back to base', () => {
  assert.equal(effectiveAmount(line({ baseAmount: 1000, amountOverride: null })), 1000);
});

test('docTotal — sums non-excluded effective amounts, honors overrides + exclusions', () => {
  const lines = [
    line({ baseAmount: 1000 }),                              // 1000
    line({ baseAmount: 2000, amountOverride: 1500 }),         // 1500
    line({ baseAmount: 500, excluded: true }),                // 0 (excluded)
    line({ sourceType: 'ADHOC', baseAmount: 0, amountOverride: 300 }), // 300 adhoc
  ];
  assert.equal(docTotal(lines), 2800);
});

test('documentLedgerAdjustment — sourced edits contribute only their delta', () => {
  const lines = [
    line({ sourceType: 'TRIP', baseAmount: 6_000_000, amountOverride: 6_200_000 }),
    line({ sourceType: 'EXPENSE', lineType: 'SERVICE_FEE', baseAmount: 1_000_000, amountOverride: 1_080_000 }),
  ];
  assert.equal(documentLedgerAdjustment(lines), 280_000);
});

test('documentLedgerAdjustment — ad-hoc rows add fully and excluded source rows reduce AR', () => {
  const lines = [
    line({ sourceType: 'EXPENSE', lineType: 'SERVICE_FEE', baseAmount: 1_000_000, excluded: true }),
    line({ sourceType: 'ADHOC', sourceId: null, lineType: 'ADHOC', baseAmount: 0, amountOverride: 400_000 }),
  ];
  assert.equal(documentLedgerAdjustment(lines), -600_000);
});

test('splitContainers — null/empty → null', () => {
  assert.equal(splitContainers(null), null);
  assert.equal(splitContainers(''), null);
  assert.equal(splitContainers('   '), null);
});

test('splitContainers — comma-joined text → trimmed array', () => {
  assert.deepEqual(splitContainers('ABCD1234567, EFGH8910111 '), ['ABCD1234567', 'EFGH8910111']);
});

test('joinContainers ← splitContainers roundtrip', () => {
  const list = ['ABCD1234567', 'EFGH8910111'];
  assert.equal(joinContainers(list), 'ABCD1234567, EFGH8910111');
  assert.deepEqual(splitContainers(joinContainers(list)), list);
  // null + empty lists collapse to null (DB-storable without placeholder)
  assert.equal(joinContainers(null), null);
  assert.equal(joinContainers([]), null);
});

test('billing document inputs accept an explicit CARRIER payable scope', () => {
  const draftInput = {
    type: 'PAYMENT_STATEMENT',
    entityType: 'CARRIER',
    entityId: 17,
    rangeFrom: '2026-07-01',
    rangeTo: '2026-07-31',
  };
  assert.equal(generateBillingDocumentSchema.parse(draftInput).entityType, 'CARRIER');
  assert.equal(saveBillingDocumentSchema.parse({
    ...draftInput,
    entityName: 'Nhà xe song vai trò',
    lines: [{
      sourceType: 'TRIP',
      sourceId: 99,
      lineType: 'FREIGHT',
      typeLabel: 'Cước thuê ngoài',
      unit: 'chuyến',
      description: 'Cước vận chuyển thuê ngoài',
      baseAmount: 3_500_000,
      amountOverride: null,
      excluded: false,
      sortOrder: 0,
    }],
  }).entityType, 'CARRIER');
});

test('billing document inputs reject debit notes outside the CUSTOMER scope', () => {
  for (const entityType of ['CARRIER', 'VENDOR'] as const) {
    assert.throws(() => generateBillingDocumentSchema.parse({
      type: 'DEBIT_NOTE',
      entityType,
      entityId: 17,
      rangeFrom: '2026-07-01',
      rangeTo: '2026-07-31',
    }));
  }
});

test('billing document inputs require real ordered ISO date ranges', () => {
  const base = {
    type: 'PAYMENT_STATEMENT' as const,
    entityType: 'CARRIER' as const,
    entityId: 17,
  };
  for (const range of [
    { rangeFrom: '01/07/2026', rangeTo: '31/07/2026' },
    { rangeFrom: '2026-02-30', rangeTo: '2026-03-01' },
    { rangeFrom: '2026-07-31', rangeTo: '2026-07-01' },
  ]) {
    assert.throws(() => generateBillingDocumentSchema.parse({ ...base, ...range }));
  }
});

test('carrier exports resolve counterparty details from the customer catalog', () => {
  assert.equal(counterpartyCatalogForEntityType('CUSTOMER'), 'CUSTOMER');
  assert.equal(counterpartyCatalogForEntityType('CARRIER'), 'CUSTOMER');
  assert.equal(counterpartyCatalogForEntityType('VENDOR'), 'SUPPLIER');
});

test('carrier payable export preserves VAT-inclusive freight and reverses the service parties', () => {
  assert.deepEqual(paymentStatementRenderingPolicy('CARRIER', 3_500_000), {
    vatAmount: 0,
    grandTotal: 3_500_000,
    hirer: 'COMPANY',
    provider: 'COUNTERPARTY',
  });
  assert.deepEqual(paymentStatementRenderingPolicy('CUSTOMER', 3_500_000), {
    vatAmount: 280_000,
    grandTotal: 3_780_000,
    hirer: 'COUNTERPARTY',
    provider: 'COMPANY',
  });
});

test('carrier migration uses billing-line trip provenance instead of mutable carrier flags', () => {
  const migration = readFileSync(
    new URL('../../drizzle/0111_explicit_carrier_billing_scope.sql', import.meta.url),
    'utf8',
  );
  assert.match(migration, /billing_document_lines/i);
  assert.match(migration, /external_carrier_id/i);
  assert.match(migration, /customer_id/i);
  assert.doesNotMatch(migration, /is_carrier/i);
});

// ─── NEPO-62 — per-lot debit notes ───────────────────────────────────────────

test('effectiveAmount — Chờ hóa đơn (blankAmount) contributes nothing', () => {
  assert.equal(effectiveAmount(line({ baseAmount: 500000, renderData: { blankAmount: true } })), 0);
  assert.equal(effectiveAmount(line({ baseAmount: 500000, renderData: { blankAmount: false } })), 500000);
});

test('docTotal — blank-amount lines never join the total', () => {
  const lines = [
    line({ baseAmount: 1200000 }),
    line({ baseAmount: 300000, renderData: { blankAmount: true } }),
  ];
  assert.equal(docTotal(lines), 1200000);
});

test('documentLedgerAdjustment — SHIPMENT_COST posts its full amount', () => {
  const lines = [
    line({ sourceType: 'SHIPMENT_COST', baseAmount: 4500000 }),
    line({ sourceType: 'TRIP', baseAmount: 2000000 }),
  ];
  // Trip base was already posted at completion → delta 0; lot cost posts in full.
  assert.equal(documentLedgerAdjustment(lines), 4500000);
});

test('documentLedgerAdjustment — awaiting-invoice rows post nothing', () => {
  const lines = [
    line({ sourceType: 'SHIPMENT_COST', baseAmount: 4500000, renderData: { blankAmount: true } }),
    line({ sourceType: 'SHIPMENT_COST', baseAmount: 800000 }),
  ];
  assert.equal(documentLedgerAdjustment(lines), 800000);
});

test('documentLedgerAdjustment — SHIPMENT_COST override delta counts', () => {
  const lines = [
    line({ sourceType: 'SHIPMENT_COST', baseAmount: 4500000, amountOverride: 5000000 }),
  ];
  assert.equal(documentLedgerAdjustment(lines), 5000000);
});

// ─── NEPO-63 — audit key for admin edits of an issued debit note ─────────────

const editDoc = (over: Partial<BillingDocument>): BillingDocument => ({
  id: 1, type: 'DEBIT_NOTE', entityType: 'CUSTOMER', entityId: 7,
  rangeFrom: '2026-11-01', rangeTo: '2026-11-30', note: null, totalInclVat: 22_500_000,
  createdBy: null, createdAt: '2026-11-22T00:00:00Z', updatedAt: '2026-11-22T00:00:00Z',
  documentNumber: 'DN26110001', lines: [], ...over,
});

test('describeBillingDocumentEdit — names the note, the old→new total, and changed lines', () => {
  const before = editDoc({
    lines: [
      line({ description: 'Cước biển HP-SGP', baseAmount: 10_000_000 }),
      line({ description: 'Cước biển HP-SGP (cont 2)', baseAmount: 12_000_000 }),
    ],
  });
  const after = editDoc({
    totalInclVat: 22_000_000,
    lines: [
      line({ description: 'Cước biển HP-SGP', baseAmount: 10_000_000 }),
      line({ description: 'Cước biển HP-SGP (cont 2)', baseAmount: 12_000_000, excluded: true }),
    ],
  });
  assert.equal(
    describeBillingDocumentEdit(before, after),
    'DN26110001 · 22.500.000₫ → 22.000.000₫ (đổi: dòng phí (2 → 2))',
  );
});

test('describeBillingDocumentEdit — an amount override is caught with an unchanged line count', () => {
  const before = editDoc({ lines: [line({ baseAmount: 10_000_000 })] });
  const after = editDoc({ totalInclVat: 12_000_000, lines: [line({ baseAmount: 10_000_000, amountOverride: 12_000_000 })] });
  assert.equal(
    describeBillingDocumentEdit(before, after),
    'DN26110001 · 22.500.000₫ → 12.000.000₫ (đổi: dòng phí (1 → 1))',
  );
});

test('describeBillingDocumentEdit — scalar edits are named without a line diff', () => {
  const before = editDoc({});
  const after = editDoc({ note: 'Điều khoản thanh toán mới' });
  assert.equal(describeBillingDocumentEdit(before, after), 'DN26110001 · 22.500.000₫ (đổi: ghi chú)');
});

test('describeBillingDocumentEdit — an unchanged re-save renders number + total only', () => {
  const before = editDoc({});
  assert.equal(describeBillingDocumentEdit(before, editDoc({})), 'DN26110001 · 22.500.000₫');
});
