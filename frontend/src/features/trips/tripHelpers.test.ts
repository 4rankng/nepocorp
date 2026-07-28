import { describe, expect, it } from 'vitest';
import type { TripDetail } from '@tingting/shared';
import {
  getExternalTripFinancials,
  getExternalTripPreviewGrossProfit,
  getTripDisplayGrossProfit,
} from './tripHelpers';

describe('getTripDisplayGrossProfit', () => {
  it('recomputes stale external profit from both prices ex-VAT for the reported commission case', () => {
    const trip = {
      carrierType: 'EXTERNAL',
      revenue: '7560000',
      externalFreightCost: '7128000',
      vatRate: '0.080',
      customerCommission: '200000',
      grossProfit: '-328000',
      totalCost: '7128000',
    } as TripDetail;

    expect(getTripDisplayGrossProfit(trip)).toBe(200000);
  });

  it('computes external-trip preview from shared trip totals for the production commission case', () => {
    expect(getExternalTripPreviewGrossProfit({
      carrierType: 'EXTERNAL',
      revenue: '7560000',
      externalFreightCost: '7128000',
      vatRate: '0.080',
      customerCommission: '200000',
    })).toBe(200000);
  });

  it('projects a reconciling ex-VAT breakdown for the reported commission case', () => {
    expect(getExternalTripFinancials({
      carrierType: 'EXTERNAL',
      revenue: '7560000',
      externalFreightCost: '7128000',
      vatRate: '0.080',
      customerCommission: '200000',
    })).toEqual({
      freightRevenue: 7000000,
      recordedRevenue: 6800000,
      externalFreightCost: 6600000,
      grossProfit: 200000,
    });
  });

  it('keeps the legacy zero-VAT contract when vatRate is null', () => {
    expect(getExternalTripFinancials({
      carrierType: 'EXTERNAL',
      revenue: '7560000',
      externalFreightCost: '7128000',
      vatRate: null,
      customerCommission: '200000',
    })?.grossProfit).toBe(232000);
  });

  it.each([
    { vatRate: 0, commission: 0, revenue: 1000000, expected: 300000 },
    { vatRate: 0, commission: 50000, revenue: 1000000, expected: 250000 },
    { vatRate: 0.08, commission: 0, revenue: 1080000, externalFreightCost: 756000, expected: 300000 },
    { vatRate: 0.08, commission: 50000, revenue: 1080000, externalFreightCost: 756000, expected: 250000 },
    { vatRate: 0.1, commission: 0, revenue: 1100000, externalFreightCost: 770000, expected: 300000 },
    { vatRate: 0.1, commission: 50000, revenue: 1100000, externalFreightCost: 770000, expected: 250000 },
  ])('matches canonical external preview math for VAT $vatRate and commission $commission', ({
    vatRate,
    commission,
    revenue,
    externalFreightCost = 700000,
    expected,
  }) => {
    expect(getExternalTripPreviewGrossProfit({
      carrierType: 'EXTERNAL',
      revenue,
      externalFreightCost,
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
