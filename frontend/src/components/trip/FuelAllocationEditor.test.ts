import { describe, expect, it } from 'vitest';
import type { Supplier } from '@tingting/shared';
import type { FuelAllocationFormRow } from '../../hooks/useTripFormState';
import { activeFuelSuppliers, fuelSupplierLabel, normalizeFuelAllocationRows } from './FuelAllocationEditor';
import { groupFuelAllocationRows } from './fuelAllocationRows';

const suppliers = [
  { id: 1, name: 'Petrolimex Mộc Châu', shortName: 'Petrolimex', status: 'ACTIVE', isFuelSupplier: true },
  { id: 2, name: 'Long Hưng', shortName: null, status: 'ACTIVE', isFuelSupplier: true },
  { id: 3, name: 'PV Oil', shortName: 'PVOIL', status: 'ACTIVE', isFuelSupplier: true },
] as Supplier[];

describe('normalizeFuelAllocationRows', () => {
  it('uses every active fuel supplier returned by the database catalog', () => {
    const fromBootstrap = [
      ...suppliers,
      { id: 4, name: 'NCC đã ngừng', shortName: null, status: 'INACTIVE', isFuelSupplier: true },
      { id: 5, name: 'Gara', shortName: null, status: 'ACTIVE', isFuelSupplier: false },
    ];

    expect(activeFuelSuppliers(fromBootstrap)).toEqual(suppliers);
  });

  it('uses the configured short name for operational fuel labels and falls back to the legal name', () => {
    expect(fuelSupplierLabel(suppliers[0])).toBe('Petrolimex');
    expect(fuelSupplierLabel(suppliers[1])).toBe('Long Hưng');
  });

  it('renders every active fuel supplier and the cash row by default', () => {
    const rows = normalizeFuelAllocationRows([], suppliers);

    expect(rows).toEqual([
      expect.objectContaining({ point: 'CUSTOM', enabled: false, supplierId: 1, paymentMethod: 'CREDIT', liters: '' }),
      expect.objectContaining({ point: 'CUSTOM', enabled: false, supplierId: 2, paymentMethod: 'CREDIT', liters: '' }),
      expect.objectContaining({ point: 'CUSTOM', enabled: false, supplierId: 3, paymentMethod: 'CREDIT', liters: '' }),
      expect.objectContaining({ point: 'OUTSIDE', enabled: false, supplierId: null, paymentMethod: 'CASH', liters: '' }),
    ]);
  });

  it('retains saved allocation values in their matching supplier rows', () => {
    const rows = normalizeFuelAllocationRows([
      { _key: 'old-petro', point: 'CUSTOM', enabled: true, supplierId: 1, paymentMethod: 'CREDIT', liters: '120' },
      { _key: 'old-long-hung', point: 'CUSTOM', enabled: true, supplierId: 2, paymentMethod: 'CREDIT', liters: '80' },
      { _key: 'old-cash', point: 'CUSTOM', enabled: true, supplierId: null, paymentMethod: 'CASH', liters: '20' },
    ], suppliers);

    expect(rows).toContainEqual(expect.objectContaining({ enabled: true, supplierId: 1, liters: '120' }));
    expect(rows).toContainEqual(expect.objectContaining({ enabled: true, supplierId: 2, liters: '80' }));
    expect(rows).toContainEqual(expect.objectContaining({ point: 'OUTSIDE', enabled: true, supplierId: null, liters: '20' }));
  });

  it('treats entered litres as the allocation even when a legacy row has no enabled flag', () => {
    const rows = normalizeFuelAllocationRows([
      { _key: 'legacy-value', point: 'CUSTOM', enabled: false, supplierId: 2, paymentMethod: 'CREDIT', liters: '80' },
    ], suppliers);

    expect(rows).toContainEqual(expect.objectContaining({ enabled: true, supplierId: 2, liters: '80' }));
  });

  it('preserves a legacy supplier that is not one of the fixed points', () => {
    const rows = normalizeFuelAllocationRows([
      { _key: 'legacy', point: 'CUSTOM', enabled: true, supplierId: 99, paymentMethod: 'CREDIT', liters: '50' },
    ], suppliers);

    expect(rows).toContainEqual(expect.objectContaining({ _key: 'legacy', supplierId: 99, liters: '50' }));
  });

  it('restores catalog rows after a trip reseed replaces them with saved-only rows', () => {
    // Rows reseeded from a saved trip use the allocation id (or `legacy-`) as
    // the key — useTripFormDispatch's trip-load effect. The catalog points
    // must come back alongside the saved values.
    const rows = normalizeFuelAllocationRows([
      { _key: '77', point: 'OUTSIDE', enabled: true, supplierId: null, paymentMethod: 'CASH', liters: '40' },
    ], suppliers);

    expect(rows).toContainEqual(expect.objectContaining({ supplierId: 1, liters: '' }));
    expect(rows).toContainEqual(expect.objectContaining({ supplierId: 2, liters: '' }));
    expect(rows).toContainEqual(expect.objectContaining({ supplierId: 3, liters: '' }));
    expect(rows).toContainEqual(expect.objectContaining({ point: 'OUTSIDE', enabled: true, liters: '40' }));
  });

  it('is idempotent: normalizing already-normalized rows changes nothing', () => {
    const once = normalizeFuelAllocationRows([
      { _key: 'old-petro', point: 'CUSTOM', enabled: true, supplierId: 1, paymentMethod: 'CREDIT', liters: '120' },
      { _key: 'old-cash', point: 'OUTSIDE', enabled: true, supplierId: null, paymentMethod: 'CASH', liters: '20' },
    ], suppliers);

    const twice = normalizeFuelAllocationRows(once, suppliers);

    expect(twice).toEqual(once);
  });

  it('drops an unchecked row for a supplier that is no longer active', () => {
    const rows = normalizeFuelAllocationRows([
      { _key: 'stale', point: 'CUSTOM', enabled: false, supplierId: 99, paymentMethod: 'CREDIT', liters: '' },
    ], suppliers);

    expect(rows).not.toContainEqual(expect.objectContaining({ _key: 'stale' }));
  });
});

describe('multi-row (per-purchase) allocation merge', () => {
  const row = (over: Partial<FuelAllocationFormRow>): FuelAllocationFormRow => ({
    _key: 'x', point: 'CUSTOM', enabled: true, supplierId: 1, paymentMethod: 'CREDIT', liters: '', unitPrice: '', ...over,
  });

  it('keeps the second purchase row for the same supplier through reseed', () => {
    const saved = [
      row({ _key: '11', supplierId: 1, liters: '60', unitPrice: '23500' }),
      row({ _key: '12', supplierId: 1, liters: '40', unitPrice: '24000' }),
    ];
    const out = normalizeFuelAllocationRows(saved, suppliers);
    const petro = out.filter(r => r.supplierId === 1);
    expect(petro).toHaveLength(2);
    expect(petro.map(r => r.liters)).toEqual(['60', '40']);
    expect(petro.map((r) => (r as { unitPrice?: string }).unitPrice)).toEqual(['23500', '24000']);
  });

  it('keeps catalog rows after reseed with multi-row saved data (no regression of the Sep-7 fix)', () => {
    const saved = [
      row({ _key: '11', supplierId: 1, liters: '60', unitPrice: '23500' }),
      row({ _key: '12', supplierId: 1, liters: '40', unitPrice: '24000' }),
    ];
    const out = normalizeFuelAllocationRows(saved, suppliers);
    const keys = out.map(r => r._key);
    expect(keys).toContain('fuel-supplier-2');
    expect(keys).toContain('fuel-outside');
    expect(out.filter(r => r._key === 'fuel-supplier-1')).toHaveLength(1);
    expect(out.filter(r => r.supplierId === 1).map(r => r.unitPrice ?? '')).toEqual(['23500', '24000']);
  });

  it('is idempotent with multi-row input', () => {
    const saved = [
      row({ _key: '11', supplierId: 1, liters: '60', unitPrice: '23500' }),
      row({ _key: '12', supplierId: 1, liters: '40', unitPrice: '24000' }),
    ];
    const once = normalizeFuelAllocationRows(saved, suppliers);
    const twice = normalizeFuelAllocationRows(once, suppliers);
    expect(twice).toEqual(once);
  });

  it('keeps empty draft extra rows (the + button adds them; submit filters them)', () => {
    const saved = [row({ _key: '11', supplierId: 1, liters: '60' })];
    const draft = [saved[0], row({ _key: 'extra-1', supplierId: 1, liters: '' })];
    const out = normalizeFuelAllocationRows(draft, suppliers);
    expect(out.filter(r => r._key === 'extra-1')).toHaveLength(1);
  });

  it('keeps an added purchase directly below the line it was added to', () => {
    const draft = [
      row({ _key: 'fuel-supplier-1', supplierId: 1, liters: '21212' }),
      row({ _key: 'extra-1', supplierId: 1, liters: '' }),
      row({ _key: 'fuel-supplier-2', supplierId: 2, liters: '' }),
      row({ _key: 'fuel-outside', supplierId: null, paymentMethod: 'CASH', liters: '' }),
    ];
    const keys = normalizeFuelAllocationRows(draft, suppliers).map(entry => entry._key);

    // Rebuilding the list as [...standardRows, ...extras] used to push every row
    // the + button added to the bottom of the table, under unrelated suppliers.
    expect(keys.indexOf('extra-1')).toBe(keys.indexOf('fuel-supplier-1') + 1);
  });
});

describe('per-counterparty grouping', () => {
  const row = (over: Partial<FuelAllocationFormRow>): FuelAllocationFormRow => ({
    _key: 'x', point: 'CUSTOM', enabled: true, supplierId: 1, paymentMethod: 'CREDIT', liters: '', unitPrice: '', ...over,
  });

  it('renders every purchase of one counterparty as one group, in first-appearance order', () => {
    const groups = groupFuelAllocationRows([
      row({ _key: 'fuel-supplier-1', supplierId: 1, liters: '60' }),
      row({ _key: 'extra-1', supplierId: 1, liters: '40' }),
      row({ _key: 'fuel-supplier-2', supplierId: 2, liters: '0' }),
      row({ _key: 'fuel-outside', supplierId: null, paymentMethod: 'CASH', liters: '0' }),
    ]);

    expect(groups.map(group => group.key)).toEqual(['CREDIT:1', 'CREDIT:2', 'CASH']);
    expect(groups[0].rows.map(entry => entry._key)).toEqual(['fuel-supplier-1', 'extra-1']);
  });
});
