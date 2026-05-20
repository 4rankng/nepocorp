import { EventEmitter } from 'events';

export const eventBus = new EventEmitter();
eventBus.setMaxListeners(50);

export const AuditEvents = {
  AUDIT_LOG: 'audit:log',
} as const;
