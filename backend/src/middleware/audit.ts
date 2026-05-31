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

/**
 * Pull a human-readable identifier out of a response/request body so audit
 * messages can read "khóa chuyến TRP-202606-0086" instead of raw numeric IDs.
 *
 * Checks both camelCase and snake_case because the serializer middleware can
 * emit either depending on order. Preference is route-specific: trips have a
 * `tripCode`, trucks/trailers have a `licensePlate`, everything config-like
 * has `name`. Returns undefined if no readable key is found.
 */
function extractEntityKey(
  entityType: string | null,
  responseBody: Record<string, unknown> | null,
  requestBody: Record<string, unknown> | null,
): string | undefined {
  const pick = (obj: Record<string, unknown> | null, ...keys: string[]): string | undefined => {
    if (!obj) return undefined;
    for (const k of keys) {
      const v = (obj as any)[k];
      if (typeof v === 'string' && v.trim()) return v.trim();
      if (typeof v === 'number') return String(v);
    }
    return undefined;
  };

  switch (entityType) {
    case 'trips':
      return pick(responseBody, 'tripCode')
        || pick(requestBody, 'tripCode');
    case 'trucks':
    case 'trailers':
      return pick(responseBody, 'licensePlate')
        || pick(requestBody, 'licensePlate');
    case 'customers':
    case 'routes':
    case 'cargo-types':
    case 'drivers':
    case 'penalty-reasons':
      return pick(responseBody, 'name')
        || pick(requestBody, 'name');
    case 'cap-table':
      return pick(responseBody, 'partnerName')
        || pick(requestBody, 'partnerName');
    case 'payments':
    case 'adjustments':
    case 'penalties': {
      // These often reference a trip in the body — surface that.
      const tripRef = pick(responseBody, 'tripCode')
        || pick(requestBody, 'tripCode');
      if (tripRef) return `cho chuyến ${tripRef}`;
      return undefined;
    }
    default:
      return pick(responseBody, 'name', 'code')
        || pick(requestBody, 'name', 'code');
  }
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

  // Intercept res.json so we can inspect the response body (e.g. the created
  // trip's tripCode, the truck's licensePlate) for use in audit messages.
  // Falling back to req.body alone wasn't enough: POST /api/trips' response
  // body contains the generated tripCode that the request doesn't have.
  let capturedBody: Record<string, unknown> | null = null;
  const originalJson = res.json.bind(res);
  res.json = function (body: any) {
    if (body && typeof body === 'object' && !Array.isArray(body)) {
      capturedBody = body as Record<string, unknown>;
    }
    return originalJson(body);
  };

  const isLoginPath = fullPath.includes('/login');

  const originalEnd = res.end;
  res.end = function (...args: any[]) {
    const event = resolveAuditEvent(req.method, fullPath);
    const entityType = extractEntityType(fullPath);
    const entityId = extractEntityId(fullPath, req.body as Record<string, unknown>);
    const entityKey = extractEntityKey(
      entityType,
      capturedBody,
      req.body as Record<string, unknown>,
    );

    if (res.statusCode < 400 && req.user) {
      emitAudit({
        event,
        entityType: entityType || 'unknown',
        entityId: entityId ?? undefined,
        entityKey,
        userId: req.user.userId,
        actorRole: req.user.role,
        actorEmail: req.user.email ?? undefined,
        actorName: req.user.fullName ?? req.user.username ?? undefined,
        ipAddress: req.ip,
        metadata: {
          method: req.method,
          path: fullPath,
          body: sanitizeBody(req.body as Record<string, unknown>),
        },
      });
    } else if (res.statusCode < 400 && !req.user && isLoginPath) {
      const respUser = capturedBody?.user as Record<string, unknown> | undefined;
      emitAudit({
        event,
        entityType: entityType || 'auth',
        entityId: entityId ?? undefined,
        entityKey,
        userId: respUser?.id as number,
        actorRole: respUser?.role as string,
        actorEmail: respUser?.email as string,
        actorName: (respUser?.fullName as string) ?? (respUser?.username as string),
        ipAddress: req.ip,
        metadata: {
          method: req.method,
          path: fullPath,
          body: sanitizeBody(req.body as Record<string, unknown>),
        },
      });
    } else if (res.statusCode === 401 && isLoginPath) {
      emitAudit({
        event: AuditEvent.LOGIN_FAILED,
        entityType: 'auth',
        entityKey: (req.body as any)?.identifier as string,
        ipAddress: req.ip,
        metadata: {
          method: req.method,
          path: fullPath,
          statusCode: res.statusCode,
          failed: true,
        },
      });
    } else if (res.statusCode === 403 && req.user) {
      emitAudit({
        event: AuditEvent.ACCESS_DENIED,
        entityType: entityType || 'unknown',
        entityId: entityId ?? undefined,
        entityKey,
        userId: req.user.userId,
        actorRole: req.user.role,
        actorEmail: req.user.email ?? undefined,
        actorName: req.user.fullName ?? req.user.username ?? undefined,
        ipAddress: req.ip,
        metadata: {
          method: req.method,
          path: fullPath,
          statusCode: res.statusCode,
          forbidden: true,
        },
      });
    }
    return (originalEnd as any).apply(res, args);
  };

  next();
}
