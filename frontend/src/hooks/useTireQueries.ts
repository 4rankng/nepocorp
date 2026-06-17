import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tireClient } from '../api/tireClient';
import { qk } from '../api/keys';
import type { Tire, TirePosition } from '@tingting/shared';

export function useTires(truckId?: number) {
  return useQuery<Tire[]>({
    queryKey: qk.catalogs.tires(truckId),
    queryFn: () => tireClient.list(truckId),
    staleTime: 60 * 1000,
  });
}

function useInvalidateTires() {
  const queryClient = useQueryClient();
  return () => {
    // Invalidate the broad 'tires' prefix so every per-truck view + the
    // unfiltered stock list refetch.
    queryClient.invalidateQueries({ queryKey: ['tires'] });
  };
}

export function useCreateTire() {
  const invalidate = useInvalidateTires();
  return useMutation({
    mutationFn: (data: Parameters<typeof tireClient.create>[0]) =>
      tireClient.create(data),
    onSuccess: invalidate,
  });
}

export function useUpdateTire() {
  const invalidate = useInvalidateTires();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof tireClient.update>[1] }) =>
      tireClient.update(id, data),
    onSuccess: invalidate,
  });
}

export function useDeleteTire() {
  const invalidate = useInvalidateTires();
  return useMutation({
    mutationFn: (id: number) => tireClient.remove(id),
    onSuccess: invalidate,
  });
}

export function useInstallTire() {
  const invalidate = useInvalidateTires();
  return useMutation({
    mutationFn: ({ id, truckId, position }: { id: number; truckId: number; position?: TirePosition | null }) =>
      tireClient.install(id, truckId, position ?? null),
    onSuccess: invalidate,
  });
}

export function useRemoveTire() {
  const invalidate = useInvalidateTires();
  return useMutation({
    mutationFn: ({ id, retire }: { id: number; retire?: boolean }) =>
      tireClient.removeFromTruck(id, retire),
    onSuccess: invalidate,
  });
}
