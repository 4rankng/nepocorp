import { describe, expect, it } from 'vitest';
import type { Trip, TripFuelAllocation } from '@tingting/shared';
import { fuelSupplierCompletionWarning } from './completionWarnings';

const cashAllocation: TripFuelAllocation = {
  id: 1, tripId: 1, supplierId: null, supplierName: '', liters: '152',
  unitPrice: null, paymentMethod: 'CASH', createdAt: '', updatedAt: '',
};

const trip = (over: Partial<Trip>): Pick<Trip, 'carrierType' | 'fuelLiters' | 'fuelLitersOverride' | 'fuelSupplierId' | 'fuelSupplier' | 'fuelAllocations'> => ({
  carrierType: 'OWN',
  fuelLiters: '152',
  fuelLitersOverride: null,
  fuelSupplierId: null,
  fuelSupplier: null,
  fuelAllocations: [],
  ...over,
});

describe('fuelSupplierCompletionWarning (kanban 121026194100)', () => {
  it('warns on a xe nhà trip that drew fuel but names no supplier', () => {
    const msg = fuelSupplierCompletionWarning(trip({}));
    expect(msg).toMatch(/chưa vào công nợ/);
    expect(msg).toMatch(/Vẫn hoàn thành được chuyến/);
  });

  it('stays quiet once a supplier is assigned', () => {
    expect(fuelSupplierCompletionWarning(trip({ fuelSupplierId: 7 }))).toBeNull();
    expect(fuelSupplierCompletionWarning(trip({ fuelSupplier: { id: 7, name: 'Petrolimex' } }))).toBeNull();
  });

  it('stays quiet when the fuel is recorded as an allocation, including CASH', () => {
    expect(fuelSupplierCompletionWarning(trip({ fuelAllocations: [cashAllocation] }))).toBeNull();
  });

  it('never warns on a xe ngoài trip — its liters are informational and no supplier can exist', () => {
    expect(fuelSupplierCompletionWarning(trip({ carrierType: 'EXTERNAL' }))).toBeNull();
  });

  it('stays quiet when the trip drew no fuel at all', () => {
    expect(fuelSupplierCompletionWarning(trip({ fuelLiters: '0', fuelLitersOverride: null }))).toBeNull();
    expect(fuelSupplierCompletionWarning(trip({ fuelLiters: '0', fuelLitersOverride: '80' }))).not.toBeNull();
  });
});
