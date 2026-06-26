import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  debitNoteColumnSchema,
  defaultDebitNoteColumns,
} from '@tingting/shared';

test('debitNoteColumnSchema — accepts width:0 (hidden column)', () => {
  const parsed = debitNoteColumnSchema.parse({
    id: 'ghi_chu', label: 'Ghi chú', variable: 'note', width: 0,
    align: 'left', format: 'text', total: false,
  });
  assert.equal(parsed.width, 0);
});

test('debitNoteColumnSchema — defaults width to 14 when omitted', () => {
  const parsed = debitNoteColumnSchema.parse({
    id: 'ghi_chu', label: 'Ghi chú', variable: 'note',
  });
  assert.equal(parsed.width, 14);
});

test('debitNoteColumnSchema — rejects negative width', () => {
  assert.throws(() => debitNoteColumnSchema.parse({
    id: 'x', label: 'X', variable: 'note', width: -1,
  }));
});

test('debitNoteColumnSchema — rejects width > 80', () => {
  assert.throws(() => debitNoteColumnSchema.parse({
    id: 'x', label: 'X', variable: 'note', width: 200,
  }));
});

test('defaultDebitNoteColumns — exported and has 12 BK VIETSUN entries', () => {
  assert.ok(Array.isArray(defaultDebitNoteColumns));
  assert.equal(defaultDebitNoteColumns.length, 12);
  // BK VIETSUN order: STT first, Giá VC has total:true.
  assert.equal(defaultDebitNoteColumns[0].variable, 'rowIndex');
  const amountCol = defaultDebitNoteColumns.find(c => c.variable === 'amount');
  assert.ok(amountCol, 'amount column should exist');
  assert.equal(amountCol.total, true);
  // Action type column maps to loadingType (HANG → ĐÓNG / VO → TRẢ).
  const actionCol = defaultDebitNoteColumns.find(c => c.variable === 'actionType');
  assert.ok(actionCol, 'actionType column should exist');
});

test('defaultDebitNoteColumns — every column validates against debitNoteColumnSchema', () => {
  for (const c of defaultDebitNoteColumns) {
    const parsed = debitNoteColumnSchema.parse(c);
    assert.equal(parsed.id, c.id);
  }
});