import type { Request, Response, NextFunction } from 'express';
import { emitAudit } from '../services/audit.service';
import { AuditEvent } from '../services/audit-types';
import type { AuditEventType } from '../services/audit-types';
import { resolveAuditEvent } from '../services/audit-registry';

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

function sanitizeBody(body: Record<string, unknown>): Record<string, unknown> {
  if (!body) return {};
  const { password, passwordHash, password_hash, ...rest } = body;
  return rest;
}

/**
 * Pull a human-readable identifier out of a response/request body so audit
 * messages can read "khóa chuyến TRP-202606-0086" instead of raw numeric IDs.
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
      return pick(responseBody, 'licensePlate')
        || pick(requestBody, 'licensePlate');
    case 'customers':
    case 'routes':
    case 'cargo-types':
    case 'drivers':
    case 'penalty-reasons':
    case 'suppliers':
    case 'expense-categories':
      return pick(responseBody, 'name')
        || pick(requestBody, 'name');
    case 'cap-table':
      return pick(responseBody, 'partnerName')
        || pick(requestBody, 'partnerName');
    case 'reports': {
      const quarter = pick(responseBody, 'quarter') || pick(requestBody, 'quarter');
      const year = pick(responseBody, 'year') || pick(requestBody, 'year');
      if (quarter && year) {
        return `Quý ${quarter}/${year}`;
      }
      return undefined;
    }
    case 'payments':
    case 'adjustments':
    case 'penalties': {
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

  const fullPath = (req.originalUrl || req.url || '').split('?')[0];

  // Intercept res.json to capture the response body for entity key extraction
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
    }
    return (originalEnd as any).apply(res, args);
  };

  next();
}
