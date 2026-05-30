import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Driver, PenaltyReason, Truck, PaginatedResponse } from '@nepocorp/shared';

interface PenaltyRow {
  id: number;
  driver_id: number;
  trip_id: number | null;
  reason_id: number | null;
  custom_reason: string | null;
  amount: string;
  date: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  driverName?: string;
  reasonText?: string;
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
