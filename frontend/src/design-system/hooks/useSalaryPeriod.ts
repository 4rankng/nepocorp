import { useQuery } from '@tanstack/react-query';
import { configClient } from '../../api/configClient';
import { qk } from '../../api/keys';

/**
 * Returns the salary period for a given (month, year). Same shape as the
 * old `useSalaryPeriod` but lives in the design-system layer alongside the
 * other consolidated hooks.
 *
 * The previous version lived in `useCatalogQueries.ts` and was imported
 * by name in 4+ places; this file re-exports the same name to keep callers
 * working without a rename.
 */
export interface SalaryPeriod {
  start: string;
  end: string;
}

export function useSalaryPeriod(month: number, year: number) {
  return useQuery<SalaryPeriod>({
    queryKey: qk.catalogs.salaryPeriod(month, year),
    queryFn: () => configClient.getSalaryPeriodResolve(month, year),
    staleTime: 30 * 60 * 1000,
    enabled: month >= 1 && month <= 12 && year >= 2000,
  });
}


