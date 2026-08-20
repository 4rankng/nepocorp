import { describe, expect, it } from 'vitest';
import { TripStatus } from '@tingting/shared';
import { createTripEditReturnState, createTripListReturnState, isTripEditReturnState, readTripListReturnState, shouldSyncTripListReturnState } from './tripListNavigation';

describe('trip-list navigation state', () => {
  it('round-trips the filters used to reopen the trip list', () => {
    const state = createTripListReturnState({
      statusFilter: TripStatus.IN_TRANSIT,
      truckFilter: 136,
      customerFilter: 42,
      searchInput: '15C-136.31',
    });

    expect(readTripListReturnState(state)).toEqual(state);
  });

  it('rejects malformed history state', () => {
    expect(readTripListReturnState({ tripList: { truckFilter: '136' } })).toBeNull();
  });

  it('syncs the current list history entry only when filters differ', () => {
    const state = createTripListReturnState({
      statusFilter: TripStatus.IN_TRANSIT,
      truckFilter: 136,
      customerFilter: '',
      searchInput: '15C-136.31',
    });

    expect(shouldSyncTripListReturnState(undefined, state)).toBe(true);
    expect(shouldSyncTripListReturnState(state, state)).toBe(false);
  });

  it('marks only a detail-origin edit navigation as safe to pop', () => {
    const state = createTripListReturnState({
      statusFilter: '',
      truckFilter: '',
      customerFilter: 42,
      searchInput: '',
    });

    expect(isTripEditReturnState(createTripEditReturnState(state))).toBe(true);
    expect(isTripEditReturnState(state)).toBe(false);
  });
});
