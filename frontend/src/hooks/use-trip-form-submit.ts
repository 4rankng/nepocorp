import { useCallback, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { FuelMode, TripStatus } from '@tingting/shared';
import type { TripDetail } from '@tingting/shared';
import { api, ApiError } from '../lib/api';
import { tripClient } from '../api/tripClient';
import { qk } from '../api/keys';
import { useToast } from '../components/shared/Toast';
import type { FormLeg } from './useTripFormLegs';
import type { UseTripFormStateReturn, ContainerFormRow } from './useTripFormState';
import { resolveContainerCount } from './tripFormDispatchUtils';
import { buildContainerBatchPayload, rebindSavedContainerRows, type ServerContainer } from '../components/trip/container-instance-helpers';
import { moneyInputToNumber } from '../lib/moneyInput';
import { fuelPriceSanityError } from './tripFuelPriceGuard';

function moneyOrZero(value: string): number { return moneyInputToNumber(value) ?? 0; }
function moneyOrUndefined(value: string): number | undefined { return moneyInputToNumber(value); }
function moneyOrNull(value: string): number | null { return moneyInputToNumber(value) ?? null; }

interface Params { state: UseTripFormStateReturn; isEditMode: boolean; existingTrip: TripDetail | undefined; legs: FormLeg[]; hasOptionalData: boolean; photoUrls: string[]; flushPendingContainerPhotos: (tripId: number, rowKeyToContainerId: Map<string, number>) => Promise<Map<string, string>>; }

export async function saveTripFiguresOnce<T>(
  save: () => Promise<T>,
  refreshAfterConflict: () => Promise<unknown>,
): Promise<T> {
  try {
    return await save();
  } catch (error) {
    if (error instanceof ApiError && error.status === 409) {
      await refreshAfterConflict();
    }
    throw error;
  }
}

export function useTripFormSubmit({ state: s, isEditMode, existingTrip, legs, hasOptionalData, photoUrls, flushPendingContainerPhotos }: Params) {
const queryClient = useQueryClient();
const { toast: showToast } = useToast();
const createdTrip = useRef<{ id: number; plan: string } | null>(null);
const [createdTripId, setCreatedTripId] = useState<number | null>(null);
const submitting = useRef(false);
const handleSubmit = useCallback(
  async (e?: React.FormEvent): Promise<number | undefined> => {
    e?.preventDefault();
    if (submitting.current) return;
    s.setError("");

    const focusAndScroll = (id: string) => {
      const el = document.getElementById(id);
      if (el) {
        el.focus();
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    };

    // Compulsory fields check
    if (!s.customerId) {
      const msg = "Khách hàng là bắt buộc.";
      s.setError(msg);
      showToast({ kind: 'error', message: msg });
      focusAndScroll("customerId");
      return;
    }
    if (!s.routeId) {
      const msg = "Tuyến đường là bắt buộc.";
      s.setError(msg);
      showToast({ kind: 'error', message: msg });
      focusAndScroll("routeId");
      return;
    }
    if (!s.cargoTypeId) {
      const msg = "Loại hàng là bắt buộc.";
      s.setError(msg);
      showToast({ kind: 'error', message: msg });
      focusAndScroll("cargoTypeId");
      return;
    }
    if (!s.plannedContainerTypeId && !s.containerRows.some(r => r.containerTypeId)) {
      const msg = "Loại container là bắt buộc.";
      s.setError(msg);
      showToast({ kind: 'error', message: msg });
      focusAndScroll("plannedContainerTypeId");
      return;
    }
    if (!s.departureDate) {
      const msg = "Ngày khởi hành là bắt buộc.";
      s.setError(msg);
      showToast({ kind: 'error', message: msg });
      focusAndScroll("departureDate");
      return;
    }
    if (s.carrierType === 'OWN') {
      if (!s.truckId) {
        const msg = "Xe đầu kéo là bắt buộc.";
        s.setError(msg);
        showToast({ kind: 'error', message: msg });
        focusAndScroll("truckId");
        return;
      }
      if (!s.trailerType) {
        const msg = "Loại rơ moóc là bắt buộc.";
        s.setError(msg);
        showToast({ kind: 'error', message: msg });
        focusAndScroll("trailerType");
        return;
      }
      if (!s.driverId) {
        const msg = "Lái xe là bắt buộc.";
        s.setError(msg);
        showToast({ kind: 'error', message: msg });
        focusAndScroll("driverId");
        return;
      }
    } else {
      // The counter requires both for an external plan, so the guard must too —
      // otherwise the two disagree and a blocked form can still POST.
      if (!s.externalCarrierId) {
        const msg = "Đối tác điều xe là bắt buộc.";
        s.setError(msg);
        showToast({ kind: 'error', message: msg });
        focusAndScroll("externalCarrierId");
        return;
      }
      if (!s.externalFreightCost.trim()) {
        const msg = "Giá cước thuê ngoài là bắt buộc.";
        s.setError(msg);
        showToast({ kind: 'error', message: msg });
        focusAndScroll("externalFreightCost");
        return;
      }
    }
    // External plate is NOT required here: at planning time the partner has not
    // assigned a truck yet. It is required when the trip is completed (server
    // guard in transitionTripStatus) — kanban 20260921_4.

    const legsToSubmit = isEditMode ? legs : legs.filter(
      leg => leg.origin.trim() !== '' || leg.destination.trim() !== '' || leg.km.trim() !== '',
    );
    if (isEditMode || hasOptionalData) {
      if (isEditMode && legsToSubmit.length === 0) {
        const msg = 'Vui lòng nhập ít nhất một chặng đường.';
        s.setError(msg);
        showToast({ kind: 'error', message: msg });
        return;
      }
      for (const leg of legsToSubmit) {
        if (!leg.origin.trim() || !leg.destination.trim()) {
          const msg = `Chặng ${leg.sequence}: Vui lòng nhập đủ điểm đi và điểm đến.`;
          s.setError(msg);
          showToast({ kind: 'error', message: msg });
          return;
        }
        const kmRaw = (leg.km ?? '').toString().trim();
        if (kmRaw !== '' && (!Number.isFinite(Number(kmRaw)) || Number(kmRaw) < 0)) {
          const msg = `Chặng ${leg.sequence}: Quãng đường phải là số không âm.`;
          s.setError(msg);
          showToast({ kind: 'error', message: msg });
          return;
        }
      }
      const supplementNum = Number(s.fuelSupplementLiters);
      if (supplementNum > 0 && !s.fuelSupplementReason.trim()) {
        const msg = 'Vui lòng nhập lý do cấp dầu bổ sung.';
        s.setError(msg);
        showToast({ kind: 'error', message: msg });
        focusAndScroll("fuelSupplementReason");
        return;
      }
      // A fat-fingered pump price would book a nonsense fuel payable (081026232520).
      const priceErr = fuelPriceSanityError(moneyInputToNumber(s.fuelActualUnitPrice));
      if (priceErr) { s.setError(priceErr); showToast({ kind: 'error', message: priceErr }); focusAndScroll("fuelActualUnitPrice"); return; }
    }

    // An allocation exists only when its litres field has a value. The form
    // deliberately has no separate checkbox or "enabled" control.
    const allocationRows = s.fuelAllocations.filter(allocation => allocation.liters.trim() !== '');
    for (const allocation of allocationRows) {
      const liters = Number(allocation.liters);
      if (!Number.isFinite(liters) || liters <= 0) {
        const msg = 'Số lít tại mỗi điểm đổ phải lớn hơn 0.';
        s.setError(msg);
        showToast({ kind: 'error', message: msg });
        return;
      }
      if (Math.abs(liters * 100 - Math.round(liters * 100)) > 1e-8) {
        const msg = 'Số lít tại mỗi điểm đổ chỉ được có tối đa 2 chữ số thập phân.';
        s.setError(msg);
        showToast({ kind: 'error', message: msg });
        return;
      }
      if (allocation.paymentMethod === 'CREDIT' && allocation.supplierId === null) {
        const msg = 'Vui lòng chọn nhà cung cấp cho dòng ghi công nợ.';
        s.setError(msg);
        showToast({ kind: 'error', message: msg });
        return;
      }
    }
    const fuelAllocations = allocationRows.map(allocation => ({
      supplierId: allocation.paymentMethod === 'CASH' ? null : allocation.supplierId,
      liters: Number(allocation.liters),
      unitPrice: allocation.unitPrice && Number(allocation.unitPrice) > 0 ? Number(allocation.unitPrice) : null,
      paymentMethod: allocation.paymentMethod,
    }));
    const primaryFuelSupplierId = fuelAllocations.find(
      allocation => allocation.paymentMethod === 'CREDIT',
    )?.supplierId ?? null;

    submitting.current = true;
    s.setSubmitting(true);
    try {
      // Container type is planning data and must be preserved even when the
      // operational actuals (container number, seals, photos) are not known yet.
      const rowShouldPersist = (r: ContainerFormRow) => Boolean(
        r.containerTypeId ||
        r.containerNumber.trim() ||
        r.seals.some(sl => sl.sealNumber.trim()) ||
        r.cargoWeightKg ||
        r.notes.trim() ||
        r.photoKeys.cont.some(Boolean) ||
        r.photoKeys.seal.some(Boolean),
      );
      const rowsToPersist = s.containerRows.filter(rowShouldPersist);
      for (const r of rowsToPersist) {
        // No half-filled seal rows: if any seal field is present, the number is required.
        for (const sl of r.seals) {
          const hasPartial = sl.sealNumber.trim() || sl.sealType.trim() || sl.notes.trim();
          if (hasPartial && !sl.sealNumber.trim()) {
            const msg = 'Each seal must have a seal number. Delete empty seals if not entered.';
            s.setError(msg);
            showToast({ kind: 'error', message: msg });
            return;
          }
        }
      }

      // Persist container instances as part of the unified save (the
      // standalone "Lưu danh sách container" button was removed). Full
      // reconcile: insert/update by id, delete rows not in the list. Each row
      // carries its `clientKey` and the server echoes it back, so the post-save
      // rebind is exact (stable row identity — never content/position matching,
      // which bound one container's buffered photos to another container on
      // prod trip TRP-202610-0029).
      const saveContainers = async (id: number) => {
        const rowsSnapshot = s.containerRows;
        const containers = buildContainerBatchPayload(rowsSnapshot.filter(rowShouldPersist));
        const result = await api.put<{ items: ServerContainer[] }>(`/trips/${id}/containers`, { containers });
        await queryClient.invalidateQueries({ queryKey: qk.tripForm.tripContainers(id) });

        const items = Array.isArray(result?.items) ? result.items : [];
        const { rows: nextRows, rowKeyToContainerId } = rebindSavedContainerRows(items, rowsSnapshot);
        s.setContainerRows(nextRows);

        // Flush per-container photos captured before the row had an id,
        // binding each to the container id its own row was saved as.
        if (rowKeyToContainerId.size > 0) {
          const swaps = await flushPendingContainerPhotos(id, rowKeyToContainerId);
          if (swaps.size > 0) {
            s.setContainerRows(prev => prev.map(r => ({
              ...r,
              photoKeys: {
                cont: r.photoKeys.cont.map(u => swaps.get(u) ?? u),
                seal: r.photoKeys.seal.map(u => swaps.get(u) ?? u),
              },
            })));
          }
        }
      };

      if (isEditMode && existingTrip) {
        const payload = {
          customerId: Number(s.customerId),
          routeId: s.routeId ? Number(s.routeId) : undefined,
          departureDate: s.departureDate || undefined,
          completedAt: s.completedAt || undefined,
          legs: legs.map(l => ({
            sequence: l.sequence,
            origin: l.origin.trim(),
            destination: l.destination.trim(),
            km: Number(l.km),
            loadingType: l.loadingType,
          })),
          version: existingTrip.version,
          fuelMode: s.fuelMode,
          fuelLitersOverride: s.fuelMode === FuelMode.FLAT_RATE ? (s.fuelLitersOverride ? Number(s.fuelLitersOverride) : 0) : undefined,
          fuelSupplementLiters: s.fuelSupplementLiters ? Number(s.fuelSupplementLiters) : 0,
          fuelSupplementReason: s.fuelSupplementReason.trim() || undefined,
          tollsDiscount: moneyOrZero(s.tollsDiscount),
          tollsAddition: moneyOrZero(s.tollsAddition),
          tollsStations: s.tollsStations ? Number(s.tollsStations) : 0,
          hasReturnCargo: s.hasReturnCargo,
          driverSalary: moneyOrUndefined(s.driverSalary),
          twoPointDeliveryBonus: moneyOrZero(s.twoPointDeliveryBonus),
          vehicleShiftAllowance: moneyOrZero(s.vehicleShiftAllowance),
          // Revenue is split-based; `revenue` is derived and recomputed
          // server-side from the splits. Send splits as `undefined` when
          // untouched (NOT 0) so resolveRevenue preserves stored revenue, and
          // omit the derived `revenue` copy — sending it would zero stored
          // revenue whenever both splits are blank. feedback202606 A3 §9.
          revenueEmptyReturn: moneyOrUndefined(s.revenueEmptyReturn),
          revenueCombine: moneyOrUndefined(s.revenueCombine),
          notes: s.notes.trim() || undefined,
          roadAllowanceOverride: moneyOrNull(s.roadAllowanceOverride),
          fuelActualUnitPrice: moneyOrNull(s.fuelActualUnitPrice),
          fuelSupplierId: primaryFuelSupplierId,
          fuelAllocations,
          customerCommission: moneyOrZero(s.customerCommission),
          tripWageDays: s.tripWageDays ? Number(s.tripWageDays) : undefined,
          carrierType: s.carrierType,
          externalCarrierId: s.carrierType === 'EXTERNAL' ? (s.externalCarrierId ?? null) : null,
          externalFreightCost: s.carrierType === 'EXTERNAL' ? moneyOrNull(s.externalFreightCost) : null,
          externalPlateNumber: s.carrierType === 'EXTERNAL' ? (s.externalPlateNumber.trim() || null) : null,
          externalDriverName: s.carrierType === 'EXTERNAL' ? (s.externalDriverName.trim() || null) : null,
          externalDriverPhone: s.carrierType === 'EXTERNAL' ? (s.externalDriverPhone.trim() || null) : null,
          truckId: s.carrierType === 'OWN' ? (s.truckId ? Number(s.truckId) : null) : null,
          driverId: s.carrierType === 'OWN' ? (s.driverId ? Number(s.driverId) : null) : null,
          trailerType: s.carrierType === 'OWN' ? (s.trailerType || null) : null,
        };

        const endpoint = existingTrip.status === TripStatus.CREATED ? `/trips/${existingTrip.id}/pre-departure` : `/trips/${existingTrip.id}/actuals`;
        const updatedTrip = await saveTripFiguresOnce(
          () => api.put<Record<string, unknown>>(endpoint, payload),
          () => queryClient.refetchQueries({ queryKey: qk.trips.detail(existingTrip.id) }),
        );
        queryClient.invalidateQueries({ queryKey: qk.trips.all });
        queryClient.setQueryData(qk.trips.detail(existingTrip.id), updatedTrip);
        queryClient.invalidateQueries({ queryKey: qk.trips.detail(existingTrip.id) });
        queryClient.invalidateQueries({ queryKey: qk.trips.adjustments(existingTrip.id) });

        // The figures request has committed. Later best-effort work must not
        // erase this narrower completed outcome.

        await saveContainers(existingTrip.id);
        // Manager-authored contact + guidance (N2 / B1.3) — persisted via the
        // existing PUT /api/trips/:id/instructions route. Always called so
        // a manager can blank a previously-typed contact. The trip figures
        // above are already committed, so this is best-effort and must never
        // roll them back — but if it fails we surface the error and stay on
        // the page (return undefined) so the manager actually sees it and can
        // retry. Navigating to the detail page on success would otherwise
        // discard the message before it renders.
        try {
          await tripClient.upsertTripInstructions(existingTrip.id, {
            contactName: s.contactName.trim() || null,
            contactPhone: s.contactPhone.trim() || null,
            notes: s.instructionsNotes.trim() || null,
          });
        } catch (instErr) {
          console.error('Trip instructions upsert failed:', instErr);
          const msg = instErr instanceof ApiError
            ? `Instructions not saved: ${instErr.message}`
            : 'Instructions not saved. Please try again.';
          s.setError(msg);
          showToast({ kind: 'error', message: msg });
          return undefined;
        }
        return existingTrip.id;
      }

      const createPayload: Record<string, unknown> = {
        customerId: Number(s.customerId),
        routeId: Number(s.routeId),
        cargoTypeId: Number(s.cargoTypeId),
        departureDate: s.departureDate,
        fuelMode: s.fuelMode,
        carrierType: s.carrierType,
        vatRate: s.vatRate,
        fuelSupplierId: null,
        // Per-trip actual pump price — only OWN trips consume fuel. Blank
        // (null) falls back to the config snapshot server-side.
        fuelActualUnitPrice: s.carrierType === 'OWN' ? moneyOrNull(s.fuelActualUnitPrice) : null,
      };
      if (s.carrierType === 'OWN') {
        createPayload.truckId = Number(s.truckId);
        createPayload.trailerType = s.trailerType || undefined;
        createPayload.driverId = Number(s.driverId);
      } else {
        createPayload.truckId = null;
        createPayload.driverId = null;
        createPayload.externalCarrierId = s.externalCarrierId ?? undefined;
        createPayload.externalFreightCost = moneyOrUndefined(s.externalFreightCost);
        createPayload.externalPlateNumber = s.externalPlateNumber.trim() || undefined;
        createPayload.externalDriverName = s.externalDriverName.trim() || undefined;
        createPayload.externalDriverPhone = s.externalDriverPhone.trim() || undefined;
      }
      if (s.customerReference.trim()) {
        createPayload.customerReference = s.customerReference.trim();
      }
      const count = resolveContainerCount(s.containerCount);
      createPayload.containerCount = count;
      createPayload.containerTypeId = Number(s.plannedContainerTypeId || s.containerRows.find(r => r.containerTypeId)?.containerTypeId);
      // Creation and the following figures/container requests are separate
      // commits. Keep the first ID so a rejected follow-up cannot create a
      // second trip when the user corrects the form and retries.
      const planningFields = { ...createPayload };
      delete planningFields.fuelMode;
      delete planningFields.fuelActualUnitPrice;
      const plan = JSON.stringify(planningFields);
      if (createdTrip.current && createdTrip.current.plan !== plan) {
        throw new Error('Thông tin lệnh đã thay đổi sau khi tạo. Khôi phục thông tin ban đầu để thử lưu lại, hoặc mở chuyến đã tạo để chỉnh sửa.');
      }
      if (!createdTrip.current) {
        const trip = await api.post<{ id: number }>("/trips", createPayload);
        createdTrip.current = { id: trip.id, plan };
        setCreatedTripId(trip.id);
        void queryClient.invalidateQueries({ queryKey: qk.trips.all });
      }
      const trip = createdTrip.current;

      if (hasOptionalData) {
        const preDeparturePayload = {
          legs: legsToSubmit.length ? legsToSubmit.map((l) => ({
            sequence: l.sequence,
            origin: l.origin.trim(),
            destination: l.destination.trim(),
            km: Number(l.km),
            loadingType: l.loadingType,
          })) : undefined,
          fuelMode: s.fuelMode,
          fuelLitersOverride:
            s.fuelMode === FuelMode.FLAT_RATE
              ? s.fuelLitersOverride
                ? Number(s.fuelLitersOverride)
                : 0
              : undefined,
          fuelSupplementLiters: s.fuelSupplementLiters
            ? Number(s.fuelSupplementLiters)
            : 0,
          fuelSupplementReason: s.fuelSupplementReason.trim() || undefined,
          tollsDiscount: moneyOrZero(s.tollsDiscount),
          tollsAddition: moneyOrZero(s.tollsAddition),
          tollsStations: s.tollsStations ? Number(s.tollsStations) : 0,
          hasReturnCargo: s.hasReturnCargo,
          driverSalary: moneyOrUndefined(s.driverSalary),
          twoPointDeliveryBonus: moneyOrZero(s.twoPointDeliveryBonus),
          vehicleShiftAllowance: moneyOrZero(s.vehicleShiftAllowance),
          // Revenue is split-based; `revenue` is derived and recomputed
          // server-side from the splits. Send splits as `undefined` when
          // untouched (NOT 0) so resolveRevenue preserves stored revenue, and
          // omit the derived `revenue` copy — sending it would zero stored
          // revenue whenever both splits are blank. feedback202606 A3 §9.
          revenueEmptyReturn: moneyOrUndefined(s.revenueEmptyReturn),
          revenueCombine: moneyOrUndefined(s.revenueCombine),
          notes: s.notes.trim() || undefined,
          photoUrls,
          fuelActualUnitPrice: moneyOrNull(s.fuelActualUnitPrice),
          fuelSupplierId: primaryFuelSupplierId,
          fuelAllocations,
          customerCommission: moneyOrZero(s.customerCommission),
          tripWageDays: s.tripWageDays ? Number(s.tripWageDays) : undefined,
        };
        await api.put(`/trips/${trip.id}/pre-departure`, preDeparturePayload);
      }
      await saveContainers(trip.id);
      // Skip the instructions upsert in the create flow — TripCreatePage
      // doesn't mount the instructions card, so the fields are guaranteed
      // empty and a no-op upsert would still create an empty row + an
      // audit entry. The user fills the instructions later on the edit
      // page, where the upsert runs.
      await queryClient.invalidateQueries({ queryKey: qk.trips.all });
      return trip.id;
    } catch (err) {
      if (isEditMode && err instanceof ApiError && err.status === 409) {
        const msg = "Version conflict: your local data is stale. Please reload.";
        s.setError(msg);
        showToast({ kind: 'error', message: msg });
        throw err;
      }
      let msg = "An error occurred. Please try again.";
      if (err instanceof ApiError) {
        msg = err.message;
      } else if (err instanceof Error) {
        msg = err.message;
      }
      if (!isEditMode && createdTrip.current) {
        msg = `Lệnh đã được tạo nhưng chưa lưu đủ dữ liệu. ${msg}`;
      }
      s.setError(msg);
      showToast({ kind: 'error', message: msg });
      return undefined;
    } finally {
      submitting.current = false;
      s.setSubmitting(false);
    }
  },
  // 's' object omitted: individual s.* fields listed below are the correct
  // granularity for this submit handler.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [
    isEditMode, existingTrip, s.containerRows,
    s.customerId, s.routeId, s.truckId, s.trailerType,
    s.driverId, s.cargoTypeId, s.departureDate, s.customerReference, s.containerCount,
    s.plannedContainerTypeId,
    hasOptionalData, legs, s.fuelMode, s.fuelLitersOverride,
    s.fuelSupplementLiters, s.fuelSupplementReason, s.tollsDiscount,
    s.tollsAddition, s.tollsStations, s.hasReturnCargo, s.driverSalary,
    s.roadAllowanceOverride,
    s.fuelActualUnitPrice,
    s.fuelSupplierId,
    s.fuelAllocations,
    s.customerCommission, s.tripWageDays,
    s.twoPointDeliveryBonus, s.vehicleShiftAllowance,
    s.revenue, s.revenueEmptyReturn, s.revenueCombine, s.notes, photoUrls,
    s.contactName, s.contactPhone, s.instructionsNotes,
    flushPendingContainerPhotos,
    s.carrierType, s.vatRate, s.externalCarrierId, s.externalFreightCost,
    s.externalPlateNumber, s.externalDriverName, s.externalDriverPhone,
    queryClient,
  ],
);
return { handleSubmit, createdTripId };
}
