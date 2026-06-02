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
    mutationFn: ({ tripId, data }: { tripId: number; data: { containerTypeId?: number; containerNumber: string; sealNumber?: string; notes?: string } }) =>
      forwarderClient.createContainer(tripId, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['forwarder-trip-detail', variables.tripId] });
    },
  });
}

export function useCreateForwarderExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      tripId: number;
      expenseType: string;
      buyAmount: number;
      sellAmount?: number;
      settlementMethod?: 'COMPANY_DIRECT' | 'FORWARDER_ADVANCE';
      supplierId?: number;
      invoiceNumber?: string;
      invoiceDate?: string;
      declarationNumber?: string;
      containerNumber?: string;
      note?: string;
    }) =>
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

// ── Advance Requests (forwarder) ──────────────────────────────────────────────

export function useForwarderAdvanceRequests() {
  return useQuery({
    queryKey: ['forwarder-advance-requests'],
    queryFn: () => forwarderClient.getAdvanceRequests(),
  });
}

export function useCreateAdvanceRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { amount: number; reason: string }) =>
      forwarderClient.createAdvanceRequest(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['forwarder-advance-requests'] });
    },
  });
}

// ── Advance Settlements (forwarder) ──────────────────────────────────────────

export function useForwarderSettlements() {
  return useQuery({
    queryKey: ['forwarder-settlements'],
    queryFn: () => forwarderClient.getAdvanceSettlements(),
  });
}

export function useCreateAdvanceSettlement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { totalExpenseAmount?: number; refundAmount?: number; note?: string; advanceRequestIds: number[]; tripExpenseIds?: number[] }) =>
      forwarderClient.createAdvanceSettlement(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['forwarder-settlements'] });
      qc.invalidateQueries({ queryKey: ['forwarder-advance-requests'] });
      qc.invalidateQueries({ queryKey: ['forwarder-unlinked-expenses'] });
    },
  });
}

export function useUnlinkedExpenses() {
  return useQuery({
    queryKey: ['forwarder-unlinked-expenses'],
    queryFn: () => forwarderClient.getUnlinkedExpenses(),
  });
}

// ── Admin: Advance Requests ──────────────────────────────────────────────────

export function useAdminAdvanceRequests(filters?: { status?: string }) {
  return useQuery({
    queryKey: ['admin-advance-requests', filters],
    queryFn: () => forwarderClient.listAllAdvanceRequests(filters),
  });
}

export function useApproveAdvanceRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => forwarderClient.approveAdvanceRequest(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-advance-requests'] });
    },
  });
}

export function useRejectAdvanceRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => forwarderClient.rejectAdvanceRequest(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-advance-requests'] });
    },
  });
}

// ── Admin: Advance Settlements ──────────────────────────────────────────────

export function useAdminSettlements(filters?: { status?: string }) {
  return useQuery({
    queryKey: ['admin-settlements', filters],
    queryFn: () => forwarderClient.listAllAdvanceSettlements(filters),
  });
}

export function useCheckSettlement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => forwarderClient.checkAdvanceSettlement(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-settlements'] });
    },
  });
}

export function useApproveSettlement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => forwarderClient.approveAdvanceSettlement(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-settlements'] });
    },
  });
}

export function useRejectSettlement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => forwarderClient.rejectAdvanceSettlement(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-settlements'] });
    },
  });
}
