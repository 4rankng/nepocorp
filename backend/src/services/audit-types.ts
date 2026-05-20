export const AuditEvent = {
  // Trip lifecycle
  TRIP_CREATED: 'TRIP_CREATED',
  TRIP_DISPATCHED: 'TRIP_DISPATCHED',
  TRIP_UPDATED_PRE_DEPARTURE: 'TRIP_UPDATED_PRE_DEPARTURE',
  TRIP_UPDATED_ACTUALS: 'TRIP_UPDATED_ACTUALS',
  TRIP_COMPLETED: 'TRIP_COMPLETED',
  TRIP_LOCKED: 'TRIP_LOCKED',
  TRIP_CANCELED: 'TRIP_CANCELED',

  // Financial
  PAYMENT_RECEIVED: 'PAYMENT_RECEIVED',
  ADJUSTMENT_CREATED: 'ADJUSTMENT_CREATED',
  PENALTY_CREATED: 'PENALTY_CREATED',
  DRIVER_SALARY_RECORDED: 'DRIVER_SALARY_RECORDED',

  // Config CRUD
  ENTITY_CREATED: 'ENTITY_CREATED',
  ENTITY_UPDATED: 'ENTITY_UPDATED',
  ENTITY_DELETED: 'ENTITY_DELETED',

  // Auth
  USER_LOGIN: 'USER_LOGIN',
  USER_LOGOUT: 'USER_LOGOUT',
} as const;

export type AuditEventType = (typeof AuditEvent)[keyof typeof AuditEvent];

export interface AuditPayload {
  event: AuditEventType;
  entityType: string;
  entityId?: number;
  actorRole?: string;
  actorEmail?: string;
  metadata?: Record<string, unknown>;
}
