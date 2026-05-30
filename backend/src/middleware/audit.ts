import type { Request, Response, NextFunction } from 'express';
import { emitAudit } from '../services/audit.service';
import { AuditEvent } from '../services/audit-types';
import type { AuditEventType } from '../services/audit-types';

function extractEntityType(path: string): string | null {
  const parts = path.replace('/api/', '').split('/');
  if (parts.length >= 1) return parts[0];
  return null;
}

function extractEntityId(path: string, body: Record<string, unknown>): number | null {
  const parts = path.replace('/api/', '').split('/');
  const last = parts[parts.length - 1];
  const num = parseInt(last);
  if (!isNaN(num)) return num;
  return body?.id ? parseInt(body.id as string) : null;
}

function resolveAuditEvent(method: string, path: string): AuditEventType {
  if (path.includes('/login')) return AuditEvent.USER_LOGIN;
  if (path.includes('/logout')) return AuditEvent.USER_LOGOUT;

  if (path.includes('/trips') && path.endsWith('/lock')) return AuditEvent.TRIP_LOCKED;
  if (path.includes('/trips') && path.endsWith('/dispatch')) return AuditEvent.TRIP_DISPATCHED;
  if (path.includes('/trips') && path.endsWith('/cancel')) return AuditEvent.TRIP_CANCELED;
  if (path.includes('/trips') && path.includes('/actuals')) return AuditEvent.TRIP_UPDATED_ACTUALS;
  if (path.includes('/trips') && path.includes('/pre-departure')) return AuditEvent.TRIP_UPDATED_PRE_DEPARTURE;
  if (path.includes('/trips') && method === 'POST' && !path.split('/').pop()?.match(/^\d/)) return AuditEvent.TRIP_CREATED;

  if (path.includes('/payments') && method === 'POST') return AuditEvent.PAYMENT_RECEIVED;
  if (path.includes('/adjustments') && method === 'POST') return AuditEvent.ADJUSTMENT_CREATED;
  if (path.includes('/penalties') && method === 'POST') return AuditEvent.PENALTY_CREATED;

  if (method === 'POST') return AuditEvent.ENTITY_CREATED;
  if (method === 'PUT' || method === 'PATCH') return AuditEvent.ENTITY_UPDATED;
  if (method === 'DELETE') return AuditEvent.ENTITY_DELETED;

  return AuditEvent.ENTITY_UPDATED;
}

function sanitizeBody(body: Record<string, unknown>): Record<string, unknown> {
  if (!body) return {};
  const { password, passwordHash, password_hash, ...rest } = body;
  return rest;
}

export function auditLogMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    return next();
  }

  // Snapshot the full request path now. By the time `res.end` runs (after
  // routing), Express has stripped the mount prefix off `req.url`/`req.path`
  // — so `req.path` would be `/` for a `POST /api/trips`, which made
  // `extractEntityType` return null and audit messages came out as
  // "tạo unknown mới" instead of "tạo lệnh vận chuyển mới".
  // `req.originalUrl` is preserved through routing and is the right source.
  const fullPath = (req.originalUrl || req.url || '').split('?')[0];

  const originalEnd = res.end;

  res.end = function (...args: any[]) {
    if (res.statusCode < 400 && req.user) {
      const event = resolveAuditEvent(req.method, fullPath);
      const entityType = extractEntityType(fullPath);
      const entityId = extractEntityId(fullPath, req.body as Record<string, unknown>);

      emitAudit({
        event,
        entityType: entityType || 'unknown',
        entityId: entityId ?? undefined,
        userId: req.user.userId,
        actorRole: req.user.role,
        actorEmail: req.user.email ?? req.user.username ?? undefined,
        ipAddress: req.ip,
        metadata: {
          method: req.method,
          path: fullPath,
          body: sanitizeBody(req.body as Record<string, unknown>),
        },
      });
    }
    return (originalEnd as any).apply(res, args);
  };

  next();
}
