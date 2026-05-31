import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

function getErrorMessage(e: unknown): string {
  return e instanceof Error ? e.message : 'Unknown error';
}

export function useCRUD(apiPath: string, onRefresh: () => Promise<void>) {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const invalidateCatalogs = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['catalogs'] });
  }, [queryClient]);

  const doCreate = useCallback(async (body: Record<string, unknown>) => {
    setSaving(true);
    try {
      await api.post(apiPath, body);
      setShowAddForm(false);
      await Promise.all([onRefresh(), invalidateCatalogs()]);
    } catch (e: unknown) { setError(getErrorMessage(e) || 'Lỗi lưu'); } finally { setSaving(false); }
  }, [apiPath, onRefresh, invalidateCatalogs]);

  const doUpdate = useCallback(async (id: number, body: Record<string, unknown>) => {
    setSaving(true);
    try {
      await api.put(`${apiPath}/${id}`, body);
      setEditingId(null);
      await Promise.all([onRefresh(), invalidateCatalogs()]);
    } catch (e: unknown) { setError(getErrorMessage(e) || 'Lỗi cập nhật'); } finally { setSaving(false); }
  }, [apiPath, onRefresh, invalidateCatalogs]);

  const doDelete = useCallback(async (id: number) => {
    setDeleting(id);
    try {
      await api.delete(`${apiPath}/${id}`);
      await Promise.all([onRefresh(), invalidateCatalogs()]);
    } catch (e: unknown) { setError(getErrorMessage(e) || 'Lỗi xóa'); } finally { setDeleting(null); }
  }, [apiPath, onRefresh, invalidateCatalogs]);

  const cancelForm = useCallback(() => { setShowAddForm(false); setEditingId(null); }, []);

  return {
    editingId, showAddForm, saving, deleting, error, setError,
    setEditingId, setShowAddForm,
    doCreate, doUpdate, doDelete, cancelForm,
  };
}
