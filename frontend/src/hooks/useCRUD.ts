import { useState, useCallback } from 'react';
import { api } from '../lib/api';

export function useCRUD(apiPath: string, onRefresh: () => Promise<void>) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const doCreate = useCallback(async (body: Record<string, unknown>) => {
    setSaving(true);
    try {
      await api.post(apiPath, body);
      setShowAddForm(false);
      await onRefresh();
    } catch (e: any) { setError(e?.message || 'Lỗi lưu'); } finally { setSaving(false); }
  }, [apiPath, onRefresh]);

  const doUpdate = useCallback(async (id: number, body: Record<string, unknown>) => {
    setSaving(true);
    try {
      await api.put(`${apiPath}/${id}`, body);
      setEditingId(null);
      await onRefresh();
    } catch (e: any) { setError(e?.message || 'Lỗi cập nhật'); } finally { setSaving(false); }
  }, [apiPath, onRefresh]);

  const doDelete = useCallback(async (id: number) => {
    setDeleting(id);
    try {
      await api.delete(`${apiPath}/${id}`);
      await onRefresh();
    } catch (e: any) { setError(e?.message || 'Lỗi xóa'); } finally { setDeleting(null); }
  }, [apiPath, onRefresh]);

  const cancelForm = useCallback(() => { setShowAddForm(false); setEditingId(null); }, []);

  return {
    editingId, showAddForm, saving, deleting, error, setError,
    setEditingId, setShowAddForm,
    doCreate, doUpdate, doDelete, cancelForm,
  };
}
