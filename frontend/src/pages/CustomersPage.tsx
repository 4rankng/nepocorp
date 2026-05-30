import { useState, useEffect, useCallback } from 'react';
import {
  Users, UserCheck, BarChart3, Lock, Plus, Download, Search,
  MoreHorizontal, Pencil, Trash2, X, Save, Loader2,
} from 'lucide-react';
import { api } from '../lib/api';
import { PageHeader, KPI, FilterPill, StatusPill } from '../components/UI';
import { formatCurrency } from '../lib/format';
import type { Customer, PaginatedResponse } from '@nepocorp/shared';
import { CustomerStatus } from '@nepocorp/shared';

type FilterKey = 'all' | 'locked' | 'active' | 'risk';

const STATUS_LABELS: Record<string, string> = {
  [CustomerStatus.ACTIVE]: 'Hoạt động',
  [CustomerStatus.LOCKED]: 'Tạm khoá',
};

function riskDot(debt: number | null, limit: number | null) {
  if (!debt || !limit || limit === 0) return 'low';
  const ratio = debt / limit;
  if (ratio > 1) return 'high';
  if (ratio > 0.7) return 'med';
  return 'low';
}

// ─── Inline Form ──────────────────────────────────────────────────────────────

function CustomerForm({ item, saving, onsave, oncancel }: {
  item?: Customer; saving: boolean; onsave: (d: Record<string, unknown>) => void; oncancel: () => void;
}) {
  const [name, setName] = useState(item?.name || '');
  const [taxCode, setTaxCode] = useState((item as any)?.taxCode || (item as any)?.tax_code || '');
  const [contactPerson, setContactPerson] = useState((item as any)?.contactPerson || (item as any)?.contact_person || '');
  const [phone, setPhone] = useState(item?.phone || '');
  const [creditLimit, setCreditLimit] = useState((item as any)?.creditLimit || (item as any)?.credit_limit || '');
  const [status, setStatus] = useState<string>(item?.status || CustomerStatus.ACTIVE);

  return (
    <tr>
      <td colSpan={8} style={{ background: 'var(--accent-soft)', padding: '12px 16px' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 2, minWidth: 160 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-2)', display: 'block', marginBottom: 4 }}>Tên khách hàng</label>
            <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Nhập tên..." style={{ width: '100%' }} />
          </div>
          <div style={{ flex: 1, minWidth: 120 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-2)', display: 'block', marginBottom: 4 }}>MST</label>
            <input className="input" value={taxCode} onChange={e => setTaxCode(e.target.value)} placeholder="0312..." style={{ width: '100%' }} />
          </div>
          <div style={{ flex: 1, minWidth: 120 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-2)', display: 'block', marginBottom: 4 }}>Người liên hệ</label>
            <input className="input" value={contactPerson} onChange={e => setContactPerson(e.target.value)} placeholder="Anh Tuấn · KT" style={{ width: '100%' }} />
          </div>
          <div style={{ flex: 1, minWidth: 110 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-2)', display: 'block', marginBottom: 4 }}>Điện thoại</label>
            <input className="input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="0912..." style={{ width: '100%' }} />
          </div>
          <div style={{ flex: 1, minWidth: 120 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-2)', display: 'block', marginBottom: 4 }}>Hạn mức TD</label>
            <input className="input" type="number" value={creditLimit} onChange={e => setCreditLimit(e.target.value)} placeholder="0" style={{ width: '100%' }} />
          </div>
          <div style={{ flex: 1, minWidth: 100 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-2)', display: 'block', marginBottom: 4 }}>Trạng thái</label>
            <select className="input" value={status} onChange={e => setStatus(e.target.value)} style={{ width: '100%' }}>
              {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 6, paddingBottom: 4 }}>
            <button className="btn btn--primary btn--sm" disabled={saving || !name.trim()} onClick={() => onsave({ name: name.trim(), tax_code: taxCode.trim() || undefined, contact_person: contactPerson.trim() || undefined, phone: phone.trim() || undefined, credit_limit: creditLimit ? Number(creditLimit) : undefined, status })}>
              {saving ? <Loader2 size={12} className="spin" /> : <Save size={12} />}
              {item ? 'Cập nhật' : 'Thêm'}
            </button>
            <button className="btn btn--ghost btn--sm" onClick={oncancel}>
              <X size={12} /> Hủy
            </button>
          </div>
        </div>
      </td>
    </tr>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null);

  const pageSize = 10;

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ page: String(page), limit: String(pageSize) });
      if (search) qs.set('search', search);
      const r = await api.get<PaginatedResponse<Customer>>(`/customers?${qs}`);
      setCustomers(r.items);
      setTotal(r.total);
    } catch {
      setError('Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  // Debounced search
  useEffect(() => {
    if (search === '') { setPage(1); return; }
    const t = setTimeout(() => setPage(1), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Computed KPI values
  const activeCount = customers.filter(c => c.status === CustomerStatus.ACTIVE).length;
  const lockedCount = customers.filter(c => c.status === CustomerStatus.LOCKED).length;

  // Filtered list
  const filtered = customers.filter(c => {
    if (filter === 'active') return c.status === CustomerStatus.ACTIVE;
    if (filter === 'locked') return c.status === CustomerStatus.LOCKED;
    if (filter === 'risk') {
      const debt = 0; // TODO: compute from ledger
      const limit = Number((c as any).creditLimit || c.credit_limit || 0);
      return limit > 0 && debt / limit > 0.8;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  async function doCreate(body: Record<string, unknown>) {
    setSaving(true);
    try {
      await api.post('/customers', body);
      setShowAddForm(false);
      await fetchCustomers();
    } catch (e: any) { setError(e?.message || 'Lỗi lưu'); } finally { setSaving(false); }
  }

  async function doUpdate(id: number, body: Record<string, unknown>) {
    setSaving(true);
    try {
      await api.put(`/customers/${id}`, body);
      setEditingId(null);
      setMenuOpenId(null);
      await fetchCustomers();
    } catch (e: any) { setError(e?.message || 'Lỗi cập nhật'); } finally { setSaving(false); }
  }

  async function doDelete(id: number) {
    setDeleting(id);
    try {
      await api.delete(`/customers/${id}`);
      setMenuOpenId(null);
      await fetchCustomers();
    } catch (e: any) { setError(e?.message || 'Lỗi xóa'); } finally { setDeleting(null); }
  }

  return (
    <div className="fade-up">
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } .spin { animation: spin 0.8s linear infinite; }`}</style>

      <PageHeader
        title="Khách hàng"
        description={`${total} khách hàng đang quản lý`}
        action={
          <>
            <button className="btn btn--secondary">
              <Download size={14} /> Xuất Excel
            </button>
            <button className="btn btn--primary" onClick={() => { setShowAddForm(true); setEditingId(null); }}>
              <Plus size={14} /> Thêm khách hàng
            </button>
          </>
        }
      />

      {/* KPI strip */}
      <div className="kpi-grid">
        <KPI
          label="Tổng khách hàng"
          value={total}
          icon={Users}
          meta={<span>{total} khách hàng</span>}
        />
        <KPI
          label="Đang hoạt động"
          value={`${activeCount}`}
          unit={`/ ${total}`}
          variant="success"
          icon={UserCheck}
          meta={total > 0 ? `${Math.round((activeCount / total) * 100)}% hoạt động đều` : ''}
        />
        <KPI
          label="Top 4 chiếm"
          value="—"
          variant="warn"
          icon={BarChart3}
          meta="Chưa có dữ liệu doanh thu"
        />
        <KPI
          label="Tạm khoá"
          value={lockedCount}
          variant="danger"
          icon={Lock}
          meta="Do nợ quá hạn"
        />
      </div>

      {/* Toolbar with filter pills */}
      <div className="toolbar">
        <FilterPill active={filter === 'all'} onClick={() => setFilter('all')}>Tất cả · {total}</FilterPill>
        <FilterPill active={filter === 'risk'} onClick={() => setFilter('risk')}>Rủi ro cao</FilterPill>
        <FilterPill active={filter === 'active'} onClick={() => setFilter('active')}>Hoạt động · {activeCount}</FilterPill>
        <FilterPill active={filter === 'locked'} onClick={() => setFilter('locked')}>Tạm khoá · {lockedCount}</FilterPill>
        <div style={{ flex: 1 }} />
        <div style={{ position: 'relative', width: 240 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)' }} />
          <input
            type="text"
            placeholder="Tìm theo tên, MST..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '7px 11px 7px 32px', background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 8, fontSize: 12.5 }}
          />
        </div>
      </div>

      {/* ── Mobile card list (≤640px) ──────────────────────────────────── */}
      <div className="mobile-only mobile-table-wrap">
        <div className="m-card-list">
          {loading ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--ink-3)' }}>Đang tải...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--ink-3)' }}>Chưa có dữ liệu</div>
          ) : (
            filtered.map(c => (
              <div key={c.id} className="m-card">
                <div className="m-card__top">
                  <span className="m-card__title">
                    <span className={`risk-dot risk-dot--${riskDot(0, Number((c as any).creditLimit || c.credit_limit || 0))}`} />
                    {c.name}
                  </span>
                  <StatusPill variant={c.status === CustomerStatus.ACTIVE ? 'success' : 'danger'}>
                    {STATUS_LABELS[c.status] || c.status}
                  </StatusPill>
                </div>
                {((c as any).taxCode || c.tax_code) && (
                  <div className="m-card__meta" style={{ fontFamily: 'var(--font-mono)' }}>
                    MST {(c as any).taxCode || c.tax_code}
                  </div>
                )}
                {((c as any).contactPerson || c.contact_person || c.phone) && (
                  <div className="m-card__meta">
                    {(c as any).contactPerson || c.contact_person}
                    {c.phone && <><span className="m-card__meta-sep">·</span>{c.phone}</>}
                  </div>
                )}
                {((c as any).creditLimit || c.credit_limit) && (
                  <div className="m-card__row">
                    <span className="m-card__row-label">Hạn mức tín dụng</span>
                    <span className="m-card__row-value">{formatCurrency((c as any).creditLimit || c.credit_limit)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginTop: 8 }}>
                  <button className="btn btn--ghost btn--sm" onClick={() => { setEditingId(c.id); setShowAddForm(false); }}>
                    Sửa
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="table-foot">
          <span>Hiển thị <strong style={{ fontFamily: 'var(--font-mono)' }}>{filtered.length}</strong> khách hàng</span>
        </div>
      </div>

      {/* ── Desktop table (>640px) ──────────────────────────────────────── */}
      <div className="desktop-only table-wrap">
        <div className="table-scroll">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 900 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '11px 12px', background: 'var(--surface-2)', borderBottom: '1px solid var(--line)', fontSize: 10.5, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>Khách hàng</th>
                <th style={{ textAlign: 'left', padding: '11px 12px', background: 'var(--surface-2)', borderBottom: '1px solid var(--line)', fontSize: 10.5, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>Liên hệ</th>
                <th style={{ textAlign: 'right', padding: '11px 12px', background: 'var(--surface-2)', borderBottom: '1px solid var(--line)', fontSize: 10.5, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)' }}>Hạn mức TD</th>
                <th style={{ textAlign: 'left', padding: '11px 12px', background: 'var(--surface-2)', borderBottom: '1px solid var(--line)', fontSize: 10.5, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>Trạng thái</th>
                <th style={{ width: 60 }}></th>
              </tr>
            </thead>
            <tbody>
              {showAddForm && !editingId && (
                <CustomerForm saving={saving} onsave={doCreate} oncancel={() => setShowAddForm(false)} />
              )}
              {loading && (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 32, color: 'var(--ink-3)' }}>
                  <Loader2 size={22} className="spin" style={{ display: 'inline-block', marginBottom: 8 }} />
                  <p style={{ fontSize: 13 }}>Đang tải...</p>
                </td></tr>
              )}
              {error && (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 32, color: 'var(--danger)' }}>
                  <p>{error}</p>
                  <button className="btn btn--secondary btn--sm" style={{ marginTop: 8 }} onClick={fetchCustomers}>Thử lại</button>
                </td></tr>
              )}
              {!loading && filtered.length === 0 && !showAddForm && (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 32, color: 'var(--ink-3)' }}>Chưa có dữ liệu</td></tr>
              )}
              {filtered.map(c => editingId === c.id
                ? <CustomerForm key={`edit-${c.id}`} item={c} saving={saving} onsave={d => doUpdate(c.id, d)} oncancel={() => setEditingId(null)} />
                : (
                  <tr key={c.id} style={{ transition: 'background 0.12s ease', cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}
                  >
                    <td style={{ padding: 12, borderBottom: '1px solid var(--line)', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                      <div style={{ fontWeight: 600 }}>
                        <span className={`risk-dot risk-dot--${riskDot(0, Number((c as any).creditLimit || c.credit_limit || 0))}`} />
                        {c.name}
                      </div>
                      {((c as any).taxCode || c.tax_code) && <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>MST {(c as any).taxCode || c.tax_code}</div>}
                    </td>
                    <td style={{ padding: 12, borderBottom: '1px solid var(--line)', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                      {((c as any).contactPerson || c.contact_person) && <div style={{ fontWeight: 600 }}>{(c as any).contactPerson || c.contact_person}</div>}
                      {/* Seed data stored phone numbers in the `contact_info`
                          text field rather than the dedicated `phone` column,
                          so fall through to that before rendering "—". */}
                      {(c.phone || (c as any).contact_info || (c as any).contactInfo) && (
                        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
                          {c.phone || (c as any).contact_info || (c as any).contactInfo}
                        </div>
                      )}
                      {!((c as any).contactPerson || c.contact_person) && !c.phone && !(c as any).contact_info && !(c as any).contactInfo && <span style={{ color: 'var(--ink-3)' }}>—</span>}
                    </td>
                    <td style={{ padding: 12, borderBottom: '1px solid var(--line)', verticalAlign: 'middle', whiteSpace: 'nowrap', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                      {((c as any).creditLimit || c.credit_limit) ? formatCurrency((c as any).creditLimit || c.credit_limit) : '—'}
                    </td>
                    <td style={{ padding: 12, borderBottom: '1px solid var(--line)', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                      <StatusPill variant={c.status === CustomerStatus.ACTIVE ? 'success' : 'danger'}>
                        {STATUS_LABELS[c.status] || c.status}
                      </StatusPill>
                    </td>
                    <td style={{ padding: 12, borderBottom: '1px solid var(--line)', verticalAlign: 'middle', position: 'relative' }}>
                      <div className="row-actions">
                        <button className="row-action" onClick={() => setMenuOpenId(menuOpenId === c.id ? null : c.id)}>
                          <MoreHorizontal size={14} />
                        </button>
                      </div>
                      {menuOpenId === c.id && (
                        <div style={{
                          position: 'absolute', right: 12, top: '100%', zIndex: 20,
                          background: '#fff', border: '1px solid var(--line)', borderRadius: 8,
                          boxShadow: '0 4px 14px rgba(10,10,10,0.06)', overflow: 'hidden', minWidth: 140,
                        }}>
                          <button style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 12px', fontSize: 12.5, border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', color: 'var(--ink)' }}
                            onClick={() => { setEditingId(c.id); setShowAddForm(false); }}>
                            <Pencil size={13} /> Sửa
                          </button>
                          <button style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 12px', fontSize: 12.5, border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', color: 'var(--danger)' }}
                            disabled={deleting === c.id}
                            onClick={() => doDelete(c.id)}>
                            {deleting === c.id ? <Loader2 size={13} className="spin" /> : <Trash2 size={13} />} Xoá
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>

        {/* Table footer with pagination */}
        <div className="table-foot">
          <span>Đang hiển thị <strong style={{ color: 'var(--ink)', fontFamily: 'var(--font-mono)' }}>{((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, total)}</strong> trên <strong style={{ color: 'var(--ink)', fontFamily: 'var(--font-mono)' }}>{total}</strong> khách hàng</span>
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
    </div>
  );
}
