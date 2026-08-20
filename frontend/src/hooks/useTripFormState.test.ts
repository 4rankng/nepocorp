import { describe, expect, it } from 'vitest';
import { createDefaultFuelAllocations } from './useTripFormState';

describe('createDefaultFuelAllocations', () => {
  it('creates the cash row before the fuel-supplier catalog is loaded', () => {
    expect(createDefaultFuelAllocations()).toEqual([
      expect.objectContaining({ point: 'OUTSIDE', enabled: false, paymentMethod: 'CASH', liters: '' }),
    ]);
  });
});
