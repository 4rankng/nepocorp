import { useState, useCallback, useRef } from 'react';
import { usePageAnimations } from '../../hooks/animations';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Loader2, Save, X } from 'lucide-react';
import { api } from '../../lib/api';
import { configClient } from '../../api/configClient';
import { useCRUD } from '../../hooks/useCRUD';
import { PageHeader, Modal, useConfirm } from '../../components/UI';
import type { Port } from '@tingting/shared';
import './config-list.css';
import './config-page.css';

/* ─── Modal form ────────────────────────────────────────────────────── */

function PortModal({ open, item, saving, onSave, onClose }: {
  open: boolean;
  item?: Port;
  saving: boolean;
  onSave: (d: Record<string, unknown>) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(item?.name ?? '');
  const [code, setCode] = useState(item?.code ?? '');
  const [city, setCity] = useState(item?.city ?? 'Hải Phòng');
  const [address, setAddress] = useState(item?.address ?? '');
  const [notes, setNotes] = useState(item?.notes ?? '');

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      code: code.trim() || null,
      city: city.trim() || 'Hải Phòng',
      address: address.trim() || null,
      notes: notes.trim() || null,
    });
  };

  return (
    <Modal
      isOpen={open}
      title={item ? 'Sửa cảng / bãi' : 'Thêm cảng / bãi'}
      onClose={onClose}
      onConfirm={handleSave}
      maxWidth={480}
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
          <label>Tên cảng / bãi <span style={{ color: 'var(--danger)' }}>*</span></label>
          <input
            className="input"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="VD: Cảng Hải Phòng, Bãi ICD Đình Vũ"
            autoFocus
          />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 12 }}>
          <div className="field">
            <label>Mã cảng</label>
            <input
              className="input"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              placeholder="HPH"
              style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.04em' }}
            />
          </div>
          <div className="field">
            <label>Thành phố</label>
            <input
              className="input"
              value={city}
              onChange={e => setCity(e.target.value)}
              placeholder="Hải Phòng"
            />
          </div>
        </div>
        <div className="field">
          <label>Địa chỉ</label>
          <input
            className="input"
            value={address}
            onChange={e => setAddress(e.target.value)}
            placeholder="Địa chỉ (tuỳ chọn)"
          />
        </div>
        <div className="field">
          <label>Ghi chú</label>
          <input
            className="input"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Ghi chú thêm (tuỳ chọn)"
          />
        </div>
      </div>
    </Modal>
  );
}

/* ─── Row item ──────────────────────────────────────────────────────── */

function PortRow({ port, deleting, onEdit, onDelete }: {
  port: Port;
  deleting: number | null;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const isDeleting = deleting === port.id;
  const actionsRef = useRef<HTMLDivElement>(null);

  const handleRowClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (actionsRef.current && actionsRef.current.contains(e.target as Node)) return;
    onEdit();
  };

  return (
    <div
      className="cfg-row cfg-row--port"
      role="button"
      tabIndex={0}
      onClick={handleRowClick}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onEdit(); } }}
    >
      {/* Code chip */}
      <span className={`cfg-row__code${port.code ? '' : ' cfg-row__code--empty'}`}>{port.code || ''}</span>

      {/* Name */}
      <span className="cfg-row__name cfg-row__name--wide">{port.name}</span>

      {/* City */}
      <span className="cfg-row__city">{port.city || ''}</span>

      {/* Address */}
      <span className="cfg-row__notes">{port.address || ''}</span>

      {/* Actions — visible on hover (desktop) or always (mobile) */}
      <div ref={actionsRef} className="cfg-row__actions">
        <button className="btn btn--ghost btn--icon btn--sm" onClick={onEdit} title="Sửa">
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
      <img src="/assets/illustrations/empty-routes.svg" alt="" aria-hidden="true" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
      <div className="cfg-empty__title">Chưa có cảng / bãi</div>
      <div className="cfg-empty__hint">Thêm các cảng và bãi container Hải Phòng để dùng khi tạo chuyến đi.</div>
      <button className="btn btn--primary btn--sm" onClick={onAdd} style={{ marginTop: 4 }}>
        <Plus size={13} /> Thêm cảng đầu tiên
      </button>
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────────────────────── */

export default function PortsConfigPage() {
  const { rootRef: pageRef } = usePageAnimations({ ready: true, selectors: ['.cfg-row'] });
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<Port | undefined>();
  const { confirm, dialog: confirmDialog } = useConfirm();

  const { data, refetch } = useQuery({
    queryKey: ['ports'],
    queryFn: () => configClient.getPorts(),
  });

  const refresh = useCallback(async () => { await refetch(); }, [refetch]);
  const crud = useCRUD('/ports', refresh);
  const items = data ?? [];

  const openAdd = () => { setEditItem(undefined); setModalOpen(true); };
  const openEdit = (p: Port) => { setEditItem(p); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditItem(undefined); };

  const handleSave = (d: Record<string, unknown>) => {
    if (editItem) {
      crud.doUpdate(editItem.id, d).then(closeModal);
    } else {
      crud.doCreate(d).then(closeModal);
    }
  };

  const handleDelete = async (port: Port) => {
    const ok = await confirm(`Xóa cảng "${port.name}"?`, {
      confirmLabel: 'Xóa',
      variant: 'danger',
    });
    if (ok) crud.doDelete(port.id);
  };

  return (
    <div ref={pageRef} className="cfg-page cfg-page--ports">
      <PageHeader
        title="Cảng / Bãi Hải Phòng"
        description="Danh mục các cảng và bãi container tại khu vực Hải Phòng — điểm đi / điểm đến trong chuyến hàng"
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
            <span className="cfg-list-header__col cfg-list-header__col--name-wide">Tên cảng / bãi</span>
            <span className="cfg-list-header__col cfg-list-header__col--city">Thành phố</span>
            <span className="cfg-list-header__col cfg-list-header__col--notes">Địa chỉ</span>
            <span className="cfg-list-header__col cfg-list-header__col--spacer" />
          </div>
        )}

        {items.length === 0 ? (
          <EmptyState onAdd={openAdd} />
        ) : (
          items.map(port => (
            <PortRow
              key={port.id}
              port={port}
              deleting={crud.deleting}
              onEdit={() => openEdit(port)}
              onDelete={() => handleDelete(port)}
            />
          ))
        )}
      </div>

      {items.length > 0 && (
        <div className="cfg-list-footer">
          <span className="cfg-page__summary"><strong>{items.length}</strong> cảng / bãi</span>
          <button className="btn btn--ghost btn--sm cfg-list-footer__add" onClick={openAdd}>
            <Plus size={13} /> Thêm cảng mới
          </button>
        </div>
      )}

      {crud.error && (
        <div style={{ textAlign: 'center', color: 'var(--danger)', marginTop: 12, fontSize: 13 }}>
          {crud.error}
        </div>
      )}

      <PortModal
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
