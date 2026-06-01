import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Loader2, Anchor, Save, X } from 'lucide-react';
import { api } from '../../lib/api';
import { useCRUD } from '../../hooks/useCRUD';
import { PageHeader, Modal, useConfirm } from '../../components/UI';
import type { Port } from '@nepocorp/shared';
import type { PaginatedResponse } from '@nepocorp/shared';

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
  const [hovered, setHovered] = useState(false);
  const isDeleting = deleting === port.id;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 16px',
        borderBottom: '1px solid var(--line)',
        background: hovered ? 'var(--surface-2)' : 'transparent',
        transition: 'background 0.1s',
      }}
    >
      {/* Code chip */}
      <span style={{
        flexShrink: 0,
        width: 52,
        textAlign: 'center',
        background: port.code ? 'var(--accent-soft)' : 'transparent',
        color: 'var(--accent-2)',
        fontFamily: 'var(--font-mono)',
        fontWeight: 700,
        fontSize: 11,
        letterSpacing: '0.06em',
        borderRadius: 5,
        padding: '3px 0',
      }}>
        {port.code || ''}
      </span>

      {/* Name */}
      <span style={{
        width: 220,
        flexShrink: 0,
        fontWeight: 600,
        fontSize: 13,
        color: 'var(--ink)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {port.name}
      </span>

      {/* City */}
      <span style={{
        width: 100,
        flexShrink: 0,
        fontSize: 13,
        color: 'var(--ink-2)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {port.city || ''}
      </span>

      {/* Address */}
      <span style={{
        flex: 1,
        fontSize: 13,
        color: 'var(--ink-3)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {port.address || ''}
      </span>

      {/* Actions — only visible on hover */}
      <div style={{
        display: 'flex',
        gap: 2,
        opacity: hovered ? 1 : 0,
        transition: 'opacity 0.1s',
      }}>
        <button className="btn btn--ghost btn--icon btn--sm" onClick={onEdit} title="Sửa">
          <Pencil size={12} />
        </button>
        <button
          className="btn btn--ghost btn--icon btn--sm"
          onClick={onDelete}
          disabled={isDeleting}
          title="Xóa"
          style={{ color: 'var(--ink-3)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--danger)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--ink-3)')}
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
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '56px 24px',
      gap: 12,
    }}>
      <div style={{
        width: 48,
        height: 48,
        borderRadius: 12,
        background: 'var(--surface-3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Anchor size={20} color="var(--ink-4)" />
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink-2)', marginBottom: 4 }}>
          Chưa có cảng / bãi nào
        </div>
        <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>
          Thêm các cảng và bãi container để dùng khi tạo chuyến đi
        </div>
      </div>
      <button className="btn btn--primary btn--sm" onClick={onAdd}>
        <Plus size={13} /> Thêm cảng đầu tiên
      </button>
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────────────────────── */

export default function PortsConfigPage() {
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<Port | undefined>();
  const { confirm, dialog: confirmDialog } = useConfirm();

  const { data, refetch } = useQuery({
    queryKey: ['/ports'],
    queryFn: async () => {
      const r = await api.get<PaginatedResponse<Port>>('/ports');
      return r.items;
    },
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
    <div className="fade-up">
      <PageHeader
        title="Cảng / Bãi tại Hải Phòng"
        description="Danh mục các cảng và bãi container tại khu vực Hải Phòng"
        onBack={() => navigate('/config')}
        action={
          <button className="btn btn--primary btn--sm" onClick={openAdd}>
            <Plus size={14} /> Thêm mới
          </button>
        }
      />

      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        borderRadius: 12,
        overflow: 'hidden',
      }}>
        {/* Column headers */}
        {items.length > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '8px 16px',
            borderBottom: '1px solid var(--line)',
            background: 'var(--surface-2)',
          }}>
            <span style={{ width: 52, flexShrink: 0, fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Mã</span>
            <span style={{ width: 220, flexShrink: 0, fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Tên cảng / bãi</span>
            <span style={{ width: 100, flexShrink: 0, fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Thành phố</span>
            <span style={{ flex: 1, fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Địa chỉ</span>
            <span style={{ width: 56, flexShrink: 0 }} />
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

        {items.length > 0 && (
          <div style={{ padding: '10px 16px' }}>
            <button
              className="btn btn--ghost btn--sm"
              onClick={openAdd}
              style={{ color: 'var(--ink-3)', fontSize: 13 }}
            >
              <Plus size={13} /> Thêm cảng mới
            </button>
          </div>
        )}
      </div>

      {items.length > 0 && (
        <div style={{ marginTop: 8, fontSize: 12, color: 'var(--ink-4)', paddingLeft: 4 }}>
          {items.length} cảng / bãi
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
