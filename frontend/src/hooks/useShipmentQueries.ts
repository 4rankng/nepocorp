/**
 * TanStack Query hooks for the Lô hàng (Shipment) module — NEPO-61.
 * Mirrors useFinancialQueries: thin useQuery/useMutation wrappers around
 * shipmentClient with targeted cache invalidation.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { shipmentClient, type ShipmentListParams } from '../api/shipmentClient';
import { qk } from '../api/keys';
import type {
  CreateShipmentInput,
  RegisterShipmentDocumentInput,
  ShipmentCostInput,
  ShipmentCostUpdateInput,
  UpdateShipmentInput,
} from '@tingting/shared';

export function useShipments(params: ShipmentListParams = {}) {
  return useQuery({
    queryKey: qk.shipments.list(params),
    queryFn: () => shipmentClient.list(params),
  });
}

export function useShipmentDetail(id: number | string | undefined) {
  return useQuery({
    queryKey: qk.shipments.detail(id),
    queryFn: () => shipmentClient.detail(id as number),
    enabled: id != null && Number.isFinite(Number(id)),
  });
}

export function useShipmentCostRegister(id: number | string | undefined) {
  return useQuery({
    queryKey: qk.shipments.costRegister(id),
    queryFn: () => shipmentClient.costRegister(id as number),
    enabled: id != null && Number.isFinite(Number(id)),
  });
}

function useInvalidateShipment() {
  const qc = useQueryClient();
  return (id?: number | string) => {
    qc.invalidateQueries({ queryKey: qk.shipments.all });
    if (id != null) {
      qc.invalidateQueries({ queryKey: qk.shipments.detail(id) });
      qc.invalidateQueries({ queryKey: qk.shipments.costRegister(id) });
    }
    // Lô writes can move totals surfaced elsewhere (dashboard ops alerts).
    qc.invalidateQueries({ queryKey: qk.dashboard.main });
  };
}

export function useCreateShipment() {
  const invalidate = useInvalidateShipment();
  return useMutation({
    mutationFn: (data: CreateShipmentInput) => shipmentClient.create(data),
    onSuccess: () => invalidate(),
  });
}

export function useUpdateShipment(id: number) {
  const invalidate = useInvalidateShipment();
  return useMutation({
    mutationFn: (data: UpdateShipmentInput) => shipmentClient.update(id, data),
    onSuccess: () => invalidate(id),
  });
}

export function useUploadShipmentDocument(id: number) {
  const invalidate = useInvalidateShipment();
  return useMutation({
    mutationFn: ({ file, input }: { file: File; input: RegisterShipmentDocumentInput }) =>
      shipmentClient.uploadDocument(id, file, input),
    onSuccess: () => invalidate(id),
  });
}

export function useDeleteShipmentDocument(id: number) {
  const invalidate = useInvalidateShipment();
  return useMutation({
    mutationFn: (docId: number) => shipmentClient.deleteDocument(id, docId),
    onSuccess: () => invalidate(id),
  });
}

export function useAddShipmentCost(id: number) {
  const invalidate = useInvalidateShipment();
  return useMutation({
    mutationFn: (data: ShipmentCostInput) => shipmentClient.addCost(id, data),
    onSuccess: () => invalidate(id),
  });
}

export function useUpdateShipmentCost(id: number) {
  const invalidate = useInvalidateShipment();
  return useMutation({
    mutationFn: ({ costId, data }: { costId: number; data: ShipmentCostUpdateInput }) =>
      shipmentClient.updateCost(id, costId, data),
    onSuccess: () => invalidate(id),
  });
}

export function useDeleteShipmentCost(id: number) {
  const invalidate = useInvalidateShipment();
  return useMutation({
    mutationFn: (costId: number) => shipmentClient.deleteCost(id, costId),
    onSuccess: () => invalidate(id),
  });
}

/** Gắn/gỡ chuyến vào lô — invalidates the trips list cache + both lô sides. */
export function useLinkTripShipment() {
  const qc = useQueryClient();
  const invalidate = useInvalidateShipment();
  return useMutation({
    mutationFn: ({ tripId, shipmentId }: { tripId: number; shipmentId: number | null }) =>
      shipmentClient.linkTrip(tripId, { shipmentId }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: qk.trips.all });
      if (vars.shipmentId != null) invalidate(vars.shipmentId);
    },
  });
}
