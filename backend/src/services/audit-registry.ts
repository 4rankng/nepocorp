/**
 * Audit event registry — routes register their events explicitly
 * instead of the middleware guessing from URL patterns.
 *
 * Usage in routes:
 *   import { registerAuditEvent } from '../services/audit-registry';
 *   registerAuditEvent('POST', '/api/trips', AuditEvent.TRIP_CREATED);
 */
import type { AuditEventType } from './audit-types';

type Method = 'POST' | 'PUT' | 'PATCH' | 'DELETE';

const registry = new Map<string, AuditEventType>();

function key(method: string, path: string): string {
  return `${method.toUpperCase()} ${path}`;
}

/**
 * Register an audit event for a specific method + path combination.
 * Call this at module load time (top-level in route files).
 */
export function registerAuditEvent(method: Method, path: string, event: AuditEventType): void {
  registry.set(key(method, path), event);
}

/**
 * Look up the registered audit event for a method + path.
 * Falls back to generic ENTITY_CREATED/UPDATED/DELETED if no specific registration.
 */
export function resolveAuditEvent(method: string, path: string): AuditEventType {
  // Try exact match first
  const exact = registry.get(key(method, path));
  if (exact) return exact;

  // Try matching registered prefixes (e.g. POST /api/trips matches POST /api/trips/123/dispatch)
  const methodKey = method.toUpperCase();
  let bestMatch: { event: AuditEventType; specificity: number } | null = null;
  for (const [regKey, event] of registry) {
    if (!regKey.startsWith(methodKey + ' ')) continue;
    const regPath = regKey.slice(methodKey.length + 1);
    if (path.startsWith(regPath)) {
      const specificity = regPath.length;
      if (!bestMatch || specificity > bestMatch.specificity) {
        bestMatch = { event, specificity };
      }
    }
  }
  if (bestMatch) return bestMatch.event;

  // Generic fallback
  if (method === 'POST') return 'ENTITY_CREATED' as AuditEventType;
  if (method === 'PUT' || method === 'PATCH') return 'ENTITY_UPDATED' as AuditEventType;
  if (method === 'DELETE') return 'ENTITY_DELETED' as AuditEventType;
  return 'ENTITY_UPDATED' as AuditEventType;
}
