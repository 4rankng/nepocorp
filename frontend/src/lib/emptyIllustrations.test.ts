import { describe, expect, it } from 'vitest';
import { EMPTY_ILLUSTRATIONS, resolveEmptyIllustration } from './emptyIllustrations';

describe('resolveEmptyIllustration', () => {
  it('maps category keys to the flat SVG assets', () => {
    expect(resolveEmptyIllustration('trips')).toBe('/assets/illustrations/empty-flat-trips.svg');
    expect(resolveEmptyIllustration('fleet')).toBe('/assets/illustrations/empty-flat-fleet.svg');
    expect(resolveEmptyIllustration('ops')).toBe('/assets/illustrations/empty-flat-ops.svg');
    expect(resolveEmptyIllustration('finance')).toBe('/assets/illustrations/empty-flat-finance.svg');
  });

  it('maps legacy bare names to a category asset', () => {
    expect(resolveEmptyIllustration('empty-trucks')).toBe('/assets/illustrations/empty-flat-fleet.svg');
    expect(resolveEmptyIllustration('empty-debts')).toBe('/assets/illustrations/empty-flat-finance.svg');
  });

  it('maps legacy full paths and strips extensions', () => {
    expect(resolveEmptyIllustration('/assets/illustrations/empty-trips.svg'))
      .toBe('/assets/illustrations/empty-flat-trips.svg');
    expect(resolveEmptyIllustration('assets/illustrations/empty-fleet.png'))
      .toBe('/assets/illustrations/empty-flat-fleet.svg');
  });

  it('falls back to the ops illustration when called without input', () => {
    expect(resolveEmptyIllustration()).toBe('/assets/illustrations/empty-flat-ops.svg');
    expect(resolveEmptyIllustration('')).toBe('/assets/illustrations/empty-flat-ops.svg');
  });

  it('passes unknown inputs through unchanged (defensive for custom art)', () => {
    expect(resolveEmptyIllustration('/img/custom-banner.png')).toBe('/img/custom-banner.png');
  });

  it('ships exactly one flat asset per category, with no duplicates or strays', () => {
    expect(Object.values(EMPTY_ILLUSTRATIONS).sort()).toEqual([
      '/assets/illustrations/empty-flat-finance.svg',
      '/assets/illustrations/empty-flat-fleet.svg',
      '/assets/illustrations/empty-flat-ops.svg',
      '/assets/illustrations/empty-flat-trips.svg',
    ]);
  });
});
