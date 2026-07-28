import {
  VEHICLE_SCHEDULES,
  type CreateVehicleScheduleInput,
  type UpdateVehicleScheduleInput,
  type VehicleComponent,
  type VehicleSchedule,
  type VehicleScheduleStatus,
} from '@tingting/shared';
import { api } from '../lib/api';
import { toQuery } from '../lib/http/query';

export interface VehicleScheduleListParams {
  vehicleComponent?: VehicleComponent;
  vehicleId?: number;
  history?: boolean;
  status?: VehicleScheduleStatus;
}

export const vehicleScheduleClient = {
  list(params: VehicleScheduleListParams = {}) {
    return api.get<VehicleSchedule[]>(`${VEHICLE_SCHEDULES.LIST}${toQuery({
      vehicleComponent: params.vehicleComponent,
      vehicleId: params.vehicleId,
      history: params.history,
      status: params.status,
    })}`);
  },

  create(input: CreateVehicleScheduleInput) {
    return api.post<VehicleSchedule>(VEHICLE_SCHEDULES.CREATE, input);
  },

  update(id: number, input: UpdateVehicleScheduleInput) {
    return api.put<VehicleSchedule>(VEHICLE_SCHEDULES.UPDATE(id), input);
  },

  complete(id: number) {
    return api.post<VehicleSchedule>(VEHICLE_SCHEDULES.COMPLETE(id), {});
  },

  cancel(id: number) {
    return api.post<VehicleSchedule>(VEHICLE_SCHEDULES.CANCEL(id), {});
  },
};
