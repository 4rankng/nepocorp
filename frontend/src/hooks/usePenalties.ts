import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { configClient } from '../api/configClient';
import { qk } from '../api/keys';
import type { Driver, PenaltyReason, Truck, PenaltyStatus } from '@tingting/shared';

interface PenaltyRow {
  id: number;
  driverId: number;
  tripId: number | null;
  reasonId: number | null;
  customReason: string | null;
  amount: string;
  date: string;
  status: PenaltyStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  driverName?: string;
  reasonText?: string;
  tripCode?: string | null;
}

/**
 * Penalties for the discipline page. `dateFrom` bounds the fetch — the page
 * computes all its KPIs (month totals, prev-month compare, YTD, cutoff
 * grades, streaks) inside a rolling multi-year window, so the formerly
 * unbounded load-all is gone without changing any table math.
 */
export function usePenalties(dateFrom?: string) {
  return useQuery<PenaltyRow[]>({
    queryKey: [...qk.penalties.list, dateFrom ?? null],
    queryFn: async () => {
      const qs = dateFrom ? `?dateFrom=${encodeURIComponent(dateFrom)}&limit=1000` : '?limit=1000';
      const data = await api.get<{ items: PenaltyRow[]; total?: number } | PenaltyRow[]>(`/penalties${qs}`);
      const raw: PenaltyRow[] = Array.isArray(data) ? data : data.items ?? [];
      return raw;
    },
  });
}

export function usePenaltyCatalogs() {
  return useQuery<{
    drivers: Driver[];
    reasons: PenaltyReason[];
    trucks: Truck[];
  }>({
    queryKey: qk.penalties.catalogs,
    queryFn: async () => {
      const [drivers, reasons, trucks] = await Promise.all([
        configClient.getDrivers(),
        configClient.getPenaltyReasons(),
        configClient.getTrucks(),
      ]);
      return {
        drivers: drivers.filter((x: Driver) => x.status === 'ACTIVE'),
        reasons,
        trucks,
      };
    },
  });
}

export type { PenaltyRow };
