import { describe, expect, it } from 'vitest';
import type { TripDetail } from '@tingting/shared';
import { getExternalTripPreviewGrossProfit, getTripDisplayGrossProfit } from './tripHelpers';

describe('getTripDisplayGrossProfit', () => {
  it('keeps persisted gross profit for external trips from the production commission case', () => {
    const trip = {
      carrierType: 'EXTERNAL',
      revenue: '7560000',
      externalFreightCost: '7128000',
      vatRate: '0.080',
      customerCommission: '200000',
      grossProfit: '-328000',
      totalCost: '7128000',
    } as TripDetail;

    expect(getTripDisplayGrossProfit(trip)).toBe(-328000);
  });

  it('computes external-trip preview from shared trip totals for the production commission case', () => {
    expect(getExternalTripPreviewGrossProfit({
      carrierType: 'EXTERNAL',
      revenue: '7560000',
      externalFreightCost: '7128000',
      vatRate: '0.080',
      customerCommission: '200000',
    })).toBe(-328000);
  });

  it.each([
    { vatRate: 0, commission: 0, revenue: 1000000, expected: 300000 },
    { vatRate: 0, commission: 50000, revenue: 1000000, expected: 250000 },
    { vatRate: 0.08, commission: 0, revenue: 1080000, expected: 300000 },
    { vatRate: 0.08, commission: 50000, revenue: 1080000, expected: 250000 },
    { vatRate: 0.1, commission: 0, revenue: 1100000, expected: 300000 },
    { vatRate: 0.1, commission: 50000, revenue: 1100000, expected: 250000 },
  ])('matches canonical external preview math for VAT $vatRate and commission $commission', ({
    vatRate,
    commission,
    revenue,
    expected,
  }) => {
    expect(getExternalTripPreviewGrossProfit({
      carrierType: 'EXTERNAL',
      revenue,
      externalFreightCost: 700000,
      vatRate,
      customerCommission: commission,
    })).toBe(expected);
  });

  it('keeps stored gross profit for own-truck trips', () => {
    const trip = {
      carrierType: 'OWN',
      revenue: '24130980',
      totalCost: '23220000',
      grossProfit: '-876500',
    } as TripDetail;

    expect(getTripDisplayGrossProfit(trip)).toBe(-876500);
  });
});
