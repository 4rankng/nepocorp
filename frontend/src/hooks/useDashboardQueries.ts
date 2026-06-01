import { useQuery } from '@tanstack/react-query';
import { reportClient } from '../api/reportClient';
import type { ExtendedDashboardStats } from '../api/reportClient';
import type { PnlReport, RenewalReminder } from '@nepocorp/shared';

export type { PnlReport, PnlTruck } from '@nepocorp/shared';
export type { ExtendedDashboardStats };

export function useDashboardStats() {
  return useQuery<ExtendedDashboardStats>({
    queryKey: ['dashboard'],
    queryFn: () => reportClient.getDashboard(),
    staleTime: 2 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: true,
  });
}

export function usePnlReport(month: number, year: number) {
  return useQuery<PnlReport>({
    queryKey: ['pnl', month, year],
    queryFn: () => reportClient.getPnl(month, year),
    staleTime: 5 * 60 * 1000,
  });
}

export function useYearlyPnl(year: number) {
  return useQuery<(PnlReport | null)[]>({
    queryKey: ['yearly-pnl', year],
    queryFn: () =>
      Promise.all(
        Array.from({ length: 12 }, (_, i) =>
          reportClient.getPnl(i + 1, year).catch(() => null),
        ),
      ),
    staleTime: 5 * 60 * 1000,
  });
}

export function useRenewalReminders() {
  return useQuery<RenewalReminder[]>({
    queryKey: ['renewal-reminders'],
    queryFn: () => reportClient.getRenewals(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useDistributionHistory() {
  return useQuery({
    queryKey: ['distribution-history'],
    queryFn: () => reportClient.getDistributionHistory(),
    staleTime: 5 * 60 * 1000,
  });
}
