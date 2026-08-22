import { describe, expect, it } from 'vitest';
import { TripStatus } from '@tingting/shared';
import { createTripEditReturnState, createTripListReturnState, isTripEditReturnState, readTripListReturnState, shouldSyncTripListReturnState } from './tripListNavigation';

describe('trip-list navigation state', () => {
  it('round-trips the month and filters used to reopen the trip list', () => {
    const state = createTripListReturnState({
      month: 7,
      year: 2026,
      statusFilter: TripStatus.IN_TRANSIT,
      truckFilter: 136,
      customerFilter: 42,
      searchInput: '15C-136.31',
    });

    expect(readTripListReturnState(state)).toEqual(state);
  });

  it('rejects malformed history state', () => {
    expect(readTripListReturnState({ tripList: { truckFilter: '136' } })).toBeNull();
    expect(readTripListReturnState({
      tripList: { month: 13, year: 2026, statusFilter: '', truckFilter: '', customerFilter: '', searchInput: '' },
    })).toBeNull();
    expect(readTripListReturnState({
      tripList: { month: 7, statusFilter: '', truckFilter: '', customerFilter: '', searchInput: '' },
    })).toBeNull();
  });

  it('syncs the current list history entry when the selected month differs', () => {
    const state = createTripListReturnState({
      month: 7,
      year: 2026,
      statusFilter: TripStatus.IN_TRANSIT,
      truckFilter: 136,
      customerFilter: '',
      searchInput: '15C-136.31',
    });

    expect(shouldSyncTripListReturnState(undefined, state)).toBe(true);
    expect(shouldSyncTripListReturnState(state, state)).toBe(false);
    expect(shouldSyncTripListReturnState(state, createTripListReturnState({
      ...state.tripList,
      month: 8,
    }))).toBe(true);
  });

  it('marks only a detail-origin edit navigation as safe to pop', () => {
    const state = createTripListReturnState({
      month: 7,
      year: 2026,
      statusFilter: '',
      truckFilter: '',
      customerFilter: 42,
      searchInput: '',
    });

    expect(isTripEditReturnState(createTripEditReturnState(state))).toBe(true);
    expect(isTripEditReturnState(state)).toBe(false);
  });
});
