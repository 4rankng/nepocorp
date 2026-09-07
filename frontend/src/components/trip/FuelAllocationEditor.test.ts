import { describe, expect, it } from 'vitest';
import type { Supplier } from '@tingting/shared';
import { activeFuelSuppliers, fuelSupplierLabel, normalizeFuelAllocationRows } from './FuelAllocationEditor';

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
