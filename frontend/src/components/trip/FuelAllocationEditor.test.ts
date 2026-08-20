import { describe, expect, it } from 'vitest';
import type { Supplier } from '@tingting/shared';
import { normalizeFuelAllocationRows } from './FuelAllocationEditor';

const suppliers = [
  { id: 1, name: 'Petrolimex Mộc Châu', isFuelSupplier: true },
  { id: 2, name: 'Long Hưng', isFuelSupplier: true },
] as Supplier[];

describe('normalizeFuelAllocationRows', () => {
  it('renders legacy allocations in the three fixed accounting rows', () => {
    const rows = normalizeFuelAllocationRows([
      { _key: 'old-petro', point: 'CUSTOM', enabled: true, supplierId: 1, paymentMethod: 'CREDIT', liters: '120' },
      { _key: 'old-long-hung', point: 'CUSTOM', enabled: true, supplierId: 2, paymentMethod: 'CREDIT', liters: '80' },
      { _key: 'old-cash', point: 'CUSTOM', enabled: true, supplierId: null, paymentMethod: 'CASH', liters: '20' },
    ], suppliers);

    expect(rows.slice(0, 3)).toEqual([
      expect.objectContaining({ point: 'PETRO', enabled: true, supplierId: 1, liters: '120' }),
      expect.objectContaining({ point: 'LONG_HUNG', enabled: true, supplierId: 2, liters: '80' }),
      expect.objectContaining({ point: 'OUTSIDE', enabled: true, supplierId: null, liters: '20' }),
    ]);
  });

  it('preserves a legacy supplier that is not one of the fixed points', () => {
    const rows = normalizeFuelAllocationRows([
      { _key: 'legacy', point: 'CUSTOM', enabled: true, supplierId: 99, paymentMethod: 'CREDIT', liters: '50' },
    ], suppliers);

    expect(rows).toContainEqual(expect.objectContaining({ _key: 'legacy', supplierId: 99, liters: '50' }));
  });
});
