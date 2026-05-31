import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Driver, PenaltyReason, Truck } from '@nepocorp/shared';

interface PenaltyRow {
  id: number;
  driverId: number;
  tripId: number | null;
  reasonId: number | null;
  customReason: string | null;
  amount: string;
  date: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  driverName?: string;
  reasonText?: string;
  tripCode?: string | null;
}

export function usePenalties() {
  return useQuery<PenaltyRow[]>({
    queryKey: ['penalties'],
    queryFn: async () => {
      const data = await api.get<any>('/penalties');
      const raw: any[] = Array.isArray(data) ? data : (data as any).items ?? [];
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
    queryKey: ['penalty-catalogs'],
    queryFn: async () => {
      const [d, r, t] = await Promise.all([
        api.get<any>('/drivers'),
        api.get<any>('/penalty-reasons'),
        api.get<any>('/trucks'),
      ]);
      const rawDrivers: any[] = Array.isArray(d) ? d : d.items ?? [];
      return {
        drivers: rawDrivers.filter((x: any) => x.status === 'ACTIVE'),
        reasons: Array.isArray(r) ? r : r.items ?? [],
        trucks: Array.isArray(t) ? t : t.items ?? [],
      };
    },
  });
}

export type { PenaltyRow };
