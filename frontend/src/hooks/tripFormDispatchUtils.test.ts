import { describe, expect, it } from 'vitest';
import { LoadingType } from '@tingting/shared';
import {
  countRequiredTripFields,
  createFallbackLegsFromRouteName,
  resolveCommonContainerTypeId,
  resolveContainerCount,
} from './tripFormDispatchUtils';

describe('tripFormDispatchUtils', () => {
  it('counts carrier and freight, but never the external plate, as required fields', () => {
    const fields = {
      customerId: '1',
      routeId: '2',
      carrierType: 'EXTERNAL' as const,
      externalCarrierId: 3,
      externalFreightCost: '7128000',
      externalPlateNumber: '15C-12345',
      truckId: '',
      trailerType: '',
      driverId: '',
      cargoTypeId: '4',
      plannedContainerTypeId: '5',
      containerRows: [],
      departureDate: '2026-07-28',
    };

    // The plate is only required at completion, so it never moves this counter
    // (kanban 20260921_4).
    expect(countRequiredTripFields(fields)).toBe(7);
    expect(countRequiredTripFields({ ...fields, externalPlateNumber: '   ' })).toBe(7);
    expect(countRequiredTripFields({ ...fields, externalPlateNumber: '' })).toBe(7);
  });

  it('clamps container count to the supported trip-form range', () => {
    expect(resolveContainerCount('')).toBe(1);
    expect(resolveContainerCount('0')).toBe(1);
    expect(resolveContainerCount('3')).toBe(3);
    expect(resolveContainerCount('99')).toBe(10);
  });

  it('restores a planned type from persisted containers without container numbers', () => {
    expect(resolveCommonContainerTypeId([
      { containerTypeId: 4 },
      { containerTypeId: 4 },
    ])).toBe('4');
  });

  it('does not invent one planned type for a mixed-container trip', () => {
    expect(resolveCommonContainerTypeId([
      { containerTypeId: 1 },
      { containerTypeId: 4 },
    ])).toBe('');
  });

  it('does not fill partial, untyped, or missing persisted container rows', () => {
    expect(resolveCommonContainerTypeId([
      { containerTypeId: 4 },
      { containerTypeId: null },
    ])).toBe('');
    expect(resolveCommonContainerTypeId([
      { containerTypeId: null },
      { containerTypeId: null },
    ])).toBe('');
    expect(resolveCommonContainerTypeId([])).toBe('');
  });

  it('builds fallback return legs from a dashed route name', () => {
    const ids = ['outbound', 'return'];
    const legs = createFallbackLegsFromRouteName('Cát Lái - Bình Dương', () => ids.shift() ?? 'extra');

    expect(legs).toEqual([
      {
        id: 'outbound',
        sequence: 1,
        origin: 'Cát Lái',
        destination: 'Bình Dương',
        km: '',
        loadingType: LoadingType.HANG,
      },
      {
        id: 'return',
        sequence: 2,
        origin: 'Bình Dương',
        destination: 'Cát Lái',
        km: '',
        loadingType: LoadingType.VO,
      },
    ]);
  });
});
