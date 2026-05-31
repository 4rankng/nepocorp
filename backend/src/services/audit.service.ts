import { EventEmitter } from 'events';
import { renderAuditMessage } from './audit-templates';
import { db } from '../db';
import * as s from '../db/schema';
import { auditLogs } from '../db/schema';
import { eq, inArray } from 'drizzle-orm';
import type { AuditPayload } from './audit-types';

// Inlined event bus — sole consumer is this module.
const eventBus = new EventEmitter();
eventBus.setMaxListeners(50);
const AUDIT_LOG_EVENT = 'audit:log';

export interface AuditEntry extends AuditPayload {
  userId?: number;
  ipAddress?: string;
}

/**
 * Resolve human-readable identifiers for entities whose audit row only has the
 * numeric foreign key in the request body (payments, adjustments, penalties
 * all reference a trip via `trip_id`). Runs async out-of-band so it doesn't
 * delay the response.
 */
async function enrichEntityKey(payload: AuditEntry): Promise<string | undefined> {
  if (payload.entityKey) return payload.entityKey;
  const body = (payload.metadata?.body || {}) as Record<string, any>;

  // Single-trip ref: { trip_id: 12 } → look up tripCode
  const singleTripId = body.trip_id ?? body.tripId;
  if (typeof singleTripId === 'number') {
    const [trip] = await db.select({ tripCode: s.trips.tripCode })
      .from(s.trips).where(eq(s.trips.id, singleTripId)).limit(1);
    if (trip?.tripCode) return `cho chuyến ${trip.tripCode}`;
  }

  // Multi-trip ref: { payments: [{ trip_id, amount }, ...] } → join codes
  if (Array.isArray(body.payments)) {
    const ids = body.payments.map((p: any) => p?.trip_id).filter((x: any) => typeof x === 'number');
    if (ids.length > 0) {
      const rows = await db.select({ tripCode: s.trips.tripCode })
        .from(s.trips).where(inArray(s.trips.id, ids));
      const codes = rows.map(r => r.tripCode).filter(Boolean) as string[];
      if (codes.length > 0) return `cho ${codes.length === 1 ? `chuyến ${codes[0]}` : `${codes.length} chuyến (${codes.join(', ')})`}`;
    }
  }

  return undefined;
}

export function initAuditService() {
  eventBus.on(AUDIT_LOG_EVENT, async (payload: AuditEntry) => {
    try {
      // For payment/adjustment/penalty audit rows, the middleware can only see
      // the numeric trip_id in the request body. Resolve it to the natural
      // tripCode so the message reads "ghi nhận thanh toán cho chuyến TRP-..."
      // rather than the bare "ghi nhận thanh toán".
      if (!payload.entityKey && ['payments', 'adjustments', 'penalties'].includes(payload.entityType)) {
        try { payload.entityKey = await enrichEntityKey(payload); } catch {}
      }
      const message = renderAuditMessage(payload);
      await db.insert(auditLogs).values({
        userId: payload.userId ?? null,
        message,
        entityType: payload.entityType,
        entityId: payload.entityId ?? null,
        payload: { event: payload.event, ...payload.metadata },
        ipAddress: payload.ipAddress ?? null,
      });
    } catch (err) {
      console.error('Audit log write failed:', err);
    }
  });
}

export function emitAudit(payload: AuditEntry) {
  eventBus.emit(AUDIT_LOG_EVENT, payload);
}

/**
 * Synchronous in-transaction audit logger.
 * Guarantees that the business operation and its audit record commit atomically.
 */
export async function writeAuditLogTransaction(
  tx: any,
  data: {
    userId: number;
    message: string;
    entityType: string;
    entityId: number | null;
    payload?: Record<string, any>;
    ipAddress?: string;
  }
) {
  await tx.insert(auditLogs).values({
    userId: data.userId,
    message: data.message,
    entityType: data.entityType,
    entityId: data.entityId,
    payload: data.payload ?? null,
    ipAddress: data.ipAddress ?? null,
  });
}
