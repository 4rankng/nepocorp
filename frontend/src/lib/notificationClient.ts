import { api } from './api';
import { NOTIFICATIONS } from '@nepocorp/shared';

export const notificationClient = {
  list: (page = 1, limit = 20) =>
    api.get<{ items: any[]; total: number; page: number; limit: number }>(
      `${NOTIFICATIONS.LIST}?page=${page}&limit=${limit}`,
    ),

  getUnreadCount: () =>
    api.get<{ count: number }>(NOTIFICATIONS.UNREAD_COUNT),

  markAsRead: (id: number) =>
    api.post<any>(NOTIFICATIONS.MARK_READ(id), {}),

  markAllAsRead: () =>
    api.post<any>(NOTIFICATIONS.MARK_ALL_READ, {}),
};
