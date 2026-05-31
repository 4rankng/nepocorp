import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface AuditEntry {
  id: number;
  timestamp: string;
  userEmail?: string;
  userName?: string;
  action: string;
  method?: 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'GET';
  path?: string;
  message: string;
  category?: 'trip' | 'config' | 'finance' | 'auth' | 'penalty';
  payload?: Record<string, any>;
  ipAddress?: string;
}

export type Category = 'all' | 'trip' | 'config' | 'finance' | 'auth' | 'penalty';

export function useAuditLogs(page: number, pageSize: number, filter: Category, search: string) {
  return useQuery<{ items: AuditEntry[]; total: number }>({
    queryKey: ['audit-logs', page, pageSize, filter, search],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: String(pageSize) });
      if (filter !== 'all') params.set('category', filter);
      if (search.trim()) params.set('search', search.trim());
      return api.get<{ items: AuditEntry[]; total: number }>(`/audit-logs?${params}`);
    },
  });
}
