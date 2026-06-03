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
import { useConfirm } from '../../components/UI';
import type { TripDetailPageData, TripDerivedData, TripPermissions, TripUIState } from './types';

/**
 * useTripDetailPage — all business logic for the Trip Detail page.
 * Returns typed data, permissions, derived values, and action handlers.
 * No JSX — pure logic hook.
 */
export function useTripDetailPage(id: string | undefined): TripDetailPageData {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { confirm, dialog: confirmDialog } = useConfirm();

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

    const isExternal = trip.carrierType === 'EXTERNAL';
    const vatRate = Number(trip.vatRate ?? 0.08);
    const revenueRaw = Number(trip.revenue || 0);
    const externalFreightInclVat = Number(trip.externalFreightCost || 0);

    // For EXTERNAL trips, Pete B3 + the test guide require ex-VAT profit math:
    //   profit = round(revenue / (1+vat)) − round(externalFreightCost / (1+vat))
    // The persisted trip.totalCost / trip.grossProfit are 0 for these trips
    // (no fleet operating costs apply), which previously made the KPI strip
    // render "Lợi nhuận gộp = doanh thu" (100% margin). Override here so the
    // single-trip KPI matches the /finance "Doanh thu điều xe ngoài" line.
    const externalMargin = isExternal && revenueRaw && externalFreightInclVat
      ? Math.round(revenueRaw / (1 + vatRate)) - Math.round(externalFreightInclVat / (1 + vatRate))
      : null;
    const revenue = revenueRaw;
    const totalCost = isExternal ? externalFreightInclVat : Number(trip.totalCost || 0);
    const grossProfit = isExternal && externalMargin != null ? externalMargin : Number(trip.grossProfit || 0);
    const marginPct = revenue > 0 ? ((grossProfit / (isExternal ? Math.round(revenue / (1 + vatRate)) : revenue)) * 100).toFixed(1) : null;
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
    const isAccountant = user?.role === Role.ACCOUNTANT;
    const s = trip?.status;
    // Lifecycle / structural edits (route, customer, truck, driver, status
    // transitions) stay with manager/admin only — see trip.service.ts comments
    // and docs/flows/01-TRIP_LIFECYCLE.md §1.3.
    //
    // Financial-figures edits on IN_TRANSIT + COMPLETED are ACCOUNTANT's job
    // (CONTEXT.md Phase 3 + Phase 4: "Accountant finalizes these numbers and
    // moves it to Hoàn thành"). The backend has always allowed it (RBAC
    // `trips:write` for ACCOUNTANT + `updateTripFigures` only blocks LOCKED/
    // CANCELED). The fix below closes the frontend gap surfaced by the bug
    // report "những chuyến ghi hoàn thành này kế toán là không nhập được số
    // liệu" — accountants previously had no entry point to the edit form on
    // completed trips, so road money / ticket / fuel fields looked uneditable.
    return {
      isManagerOrAdmin,
      canEdit: (s === TripStatus.CREATED || s === TripStatus.COMPLETED) && isManagerOrAdmin,
      canEditActuals: (s === TripStatus.IN_TRANSIT || s === TripStatus.COMPLETED)
        && (isManagerOrAdmin || isAccountant),
      canCancel: s !== TripStatus.LOCKED && s !== TripStatus.CANCELED && isManagerOrAdmin,
      canDispatch: s === TripStatus.CREATED && isManagerOrAdmin,
      canLock: s === TripStatus.COMPLETED && isManagerOrAdmin,
      canReassign: s === TripStatus.CREATED && isManagerOrAdmin,
      canAdjust: s === TripStatus.LOCKED && isManagerOrAdmin,
      canUnlock: s === TripStatus.LOCKED && isManagerOrAdmin,
      canChangeDate: s !== TripStatus.CANCELED && isManagerOrAdmin,
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
        const confirmed = await confirm(
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

  const handleUnlock = async () => {
    if (!trip) return;
    const confirmed = await confirm(
      'Mở khóa chuyến này sẽ hoàn tác các bút toán tài chính đã ghi nhận. Tiếp tục?'
    );
    if (!confirmed) return;
    setActionLoading(true);
    setActionError('');
    try {
      await api.post(`/trips/${trip.id}/unlock`, {});
      await refetchTrip();
    } catch (err: any) {
      setActionError(err.message || 'Lỗi khi mở khóa chuyến đi.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleChangeDepartureDate = async (newDate: string) => {
    if (!trip) return;
    const confirmed = await confirm(
      `Thay đổi ngày khởi hành thành ${newDate}?`
    );
    if (!confirmed) return;
    setActionLoading(true);
    setActionError('');
    try {
      await api.patch(`/trips/${trip.id}/departure-date`, { departureDate: newDate });
      await refetchTrip();
    } catch (err: any) {
      setActionError(err.message || 'Lỗi khi thay đổi ngày khởi hành.');
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
    confirm,
    confirmDialog,
    handleAction,
    handleLockClick,
    handleUnlock,
    handleChangeDepartureDate,
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
