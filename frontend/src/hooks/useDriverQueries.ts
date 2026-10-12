import { useQuery } from '@tanstack/react-query';
import { driverClient } from '../api/driverClient';
import { qk } from '../api/keys';
import { useAuth } from './useAuth';

/**
 * The driver portal's data is derived from the logged-in account server-side,
 * so the account id scopes every cache entry and gates every fetch: a cache
 * keyed without it can render the previous account's rows on open before the
 * refetch corrects them — a privacy-leak flash (kanban 101026004000).
 */
function useDriverAccount(): number | null {
  const { user } = useAuth();
  return user ? user.userId : null;
}

export function useDriverTrips(params: { page: number; limit: number; status?: string }) {
  const userId = useDriverAccount();
  return useQuery({
    queryKey: qk.driver.tripsList(userId, params),
    queryFn: () => driverClient.getTrips(params),
    enabled: userId !== null,
    // Paging keeps the previous page's rows on screen while the next page
    // loads — but only rows this account just saw. `keepPreviousData` bridges
    // ANY key change, including an account change, which would flash another
    // driver's trips (kanban 101026004000).
    placeholderData: (prev, prevQuery) => (prevQuery?.queryKey[1] === userId ? prev : undefined),
  });
}

export function useDriverEarnings(month: number, year: number) {
  const userId = useDriverAccount();
  return useQuery({
    queryKey: qk.driver.earnings(userId, month, year),
    queryFn: () => driverClient.getEarnings(month, year),
    enabled: userId !== null && month >= 1 && month <= 12 && year >= 2000,
  });
}

export function useDriverPenalties(params?: { dateFrom: string; dateTo: string }) {
  const userId = useDriverAccount();
  return useQuery({
    queryKey: qk.driver.penalties(userId, params),
    queryFn: () => driverClient.getPenalties(params),
    enabled: userId !== null,
  });
}

/** N5 / B4 — the driver's truck compliance/service reminders (overdue/due). */
export function useDriverVehicleAlerts() {
  const userId = useDriverAccount();
  return useQuery({
    queryKey: qk.driver.vehicleAlerts(userId),
    queryFn: () => driverClient.getVehicleAlerts(),
    enabled: userId !== null,
    // Reminders are not urgent enough to refetch frequently; stale for an hour
    // is fine (a manager edits the dates, the driver sees them next visit).
    staleTime: 60 * 60 * 1000,
  });
}
