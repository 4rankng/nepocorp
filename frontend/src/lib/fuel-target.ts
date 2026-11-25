import { TripStatus } from '@tingting/shared';

/**
 * Fuel-rate snapshots stored on the trips row (`fuel_*_applied`). Values
 * arrive as strings from the API; `null`/absent means "no snapshot".
 */
export interface FuelRateSnapshots {
  fuelPriceApplied?: string | number | null;
  fuelLoadedNormApplied?: string | number | null;
  fuelEmptyNormApplied?: string | number | null;
  fuelSupplementNormApplied?: string | number | null;
  fuelFixedAllowanceApplied?: string | number | null;
}

/** Live fuel config as loaded by `useFuelConfig()`, normalized to numbers. */
export interface LiveFuelConfig {
  unitPrice: number;
  loadedNorm: number;
  emptyNorm: number;
  supplement: number;
}

export interface ResolveFuelRateInputs {
  /** `existingTrip.status`; null/absent on create mode. */
  tripStatus?: string | null;
  /** Trip-row snapshots; null on create mode. */
  snapshots: FuelRateSnapshots | null;
  /** Live config from useFuelConfig(); null while the query is cold. */
  liveConfig: LiveFuelConfig | null;
  /** `selectedRouteData.fixedFuelAllowance` of the currently selected route. */
  routeFixedAllowance: number | null;
  /** True when the form's route differs from the stored trip's route (create mode: false). */
  routeChanged: boolean;
}

export interface ResolvedFuelRates {
  fuelUnitPrice: number;
  fuelLoadedNorm: number;
  fuelEmptyNorm: number;
  fuelPerTripSupplement: number;
  /** Passed to computeTripTotals as `mountainFixedAllowance`; null = no fixed allowance. */
  fixedAllowance: number | null;
  /**
   * Committed trip (IN_TRANSIT/COMPLETED/LOCKED) whose fuel snapshots are all
   * zero: the backend pins fuel to the stored liters/cost
   * (applyCommittedLegacyFuelFreeze) instead of recomputing, so the UI must
   * not offer a total that recomputation would contradict.
   */
  frozenLegacy: boolean;
}

function num(value: string | number | null | undefined): number {
  return Number(value ?? 0) || 0;
}

/**
 * Frontend mirror of the fuel-rate resolution in
 * `updateTripFigures` (backend/src/services/trip-mutations.service.ts) so the
 * live totals preview matches what saving will produce:
 *
 * - Snapshots come from the trips row; all-zero snapshots mean the trip
 *   predates fuel config.
 * - Non-committed trips with all-zero snapshots adopt today's live config
 *   (backend live-fallback).
 * - Committed trips with all-zero snapshots keep the 0 sentinels — the
 *   backend then freezes the fuel component to the stored values; the caller
 *   applies that freeze after computeTripTotals (`frozenLegacy`).
 * - Fixed route allowance: a route change overwrites the snapshot with the
 *   new route's value (even to 0); an unchanged route keeps a non-zero
 *   snapshot and falls back to the live route value otherwise
 *   (resolveFuelFixedAllowanceApplied).
 */
export function resolveFuelRates(p: ResolveFuelRateInputs): ResolvedFuelRates {
  const isCommitted = p.tripStatus === TripStatus.IN_TRANSIT
    || p.tripStatus === TripStatus.COMPLETED
    || p.tripStatus === TripStatus.LOCKED;

  const snapPrice = num(p.snapshots?.fuelPriceApplied);
  const snapLoaded = num(p.snapshots?.fuelLoadedNormApplied);
  const snapEmpty = num(p.snapshots?.fuelEmptyNormApplied);
  const snapSupplement = num(p.snapshots?.fuelSupplementNormApplied);
  const snapshotsMissing = snapPrice === 0 && snapLoaded === 0 && snapEmpty === 0;

  let fuelUnitPrice = snapPrice;
  let fuelLoadedNorm = snapLoaded;
  let fuelEmptyNorm = snapEmpty;
  let fuelPerTripSupplement = snapSupplement;

  if (!isCommitted && snapshotsMissing && p.liveConfig) {
    fuelUnitPrice = p.liveConfig.unitPrice;
    fuelLoadedNorm = p.liveConfig.loadedNorm;
    fuelEmptyNorm = p.liveConfig.emptyNorm;
    fuelPerTripSupplement = p.liveConfig.supplement;
  }

  const snapshotAllowance = num(p.snapshots?.fuelFixedAllowanceApplied);
  const routeAllowance = p.routeFixedAllowance ?? 0;
  const resolvedAllowance = p.routeChanged
    ? routeAllowance
    : (snapshotAllowance > 0 ? snapshotAllowance : routeAllowance);

  return {
    fuelUnitPrice,
    fuelLoadedNorm,
    fuelEmptyNorm,
    fuelPerTripSupplement,
    fixedAllowance: resolvedAllowance > 0 ? resolvedAllowance : null,
    frozenLegacy: isCommitted && snapshotsMissing,
  };
}
