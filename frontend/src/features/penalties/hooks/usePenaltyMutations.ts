import { useMutation } from '@tanstack/react-query';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import { FINANCIAL } from '@nepocorp/shared';
import type { CreatePenaltyRequest } from '@nepocorp/shared';

export function useCreatePenalty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: CreatePenaltyRequest) => {
      return api.post('/penalties', body);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['penalties'] });
    },
  });
}

export function useCancelPenalty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason?: string }) => {
      return api.post(FINANCIAL.PENALTY_CANCEL(id), { reason });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['penalties'] });
    },
  });
}
