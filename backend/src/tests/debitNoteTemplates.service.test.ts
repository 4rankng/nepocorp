import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { client } from '../db';
import {
  buildBillingXlsx,
  renderTemplatedXlsx,
  resolveDebitNoteTemplate,
  templateToSnapshot,
} from '../services/billingDocument.service';
import type {
  BillingDocument,
  BillingDocumentLine,
  DebitNoteTemplate,
  DebitNoteTemplateColumn,
  DebitNoteTemplateSnapshot,
} from '@tingting/shared';

const line = (over: Partial<BillingDocumentLine>): BillingDocumentLine => ({
  sourceType: 'TRIP', sourceId: 1, lineType: 'FREIGHT', typeLabel: 'Doanh thu', unit: 'lần',
  description: 'Cước vận chuyển — HCM - Bình Dương (TRIP-1)', routeName: 'HCM - Bình Dương',
  containerNumbers: ['ABCD1234567'], baseAmount: 5_000_000, amountOverride: null,
  excluded: false, sortOrder: 0, ...over,
});

const baseDoc: BillingDocument = {
  id: 1, type: 'DEBIT_NOTE', entityType: 'CUSTOMER', entityId: 10, entityName: 'Công ty ABC',
  rangeFrom: '2026-06-01', rangeTo: '2026-06-30', note: null, totalInclVat: 5_000_000,
  createdBy: null, createdAt: '2026-06-30T00:00:00.000Z', updatedAt: '2026-06-30T00:00:00.000Z',
  debitNoteTemplateId: null, debitNoteTemplateSnapshot: null, lines: [line({})],
};
const debitDoc = baseDoc;
const paymentDoc: BillingDocument = { ...baseDoc, type: 'PAYMENT_STATEMENT', entityType: 'VENDOR', entityName: 'NCC X' };

after(async () => {
  await client.end();
});

const columns: DebitNoteTemplateColumn[] = [
  { id: 'desc', label: 'Diễn giải', variable: 'description', width: 40, align: 'left', format: 'text', total: false },
  { id: 'cont', label: 'Số cont', variable: 'containerNumbers', width: 18, align: 'left', format: 'text', total: false },
  { id: 'unit', label: 'ĐVT', variable: 'unit', width: 10, align: 'center', format: 'text', total: false },
  { id: 'amount', label: 'Số tiền', variable: 'amount', width: 16, align: 'right', format: 'currency', total: true },
];

const defaultSnapshot: DebitNoteTemplateSnapshot = {
  id: 1, name: 'Mặc định', titleText: 'GIẤY BÁO NỢ',
  issuerName: null, issuerAddress: null, issuerTaxCode: null,
  accentColor: '#1F4E79', showContainerColumn: true, showUnitColumn: true, groupingMode: 'ROUTE',
  columns,
  orientation: 'landscape', termsText: null, signatureLeftLabel: 'Khách hàng', signatureRightLabel: 'Kế toán trưởng',
  logoStorageKey: null,
};

// XLSX is a ZIP archive → starts with the PK\x03\x04 magic.
function isXlsx(buf: Buffer): boolean {
  return buf.length > 4 && buf[0] === 0x50 && buf[1] === 0x4b;
}

test('buildBillingXlsx(null template) → valid xlsx for DEBIT_NOTE (legacy path)', async () => {
  const buf = await buildBillingXlsx(debitDoc, null);
  assert.ok(isXlsx(buf), 'should produce a zip/xlsx buffer');
});

test('buildBillingXlsx(null template) → valid xlsx for PAYMENT_STATEMENT (legacy, no AR bleed)', async () => {
  const buf = await buildBillingXlsx(paymentDoc, null);
  assert.ok(isXlsx(buf), 'payment statement must render via the legacy path');
});

test('renderTemplatedXlsx with default snapshot → valid xlsx', async () => {
  const buf = await renderTemplatedXlsx(debitDoc, defaultSnapshot);
  assert.ok(isXlsx(buf), 'templated render should produce a valid xlsx');
});

test('renderTemplatedXlsx writes Vietnamese amount in words for grand total', async () => {
  const buf = await renderTemplatedXlsx(debitDoc, defaultSnapshot);
  const ExcelJSMod = await import('exceljs');
  const ExcelJS = (ExcelJSMod as Record<string, unknown>).default
    ? ((ExcelJSMod as Record<string, unknown>).default as typeof ExcelJSMod)
    : ExcelJSMod;
  const wb = new ExcelJS.Workbook();
  await (wb.xlsx.load as (data: unknown) => Promise<unknown>)(buf);
  const ws = wb.worksheets[0];
  const wordsRow = ws.getColumn(1).values.find((value) =>
    typeof value === 'string' && value.startsWith('Bằng chữ:'));
  assert.equal(wordsRow, 'Bằng chữ: Năm triệu bốn trăm nghìn đồng');
});

test('renderTemplatedXlsx with letterhead + terms → valid xlsx', async () => {
  const withChrome: DebitNoteTemplateSnapshot = {
    ...defaultSnapshot,
    issuerName: 'TingTing', issuerAddress: 'TP. HCM', issuerTaxCode: '0123456789',
    termsText: 'Thanh toán trong vòng 30 ngày kể từ ngày nhận giấy báo nợ.',
  };
  const buf = await renderTemplatedXlsx(debitDoc, withChrome);
  assert.ok(isXlsx(buf), 'should still produce a valid xlsx with letterhead/terms');
});

test('renderTemplatedXlsx with toggled-off columns + flat grouping → valid xlsx', async () => {
  const minimal: DebitNoteTemplateSnapshot = {
    ...defaultSnapshot, showContainerColumn: false, showUnitColumn: false, groupingMode: 'NONE',
  };
  const buf = await renderTemplatedXlsx(debitDoc, minimal);
  assert.ok(isXlsx(buf), 'should render 2 columns (desc + amount) with no grouping bands');
});

test('resolveDebitNoteTemplate — non-DEBIT_NOTE docType returns null (no AR styling bleed)', async () => {
  // Guard returns before any DB lookup, so no Postgres needed for this case.
  const t = await resolveDebitNoteTemplate({
    docType: 'PAYMENT_STATEMENT', templateIdOverride: 5, customerTemplateId: 7,
  });
  assert.equal(t, null);
});

test('templateToSnapshot — copies render fields + resolved logo key', () => {
  const tpl: DebitNoteTemplate = {
    id: 9, name: 'A', isDefault: false, documentType: 'DEBIT_NOTE',
    logoStorageKey: 'debit-note-templates/9/logo-x.png',
    titleText: 'GN', issuerName: 'Co', issuerAddress: 'Addr', issuerTaxCode: 'MST',
    accentColor: '#123456', showContainerColumn: false, showUnitColumn: true,
    groupingMode: 'NONE', columns, amountInWords: false, orientation: 'portrait',
    termsText: 't', signatureLeftLabel: 'L', signatureRightLabel: 'R', createdBy: null,
    createdAt: '2026-06-30T00:00:00.000Z', updatedAt: '2026-06-30T00:00:00.000Z', deletedAt: null,
  };
  const snap = templateToSnapshot(tpl);
  assert.equal(snap.id, 9);
  assert.equal(snap.titleText, 'GN');
  assert.equal(snap.showContainerColumn, false);
  assert.equal(snap.logoStorageKey, 'debit-note-templates/9/logo-x.png');
  assert.equal(snap.accentColor, '#123456');
});
