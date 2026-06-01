import { useState, useEffect, useMemo } from 'react';
import {
  Users, UserCheck, Plus, Download, Search,
  MoreHorizontal, Pencil, Trash2, X, Save, Loader2,
} from 'lucide-react';
import { useConfirm } from '../components/UI';
import { api } from '../lib/api';
import { downloadCSV } from '../lib/csv';
import { PageHeader, KPI, FilterPill, StatusPill, Modal } from '../components/UI';
import type { Supplier, PaginatedResponse } from '@nepocorp/shared';
import { CONFIG } from '@nepocorp/shared';
import { useSuppliers } from '../hooks/useQueries';

type FilterKey = 'all' | 'active' | 'inactive';

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Hoạt động',
  INACTIVE: 'Ngừng hoạt động',
};

function SupplierFormModal({ item, saving, onsave, oncancel, isOpen }: {
  item?: Supplier; saving: boolean; onsave: (d: Record<string, unknown>) => void; oncancel: () => void; isOpen: boolean;
}) {
  const [name, setName] = useState(item?.name || '');
  const [contactPerson, setContactPerson] = useState(item?.contactPerson || '');
  const [phone, setPhone] = useState(item?.phone || '');
  const [taxCode, setTaxCode] = useState(item?.taxCode || '');
  const [note, setNote] = useState(item?.note || '');
  const [status, setStatus] = useState<string>(item?.status || 'ACTIVE');

  useEffect(() => {
    if (isOpen) {
      setName(item?.name || '');
      setContactPerson(item?.contactPerson || '');
      setPhone(item?.phone || '');
      setTaxCode(item?.taxCode || '');
      setNote(item?.note || '');
      setStatus(item?.status || 'ACTIVE');
    }
  }, [isOpen, item?.id]);

  const handleSave = () => {
    if (!name.trim()) return;
    onsave({
      name: name.trim(),
      contactPerson: contactPerson.trim() || undefined,
      phone: phone.trim() || undefined,
      taxCode: taxCode.trim() || undefined,
      note: note.trim() || undefined,
      status,
    });
  };
  const labelStyle = { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 6 } as const;

  return (
    <Modal
      isOpen={isOpen}
      title={item ? `Sửa nhà cung cấp — ${item.name}` : 'Thêm nhà cung cấp'}
      onClose={oncancel}
      onConfirm={handleSave}
      footer={
        <>
          <button className="btn btn--ghost btn--sm" onClick={oncancel}>
            <X size={14} /> Hủy
          </button>
          <button className="btn btn--primary btn--sm" disabled={saving || !name.trim()} onClick={handleSave}>
            {saving ? <Loader2 size={14} className="spin" /> : <Save size={14} />}
            {item ? 'Cập nhật' : 'Thêm nhà cung cấp'}
          </button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="field">
          <label htmlFor="supp-name" style={labelStyle}>
            Tên nhà cung cấp <span style={{ color: 'var(--danger)' }}>*</span>
          </label>
          <input id="supp-name" className="input" value={name} onChange={e => setName(e.target.value)} placeholder="VD: Garage Auto 123" autoFocus />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="field">
            <label htmlFor="supp-tax" style={labelStyle}>Mã số thuế</label>
            <input id="supp-tax" className="input" value={taxCode} onChange={e => setTaxCode(e.target.value)} placeholder="0312…" />
          </div>
          <div className="field">
            <label htmlFor="supp-status" style={labelStyle}>Trạng thái</label>
            <select id="supp-status" className="input" value={status} onChange={e => setStatus(e.target.value)}>
              {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="field">
            <label htmlFor="supp-contact" style={labelStyle}>Người liên hệ</label>
            <input id="supp-contact" className="input" value={contactPerson} onChange={e => setContactPerson(e.target.value)} placeholder="Anh Tuấn · Kế toán" />
          </div>
          <div className="field">
            <label htmlFor="supp-phone" style={labelStyle}>Điện thoại</label>
            <input id="supp-phone" className="input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="0912…" />
          </div>
        </div>
        <div className="field">
          <label htmlFor="supp-note" style={labelStyle}>Ghi chú</label>
          <input id="supp-note" className="input" value={note} onChange={e => setNote(e.target.value)} placeholder="Ghi chú thêm…" />
        </div>
      </div>
    </Modal>
  );
}

export default function SupplierListPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null);

  const pageSize = 10;
  const { confirm, dialog: confirmDialog } = useConfirm();

  const { data: suppliersData, isLoading: loading, error: queryError, refetch: refetchSuppliers } = useSuppliers(page, search);
  const suppliers = suppliersData?.items ?? [];
  const total = suppliersData?.total ?? 0;
  const [mutationError, setMutationError] = useState<string | null>(null);
  const error = queryError ? 'Không thể tải dữ liệu' : mutationError;

  useEffect(() => {
    if (search === '') { setPage(1); return; }
    const t = setTimeout(() => setPage(1), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { activeCount, inactiveCount, filtered } = useMemo(() => {
    const activeCount = suppliers.filter(s => s.status === 'ACTIVE').length;
    const inactiveCount = suppliers.filter(s => s.status !== 'ACTIVE').length;
    const filtered = suppliers.filter(s => {
      if (filter === 'active') return s.status === 'ACTIVE';
      if (filter === 'inactive') return s.status !== 'ACTIVE';
      return true;
    });
    return { activeCount, inactiveCount, filtered };
  }, [suppliers, filter]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  async function doCreate(body: Record<string, unknown>) {
    setSaving(true);
    try {
      await api.post(CONFIG.SUPPLIERS, body);
      setShowAddForm(false);
      await refetchSuppliers();
    } catch (e: unknown) { setMutationError(e instanceof Error ? e.message : 'Lỗi lưu'); } finally { setSaving(false); }
  }

  async function doUpdate(id: number, body: Record<string, unknown>) {
    setSaving(true);
    try {
      await api.put(CONFIG.SUPPLIER(id), body);
      setEditingId(null);
      setMenuOpenId(null);
      await refetchSuppliers();
    } catch (e: unknown) { setMutationError(e instanceof Error ? e.message : 'Lỗi cập nhật'); } finally { setSaving(false); }
  }

  async function doDelete(id: number) {
    if (!await confirm('Bạn có chắc chắn muốn xóa?', { variant: 'danger' })) return;
    setDeleting(id);
    try {
      await api.delete(CONFIG.SUPPLIER(id));
      setMenuOpenId(null);
      await refetchSuppliers();
    } catch (e: unknown) { setMutationError(e instanceof Error ? e.message : 'Lỗi xóa'); } finally { setDeleting(null); }
  }

  return (
    <div className="fade-up">
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } .spin { animation: spin 0.8s linear infinite; }`}</style>

      <PageHeader
        title="Nhà cung cấp"
        description={`${total} nhà cung cấp đang quản lý`}
        action={
          <>
            <button className="btn btn--secondary" onClick={() => {
              const headers = ['Tên NCC', 'Người liên hệ', 'Điện thoại', 'MST', 'Trạng thái'];
              const rows = filtered.map(s => [
                s.name,
                s.contactPerson || '',
                s.phone || '',
                s.taxCode || '',
                STATUS_LABELS[s.status] || s.status,
              ]);
              downloadCSV(`nha-cung-cap-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
            }}>
              <Download size={14} /> Xuất Excel
            </button>
            <button className="btn btn--primary" onClick={() => { setShowAddForm(true); setEditingId(null); }}>
              <Plus size={14} /> Thêm nhà cung cấp
            </button>
          </>
        }
      />

      <div className="kpi-grid">
        <KPI
          label="Tổng nhà cung cấp"
          value={total}
          icon={Users}
          meta={<span>{total} nhà cung cấp</span>}
        />
        <KPI
          label="Đang hoạt động"
          value={`${activeCount}`}
          unit={`/ ${total}`}
          variant="success"
          icon={UserCheck}
          meta={total > 0 ? `${activeCount}/${total} đang hoạt động` : ''}
        />
      </div>

      <div className="toolbar">
        <FilterPill active={filter === 'all'} onClick={() => setFilter('all')}>Tất cả · {total}</FilterPill>
        <FilterPill active={filter === 'active'} onClick={() => setFilter('active')}>Hoạt động · {activeCount}</FilterPill>
        <FilterPill active={filter === 'inactive'} onClick={() => setFilter('inactive')}>Ngừng HD · {inactiveCount}</FilterPill>
        <div style={{ flex: 1 }} />
        <div style={{ position: 'relative', width: 240 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)' }} />
          <input
            type="text"
            placeholder="Tìm theo tên…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '7px 11px 7px 32px', background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 8, fontSize: 12.5 }}
          />
        </div>
      </div>

      <div className="mobile-only mobile-table-wrap">
        <div className="m-card-list">
          {loading ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--ink-3)' }}>Đang tải…</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--ink-3)' }}>Chưa có dữ liệu</div>
          ) : (
            filtered.map(s => (
              <div key={s.id} className="m-card">
                <div className="m-card__top">
                  <span className="m-card__title">{s.name}</span>
                  <StatusPill variant={s.status === 'ACTIVE' ? 'success' : 'danger'}>
                    {STATUS_LABELS[s.status] || s.status}
                  </StatusPill>
                </div>
                {s.contactPerson && (
                  <div className="m-card__meta">
                    {s.contactPerson}
                    {s.phone && <><span className="m-card__meta-sep">·</span>{s.phone}</>}
                  </div>
                )}
                {s.taxCode && (
                  <div className="m-card__meta" style={{ fontFamily: 'var(--font-mono)' }}>
                    MST {s.taxCode}
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginTop: 8 }}>
                  <button className="btn btn--ghost btn--sm" onClick={() => { setEditingId(s.id); setShowAddForm(false); }}>
                    Sửa
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="table-foot">
          <span>Hiển thị <strong style={{ fontFamily: 'var(--font-mono)' }}>{filtered.length}</strong> nhà cung cấp</span>
        </div>
      </div>

      <div className="desktop-only table-wrap">
        <div className="table-scroll">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 800 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '11px 12px', background: 'var(--surface-2)', borderBottom: '1px solid var(--line)', fontSize: 10.5, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>Tên</th>
                <th style={{ textAlign: 'left', padding: '11px 12px', background: 'var(--surface-2)', borderBottom: '1px solid var(--line)', fontSize: 10.5, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>Người liên hệ</th>
                <th style={{ textAlign: 'left', padding: '11px 12px', background: 'var(--surface-2)', borderBottom: '1px solid var(--line)', fontSize: 10.5, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>SĐT</th>
                <th style={{ textAlign: 'left', padding: '11px 12px', background: 'var(--surface-2)', borderBottom: '1px solid var(--line)', fontSize: 10.5, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)' }}>Mã số thuế</th>
                <th style={{ textAlign: 'left', padding: '11px 12px', background: 'var(--surface-2)', borderBottom: '1px solid var(--line)', fontSize: 10.5, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>Trạng thái</th>
                <th style={{ width: 60 }}></th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--ink-3)' }}>
                  <Loader2 size={22} className="spin" style={{ display: 'inline-block', marginBottom: 8 }} />
                  <p style={{ fontSize: 13 }}>Đang tải…</p>
                </td></tr>
              )}
              {error && (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--danger)' }}>
                  <p>{error}</p>
                  <button className="btn btn--secondary btn--sm" style={{ marginTop: 8 }} onClick={() => refetchSuppliers()}>Thử lại</button>
                </td></tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--ink-3)' }}>Chưa có dữ liệu</td></tr>
              )}
              {filtered.map(s => (
                  <tr key={s.id} style={{ transition: 'background 0.12s ease', cursor: 'pointer' }}
                    onClick={() => { setEditingId(s.id); setShowAddForm(false); setMenuOpenId(null); }} role="button" tabIndex={0} onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); { setEditingId(s.id); setShowAddForm(false); setMenuOpenId(null);} } }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}
                  >
                    <td style={{ padding: 12, borderBottom: '1px solid var(--line)', verticalAlign: 'middle', whiteSpace: 'nowrap', fontWeight: 600 }}>
                      {s.name}
                    </td>
                    <td style={{ padding: 12, borderBottom: '1px solid var(--line)', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                      {s.contactPerson || <span style={{ color: 'var(--ink-3)' }}>—</span>}
                    </td>
                    <td style={{ padding: 12, borderBottom: '1px solid var(--line)', verticalAlign: 'middle', whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                      {s.phone || <span style={{ color: 'var(--ink-3)' }}>—</span>}
                    </td>
                    <td style={{ padding: 12, borderBottom: '1px solid var(--line)', verticalAlign: 'middle', whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                      {s.taxCode || <span style={{ color: 'var(--ink-3)' }}>—</span>}
                    </td>
                    <td style={{ padding: 12, borderBottom: '1px solid var(--line)', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                      <StatusPill variant={s.status === 'ACTIVE' ? 'success' : 'danger'}>
                        {STATUS_LABELS[s.status] || s.status}
                      </StatusPill>
                    </td>
                    <td style={{ padding: 12, borderBottom: '1px solid var(--line)', verticalAlign: 'middle', position: 'relative' }}>
                      <div className="row-actions">
                        <button className="row-action" onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === s.id ? null : s.id); }}>
                          <MoreHorizontal size={14} />
                        </button>
                      </div>
                      {menuOpenId === s.id && (
                        <div style={{
                          position: 'absolute', right: 12, top: '100%', zIndex: 20,
                          background: '#fff', border: '1px solid var(--line)', borderRadius: 8,
                          boxShadow: '0 4px 14px rgba(10,10,10,0.06)', overflow: 'hidden', minWidth: 140,
                        }} onClick={(e) => e.stopPropagation()}>
                          <button style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 12px', fontSize: 12.5, border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', color: 'var(--ink)' }}
                            onClick={() => { setEditingId(s.id); setShowAddForm(false); }}>
                            <Pencil size={13} /> Sửa
                          </button>
                          <button style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 12px', fontSize: 12.5, border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', color: 'var(--danger)' }}
                            disabled={deleting === s.id}
                            onClick={() => doDelete(s.id)}>
                            {deleting === s.id ? <Loader2 size={13} className="spin" /> : <Trash2 size={13} />} Xoá
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="table-foot">
          <span>Đang hiển thị <strong style={{ color: 'var(--ink)', fontFamily: 'var(--font-mono)' }}>{((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, total)}</strong> trên <strong style={{ color: 'var(--ink)', fontFamily: 'var(--font-mono)' }}>{total}</strong> nhà cung cấp</span>
          <div className="pagination">
            <button className="page-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>‹</button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const p = i + 1;
              return <button key={p} className={`page-btn${p === page ? ' is-active' : ''}`} onClick={() => setPage(p)}>{p}</button>;
            })}
            <button className="page-btn" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>›</button>
          </div>
        </div>
      </div>

      <SupplierFormModal
        key={editingId ?? (showAddForm ? 'add' : 'closed')}
        isOpen={showAddForm || editingId != null}
        saving={saving}
        item={editingId != null ? suppliers.find(s => s.id === editingId) : undefined}
        onsave={d => {
          if (editingId != null) doUpdate(editingId, d);
          else doCreate(d);
        }}
        oncancel={() => { setEditingId(null); setShowAddForm(false); }}
      />
    {confirmDialog}
    </div>
  );
}
