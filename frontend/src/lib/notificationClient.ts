import { api } from './api';
import { NOTIFICATIONS } from '@tingting/shared';
import type { Notification } from '@tingting/shared';

export const notificationClient = {
  list: (page = 1, limit = 20) =>
    api.get<{ items: Notification[]; total: number; page: number; limit: number }>(
      `${NOTIFICATIONS.LIST}?page=${page}&limit=${limit}`,
    ),

  getUnreadCount: () =>
    api.get<{ count: number }>(NOTIFICATIONS.UNREAD_COUNT),

  markAsRead: (id: number) =>
    api.post<void>(NOTIFICATIONS.MARK_READ(id), {}),

  markAllAsRead: () =>
    api.post<void>(NOTIFICATIONS.MARK_ALL_READ, {}),
};
