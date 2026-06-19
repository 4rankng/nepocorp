import { api } from '../lib/api';
import { TIRES } from '@tingting/shared';
import type { Tire, PaginatedResponse } from '@tingting/shared';

/**
 * N1 — Tire API client. CRUD hits the generic `/fleet/tires` router; install
 * and remove hit the dedicated lifecycle endpoints.
 *
 * list: returns all tires, optionally filtered to a single truck. Uses the
 * generic paginated endpoint with truckId passed as a query param that the
 * server ignores unless we add a filter — we filter client-side instead so we
 * don't need a backend change just for the per-truck view.
 */
export const tireClient = {
  list: async (truckId?: number): Promise<Tire[]> => {
    // Pull all non-deleted tires; client filters by truckId when viewing a
    // single truck (the catalog is small — one fleet's worth).
    const res = await api.get<PaginatedResponse<Tire>>(
      `${TIRES.LIST}?limit=1000`,
    );
    const items = res.items ?? [];
    return typeof truckId === 'number'
      ? items.filter((t) => t.truckId === truckId)
      : items;
  },

  create: (data: {
    serial: string;
    truckId?: number | null;
    position?: string | null;
    size?: string | null;
    installedAt?: string | null;
    removedAt?: string | null;
    supplierId?: number | null;
    cost?: number;
    warrantyUntil?: string | null;
    status?: Tire['status'];
  }) => api.post<Tire>(TIRES.LIST, data),

  update: (id: number, data: Partial<{
    serial: string;
    truckId: number | null;
    position: string | null;
    size: string | null;
    installedAt: string | null;
    removedAt: string | null;
    supplierId: number | null;
    cost: number;
    warrantyUntil: string | null;
    status: Tire['status'];
  }>) => api.put<Tire>(TIRES.DETAIL(id), data),

  delete: (id: number) => api.delete<{ ok: boolean }>(TIRES.DETAIL(id)),

  install: (id: number, truckId: number, position?: string | null) =>
    api.post<Tire>(TIRES.INSTALL(id), {
      truckId,
      position: position ?? null,
    }),
};
