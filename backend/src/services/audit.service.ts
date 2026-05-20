import { eventBus, AuditEvents } from './event-bus';
import { renderAuditMessage } from './audit-templates';
import { db } from '../db';
import { auditLogs } from '../db/schema';
import type { AuditPayload } from './audit-types';

export interface AuditEntry extends AuditPayload {
  userId: number;
  ipAddress?: string;
}

export function initAuditService() {
  eventBus.on(AuditEvents.AUDIT_LOG, async (payload: AuditEntry) => {
    try {
      const message = renderAuditMessage(payload);
      await db.insert(auditLogs).values({
        userId: payload.userId,
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
  eventBus.emit(AuditEvents.AUDIT_LOG, payload);
}
