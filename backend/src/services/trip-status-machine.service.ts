// Trip Status Machine — Status transition logic and validation
// transitionTripStatus with all role checks, guard conditions, and ledger integration

import { db } from '../db';
import * as s from '../db/schema';
import { eq, and, isNull, sql } from 'drizzle-orm';
import { TripStatus, Role } from '@tingting/shared';
import { LedgerService } from './ledger.service';
import { ApiError } from '../errors';

export async function transitionTripStatus(
  tripId: number,
  targetStatus: TripStatus,
  userId: number,
  userRole: string,
  confirmZeroRevenue?: boolean,
) {
  // Audit rows for status transitions are produced by the auditLogMiddleware
  // on the corresponding endpoint (POST /dispatch, /lock, /cancel) with full
  // Subject + Verb + Natural Key sentences.
  return await db.transaction(async (tx) => {
    const [trip] = await tx.select().from(s.trips).where(eq(s.trips.id, tripId)).limit(1);
    if (!trip) throw new ApiError(404, 'Không tìm thấy chuyến đi');

    const currentStatus = trip.status as TripStatus;
    if (currentStatus === targetStatus) return trip; // Idempotent short-circuit

    // Verify role permissions and transition matrix
    if (targetStatus === TripStatus.IN_TRANSIT) {
      // Per docs/flows/01-TRIP_LIFECYCLE.md §2.3, only ADMIN/MANAGER can
      // dispatch — ACCOUNTANT's trip-write permission is for financial
      // fields only and shouldn't move the lifecycle forward.
      if (userRole !== Role.ADMIN && userRole !== Role.MANAGER) {
        throw new ApiError(
          403,
          'Chỉ Quản lý hoặc Quản trị viên mới có quyền xuất phát chuyến đi',
        );
      }
      if (currentStatus !== TripStatus.CREATED && currentStatus !== TripStatus.COMPLETED) {
        throw new ApiError(409, 'Chỉ có thể xuất phát chuyến đi ở trạng thái Mới tạo hoặc Hoàn thành');
      }
      // Block dispatching a second trip on a truck that is already running
      // another trip — physically a truck can only be on one IN_TRANSIT trip
      // at a time. Without this guard the dispatch page's "Đang chạy" stat
      // stays at 3 even after dispatching more, because it counts unique
      // trucks (not trips) — so the user gets no visible feedback.
      //
      // Advisory lock serializes concurrent dispatches for the same truck —
      // without it, two READ COMMITTED transactions could both see 0 IN_TRANSIT
      // rows and both proceed (phantom-read race).
      if (trip.truckId) {
        await tx.execute(sql`SELECT pg_advisory_xact_lock(${trip.truckId})`);
      }
      const [busyTruck] = trip.truckId ? await tx.select({ id: s.trips.id, tripCode: s.trips.tripCode })
        .from(s.trips)
        .where(and(
          eq(s.trips.truckId, trip.truckId!),
          eq(s.trips.status, TripStatus.IN_TRANSIT),
          isNull(s.trips.deletedAt),
        ))
        .limit(1) : [];
      if (busyTruck && busyTruck.id !== tripId) {
        // Never leak the numeric id — show the trip code or fall back to a
        // generic phrase rather than "#17" which reads like a debug log.
        const busyLabel = busyTruck.tripCode || 'một chuyến khác';
        throw new ApiError(
          409,
          `Xe đang chạy chuyến ${busyLabel}. Vui lòng hoàn thành chuyến đó trước.`,
        );
      }
    } else if (targetStatus === TripStatus.COMPLETED && currentStatus === TripStatus.LOCKED) {
      // UNLOCK: LOCKED → COMPLETED — reverse ledger entries so the trip can be
      // edited, then re-locked with updated figures.
      if (userRole !== Role.ADMIN && userRole !== Role.MANAGER) {
        throw new ApiError(403, 'Chỉ Quản lý hoặc Quản trị viên mới có quyền mở khóa chuyến đi');
      }

      // Conditional guard status update
      const [unlockedTrip] = await tx.update(s.trips).set({
        status: TripStatus.COMPLETED,
        version: sql`${s.trips.version} + 1`,
        updatedAt: new Date(),
      }).where(and(eq(s.trips.id, tripId), eq(s.trips.status, TripStatus.LOCKED))).returning();

      if (!unlockedTrip) {
        throw new ApiError(409, 'Chuyến đi không thể mở khóa hoặc đã bị thay đổi. Vui lòng tải lại.');
      }

      // Load ancillary fees for ledger reversal
      const ancillaryFees = await tx.select().from(s.tripExpenses)
        .where(eq(s.tripExpenses.tripId, trip.id));

      // Post reversal ledger entries (swap debit↔credit via UNLOCK_REVERSAL)
      await LedgerService.postTripUnlock(tx, {
        id: unlockedTrip.id,
        tripCode: unlockedTrip.tripCode,
        customerId: unlockedTrip.customerId,
        driverId: unlockedTrip.driverId ?? null,
        revenue: unlockedTrip.revenue,
        driverSalary: unlockedTrip.driverSalary,
        carrierType: unlockedTrip.carrierType ?? 'OWN',
        externalCarrierId: unlockedTrip.externalCarrierId ?? null,
        externalFreightCost: unlockedTrip.externalFreightCost ?? null,
        fuelSupplierId: unlockedTrip.fuelSupplierId ?? null,
        totalFuelCost: unlockedTrip.totalFuelCost,
        ancillaryFees: ancillaryFees.map(fee => ({
          id: fee.id,
          buyAmount: fee.buyAmount,
          sellAmount: fee.sellAmount,
          settlementMethod: fee.settlementMethod,
          supplierId: fee.supplierId ?? null,
          forwarderId: fee.forwarderId ?? null,
          approvalStatus: fee.approvalStatus,
        })),
      });

      return unlockedTrip;
    } else if (targetStatus === TripStatus.COMPLETED) {
      if (currentStatus !== TripStatus.IN_TRANSIT) {
        throw new ApiError(409, 'Chỉ có thể hoàn thành chuyến đi đang chạy');
      }

      // Enforce photo completion requirements
      const photos = await tx.select().from(s.tripPhotos).where(eq(s.tripPhotos.tripId, tripId));
      const [cargoType] = await tx.select().from(s.cargoTypes).where(eq(s.cargoTypes.id, trip.cargoTypeId)).limit(1);

      if (photos.length === 0) {
        throw new ApiError(400, 'Cần tải lên ít nhất 1 ảnh (CONTAINER/SEAL) để hoàn thành chuyến đi');
      }

      if (cargoType && cargoType.requiresPhotos) {
        const containerPhotos = photos.filter(p => p.type === 'CONTAINER');
        const sealPhotos = photos.filter(p => p.type === 'SEAL');
        if (containerPhotos.length === 0 || sealPhotos.length === 0) {
          throw new ApiError(400, 'Yêu cầu phải có ít nhất 1 ảnh CONTAINER và 1 ảnh SEAL đối với loại hàng chè');
        }
      }
    } else if (targetStatus === TripStatus.LOCKED) {
      if (userRole !== Role.ADMIN && userRole !== Role.MANAGER) {
        throw new ApiError(
          403,
          'Chỉ Quản lý hoặc Quản trị viên mới có quyền chốt khóa chuyến đi',
        );
      }
      // Inline lock procedure to avoid nested transaction
      if (currentStatus !== TripStatus.COMPLETED) {
        throw new ApiError(409, 'Chỉ có thể chốt chuyến đi khi ở trạng thái Hoàn thành');
      }

      // Soft guard on zero-revenue
      const revenue = Number(trip.revenue || 0);
      if (revenue === 0 && !confirmZeroRevenue) {
        throw new ApiError(422, 'Doanh thu bằng 0. Vui lòng xác nhận.');
      }

      // Conditional guard status update
      const [lockedTrip] = await tx.update(s.trips).set({
        status: TripStatus.LOCKED,
        updatedAt: new Date(),
      }).where(and(eq(s.trips.id, tripId), eq(s.trips.status, TripStatus.COMPLETED))).returning();

      if (!lockedTrip) {
        throw new ApiError(409, 'Chuyến đi không thể chốt hoặc đã bị thay đổi. Vui lòng tải lại.');
      }

      // Load ancillary fees for ledger posting
      const ancillaryFees = await tx.select().from(s.tripExpenses)
        .where(eq(s.tripExpenses.tripId, trip.id));

      // Post transaction financial ledger entries via service seam
      await LedgerService.postTripLock(tx, {
        id: lockedTrip.id,
        tripCode: lockedTrip.tripCode,
        customerId: lockedTrip.customerId,
        driverId: lockedTrip.driverId ?? null,
        revenue: lockedTrip.revenue,
        driverSalary: lockedTrip.driverSalary,
        carrierType: lockedTrip.carrierType ?? 'OWN',
        externalCarrierId: lockedTrip.externalCarrierId ?? null,
        externalFreightCost: lockedTrip.externalFreightCost ?? null,
        fuelSupplierId: lockedTrip.fuelSupplierId ?? null,
        totalFuelCost: lockedTrip.totalFuelCost,
        ancillaryFees: ancillaryFees.map(fee => ({
          id: fee.id,
          buyAmount: fee.buyAmount,
          sellAmount: fee.sellAmount,
          settlementMethod: fee.settlementMethod,
          supplierId: fee.supplierId ?? null,
          forwarderId: fee.forwarderId ?? null,
          approvalStatus: fee.approvalStatus,
        })),
      });


      // Audit row is written by the auditLogMiddleware for the POST /lock
      // endpoint as "Quản lý <actor> khóa chuyến <tripCode>". We intentionally
      // skip a service-level write here to avoid a duplicate row, and to keep
      // a single source of truth for audit message phrasing (no enum leakage,
      // always Subject + Verb).

      return lockedTrip;
    } else if (targetStatus === TripStatus.CANCELED) {
      if (userRole !== Role.ADMIN && userRole !== Role.MANAGER) {
        throw new ApiError(
          403,
          'Chỉ Quản lý hoặc Quản trị viên mới có quyền hủy chuyến đi',
        );
      }
      if (currentStatus === TripStatus.LOCKED) {
        throw new ApiError(409, 'Không thể hủy chuyến đi đã chốt');
      }

      // Canceled: zero all financials
      const [updated] = await tx.update(s.trips).set({
        status: TripStatus.CANCELED,
        fuelLiters: '0',
        totalFuelCost: '0',
        totalRoadAllowance: '0',
        totalCost: '0',
        revenue: '0',
        grossProfit: '0',
        driverSalary: '0',
        updatedAt: new Date(),
      }).where(eq(s.trips.id, tripId)).returning();

      // Cancel audit row is written by the middleware for POST /cancel
      // ("Quản lý <actor> hủy chuyến <tripCode>") — skip duplicate write.
      return updated;
    }

    const [updated] = await tx.update(s.trips).set({
      status: targetStatus,
      ...(targetStatus === TripStatus.COMPLETED ? { completedAt: new Date() } : {}),
      updatedAt: new Date(),
    }).where(and(eq(s.trips.id, tripId), eq(s.trips.status, currentStatus))).returning();

    if (!updated) {
      throw new ApiError(409, 'Trạng thái chuyến đi đã bị thay đổi bởi người khác. Vui lòng tải lại.');
    }

    // Other transitions (e.g. IN_TRANSIT → COMPLETED triggered from /actuals)
    // are described by their own middleware-generated audit row using natural
    // Vietnamese verbs. We deliberately do NOT write a generic "chuyển trạng
    // thái từ <enum> sang <enum>" row — that previously leaked DB enum values
    // like CREATED / IN_TRANSIT into the audit log and read like a debug log
    // rather than a user-facing activity record.

    return updated;
  });
}
