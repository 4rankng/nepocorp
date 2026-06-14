import { useState, useCallback, useRef } from 'react';
import { usePageAnimations } from '../../hooks/animations';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Loader2, Save, X } from 'lucide-react';
import { configClient } from '../../api/configClient';
import { useCRUD } from '../../hooks/useCRUD';
import { qk } from '../../api/keys';
import { PageHeader, Modal, useConfirm } from '../../components/UI';
import type { ContainerType } from '@tingting/shared';
import './config-list.css';
import './config-page.css';

/* ─── Modal form ────────────────────────────────────────────────────── */

function ContainerTypeModal({ open, item, saving, onSave, onClose }: {
  open: boolean;
  item?: ContainerType;
  saving: boolean;
  onSave: (d: Record<string, unknown>) => void;
  onClose: () => void;
}) {
  const [code, setCode] = useState(item?.code ?? '');
  const [name, setName] = useState(item?.name ?? '');
  const [notes, setNotes] = useState(item?.notes ?? '');

  const handleSave = () => {
    if (!code.trim() || !name.trim()) return;
    onSave({ code: code.trim(), name: name.trim(), notes: notes.trim() || null });
  };

  return (
    <Modal
      isOpen={open}
      title={item ? 'Sửa loại container' : 'Thêm loại container'}
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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.8fr', gap: 12 }}>
          <div className="field">
            <label>Mã loại <span style={{ color: 'var(--danger)' }}>*</span></label>
            <input
              className="input"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              placeholder="20DC"
              style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.04em' }}
              autoFocus
            />
          </div>
          <div className="field">
            <label>Tên hiển thị <span style={{ color: 'var(--danger)' }}>*</span></label>
            <input
              className="input"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="20'DC"
            />
          </div>
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

function ContainerRow({ ct, deleting, onEdit, onDelete }: {
  ct: ContainerType;
  deleting: number | null;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const isDeleting = deleting === ct.id;
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
      {/* Code chip */}
      <span className="cfg-row__code">{ct.code}</span>

      {/* Name */}
      <span className="cfg-row__name">{ct.name}</span>

      {/* Notes */}
      <span className="cfg-row__notes">{ct.notes || ''}</span>

      {/* Actions — visible on hover (desktop) or always (mobile) */}
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
      <div className="cfg-empty__title">Chưa có loại container</div>
      <div className="cfg-empty__hint">Thêm các loại như 20&apos;DC, 40&apos;HC để dùng khi tạo chuyến đi.</div>
      <button className="btn btn--primary btn--sm" onClick={onAdd} style={{ marginTop: 4 }}>
        <Plus size={13} /> Thêm loại đầu tiên
      </button>
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────────────────────── */

export default function ContainerTypesConfigPage() {
  const { rootRef: pageRef } = usePageAnimations({ ready: true, selectors: ['.cfg-row'] });
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<ContainerType | undefined>();
  const { confirm, dialog: confirmDialog } = useConfirm();

  const { data, refetch } = useQuery({
    queryKey: qk.catalogs.containerTypes,
    queryFn: () => configClient.getContainerTypes(),
  });

  const refresh = useCallback(async () => { await refetch(); }, [refetch]);
  const crud = useCRUD('/container-types', refresh);
  const items = data ?? [];

  const openAdd = () => { setEditItem(undefined); setModalOpen(true); };
  const openEdit = (ct: ContainerType) => { setEditItem(ct); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditItem(undefined); };

  const handleSave = (d: Record<string, unknown>) => {
    if (editItem) {
      crud.doUpdate(editItem.id, d).then(closeModal);
    } else {
      crud.doCreate(d).then(closeModal);
    }
  };

  const handleDelete = async (ct: ContainerType) => {
    const ok = await confirm(`Xóa loại container "${ct.name}"?`, {
      confirmLabel: 'Xóa',
      variant: 'danger',
    });
    if (ok) crud.doDelete(ct.id);
  };

  return (
    <div ref={pageRef} className="cfg-page cfg-page--container-types">
      <PageHeader
        title="Loại container"
        description="Danh mục các loại container dùng trong chuyến đi: 20'DC, 20'OT, 40'HC, 40'DC, 40'HC…"
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
            <span className="cfg-list-header__col cfg-list-header__col--code">Mã</span>
            <span className="cfg-list-header__col cfg-list-header__col--name">Tên</span>
            <span className="cfg-list-header__col cfg-list-header__col--notes">Ghi chú</span>
            <span className="cfg-list-header__col cfg-list-header__col--spacer" />
          </div>
        )}

        {items.length === 0 ? (
          <EmptyState onAdd={openAdd} />
        ) : (
          items.map(ct => (
            <ContainerRow
              key={ct.id}
              ct={ct}
              deleting={crud.deleting}
              onEdit={() => openEdit(ct)}
              onDelete={() => handleDelete(ct)}
            />
          ))
        )}
      </div>

      {items.length > 0 && (
        <div className="cfg-list-footer">
          <span className="cfg-page__summary"><strong>{items.length}</strong> loại container</span>
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

      <ContainerTypeModal
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
