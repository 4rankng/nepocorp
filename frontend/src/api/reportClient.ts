import { api } from '../lib/api';
import { toQuery } from '../lib/http/query';
import { REPORTS } from '@tingting/shared';
import type { DashboardStats, PnlReport, RenewalReminder, Distribution, ShipmentProfitReport } from '@tingting/shared';

export interface ExtendedDashboardStats extends DashboardStats {
  topOverdueCustomer?: { name: string; balance: number; days: number } | null;
  topShareholder?: { name: string; percentage: number } | null;
}

export const reportClient = {
  getDashboard: async (month: number, year: number) => {
    // Period-scoped: the KPI row must always read the month it displays
    // (kanban 101026003200).
    return api.get<ExtendedDashboardStats>(`${REPORTS.DASHBOARD}${toQuery({ month, year })}`);
  },

  getPnl: async (month: number, year: number) => {
    return api.get<PnlReport>(`${REPORTS.PNL}${toQuery({ month, year })}`);
  },

  /** Báo cáo Lợi nhuận theo Lô (NEPO-63) — Thu − Chi Trả NCC − Chi Chạy Xe. */
  getShipmentProfit: async (month: number, year: number) => {
    return api.get<ShipmentProfitReport>(`${REPORTS.SHIPMENT_PROFIT}${toQuery({ month, year })}`);
  },

  getDistributionHistory: async () => {
    const res = await api.get<
      | Distribution[]
      | { items: Distribution[] }
    >('/reports/distribution-history');
    return Array.isArray(res) ? res : res.items ?? [];
  },

  getRenewals: async () => {
    return api.get<RenewalReminder[]>(REPORTS.RENEWALS);
  },
};
