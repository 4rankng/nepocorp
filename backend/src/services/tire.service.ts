import { db } from '../db';
import * as s from '../db/schema';
import { eq, and, isNull } from 'drizzle-orm';

/**
 * N1 — Tire lifecycle service.
 *
 * Tires are tracked by their immutable `serial`. Install/remove are the only
 * state transitions; both run in a transaction so status + dates + truck_id
 * stay consistent.
 *
 *  - install: truck_id + position + installed_at(now) + status=IN_USE, clear removed_at
 */

export interface InstallTireInput {
  truckId: number;
  position?: string | null;
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

/** Install a tire onto a truck (sets IN_USE). Validates the truck exists. */
export async function installTire(tireId: number, input: InstallTireInput) {
  return db.transaction(async (tx) => {
    const [truck] = await tx.select({ id: s.trucks.id })
      .from(s.trucks)
      .where(and(eq(s.trucks.id, input.truckId), isNull(s.trucks.deletedAt)))
      .limit(1);
    if (!truck) {
      throw new HttpError(404, 'Không tìm thấy xe đầu kéo');
    }

    const [existing] = await tx.select().from(s.tires)
      .where(and(eq(s.tires.id, tireId), isNull(s.tires.deletedAt)))
      .limit(1);
    if (!existing) {
      throw new HttpError(404, 'Không tìm thấy lốp');
    }
    // Guard the lifecycle: a tire already IN_USE must be removed first.
    // Silently re-installing it on another truck would orphan the prior
    // assignment with no removed_at (history loss). (code-review CRITICAL)
    if (existing.status === 'IN_USE') {
      throw new HttpError(
        409,
        existing.truckId != null
          ? `Lốp đang lắp trên xe khác — vui lòng tháo ra trước`
          : 'Lốp đang sử dụng — vui lòng tháo ra trước',
      );
    }

    const patch: Partial<typeof s.tires.$inferSelect> = {
      truckId: input.truckId,
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

/** Typed accessor for routes to rethrow HttpError-shaped status codes. */
export function isHttpError(e: unknown): e is HttpError {
  return e instanceof HttpError;
}
