import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { forwarderClient } from '../api/forwarderClient';
import { financialClient } from '../api/financialClient';
import { qk } from '../api/keys';

export function useForwarderTrips(
  status?: string,
  filters?: { search?: string; dateFrom?: string; dateTo?: string },
) {
  // Month-bounded portal list — fetch the whole window in one large page so
  // the hero KPIs (Σ containers, payment highlights) see every trip.
  return useQuery({
    queryKey: qk.forwarder.trips(status, filters),
    queryFn: () => forwarderClient.getTrips(status, { ...filters, page: 1, limit: 1000 }),
  });
}

export function useForwarderTripDetail(id: number) {
  return useQuery({
    queryKey: qk.forwarder.tripDetail(id),
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
      qc.invalidateQueries({ queryKey: qk.forwarder.tripDetail(variables.tripId) });
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
      /** B5: authoritative container FK (id). When set the server mirrors containerNumber. */
      tripContainerId?: number;
      note?: string;
    }) =>
      forwarderClient.createExpense(data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: qk.forwarder.tripDetail(variables.tripId) });
    },
  });
}

export function useUpdateForwarderExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, tripId: _tripId, ...data }: {
      id: number; tripId: number; expenseType: string; buyAmount: number; sellAmount?: number;
      settlementMethod?: 'COMPANY_DIRECT' | 'FORWARDER_ADVANCE'; supplierId?: number | null;
      invoiceNumber?: string | null; invoiceDate?: string | null; declarationNumber?: string | null;
      tripContainerId?: number | null; note?: string | null;
    }) => forwarderClient.updateExpense(id, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: qk.forwarder.tripDetail(variables.tripId) });
      qc.invalidateQueries({ queryKey: qk.forwarder.unlinkedExpenses });
    },
  });
}

export function useSetForwarderExpenseCompletion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ tripId, tripContainerId, completed }: { tripId: number; tripContainerId: number | null; completed: boolean }) =>
      forwarderClient.setExpenseCompletion(tripId, { tripContainerId, completed }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: qk.forwarder.tripDetail(variables.tripId) });
      qc.invalidateQueries({ queryKey: qk.forwarder.unlinkedExpenses });
    },
  });
}

export function useDeleteForwarderExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, tripId: _tripId }: { id: number; tripId: number }) =>
      forwarderClient.deleteExpense(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.forwarder.tripDetailAll });
    },
  });
}

// ── Advance Requests (forwarder) ──────────────────────────────────────────────

export function useForwarderAdvanceRequests(filters?: { status?: string; dateFrom?: string; dateTo?: string }) {
  return useQuery({
    queryKey: qk.forwarder.advanceRequests(filters),
    queryFn: () => forwarderClient.getAdvanceRequests(filters),
  });
}

export function useForwarderEligibleAdvanceRequests() {
  return useQuery({
    queryKey: qk.forwarder.eligibleAdvanceRequests,
    queryFn: () => forwarderClient.getEligibleAdvanceRequests(),
  });
}

export function useForwarderAdvanceBalance() {
  return useQuery({
    queryKey: qk.forwarder.advanceBalance,
    queryFn: () => forwarderClient.getAdvanceBalance(),
  });
}

export function useCreateAdvanceRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { amount: number; reason: string }) =>
      forwarderClient.createAdvanceRequest(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.forwarder.forwarderAdvanceRequestsAll });
    },
  });
}

export function useUpdateAdvanceRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number; amount: number; reason: string }) =>
      forwarderClient.updateAdvanceRequest(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.forwarder.forwarderAdvanceRequestsAll });
      // "Tồn tạm ứng" and the eligible-for-settlement picker are derived from
      // approved requests, so an edit can move both numbers.
      qc.invalidateQueries({ queryKey: qk.forwarder.advanceBalance });
      qc.invalidateQueries({ queryKey: qk.forwarder.eligibleAdvanceRequests });
    },
  });
}

export function useDeleteAdvanceRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => forwarderClient.deleteAdvanceRequest(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.forwarder.forwarderAdvanceRequestsAll });
      qc.invalidateQueries({ queryKey: qk.forwarder.advanceBalance });
      qc.invalidateQueries({ queryKey: qk.forwarder.eligibleAdvanceRequests });
    },
  });
}

// ── Advance Settlements (forwarder) ──────────────────────────────────────────

export function useForwarderSettlements(filters?: { dateFrom?: string; dateTo?: string }) {
  return useQuery({
    queryKey: qk.forwarder.settlements(filters),
    queryFn: () => forwarderClient.getAdvanceSettlements(filters),
  });
}

export function useForwarderSettlementDetail(id: number) {
  return useQuery({
    queryKey: qk.forwarder.settlementDetail(id),
    queryFn: () => forwarderClient.getAdvanceSettlementDetail(id),
    enabled: !!id,
  });
}

export function useCreateAdvanceSettlement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { totalExpenseAmount?: number; refundAmount?: number; reimbursementAmount?: number; note?: string; advanceRequestIds: number[]; tripExpenseIds?: number[] }) =>
      forwarderClient.createAdvanceSettlement(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.forwarder.settlementsAll });
      qc.invalidateQueries({ queryKey: qk.forwarder.forwarderAdvanceRequestsAll });
      qc.invalidateQueries({ queryKey: qk.forwarder.unlinkedExpenses });
    },
  });
}

export function useUnlinkedExpenses() {
  return useQuery({
    queryKey: qk.forwarder.unlinkedExpenses,
    queryFn: () => forwarderClient.getUnlinkedExpenses(),
  });
}

// ── Admin: Advance Requests ──────────────────────────────────────────────────

/** The slice of a mutation result the decision rows need. */
export interface PendingMutation {
  isPending?: boolean;
  variables?: number;
}

/**
 * Resolve the in-flight decision for a page that reads several mutation hooks.
 *
 * The advance pages used to read `.isPending` off each hook result directly
 * (`approveMutation.isPending ? … : rejectMutation.isPending ? …`). A hook that
 * returns nothing — a module the dev server is midway through replacing, a
 * hook disabled for the current role, a mocked module in a test — then took the
 * whole route down with `Cannot read properties of undefined (reading
 * 'isPending')` (kanban 101026101500) instead of rendering the list.
 *
 * The first in-flight candidate wins, in the order given, matching the ternary
 * chain it replaces. A missing mutation simply reads as "nothing in flight".
 */
export function pendingAction<K extends string>(
  candidates: ReadonlyArray<{ kind: K; mutation: PendingMutation | undefined }>,
): { pendingId?: number; pendingKind?: K } {
  for (const { kind, mutation } of candidates) {
    if (mutation?.isPending) return { pendingId: mutation.variables, pendingKind: kind };
  }
  return {};
}

export function useAdminAdvanceRequests(filters?: { status?: string; dateFrom?: string; dateTo?: string }) {
  return useQuery({
    queryKey: qk.adminForwarder.advanceRequests(filters),
    queryFn: () => forwarderClient.listAllAdvanceRequests(filters),
  });
}

export function useAdminAdvanceBalances() {
  return useQuery({
    queryKey: qk.adminForwarder.advanceBalances,
    queryFn: () => financialClient.getAdvanceBalances(),
  });
}

export function useApproveAdvanceRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => forwarderClient.approveAdvanceRequest(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.adminForwarder.advanceRequestsAll });
    },
  });
}

export function useRejectAdvanceRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => forwarderClient.rejectAdvanceRequest(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.adminForwarder.advanceRequestsAll });
    },
  });
}

export function useRestoreAdvanceRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => forwarderClient.restoreAdvanceRequest(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.adminForwarder.advanceRequestsAll });
    },
  });
}

// ── Admin: Advance Settlements ──────────────────────────────────────────────

export function useAdminSettlements(filters?: { status?: string; dateFrom?: string; dateTo?: string }) {
  return useQuery({
    queryKey: qk.adminForwarder.settlements(filters),
    queryFn: () => forwarderClient.listAllAdvanceSettlements(filters),
  });
}

export function useAdminSettlementOpsCompletion(settlementIds: number[]) {
  return useQuery({
    queryKey: qk.adminForwarder.settlementOpsCompletion(settlementIds),
    queryFn: () => forwarderClient.getSettlementOpsCompletion(settlementIds),
    enabled: settlementIds.length > 0,
  });
}

export function useCheckSettlement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => forwarderClient.checkAdvanceSettlement(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.adminForwarder.settlementsAll });
    },
  });
}

export function useApproveSettlement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => forwarderClient.approveAdvanceSettlement(id),
    onSuccess: (_data, id) => {
      // The detail page can trigger this too (kanban 101026003210), so its own
      // query must refresh — otherwise the header keeps the old status.
      qc.invalidateQueries({ queryKey: qk.adminForwarder.settlementDetail(id) });
      qc.invalidateQueries({ queryKey: qk.forwarder.settlementDetail(id) });
      qc.invalidateQueries({ queryKey: qk.adminForwarder.settlementsAll });
      qc.invalidateQueries({ queryKey: qk.adminForwarder.advanceRequestsAll });
      qc.invalidateQueries({ queryKey: qk.adminForwarder.advanceBalances });
      qc.invalidateQueries({ queryKey: qk.forwarder.settlementsAll });
      qc.invalidateQueries({ queryKey: qk.forwarder.forwarderAdvanceRequestsAll });
      qc.invalidateQueries({ queryKey: qk.forwarder.eligibleAdvanceRequests });
      qc.invalidateQueries({ queryKey: qk.forwarder.advanceBalance });
    },
  });
}

export function useUpdateAdvanceSettlement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ settlementId, ...data }: {
      settlementId: number;
      advanceRequestIds: number[];
      tripExpenseIds: number[];
      refundAmount: number;
      reimbursementAmount: number;
      note?: string | null;
    }) => forwarderClient.updateAdvanceSettlement(settlementId, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: qk.adminForwarder.settlementDetail(variables.settlementId) });
      qc.invalidateQueries({ queryKey: qk.adminForwarder.settlementsAll });
    },
  });
}

/** Portal variant — Ops saves composition changes on their own PENDING phiếu. */
export function useUpdateMyAdvanceSettlement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ settlementId, ...data }: {
      settlementId: number;
      advanceRequestIds: number[];
      tripExpenseIds: number[];
      refundAmount: number;
      reimbursementAmount: number;
      note?: string | null;
    }) => forwarderClient.updateMyAdvanceSettlement(settlementId, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: qk.forwarder.settlementDetail(variables.settlementId) });
      qc.invalidateQueries({ queryKey: qk.forwarder.settlementsAll });
      qc.invalidateQueries({ queryKey: qk.forwarder.eligibleAdvanceRequests });
      qc.invalidateQueries({ queryKey: qk.adminForwarder.settlementsAll });
    },
  });
}

export function useUpdateSettlementExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ settlementId, expenseId, ...data }: {
      settlementId: number; expenseId: number; buyAmount: number; sellAmount?: number;
      invoiceNumber?: string | null; invoiceDate?: string | null; declarationNumber?: string | null;
      note?: string | null; adjustmentReason: string;
    }) => forwarderClient.updateSettlementExpense(settlementId, expenseId, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: qk.adminForwarder.settlementDetail(variables.settlementId) });
      qc.invalidateQueries({ queryKey: qk.adminForwarder.settlementsAll });
    },
  });
}

export function useRejectSettlement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => forwarderClient.rejectAdvanceSettlement(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: qk.adminForwarder.settlementDetail(id) });
      qc.invalidateQueries({ queryKey: qk.forwarder.settlementDetail(id) });
      qc.invalidateQueries({ queryKey: qk.adminForwarder.settlementsAll });
    },
  });
}

// ── Admin: Settlement detail (for print/export page) ─────────────────────────

export function useAdminSettlementDetail(id: number) {
  return useQuery({
    queryKey: qk.adminForwarder.settlementDetail(id),
    queryFn: () => financialClient.getAdminSettlementDetail(id),
    enabled: !!id,
  });
}
