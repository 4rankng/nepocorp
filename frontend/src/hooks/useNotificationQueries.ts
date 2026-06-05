import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationClient } from '../lib/notificationClient';
import type { Notification } from '@tingting/shared';

export function useUnreadCount(options?: { enabled?: boolean }) {
  return useQuery<{ count: number }>({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => notificationClient.getUnreadCount(),
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    enabled: options?.enabled ?? true,
  });
}

export function useNotifications(page = 1, limit = 20) {
  return useQuery<{ items: Notification[]; total: number; page: number; limit: number }>({
    queryKey: ['notifications', 'list', page, limit],
    queryFn: () => notificationClient.list(page, limit),
    staleTime: 30_000,
  });
}

export function useMarkAsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => notificationClient.markAsRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMarkAllAsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => notificationClient.markAllAsRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
