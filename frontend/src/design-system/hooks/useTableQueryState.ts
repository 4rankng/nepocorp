import { useCallback, useMemo, useRef, useState } from 'react';
import { keepPreviousData, useQuery, type QueryKey, type UseQueryResult } from '@tanstack/react-query';
import { useDebouncedValue } from './useDebouncedValue';
import { accumulatePage, type PageAccumulator } from './useInfiniteScroll';

export interface TableQueryEndpoint<TItem, TParams extends Record<string, unknown>> {
  (params: TParams & { search?: string; page?: number; limit?: number }): Promise<{ items: TItem[]; total: number }>;
}

export interface TableQueryState<TItem, TParams extends Record<string, unknown>> {
  /** Current raw search input. */
  search: string;
  setSearch: (s: string) => void;
  /** Current filter bag (page is excluded; managed separately). */
  filters: TParams;
  setFilter: <K extends keyof TParams>(key: K, value: TParams[K] | undefined) => void;
  setFilters: (next: TParams) => void;
  page: number;
  setPage: (p: number) => void;
  pageSize: number;
  /** Changing the batch size restarts the list at page 1. */
  setPageSize: (n: number) => void;
  rows: TItem[];
  total: number;
  totalPages: number;
  /** Another page exists beyond the current one. */
  hasMore: boolean;
  /** Fetch the next page (no-op at the end of the list). */
  loadMore: () => void;
  isLoading: boolean;
  isFetching: boolean;
  error: unknown;
  query: UseQueryResult<{ items: TItem[]; total: number }>;
  /** Currently-applied params (filters + debounced search + page). */
  appliedParams: TParams & { search: string; page: number; limit: number };
  /** Reset everything back to the initial state. */
  reset: () => void;
}

export interface UseTableQueryStateOpts<TItem, TParams extends Record<string, unknown>> {
  endpoint: TableQueryEndpoint<TItem, TParams>;
  queryKey: QueryKey;
  defaultPageSize?: number;
  debounceMs?: number;
  initialFilters?: TParams;
  initialSearch?: string;
  enabled?: boolean;
  /**
   * Infinite-scroll mode: `rows` keeps every page loaded so far instead of
   * replacing them. Pair with `hasMore` + `loadMore` and render the sentinel
   * through `useInfiniteScroll`.
   */
  accumulate?: boolean;
}

/**
 * One-stop state manager for paginated list pages.
 *
 * Owns: search input, debounced search, filter bag, page, pageSize, and the
 * underlying `useQuery` (with the right queryKey for caching). Calls
 * `setPage(1)` automatically whenever the search or filters change.
 *
 * Replaces ~80 lines of duplicated state plumbing that previously lived at
 * the top of every list page (TripListPage, CustomersPage, SupplierListPage,
 * DebtListPage, PayableListPage, etc.).
 *
 * Usage:
 *
 *   const table = useTableQueryState<TripDetail, ListTripsParams>({
 *     endpoint: tripClient.listTrips,
 *     queryKey: qk.trips.list(),
 *     defaultPageSize: 25,
 *     debounceMs: 300,
 *   });
 *
 *   return <DataTable rows={table.rows} page={table.page} ... />;
 */
export function useTableQueryState<
  TItem,
  TParams extends Record<string, unknown> = Record<string, never>,
>(opts: UseTableQueryStateOpts<TItem, TParams>): TableQueryState<TItem, TParams> {
  const [search, setSearch] = useState(opts.initialSearch ?? '');
  const [filters, setFiltersRaw] = useState<TParams>(opts.initialFilters ?? ({} as TParams));
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(opts.defaultPageSize ?? 25);

  const debouncedSearch = useDebouncedValue(search, opts.debounceMs ?? 300);

  const setSearchAndResetPage = useCallback((next: string) => {
    setPage(1);
    setSearch(next);
  }, []);

  const setFilter = useCallback(
    <K extends keyof TParams>(key: K, value: TParams[K] | undefined) => {
      setPage(1);
      setFiltersRaw((prev) => {
        const next = { ...prev };
        if (value === undefined || value === '' || value === null) {
          delete next[key];
        } else {
          next[key] = value;
        }
        return next;
      });
    },
    [],
  );

  const setFilters = useCallback((next: TParams) => {
    setPage(1);
    setFiltersRaw(next);
  }, []);

  const appliedParams = useMemo(
    () => ({ ...filters, search: debouncedSearch, page, limit: pageSize }),
    [filters, debouncedSearch, page, pageSize],
  );

  // Reset to page 1 when search debounce or filters change. We use a layout
  // effect-style approach: re-derive whenever the inputs change and the
  // page is not already 1.
  // To avoid an extra effect pass, callers usually reset via setFilter / setSearch
  // which already call setPage(1). The hook consumer is therefore responsible
  // for ensuring that; this is intentional — manual control keeps things simple.

  const query = useQuery({
    // queryKey is caller-provided (arbitrary domain key); appending the applied
    // params keeps the cache scoped per filter/search/page combination.
    // eslint-disable-next-line @tingting/no-bare-query-key
    queryKey: [...opts.queryKey, appliedParams],
    queryFn: () => opts.endpoint(appliedParams),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    enabled: opts.enabled ?? true,
  });

  // Infinite-scroll accumulation. The ref is a render-time cache keyed by the
  // filter/search signature, so a filter change restarts the list while a page
  // change appends.
  const listKey = useMemo(
    () => JSON.stringify({ ...appliedParams, page: undefined }),
    [appliedParams],
  );
  const accRef = useRef<PageAccumulator<TItem>>({ key: '', page: 0, items: [] });
  const fetched = query.data?.items ?? [];

  const rows = useMemo(() => {
    if (!opts.accumulate) return fetched;
    // `keepPreviousData` serves the previous page as a placeholder while the
    // next one loads. Folding that in would duplicate a page; the rows already
    // on screen are the accumulated ones, so just keep rendering those.
    if (!query.data || query.isPlaceholderData) return accRef.current.items;
    accRef.current = accumulatePage(accRef.current, listKey, page, pageSize, fetched);
    return accRef.current.items;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.data, query.isPlaceholderData, listKey, page, pageSize, opts.accumulate]);

  const total = query.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const hasMore = page < totalPages;

  const loadMore = useCallback(() => {
    if (query.isFetching) return;
    setPage((current) => (current < totalPages ? current + 1 : current));
  }, [query.isFetching, totalPages]);

  const setPageSizeAndReset = useCallback((size: number) => {
    setPage(1);
    setPageSize(size);
  }, []);

  const reset = useCallback(() => {
    setSearch(opts.initialSearch ?? '');
    setFiltersRaw(opts.initialFilters ?? ({} as TParams));
    setPage(1);
    setPageSize(opts.defaultPageSize ?? 25);
  }, [opts.initialSearch, opts.initialFilters, opts.defaultPageSize]);

  return {
    search,
    setSearch: setSearchAndResetPage,
    filters,
    setFilter,
    setFilters,
    page,
    setPage,
    pageSize,
    setPageSize: setPageSizeAndReset,
    rows,
    total,
    totalPages,
    hasMore,
    loadMore,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    query,
    appliedParams,
    reset,
  };
}
