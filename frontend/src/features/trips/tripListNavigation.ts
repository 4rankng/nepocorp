import type { StatusFilter } from './tripHelpers';

export interface TripListReturnState {
  tripList: {
    statusFilter: StatusFilter;
    truckFilter: number | '';
    customerFilter: number | '';
    searchInput: string;
  };
}

export interface TripEditReturnState extends TripListReturnState {
  returnToTripDetail: true;
}

export function createTripListReturnState(
  filters: TripListReturnState['tripList'],
): TripListReturnState {
  return { tripList: filters };
}

export function readTripListReturnState(state: unknown): TripListReturnState | null {
  if (!state || typeof state !== 'object' || !('tripList' in state)) return null;
  const tripList = (state as { tripList?: unknown }).tripList;
  if (!tripList || typeof tripList !== 'object') return null;

  const value = tripList as Partial<TripListReturnState['tripList']>;
  if (typeof value.searchInput !== 'string') return null;
  if (value.truckFilter !== '' && typeof value.truckFilter !== 'number') return null;
  if (value.customerFilter !== '' && typeof value.customerFilter !== 'number') return null;

  return {
    tripList: {
      statusFilter: (value.statusFilter ?? '') as StatusFilter,
      truckFilter: value.truckFilter ?? '',
      customerFilter: value.customerFilter ?? '',
      searchInput: value.searchInput,
    },
  };
}

/** Whether the current history entry needs the active list filters attached. */
export function shouldSyncTripListReturnState(
  currentState: unknown,
  nextState: TripListReturnState,
): boolean {
  const current = readTripListReturnState(currentState);
  return current?.tripList.statusFilter !== nextState.tripList.statusFilter
    || current?.tripList.truckFilter !== nextState.tripList.truckFilter
    || current?.tripList.customerFilter !== nextState.tripList.customerFilter
    || current?.tripList.searchInput !== nextState.tripList.searchInput;
}

/** Mark the detail → edit transition so edit can safely pop only that entry. */
export function createTripEditReturnState(state: TripListReturnState | null): TripEditReturnState | undefined {
  return state ? { ...state, returnToTripDetail: true } : undefined;
}

export function isTripEditReturnState(state: unknown): state is TripEditReturnState {
  return Boolean(
    state
    && typeof state === 'object'
    && (state as { returnToTripDetail?: unknown }).returnToTripDetail === true
    && readTripListReturnState(state),
  );
}
