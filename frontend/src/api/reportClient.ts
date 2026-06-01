import { api } from '../lib/api';
import { REPORTS } from '@nepocorp/shared';
import type { DashboardStats, PnlReport, RenewalReminder } from '@nepocorp/shared';

export interface ExtendedDashboardStats extends DashboardStats {
  topOverdueCustomer?: { name: string; balance: number; days: number } | null;
  topShareholder?: { name: string; percentage: number } | null;
}

export const reportClient = {
  getDashboard: async () => {
    return api.get<ExtendedDashboardStats>(REPORTS.DASHBOARD);
  },

  getPnl: async (month: number, year: number) => {
    return api.get<PnlReport>(`${REPORTS.PNL}?month=${month}&year=${year}`);
  },

  getDistributionHistory: async () => {
    const res = await api.get<
      | Array<{
          id: number;
          quarter: number;
          year: number;
          partnerName: string;
          amount: string;
          createdAt: string;
        }>
      | { items: Array<any> }
    >('/reports/distribution-history');
    return Array.isArray(res) ? res : (res as any).items ?? [];
  },

  getRenewals: async () => {
    return api.get<RenewalReminder[]>(REPORTS.RENEWALS);
  },
};
