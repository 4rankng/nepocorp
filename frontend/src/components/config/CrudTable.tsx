import { Fragment, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { PageHeader, Panel, Modal, useConfirm } from '../UI';
import { ActionBtns } from './ActionBtns';
import { useCRUD } from '../../hooks/useCRUD';
import type { PaginatedResponse } from '@tingting/shared';
import { qk } from '../../api/keys';
import '../../pages/config/config-page.css';

interface CrudColumn<T> {
  header: string;
  width?: number;
  className?: string;
  render: (item: T, index: number, isActive: boolean, allItems: T[]) => React.ReactNode;
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
    onDelete?: () => Promise<void>;
    deleting?: boolean;
  }) => React.ReactNode;
  colSpan: number;
  showDelete?: boolean;
  onDelete?: (id: number) => void;
  sortFn?: (a: T, b: T) => number;
  computeActiveIds?: (items: T[]) => Set<number>;
  rowStyle?: (item: T, isActive: boolean) => React.CSSProperties | undefined;
  toolbarLeft?: (ctx: { totalItems: number; activeCount: number }) => React.ReactNode;
  backTo?: string;
  emptyIllustration?: string;
  emptyTitle?: string;
  emptyHint?: string;
  pageSlug?: string;
}

export function CrudTable<T extends { id: number }>({
  title, description, endpoint, columns, renderForm, colSpan,
  showDelete = true, onDelete, sortFn, computeActiveIds, rowStyle,
  toolbarLeft, backTo = '/config',
  emptyIllustration = 'empty-config.svg',
  emptyTitle = 'Chưa có dữ liệu',
  emptyHint,
  pageSlug,
}: CrudTableProps<T>) {
  const navigate = useNavigate();
  const { confirm, dialog } = useConfirm();

  // NOTE: fetches with no page/limit params — backend defaults to limit=50.
  // Config tables are small (< 50 rows) so this is fine for now.
  // If any table grows beyond 50 items, add pagination controls here.
  const { data, refetch } = useQuery({
    queryKey: qk.crud.entity(endpoint),
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

  const wrapperClass = ['fade-up', 'cfg-page', pageSlug ? `cfg-page--${pageSlug}` : ''].filter(Boolean).join(' ');

  return (
    <div className={wrapperClass}>
      <PageHeader title={title} description={description} onBack={() => navigate(backTo)} />
      <Panel flush>
        <div className="toolbar">
          <div style={{ flex: 1, minWidth: 0 }}>
            {toolbarLeft
              ? toolbarLeft({ totalItems: items.length, activeCount: activeIds.size })
              : items.length > 0 && (
                  <span className="cfg-page__summary">
                    <strong>{items.length}</strong> mục
                  </span>
                )}
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
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && !crud.showAddForm && (
                <tr>
                  <td colSpan={colSpan + 1} style={{ textAlign: 'center' }}>
                    <div className="cfg-empty">
                      <img
                        src={`/assets/illustrations/${emptyIllustration}`}
                        alt=""
                        aria-hidden="true"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                      <div className="cfg-empty__title">{emptyTitle}</div>
                      {emptyHint && <div className="cfg-empty__hint">{emptyHint}</div>}
                    </div>
                  </td>
                </tr>
              )}
              {items.map((item, i) => {
                const isActive = activeIds.has(item.id);
                return (
                  <tr
                    key={item.id}
                    style={{ cursor: 'pointer', ...rowStyle?.(item, isActive) }}
                    onClick={() => crud.setEditingId(item.id)}
                    title="Nhấp để chỉnh sửa hoặc xóa"
                  >
                    <td className="num">{i + 1}</td>
                    {columns.map(col => (
                      <td key={col.header} className={col.className}>
                        {col.render(item, i, isActive, items)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
      {crud.error && <div style={{ textAlign: 'center', color: 'var(--danger)', marginTop: 12 }}>{crud.error}</div>}

      {/* Modal for adding a new item */}
      <Modal
        isOpen={crud.showAddForm && !crud.editingId}
        title={`Thêm ${title.toLowerCase()}`}
        onClose={crud.cancelForm}
        maxWidth={600}
      >
        <div style={{ padding: '8px 4px' }}>
          {renderForm({
            saving: crud.saving,
            onSave: crud.doCreate,
            onCancel: crud.cancelForm,
            items,
          })}
        </div>
      </Modal>

      {/* Modal for editing/deleting an existing item */}
      {(() => {
        const item = items.find(x => x.id === crud.editingId);
        if (!item) return null;
        return (
          <Modal
            isOpen={true}
            title={`Chỉnh sửa ${title.toLowerCase()}`}
            onClose={crud.cancelForm}
            maxWidth={600}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: '8px 4px' }}>
              <div>
                {renderForm({
                  item,
                  saving: crud.saving,
                  onSave: (d) => crud.doUpdate(item.id, d),
                  onCancel: crud.cancelForm,
                  items,
                  onDelete: async () => {
                    const ok = await confirm(`Bạn có chắc chắn muốn xóa ${title.toLowerCase()} này?`, {
                      variant: 'danger',
                      confirmLabel: 'Xóa'
                    });
                    if (ok) {
                      await handleDelete(item.id);
                      crud.cancelForm();
                    }
                  },
                  deleting: crud.deleting === item.id,
                })}
              </div>
              {showDelete && (
                <div style={{ borderTop: '1px solid var(--line)', paddingTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="btn btn--ghost"
                    style={{ color: 'var(--danger)', borderColor: 'var(--danger-soft)', cursor: 'pointer' }}
                    disabled={crud.deleting === item.id || crud.saving}
                    onClick={async (e) => {
                      e.stopPropagation();
                      const ok = await confirm(`Bạn có chắc chắn muốn xóa ${title.toLowerCase()} này?`, {
                        variant: 'danger',
                        confirmLabel: 'Xóa'
                      });
                      if (ok) {
                        await handleDelete(item.id);
                        crud.cancelForm();
                      }
                    }}
                  >
                    {crud.deleting === item.id ? 'Đang xóa...' : 'Xóa cấu hình này'}
                  </button>
                </div>
              )}
            </div>
          </Modal>
        );
      })()}
      {dialog}
    </div>
  );
}
