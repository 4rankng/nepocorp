import { describe, expect, it } from 'vitest';
import { LoadingType } from '@tingting/shared';
import { createFallbackLegsFromRouteName, resolveContainerCount } from './tripFormDispatchUtils';

describe('tripFormDispatchUtils', () => {
  it('clamps container count to the supported trip-form range', () => {
    expect(resolveContainerCount('')).toBe(1);
    expect(resolveContainerCount('0')).toBe(1);
    expect(resolveContainerCount('3')).toBe(3);
    expect(resolveContainerCount('99')).toBe(10);
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
