import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tyreBoardClient } from '../api/tyreBoardClient';
import { qk } from '../api/keys';
import type { TyreBoardSlotUpdateInput } from '@tingting/shared';

/** NEPO-49 — the 22-slot sheet of one truck. */
export function useTyreBoard(truckId: number | null) {
  return useQuery({
    queryKey: qk.catalogs.tyreBoard(truckId ?? undefined),
    queryFn: () => tyreBoardClient.get(truckId as number),
    enabled: truckId != null && Number.isFinite(truckId),
    staleTime: 30 * 1000,
  });
}

/** Replacement history (ngày, seri cũ → mới), newest first. */
export function useTyreBoardChanges(truckId: number | null) {
  return useQuery({
    queryKey: qk.catalogs.tyreBoardChanges(truckId ?? undefined),
    queryFn: () => tyreBoardClient.changes(truckId as number),
    enabled: truckId != null && Number.isFinite(truckId),
    staleTime: 30 * 1000,
  });
}

function useInvalidateTyreBoard(truckId: number | null) {
  const queryClient = useQueryClient();
  return () => {
    // Board + history both move on every write; invalidate the broad prefixes
    // so tab switches (different truckId) refetch too.
    queryClient.invalidateQueries({ queryKey: qk.catalogs.tyreBoardAll });
    queryClient.invalidateQueries({ queryKey: qk.catalogs.tyreBoardChangesAll });
  };
}

/** Inline cell edit on one slot — subset patch, no history row. */
export function useUpdateTyreSlot(truckId: number | null) {
  const invalidate = useInvalidateTyreBoard(truckId);
  return useMutation({
    mutationFn: ({ position, patch }: { position: number; patch: TyreBoardSlotUpdateInput }) =>
      tyreBoardClient.updateSlot(truckId as number, position, patch),
    onSuccess: invalidate,
  });
}

/** "Thay lốp" — new serial + day; server records (ngày, seri cũ → mới). */
export function useChangeTyre(truckId: number | null) {
  const invalidate = useInvalidateTyreBoard(truckId);
  return useMutation({
    mutationFn: ({ position, newSerial, changedAt }: { position: number; newSerial: string; changedAt: string }) =>
      tyreBoardClient.changeTyre(truckId as number, position, { newSerial, changedAt }),
    onSuccess: invalidate,
  });
}
