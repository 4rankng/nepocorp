import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { forwarderClient } from '../api/forwarderClient';

export function useForwarderTrips() {
  return useQuery({
    queryKey: ['forwarder-trips'],
    queryFn: () => forwarderClient.getTrips(),
  });
}

export function useForwarderTripDetail(id: number) {
  return useQuery({
    queryKey: ['forwarder-trip-detail', id],
    queryFn: () => forwarderClient.getTripDetail(id),
    enabled: !!id,
  });
}

export function useCreateForwarderContainer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ tripId, data }: { tripId: number; data: { containerNumber: string; sealNumber?: string; notes?: string } }) =>
      forwarderClient.createContainer(tripId, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['forwarder-trip-detail', variables.tripId] });
    },
  });
}

export function useCreateForwarderExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { tripId: number; expenseType: string; amount: number; note?: string }) =>
      forwarderClient.createExpense(data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['forwarder-trip-detail', variables.tripId] });
    },
  });
}

export function useDeleteForwarderExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, tripId }: { id: number; tripId: number }) =>
      forwarderClient.deleteExpense(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['forwarder-trip-detail'] });
    },
  });
}
