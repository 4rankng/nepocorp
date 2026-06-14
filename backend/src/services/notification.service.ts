import { EventEmitter } from 'events';
import { db } from '../db';
import { notifications } from '../db/schema';
import { eq, and, desc, count, inArray } from 'drizzle-orm';
import * as s from '../db/schema';
import { NotificationType, FINANCIAL_ROLES } from '@tingting/shared';

const eventBus = new EventEmitter();
eventBus.setMaxListeners(50);
const NOTIFICATION_EVENT = 'notification:generate';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface NotificationPayload {
  type: NotificationType;
  title: string;
  message: string;
  relatedEntityType?: string;
  relatedEntityId?: number;
  targetUserId?: number;
  targetRoles?: string[];
  targetDriverId?: number;
}

// ─── Core CRUD ─────────────────────────────────────────────────────────────

export async function getNotifications(userId: number, page = 1, limit = 20) {
  const offset = (page - 1) * limit;
  const [items, [{ total }]] = await Promise.all([
    db.select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() })
      .from(notifications)
      .where(eq(notifications.userId, userId)),
  ]);
  return { items, total, page, limit };
}

export async function getUnreadCount(userId: number) {
  const [{ total }] = await db.select({ total: count() })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
  return total;
}

export async function markAsRead(id: number, userId: number) {
  const [updated] = await db.update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
    .returning();
  return updated;
}

export async function markAllAsRead(userId: number) {
  await db.update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
}

// ─── Event bus ─────────────────────────────────────────────────────────────

export function initNotificationService() {
  eventBus.on(NOTIFICATION_EVENT, async (payload: NotificationPayload) => {
    try {
      const userIds = await resolveTargetUsers(payload);
      if (userIds.length === 0) return;

      const rows = userIds.map(uid => ({
        userId: uid,
        type: payload.type as (typeof notifications.type.enumValues)[number],
        title: payload.title,
        message: payload.message,
        relatedEntityType: payload.relatedEntityType ?? null,
        relatedEntityId: payload.relatedEntityId ?? null,
        isRead: false,
      }));
      await db.insert(notifications).values(rows);
    } catch (err) {
      console.error('Notification generation failed:', err);
    }
  });
}

export function emitNotification(payload: NotificationPayload) {
  eventBus.emit(NOTIFICATION_EVENT, payload);
}

// ─── Target resolution ─────────────────────────────────────────────────────

async function resolveTargetUsers(payload: NotificationPayload): Promise<number[]> {
  const userIds = new Set<number>();

  if (payload.targetUserId) {
    userIds.add(payload.targetUserId);
  }

  const roles = payload.targetRoles ?? [...FINANCIAL_ROLES];
  const roleUsers = await db.select({ id: s.users.id })
    .from(s.users)
    .where(and(inArray(s.users.role, roles as (typeof s.users.role.enumValues)[number][]), eq(s.users.status, 'ACTIVE')));
  for (const u of roleUsers) {
    userIds.add(u.id);
  }

  if (payload.targetDriverId) {
    const [driver] = await db.select({ userId: s.drivers.userId })
      .from(s.drivers)
      .where(eq(s.drivers.id, payload.targetDriverId))
      .limit(1);
    if (driver?.userId) {
      userIds.add(driver.userId);
    }
  }

  return Array.from(userIds);
}
