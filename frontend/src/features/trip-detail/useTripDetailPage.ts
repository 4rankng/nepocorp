import { useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import {
  useTripDetail,
  useTripAdjustments,
  useTrucksAndDrivers,
  useFuelConfig,
} from '../../hooks/useQueries';
import { useCatalogs } from '../../hooks/useCatalogs';
import { TripStatus, Role } from '@nepocorp/shared';
import type { TripDetailPageData, TripDerivedData, TripPermissions, TripUIState } from './types';

/**
 * useTripDetailPage — all business logic for the Trip Detail page.
 * Returns typed data, permissions, derived values, and action handlers.
 * No JSX — pure logic hook.
 */
export function useTripDetailPage(id: string | undefined): TripDetailPageData {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  /* ── Data fetching ──────────────────────────────────────────────────── */
  const {
    data: trip,
    isLoading: loading,
    error: queryError,
    refetch: refetchTrip,
  } = useTripDetail(id);

  const error = queryError ? 'Không thể tải thông tin lệnh vận chuyển.' : '';
  const { data: adjustments = [] } = useTripAdjustments(trip?.id ?? 0);
  const { data: fuelConfig } = useFuelConfig();
  const { data: catalogData } = useCatalogs();

  /* ── UI state ───────────────────────────────────────────────────────── */
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  const [showReassign, setShowReassign] = useState(false);
  const { data: trucksDriversData } = useTrucksAndDrivers({
    enabled: showReassign || trip?.status === TripStatus.CREATED,
  });
  const reassignTrucks = trucksDriversData?.trucks ?? [];
  const reassignDrivers = trucksDriversData?.drivers ?? [];
  const [reassignTruckId, setReassignTruckId] = useState('');
  const [reassignDriverId, setReassignDriverId] = useState('');
  const [reassignLoading, setReassignLoading] = useState(false);
  const [reassignError, setReassignError] = useState('');

  const [showAdjust, setShowAdjust] = useState(false);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustNote, setAdjustNote] = useState('');
  const [adjustRef, setAdjustRef] = useState('');
  const [adjustSubmitting, setAdjustSubmitting] = useState(false);
  const [adjustError, setAdjustError] = useState('');

  const ui: TripUIState = {
    actionLoading,
    actionError,
    showReassign,
    reassignTruckId,
    reassignDriverId,
    reassignLoading,
    reassignError,
    showAdjust,
    adjustAmount,
    adjustNote,
    adjustRef,
    adjustSubmitting,
    adjustError,
  };

  /* ── Derived data ───────────────────────────────────────────────────── */
  const derived: TripDerivedData = useMemo(() => {
    if (!trip) {
      return {
        revenue: 0, totalCost: 0, grossProfit: 0, marginPct: null,
        fuelCost: 0, roadAllowance: 0, driverSalary: 0, serviceCost: 0,
        totalKm: 0, fuelLiters: 0, computedLiters: 0, ttbq: 0,
        fuelVarianceLiters: 0, fuelVarianceOver: false,
        externalCarrierName: '—', externalMargin: null,
      };
    }

    const revenue = Number(trip.revenue || 0);
    const totalCost = Number(trip.totalCost || 0);
    const grossProfit = Number(trip.grossProfit || 0);
    const marginPct = revenue > 0 ? ((grossProfit / revenue) * 100).toFixed(1) : null;
    const fuelCost = Number(trip.totalFuelCost || 0);
    const roadAllowance = Number(trip.totalRoadAllowance || 0);
    const driverSalary = Number(trip.driverSalary || 0);
    const serviceCost = 0;
    const totalKm = trip.legs?.reduce((s, l) => s + Number(l.km), 0) ?? 0;
    const fuelLiters = Number(trip.fuelLiters) || 0;
    const computedLiters = trip.legs?.reduce((s, l) => s + Number(l.calculatedLiters || 0), 0) ?? 0;
    const ttbq = totalKm > 0 && fuelLiters > 0 ? (fuelLiters / totalKm) * 100 : 0;
    const fuelVarianceLiters = fuelLiters - computedLiters;
    const fuelVarianceOver = fuelVarianceLiters > 0;

    const externalCarrierName = trip.externalCarrierId
      ? (catalogData?.customers.find(c => c.id === trip.externalCarrierId)?.name ?? `ID ${trip.externalCarrierId}`)
      : '—';

    const externalMargin = trip.carrierType === 'EXTERNAL' && trip.revenue && trip.externalFreightCost
      ? Math.round(Number(trip.revenue) / (1 + Number(trip.vatRate ?? 0.08)))
        - Math.round(Number(trip.externalFreightCost) / (1 + Number(trip.vatRate ?? 0.08)))
      : null;

    return {
      revenue, totalCost, grossProfit, marginPct,
      fuelCost, roadAllowance, driverSalary, serviceCost,
      totalKm, fuelLiters, computedLiters, ttbq,
      fuelVarianceLiters, fuelVarianceOver,
      externalCarrierName, externalMargin,
    };
  }, [trip, catalogData]);

  const fuelPriceConfig = fuelConfig?.unitPrice ? Number(fuelConfig.unitPrice) : null;

  /* ── Permissions ────────────────────────────────────────────────────── */
  const permissions: TripPermissions = useMemo(() => {
    const isManagerOrAdmin = user?.role === Role.ADMIN || user?.role === Role.MANAGER;
    const s = trip?.status;
    return {
      isManagerOrAdmin,
      canEdit: (s === TripStatus.CREATED || s === TripStatus.COMPLETED) && isManagerOrAdmin,
      canCancel: s !== TripStatus.LOCKED && s !== TripStatus.CANCELED && isManagerOrAdmin,
      canDispatch: s === TripStatus.CREATED && isManagerOrAdmin,
      canLock: s === TripStatus.COMPLETED && isManagerOrAdmin,
      canReassign: s === TripStatus.CREATED && isManagerOrAdmin,
      canAdjust: s === TripStatus.LOCKED && isManagerOrAdmin,
      needsPhotos: !trip?.photoUrls || trip.photoUrls.length === 0,
      readOnly: s === 'LOCKED' || s === 'CANCELED',
    };
  }, [user, trip]);

  /* ── Action handlers ────────────────────────────────────────────────── */
  const handleAction = async (_action: string, method: () => Promise<unknown>) => {
    setActionLoading(true);
    setActionError('');
    try {
      await method();
      await refetchTrip();
    } catch (err) {
      if (err instanceof ApiError) {
        setActionError(err.message);
      } else {
        setActionError('Có lỗi xảy ra. Vui lòng thử lại.');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleLockClick = async () => {
    if (!trip) return;
    setActionLoading(true);
    setActionError('');
    try {
      await api.post(`/trips/${trip.id}/lock`, {});
      await refetchTrip();
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 422) {
        const confirmed = window.confirm(
          'Doanh thu chuyến đi này bằng 0 đ. Bạn có chắc chắn muốn khóa chuyến với doanh thu bằng 0?'
        );
        if (confirmed) {
          setActionLoading(true);
          try {
            await api.post(`/trips/${trip.id}/lock`, { confirmZeroRevenue: true });
            await refetchTrip();
          } catch (retryErr: any) {
            setActionError(retryErr.message || 'Lỗi khi khóa chuyến đi.');
          } finally {
            setActionLoading(false);
          }
        }
      } else if (err instanceof ApiError) {
        setActionError(err.message);
      } else {
        setActionError(err.message || 'Có lỗi xảy ra khi khóa chuyến đi.');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const openReassign = () => {
    setReassignError('');
    setReassignTruckId(String(trip?.truckId ?? ''));
    setReassignDriverId(String(trip?.driverId ?? ''));
    setShowReassign(true);
  };

  const handleReassign = async () => {
    if (!id || !reassignTruckId || !reassignDriverId) return;
    setReassignLoading(true);
    setReassignError('');
    try {
      await api.patch(`/trips/${id}/reassign`, {
        truckId: Number(reassignTruckId),
        driverId: Number(reassignDriverId),
      });
      setShowReassign(false);
      await refetchTrip();
    } catch (e: any) {
      setReassignError(e.message || 'Lỗi khi phân xe lại');
    } finally {
      setReassignLoading(false);
    }
  };

  const openAdjust = () => {
    setAdjustAmount('');
    setAdjustNote('');
    setAdjustRef('');
    setAdjustError('');
    setShowAdjust(true);
  };

  const handleAdjustSubmit = async () => {
    if (!id || !adjustNote.trim() || !adjustRef.trim() || adjustAmount === '') return;
    setAdjustSubmitting(true);
    setAdjustError('');
    try {
      await api.post(`/trips/${id}/adjustment`, {
        amount: Number(adjustAmount),
        note: adjustNote.trim(),
        signedAgreementRef: adjustRef.trim(),
      });
      await queryClient.invalidateQueries({ queryKey: ['trip-adjustments'] });
      await refetchTrip();
      setAdjustAmount('');
      setAdjustNote('');
      setAdjustRef('');
    } catch (e: any) {
      setAdjustError(e.message || 'Lỗi khi tạo điều chỉnh');
    } finally {
      setAdjustSubmitting(false);
    }
  };

  return {
    trip,
    loading,
    error,
    refetchTrip,
    derived,
    permissions,
    ui,
    fuelPriceConfig,
    adjustments,
    reassignTrucks,
    reassignDrivers,
    handleAction,
    handleLockClick,
    openReassign,
    handleReassign,
    openAdjust,
    handleAdjustSubmit,
    setReassignTruckId,
    setReassignDriverId,
    setShowReassign,
    setShowAdjust,
    setAdjustAmount,
    setAdjustNote,
    setAdjustRef,
  };
}
