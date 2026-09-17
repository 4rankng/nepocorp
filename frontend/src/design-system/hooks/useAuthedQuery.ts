import { useQuery, type UseQueryOptions } from '@tanstack/react-query';

/**
 * Compatibility wrapper for authenticated queries. The API client owns session
 * expiry for every request (including mutations/downloads) and ignores late 401s
 * from an older token. A 403 is a permission error for the page to display; it
 * must not sign the user out of the rest of the application.
 */
export function useAuthedQuery<TQueryFnData = unknown, TError = Error, TData = TQueryFnData>(
  opts: UseQueryOptions<TQueryFnData, TError, TData>,
) {
  return useQuery<TQueryFnData, TError, TData>(opts);
}
