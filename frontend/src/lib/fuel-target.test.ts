import { describe, expect, it } from 'vitest';
import { resolveFuelRates } from './fuel-target';
import { TripStatus } from '@tingting/shared';

const liveConfig = { unitPrice: 25000, loadedNorm: 43, emptyNorm: 25, supplement: 3 };

function snapshots(overrides: Record<string, string | number | null> = {}) {
  return {
    fuelPriceApplied: '25000',
    fuelLoadedNormApplied: '43',
    fuelEmptyNormApplied: '25',
    fuelSupplementNormApplied: '3',
    fuelFixedAllowanceApplied: null,
    ...overrides,
  };
}

describe('resolveFuelRates', () => {
  it('keeps non-zero committed snapshots even when live config differs', () => {
    const rates = resolveFuelRates({
      tripStatus: TripStatus.COMPLETED,
      snapshots: snapshots({ fuelPriceApplied: '18000', fuelLoadedNormApplied: '40' }),
      liveConfig,
      routeFixedAllowance: null,
      routeChanged: false,
    });

    expect(rates).toMatchObject({
      fuelUnitPrice: 18000,
      fuelLoadedNorm: 40,
      fuelEmptyNorm: 25,
      fuelPerTripSupplement: 3,
    });
    expect(rates.frozenLegacy).toBe(false);
  });

  it('adopts live config for uncommitted trips with all-zero snapshots', () => {
    const rates = resolveFuelRates({
      tripStatus: TripStatus.CREATED,
      snapshots: snapshots({
        fuelPriceApplied: 0,
        fuelLoadedNormApplied: 0,
        fuelEmptyNormApplied: 0,
        fuelSupplementNormApplied: 0,
      }),
      liveConfig,
      routeFixedAllowance: null,
      routeChanged: false,
    });

    expect(rates).toMatchObject({
      fuelUnitPrice: 25000,
      fuelLoadedNorm: 43,
      fuelEmptyNorm: 25,
      fuelPerTripSupplement: 3,
    });
    expect(rates.frozenLegacy).toBe(false);
  });

  it('marks committed all-zero-snapshot trips as frozen legacy and skips the live fallback', () => {
    const rates = resolveFuelRates({
      tripStatus: TripStatus.IN_TRANSIT,
      snapshots: snapshots({
        fuelPriceApplied: '0',
        fuelLoadedNormApplied: '0',
        fuelEmptyNormApplied: '0',
        fuelSupplementNormApplied: '0',
      }),
      liveConfig,
      routeFixedAllowance: null,
      routeChanged: false,
    });

    expect(rates.frozenLegacy).toBe(true);
    expect(rates.fuelUnitPrice).toBe(0);
  });

  it('overrides a non-zero snapshot allowance when the route changed (even to 0)', () => {
    const overridden = resolveFuelRates({
      tripStatus: TripStatus.CREATED,
      snapshots: snapshots({ fuelFixedAllowanceApplied: '120' }),
      liveConfig,
      routeFixedAllowance: 80,
      routeChanged: true,
    });
    expect(overridden.fixedAllowance).toBe(80);

    const cleared = resolveFuelRates({
      tripStatus: TripStatus.CREATED,
      snapshots: snapshots({ fuelFixedAllowanceApplied: '120' }),
      liveConfig,
      routeFixedAllowance: null,
      routeChanged: true,
    });
    expect(cleared.fixedAllowance).toBeNull();
  });

  it('falls back to the live route allowance when the snapshot is 0 and route unchanged', () => {
    const rates = resolveFuelRates({
      tripStatus: TripStatus.COMPLETED,
      snapshots: snapshots({ fuelFixedAllowanceApplied: '0' }),
      liveConfig,
      routeFixedAllowance: 95,
      routeChanged: false,
    });

    expect(rates.fixedAllowance).toBe(95);
  });

  it('treats create mode (no snapshots, no status) like an uncommitted trip', () => {
    const rates = resolveFuelRates({
      tripStatus: null,
      snapshots: null,
      liveConfig,
      routeFixedAllowance: 60,
      routeChanged: false,
    });

    expect(rates).toMatchObject({
      fuelUnitPrice: 25000,
      fuelLoadedNorm: 43,
      fuelPerTripSupplement: 3,
      fixedAllowance: 60,
    });
    expect(rates.frozenLegacy).toBe(false);
  });

  it('keeps snapshot values when live config has not loaded yet', () => {
    const rates = resolveFuelRates({
      tripStatus: TripStatus.LOCKED,
      snapshots: snapshots({ fuelPriceApplied: '21000', fuelEmptyNormApplied: '22' }),
      liveConfig: null,
      routeFixedAllowance: null,
      routeChanged: false,
    });

    expect(rates).toMatchObject({
      fuelUnitPrice: 21000,
      fuelLoadedNorm: 43,
      fuelEmptyNorm: 22,
    });
    expect(rates.frozenLegacy).toBe(false);
  });

  it('ignores LOCKED-ineligible statuses for the legacy freeze', () => {
    const rates = resolveFuelRates({
      tripStatus: 'CANCELED',
      snapshots: snapshots({
        fuelPriceApplied: '0',
        fuelLoadedNormApplied: '0',
        fuelEmptyNormApplied: '0',
      }),
      liveConfig,
      routeFixedAllowance: null,
      routeChanged: false,
    });

    expect(rates.frozenLegacy).toBe(false);
  });
});
