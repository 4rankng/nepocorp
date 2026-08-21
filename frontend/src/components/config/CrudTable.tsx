import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, AlertCircle } from 'lucide-react';
import { EmptyState } from '../../design-system';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { PageHeader, Panel, Modal, useConfirm } from '../UI';
import { Alert } from '../shared/Alert';
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

interface CrudTableCommonProps<T extends { id: number }> {
  title: string;
  description: string;
  endpoint: string;
  /** Optional unpaginated loader for configuration screens that must inspect a subset of a large catalogue. */
  fetchItems?: () => Promise<T[]>;
  renderForm: (props: {
    item?: T;
    items: T[];
    saving: boolean;
    onSave: (data: Record<string, unknown>) => void;
    onCancel: () => void;
    onDelete?: () => Promise<void>;
    deleting?: boolean;
  }) => React.ReactNode;
  colSpan?: number;
  showDelete?: boolean;
  onDelete?: (id: number) => void;
  sortFn?: (a: T, b: T) => number;
  /** Limits a configuration view to the records relevant to that setting. */
  filterItems?: (items: T[]) => T[];
  computeActiveIds?: (items: T[]) => Set<number>;
  rowStyle?: (item: T, isActive: boolean) => React.CSSProperties | undefined;
  toolbarLeft?: (ctx: { totalItems: number; activeCount: number }) => React.ReactNode;
  backTo?: string;
  emptyIllustration?: string;
  emptyTitle?: string;
  emptyHint?: string;
  pageSlug?: string;
  iconName?: import('../../components/AssetIcon').AssetIconName;
  createActionPlacement?: 'header' | 'toolbar';
}

type CrudTableProps<T extends { id: number }> = CrudTableCommonProps<T> & (
  | {
      columns: CrudColumn<T>[];
      renderCompactItem?: never;
      compactItemAriaLabel?: never;
    }
  | {
      columns?: never;
      renderCompactItem: (item: T, index: number, isActive: boolean, allItems: T[]) => React.ReactNode;
      compactItemAriaLabel?: (item: T, index: number) => string;
    }
);

export function CrudTable<T extends { id: number }>({
  title, description, endpoint, fetchItems, columns, renderCompactItem, compactItemAriaLabel, renderForm, colSpan,
  showDelete = true, onDelete, sortFn, filterItems, computeActiveIds, rowStyle,
  toolbarLeft, backTo = '/config',
  emptyIllustration = 'empty-config.svg',
  emptyTitle = 'Chưa có dữ liệu',
  emptyHint,
  pageSlug,
  iconName,
  createActionPlacement = 'toolbar',
}: CrudTableProps<T>) {
  const navigate = useNavigate();
  const { confirm, dialog } = useConfirm();

  // NOTE: fetches with no page/limit params — backend defaults to limit=50.
  // Config tables are small (< 50 rows) so this is fine for now.
  // If any table grows beyond 50 items, add pagination controls here.
  const { data, refetch, isPending, isError } = useQuery({
    queryKey: qk.crud.entity(endpoint),
    queryFn: async () => {
      if (fetchItems) return fetchItems();
      const r = await api.get<PaginatedResponse<T>>(endpoint);
      return r.items;
    },
  });

  const refresh = useCallback(async () => { await refetch(); }, [refetch]);
  const crud = useCRUD(endpoint, refresh);

  const rawItems = data ?? [];
  const visibleItems = filterItems ? filterItems(rawItems) : rawItems;
  const tableColumns = columns ?? [];
  const activeIds = computeActiveIds ? computeActiveIds(visibleItems) : new Set<number>();

  const items = (() => {
    if (!visibleItems.length) return visibleItems;
    const arr = [...visibleItems];
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

  const wrapperClass = ['fade-up', 'cfg-page', pageSlug ? `cfg-page--${pageSlug}` : ''].filter(Boolean).join(' ');
  const showToolbar = items.length > 0 || createActionPlacement === 'toolbar' || Boolean(toolbarLeft);
  const createButton = (
    <button className="btn btn--primary btn--sm" onClick={() => crud.setShowAddForm(true)}>
      <Plus size={14} /> Thêm mới
    </button>
  );

  return (
    <div className={wrapperClass}>
      <PageHeader
        title={title}
        description={description}
        onBack={() => navigate(backTo)}
        iconName={iconName}
        action={createActionPlacement === 'header' ? createButton : undefined}
      />
      <Panel flush>
        {showToolbar && (
          <div className="toolbar">
            <div
              className={createActionPlacement === 'header' ? 'cfg-page__summary-wrap' : undefined}
              style={createActionPlacement === 'toolbar' ? { flex: 1, minWidth: 0 } : undefined}
            >
              {toolbarLeft
                ? toolbarLeft({ totalItems: items.length, activeCount: activeIds.size })
                : items.length > 0 && (
                    <span className="cfg-page__summary">
                      <strong>{items.length}</strong> mục
                    </span>
                  )}
            </div>
            {createActionPlacement === 'toolbar' && createButton}
          </div>
        )}
        {isPending ? (
          <div className="cfg-query-state" role="status" aria-live="polite">
            Đang tải dữ liệu…
          </div>
        ) : isError ? (
          <div className="cfg-query-state cfg-query-state--error" role="alert">
            <span>Không thể tải dữ liệu.</span>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => void refetch()}>
              Thử lại
            </button>
          </div>
        ) : renderCompactItem ? (
          items.length === 0 && !crud.showAddForm ? (
            <div className="cfg-compact-list__empty">
              <EmptyState
                illustration={`/assets/illustrations/${emptyIllustration}`}
                title={emptyTitle}
                description={emptyHint}
                action={
                  <button className="btn btn--primary btn--sm" onClick={() => crud.setShowAddForm(true)}>
                    <Plus size={14} /> Thêm mới
                  </button>
                }
              />
            </div>
          ) : (
            <ul className="cfg-compact-list" aria-label={title}>
              {items.map((item, i) => {
                const isActive = activeIds.has(item.id);
                return (
                  <li key={item.id} className="cfg-compact-list__entry">
                    <button
                      type="button"
                      className="cfg-compact-list__item"
                      style={rowStyle?.(item, isActive)}
                      onClick={() => crud.setEditingId(item.id)}
                      aria-label={compactItemAriaLabel?.(item, i) ?? `Chỉnh sửa ${title.toLowerCase()} thứ ${i + 1}`}
                      title="Nhấp để chỉnh sửa hoặc xóa"
                    >
                      {renderCompactItem(item, i, isActive, items)}
                    </button>
                  </li>
                );
              })}
            </ul>
          )
        ) : (
          <div className="table-scroll">
            <table className="tt-table">
              <caption className="sr-only">{title}</caption>
              <thead>
                <tr>
                  <th style={{ width: 40 }}>#</th>
                  {tableColumns.map(col => (
                    <th key={col.header} style={col.width ? { width: col.width } : undefined} className={col.className}>
                      {col.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.length === 0 && !crud.showAddForm && (
                  <tr className="cfg-empty-row">
                    <td colSpan={(colSpan ?? tableColumns.length) + 1} style={{ textAlign: 'center' }}>
                      <EmptyState
                        illustration={`/assets/illustrations/${emptyIllustration}`}
                        title={emptyTitle}
                        description={emptyHint}
                        action={
                          <button className="btn btn--primary btn--sm" onClick={() => crud.setShowAddForm(true)}>
                            <Plus size={14} /> Thêm mới
                          </button>
                        }
                      />
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
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          crud.setEditingId(item.id);
                        }
                      }}
                      tabIndex={0}
                      role="button"
                      aria-label={`Chỉnh sửa ${title.toLowerCase()} thứ ${i + 1}`}
                      title="Nhấp để chỉnh sửa hoặc xóa"
                    >
                      <td className="num">{i + 1}</td>
                      {tableColumns.map(col => (
                        <td key={col.header} className={col.className} data-label={col.header}>
                          {col.render(item, i, isActive, items)}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      {crud.error && (
        <Alert variant="error" style="soft" icon={<AlertCircle size={16} />} className="mt-3">
          {crud.error}
        </Alert>
      )}

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
