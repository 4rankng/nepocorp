import { describe, expect, it } from 'vitest';
import { createDefaultFuelAllocations } from './useTripFormState';

describe('createDefaultFuelAllocations', () => {
  it('creates the three accounting fuel points without selecting any of them', () => {
    expect(createDefaultFuelAllocations()).toEqual([
      expect.objectContaining({ point: 'PETRO', enabled: false, paymentMethod: 'CREDIT', liters: '' }),
      expect.objectContaining({ point: 'LONG_HUNG', enabled: false, paymentMethod: 'CREDIT', liters: '' }),
      expect.objectContaining({ point: 'OUTSIDE', enabled: false, paymentMethod: 'CASH', liters: '' }),
    ]);
  });
});
