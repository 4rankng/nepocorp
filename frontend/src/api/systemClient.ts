import { api } from '../lib/api';
import { SYSTEM } from '@tingting/shared';

export const systemClient = {
  getAuditLogs: async (params?: Record<string, string>) => {
    const qs = new URLSearchParams(params);
    const query = qs.toString() ? `?${qs.toString()}` : '';
    return api.get<any>(`${SYSTEM.AUDIT_LOGS}${query}`);
  },

  uploadFile: async (formData: FormData) => {
    const token = localStorage.getItem('token');
    const res = await fetch(`/api${SYSTEM.UPLOAD}`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Lỗi kết nối' }));
      throw new Error(error.error ?? 'Upload failed');
    }
    return res.json();
  },
};
