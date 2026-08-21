import { test } from 'node:test';
import assert from 'node:assert/strict';
import { supplierSchema } from '@tingting/shared';
import { suppliers } from '../db/schema';

test('supplier API accepts a legal name and operational short name', () => {
  const result = supplierSchema.safeParse({
    name: 'CÔNG TY TNHH MTV PETROLIMEX HẢI PHÒNG',
    shortName: '  Petrolimex  ',
    isFuelSupplier: true,
  });

  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.name, 'CÔNG TY TNHH MTV PETROLIMEX HẢI PHÒNG');
    assert.equal(result.data.shortName, 'Petrolimex');
  }
});

test('supplier API permits an absent short name for existing catalog records', () => {
  assert.equal(supplierSchema.safeParse({ name: 'Nhà cung cấp cũ' }).success, true);
  assert.equal(supplierSchema.safeParse({ name: 'Nhà cung cấp cũ', shortName: '' }).success, false);
});

test('supplier short name persists in the short_name column', () => {
  assert.equal(suppliers.shortName.name, 'short_name');
});
