import { useState, useCallback, useRef } from 'react';
import { usePageAnimations } from '../../hooks/animations';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Loader2, Save, X } from 'lucide-react';
import { configClient } from '../../api/configClient';
import { useCRUD } from '../../hooks/useCRUD';
import { qk } from '../../api/keys';
import { PageHeader, Modal, useConfirm } from '../../components/UI';
import type { SealType } from '@tingting/shared';
import './config-list.css';
import './config-page.css';

/* ─── Modal form ────────────────────────────────────────────────────── */

function SealTypeModal({ open, item, saving, onSave, onClose }: {
  open: boolean;
  item?: SealType;
  saving: boolean;
  onSave: (d: Record<string, unknown>) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(item?.name ?? '');
  const [notes, setNotes] = useState(item?.notes ?? '');

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({ name: name.trim(), notes: notes.trim() || null });
  };

  return (
    <Modal
      isOpen={open}
      title={item ? 'Sửa loại seal' : 'Thêm loại seal'}
      onClose={onClose}
      onConfirm={handleSave}
      maxWidth={440}
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn--secondary btn--sm" onClick={onClose}>
            <X size={13} /> Hủy
          </button>
          <button className="btn btn--primary btn--sm" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 size={13} className="spin" /> : <Save size={13} />}
            {item ? 'Cập nhật' : 'Thêm'}
          </button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="field">
          <label>Tên loại <span style={{ color: 'var(--danger)' }}>*</span></label>
          <input
            className="input"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="VD: Customs, Carrier, Bản in..."
            autoFocus
          />
        </div>
        <div className="field">
          <label>Ghi chú</label>
          <input
            className="input"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Mô tả thêm (tuỳ chọn)"
          />
        </div>
      </div>
    </Modal>
  );
}

/* ─── Row item ──────────────────────────────────────────────────────── */

function SealTypeRow({ st, deleting, onEdit, onDelete }: {
  st: SealType;
  deleting: number | null;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const isDeleting = deleting === st.id;
  const actionsRef = useRef<HTMLDivElement>(null);

  const handleRowClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (actionsRef.current && actionsRef.current.contains(e.target as Node)) return;
    onEdit();
  };

  return (
    <div
      className="cfg-row"
      role="button"
      tabIndex={0}
      onClick={handleRowClick}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onEdit(); } }}
    >
      {/* Name */}
      <span className="cfg-row__name" style={{ flex: '0 0 200px' }}>{st.name}</span>

      {/* Notes */}
      <span className="cfg-row__notes">{st.notes || ''}</span>

      {/* Actions */}
      <div ref={actionsRef} className="cfg-row__actions">
        <button
          className="btn btn--ghost btn--icon btn--sm"
          onClick={onEdit}
          title="Sửa"
        >
          <Pencil size={12} />
        </button>
        <button
          className="btn btn--ghost btn--icon btn--sm cfg-row__delete"
          onClick={onDelete}
          disabled={isDeleting}
          title="Xóa"
        >
          {isDeleting ? <Loader2 size={12} className="spin" /> : <Trash2 size={12} />}
        </button>
      </div>
    </div>
  );
}

/* ─── Empty state ───────────────────────────────────────────────────── */

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="cfg-empty" style={{ padding: '40px 24px' }}>
      <img src="/assets/illustrations/empty-config.svg" alt="" aria-hidden="true" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
      <div className="cfg-empty__title">Chưa có loại seal</div>
      <div className="cfg-empty__hint">Thêm các loại như Customs, Carrier, Bản in để dùng khi tạo chuyến đi.</div>
      <button className="btn btn--primary btn--sm" onClick={onAdd} style={{ marginTop: 4 }}>
        <Plus size={13} /> Thêm loại đầu tiên
      </button>
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────────────────────── */

export default function SealTypesConfigPage() {
  const { rootRef: pageRef } = usePageAnimations({ ready: true, selectors: ['.cfg-row'] });
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<SealType | undefined>();
  const { confirm, dialog: confirmDialog } = useConfirm();

  const { data, refetch } = useQuery({
    queryKey: qk.catalogs.sealTypes,
    queryFn: () => configClient.getSealTypes(),
  });

  const refresh = useCallback(async () => { await refetch(); }, [refetch]);
  const crud = useCRUD('/seal-types', refresh);
  const items = data ?? [];

  const openAdd = () => { setEditItem(undefined); setModalOpen(true); };
  const openEdit = (st: SealType) => { setEditItem(st); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditItem(undefined); };

  const handleSave = (d: Record<string, unknown>) => {
    if (editItem) {
      crud.doUpdate(editItem.id, d).then(closeModal);
    } else {
      crud.doCreate(d).then(closeModal);
    }
  };

  const handleDelete = async (st: SealType) => {
    const ok = await confirm(`Xóa loại seal "${st.name}"?`, {
      confirmLabel: 'Xóa',
      variant: 'danger',
    });
    if (ok) crud.doDelete(st.id);
  };

  return (
    <div ref={pageRef} className="cfg-page cfg-page--seal-types">
      <PageHeader
        title="Loại seal"
        description="Danh mục các loại seal (Customs, Carrier, Bản in…) dùng khi ghi nhận danh sách seal của container."
        onBack={() => navigate('/config')}
        action={
          <button className="btn btn--primary btn--sm" onClick={openAdd}>
            <Plus size={14} /> Thêm mới
          </button>
        }
      />

      <div className="cfg-list-panel">
        {/* Column headers */}
        {items.length > 0 && (
          <div className="cfg-list-header">
            <span className="cfg-list-header__col cfg-list-header__col--name" style={{ flex: '0 0 200px' }}>Tên loại</span>
            <span className="cfg-list-header__col cfg-list-header__col--notes">Ghi chú</span>
            <span className="cfg-list-header__col cfg-list-header__col--spacer" />
          </div>
        )}

        {items.length === 0 ? (
          <EmptyState onAdd={openAdd} />
        ) : (
          items.map(st => (
            <SealTypeRow
              key={st.id}
              st={st}
              deleting={crud.deleting}
              onEdit={() => openEdit(st)}
              onDelete={() => handleDelete(st)}
            />
          ))
        )}
      </div>

      {items.length > 0 && (
        <div className="cfg-list-footer">
          <span className="cfg-page__summary"><strong>{items.length}</strong> loại seal</span>
          <button className="btn btn--ghost btn--sm cfg-list-footer__add" onClick={openAdd}>
            <Plus size={13} /> Thêm loại mới
          </button>
        </div>
      )}

      {crud.error && (
        <div style={{ textAlign: 'center', color: 'var(--danger)', marginTop: 12, fontSize: 13 }}>
          {crud.error}
        </div>
      )}

      <SealTypeModal
        key={editItem?.id ?? 'new'}
        open={modalOpen}
        item={editItem}
        saving={crud.saving}
        onSave={handleSave}
        onClose={closeModal}
      />

      {confirmDialog}
    </div>
  );
}
