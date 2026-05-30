import { Fragment, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { PageHeader, Panel } from '../UI';
import { ActionBtns } from './ActionBtns';
import { useCRUD } from '../../hooks/useCRUD';
import type { PaginatedResponse } from '@nepocorp/shared';

interface CrudColumn<T> {
  header: string;
  width?: number;
  className?: string;
  render: (item: T, index: number, isActive: boolean) => React.ReactNode;
}

interface CrudTableProps<T extends { id: number }> {
  title: string;
  description: string;
  endpoint: string;
  columns: CrudColumn<T>[];
  renderForm: (props: {
    item?: T;
    items: T[];
    saving: boolean;
    onSave: (data: Record<string, unknown>) => void;
    onCancel: () => void;
  }) => React.ReactNode;
  colSpan: number;
  showDelete?: boolean;
  onDelete?: (id: number) => void;
  sortFn?: (a: T, b: T) => number;
  computeActiveIds?: (items: T[]) => Set<number>;
  rowStyle?: (item: T, isActive: boolean) => React.CSSProperties | undefined;
  toolbarLeft?: (ctx: { totalItems: number; activeCount: number }) => React.ReactNode;
  backTo?: string;
}

export function CrudTable<T extends { id: number }>({
  title, description, endpoint, columns, renderForm, colSpan,
  showDelete = true, onDelete, sortFn, computeActiveIds, rowStyle,
  toolbarLeft, backTo = '/config',
}: CrudTableProps<T>) {
  const navigate = useNavigate();

  const { data, refetch } = useQuery({
    queryKey: [endpoint],
    queryFn: async () => {
      const r = await api.get<PaginatedResponse<T>>(endpoint);
      return r.items;
    },
  });

  const refresh = useCallback(async () => { await refetch(); }, [refetch]);
  const crud = useCRUD(endpoint, refresh);

  const rawItems = data ?? [];
  const activeIds = computeActiveIds ? computeActiveIds(rawItems) : new Set<number>();

  const items = (() => {
    if (!rawItems.length) return rawItems;
    const arr = [...rawItems];
    if (computeActiveIds) {
      arr.sort((a, b) => {
        const aA = activeIds.has(a.id) ? 1 : 0;
        const bA = activeIds.has(b.id) ? 1 : 0;
        if (aA !== bA) return bA - aA;
        return sortFn ? sortFn(a, b) : 0;
      });
    } else if (sortFn) {
      arr.sort(sortFn);
    }
    return arr;
  })();

  const handleDelete = onDelete ?? ((id: number) => crud.doDelete(id));
  const actionWidth = showDelete ? 100 : 80;

  return (
    <div className="fade-up">
      <PageHeader title={title} description={description} onBack={() => navigate(backTo)} />
      <Panel flush>
        <div className="toolbar" style={{ borderBottom: 'none', padding: '16px 20px 8px' }}>
          <div style={{ flex: 1 }}>
            {toolbarLeft?.({ totalItems: items.length, activeCount: activeIds.size })}
          </div>
          <button className="btn btn--primary btn--sm" onClick={() => crud.setShowAddForm(true)}>
            <Plus size={14} /> Thêm mới
          </button>
        </div>
        <div className="table-scroll">
          <table className="tt-table">
            <thead>
              <tr>
                <th style={{ width: 40 }}>#</th>
                {columns.map(col => (
                  <th key={col.header} style={col.width ? { width: col.width } : undefined} className={col.className}>
                    {col.header}
                  </th>
                ))}
                <th style={{ width: actionWidth }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {crud.showAddForm && !crud.editingId && renderForm({
                saving: crud.saving, onSave: crud.doCreate, onCancel: crud.cancelForm, items,
              })}
              {items.length === 0 && !crud.showAddForm && (
                <tr>
                  <td colSpan={colSpan} style={{ textAlign: 'center', padding: 32, color: 'var(--fg-3)' }}>
                    Chưa có dữ liệu
                  </td>
                </tr>
              )}
              {items.map((item, i) => {
                const isActive = activeIds.has(item.id);
                if (crud.editingId === item.id) {
                  return (
                    <Fragment key={`edit-${item.id}`}>
                      {renderForm({
                        item, saving: crud.saving,
                        onSave: (d) => crud.doUpdate(item.id, d),
                        onCancel: crud.cancelForm, items,
                      })}
                    </Fragment>
                  );
                }
                return (
                  <tr key={item.id} style={rowStyle?.(item, isActive)}>
                    <td className="num">{i + 1}</td>
                    {columns.map(col => (
                      <td key={col.header} className={col.className}>
                        {col.render(item, i, isActive)}
                      </td>
                    ))}
                    <td>
                      {showDelete ? (
                        <ActionBtns
                          id={item.id} deleting={crud.deleting}
                          onedit={() => crud.setEditingId(item.id)}
                          ondelete={() => handleDelete(item.id)}
                        />
                      ) : (
                        <button className="btn btn--ghost btn--sm btn--icon" title="Sửa" onClick={() => crud.setEditingId(item.id)}>
                          <Pencil size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
      {crud.error && <div style={{ textAlign: 'center', color: 'var(--danger)', marginTop: 12 }}>{crud.error}</div>}
    </div>
  );
}
