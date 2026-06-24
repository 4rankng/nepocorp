import { db } from '../db';
import * as s from '../db/schema';
import { eq, and, isNull } from 'drizzle-orm';

/**
 * N1 — Tire lifecycle service.
 *
 * Tires are tracked by their immutable `serial`. A tire mounts on EITHER a
 * truck (truckId) OR a trailer (trailerId). install/remove/dispose are the
 * state transitions; each runs in a transaction so status + dates + the
 * vehicle ids stay consistent.
 *
 *   install:  {truck|trailer}Id + position + installed_at(now) + status=IN_USE, clear removed_at
 *   remove:   truckId/trailerId=null + removed_at(now) + status=IN_STOCK  (back to spare)
 *   dispose:  truckId/trailerId=null + removed_at(now) + status=DISPOSED + disposal_date(now) + disposal_reason
 *
 * Lifecycle guard: a tire already IN_USE must be removed first, and a DISPOSED
 * tire can never be re-installed.
 */

export interface InstallTireInput {
  truckId?: number | null;
  trailerId?: number | null;
  position?: string | null;
}

export interface DisposeTireInput {
  reason: string;
}

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Local date (YYYY-MM-DD) using system timezone — avoids the UTC drift of
 *  toISOString() (e.g. a 1am Vietnam install recording the previous day). */
function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Install a tire onto a truck OR trailer (sets IN_USE). Exactly one target. */
export async function installTire(tireId: number, input: InstallTireInput) {
  const truckId = input.truckId ?? null;
  const trailerId = input.trailerId ?? null;
  if ((truckId == null) === (trailerId == null)) {
    throw new HttpError(400, 'Phải chọn xe đầu kéo hoặc rơ-moóc để lắp lốp');
  }

  return db.transaction(async (tx) => {
    if (truckId != null) {
      const [truck] = await tx.select({ id: s.trucks.id })
        .from(s.trucks)
        .where(and(eq(s.trucks.id, truckId), isNull(s.trucks.deletedAt)))
        .limit(1);
      if (!truck) throw new HttpError(404, 'Không tìm thấy xe đầu kéo');
    } else if (trailerId != null) {
      const [trailer] = await tx.select({ id: s.trailers.id })
        .from(s.trailers)
        .where(and(eq(s.trailers.id, trailerId), isNull(s.trailers.deletedAt)))
        .limit(1);
      if (!trailer) throw new HttpError(404, 'Không tìm thấy rơ-moóc');
    }

    const [existing] = await tx.select().from(s.tires)
      .where(and(eq(s.tires.id, tireId), isNull(s.tires.deletedAt)))
      .limit(1);
    if (!existing) {
      throw new HttpError(404, 'Không tìm thấy lốp');
    }
    // A disposed tire is retired for good — it can never go back into service.
    if (existing.status === 'DISPOSED') {
      throw new HttpError(409, 'Lốp đã thanh lý, không thể lắp lại');
    }
    // Guard the lifecycle: a tire already IN_USE must be removed first.
    // Silently re-installing it elsewhere would orphan the prior assignment
    // with no removed_at (history loss). (code-review CRITICAL)
    if (existing.status === 'IN_USE') {
      throw new HttpError(
        409,
        existing.truckId != null || existing.trailerId != null
          ? `Lốp đang lắp trên phương tiện khác — vui lòng tháo ra trước`
          : 'Lốp đang sử dụng — vui lòng tháo ra trước',
      );
    }

    const patch: Partial<typeof s.tires.$inferSelect> = {
      truckId,
      trailerId,
      position: input.position ?? existing.position ?? null,
      installedAt: todayISO(),
      removedAt: null,
      status: 'IN_USE',
      updatedAt: new Date(),
    };

    const [updated] = await tx.update(s.tires).set(patch)
      .where(eq(s.tires.id, tireId)).returning();
    return updated;
  });
}

/** Remove a tire from its vehicle back to the spare pool (IN_STOCK). */
export async function removeTire(tireId: number) {
  return db.transaction(async (tx) => {
    const [existing] = await tx.select().from(s.tires)
      .where(and(eq(s.tires.id, tireId), isNull(s.tires.deletedAt)))
      .limit(1);
    if (!existing) throw new HttpError(404, 'Không tìm thấy lốp');
    if (existing.status === 'DISPOSED') {
      throw new HttpError(409, 'Lốp đã thanh lý');
    }
    if (existing.status !== 'IN_USE') {
      throw new HttpError(409, 'Lốp chưa được lắp');
    }

    const patch: Partial<typeof s.tires.$inferSelect> = {
      truckId: null,
      trailerId: null,
      position: null,
      removedAt: existing.removedAt ?? todayISO(),
      status: 'IN_STOCK',
      updatedAt: new Date(),
    };
    const [updated] = await tx.update(s.tires).set(patch)
      .where(eq(s.tires.id, tireId)).returning();
    return updated;
  });
}

/** Dispose of (thanh lý) a tire with a reason. Unmounts if still mounted. */
export async function disposeTire(tireId: number, input: DisposeTireInput) {
  const reason = input.reason?.trim();
  if (!reason) throw new HttpError(400, 'Chọn lý do thanh lý');

  return db.transaction(async (tx) => {
    const [existing] = await tx.select().from(s.tires)
      .where(and(eq(s.tires.id, tireId), isNull(s.tires.deletedAt)))
      .limit(1);
    if (!existing) throw new HttpError(404, 'Không tìm thấy lốp');
    if (existing.status === 'DISPOSED') {
      throw new HttpError(409, 'Lốp đã thanh lý rồi');
    }

    const patch: Partial<typeof s.tires.$inferSelect> = {
      truckId: null,
      trailerId: null,
      position: null,
      removedAt: existing.removedAt ?? todayISO(),
      status: 'DISPOSED',
      disposalDate: todayISO(),
      disposalReason: reason,
      updatedAt: new Date(),
    };
    const [updated] = await tx.update(s.tires).set(patch)
      .where(eq(s.tires.id, tireId)).returning();
    return updated;
  });
}

/** Typed accessor for routes to rethrow HttpError-shaped status codes. */
export function isHttpError(e: unknown): e is HttpError {
  return e instanceof HttpError;
}
