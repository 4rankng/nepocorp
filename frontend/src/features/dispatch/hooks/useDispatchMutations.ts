import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { tripClient } from '../../../api/tripClient';
import type { NormalizedTrip } from '../../../hooks/useTripQueries';
import { useConfirm } from '../../../components/UI';
import type { ReassignState, Toast } from '../utils';

export function useDispatchMutations(pendingTrips: NormalizedTrip[]) {
  const queryClient = useQueryClient();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [dispatching, setDispatching] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((kind: 'success' | 'error', text: string) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, kind, text }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4500);
  }, []);

  const handleDispatch = useCallback(async (tripId: number) => {
    const trip = pendingTrips.find((t) => t.id === tripId);
    if (!(await confirm('Bạn có chắc chắn muốn xuất phát chuyến đi này? Trạng thái sẽ chuyển thành Đang chạy.'))) {
      return;
    }
    setDispatching(true);
    setActionLoading(tripId);
    try {
      await tripClient.dispatchTrip(tripId);
      const code = trip?.tripCode || `#${tripId}`;
      addToast('success', `Đã xuất phát chuyến ${code}`);
      await queryClient.invalidateQueries({ queryKey: ['dispatch'] });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi khởi hành chuyến đi.';
      addToast('error', msg);
    } finally {
      setActionLoading(null);
      setDispatching(false);
    }
  }, [pendingTrips, confirm, addToast, queryClient]);

  return { actionLoading, dispatching, toasts, setToasts, handleDispatch, confirmDialog };
}

export function useReassignMutations() {
  const queryClient = useQueryClient();
  const [reassignOpen, setReassignOpen] = useState<number | null>(null);
  const [reassignState, setReassignState] = useState<ReassignState>({
    truckId: '',
    driverId: '',
    loading: false,
    error: '',
  });

  const openReassign = useCallback((trip: NormalizedTrip) => {
    setReassignOpen(trip.id);
    setReassignState({
      truckId: String(trip.truckId),
      driverId: String(trip.driverId),
      loading: false,
      error: '',
    });
  }, []);

  const closeReassign = useCallback(() => {
    setReassignOpen(null);
    setReassignState({ truckId: '', driverId: '', loading: false, error: '' });
  }, []);

  const handleReassign = useCallback(async (tripId: number) => {
    if (!reassignState.truckId || !reassignState.driverId) {
      setReassignState((s) => ({ ...s, error: 'Vui lòng chọn xe và tài xế' }));
      return;
    }
    setReassignState((s) => ({ ...s, loading: true, error: '' }));
    try {
      await tripClient.reassignTrip(tripId, {
        truckId: Number(reassignState.truckId),
        driverId: Number(reassignState.driverId),
      });
      await queryClient.invalidateQueries({ queryKey: ['dispatch'] });
      closeReassign();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi cập nhật';
      setReassignState((s) => ({ ...s, loading: false, error: msg }));
    }
  }, [reassignState.truckId, reassignState.driverId, queryClient, closeReassign]);

  return { reassignOpen, reassignState, setReassignState, openReassign, closeReassign, handleReassign };
}
