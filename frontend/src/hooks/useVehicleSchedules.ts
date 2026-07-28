import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CreateVehicleScheduleInput,
  UpdateVehicleScheduleInput,
  VehicleComponent,
} from '@tingting/shared';
import { VehicleScheduleStatus } from '@tingting/shared';
import { qk } from '../api/keys';
import { vehicleScheduleClient } from '../api/vehicleScheduleClient';

export function useActiveVehicleSchedules(enabled = true) {
  return useQuery({
    queryKey: qk.vehicleSchedules.active,
    queryFn: () => vehicleScheduleClient.list(),
    enabled,
    staleTime: 60_000,
    retry: false,
    refetchOnWindowFocus: true,
  });
}

/** Includes future active schedules so Fleet never offers a misleading duplicate "Thêm lịch" action. */
export function useAllActiveVehicleSchedules(enabled = true) {
  return useQuery({
    queryKey: qk.vehicleSchedules.allActive,
    queryFn: () => vehicleScheduleClient.list({
      history: true,
      status: VehicleScheduleStatus.ACTIVE,
    }),
    enabled,
    staleTime: 60_000,
    retry: false,
    refetchOnWindowFocus: true,
  });
}

export function useVehicleScheduleHistory(
  vehicleComponent: VehicleComponent | undefined,
  vehicleId: number | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: qk.vehicleSchedules.history(vehicleComponent, vehicleId),
    queryFn: () => vehicleScheduleClient.list({
      history: true,
      vehicleComponent,
      vehicleId,
    }),
    enabled: enabled && vehicleComponent !== undefined && vehicleId !== undefined,
    staleTime: 30_000,
    retry: false,
  });
}

export function useVehicleScheduleMutations() {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: qk.vehicleSchedules.all });

  const create = useMutation({
    mutationFn: (input: CreateVehicleScheduleInput) => vehicleScheduleClient.create(input),
    onSuccess: refresh,
  });
  const update = useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateVehicleScheduleInput }) =>
      vehicleScheduleClient.update(id, input),
    onSuccess: refresh,
  });
  const complete = useMutation({
    mutationFn: (id: number) => vehicleScheduleClient.complete(id),
    onSuccess: refresh,
  });
  const cancel = useMutation({
    mutationFn: (id: number) => vehicleScheduleClient.cancel(id),
    onSuccess: refresh,
  });

  return { create, update, complete, cancel };
}
