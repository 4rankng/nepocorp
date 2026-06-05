import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { configClient } from '../api/configClient';
import type { Driver, PenaltyReason, Truck, PenaltyStatus } from '@nepocorp/shared';

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
      const [drivers, reasons, trucks] = await Promise.all([
        configClient.getDrivers(),
        configClient.getPenaltyReasons(),
        configClient.getTrucks(),
      ]);
      return {
        drivers: drivers.filter((x: any) => x.status === 'ACTIVE'),
        reasons,
        trucks,
      };
    },
  });
}

export type { PenaltyRow };
