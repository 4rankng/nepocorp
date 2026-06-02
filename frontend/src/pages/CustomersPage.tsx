import { useState, useEffect, useMemo } from 'react';
import {
  Users, UserCheck, BarChart3, Lock, Plus, Download, Search,
  MoreHorizontal, Pencil, Trash2, X, Save, Loader2,
} from 'lucide-react';
import { api } from '../lib/api';
import { downloadCSV } from '../lib/csv';
import { PageHeader, KPI, FilterPill, StatusPill, Modal } from '../components/UI';
import { formatCurrency, formatCompact } from '../lib/format';
import type { Customer, PaginatedResponse } from '@nepocorp/shared';
import { CustomerStatus } from '@nepocorp/shared';
import { useCustomers, useCustomerLedgerEntries } from '../hooks/useQueries';

type FilterKey = 'all' | 'locked' | 'active' | 'risk';

const STATUS_LABELS: Record<string, string> = {
  [CustomerStatus.ACTIVE]: 'Hoạt động',
  [CustomerStatus.LOCKED]: 'Tạm khoá',
};

function riskDot(debt: number | null, limit: number | null) {
  if (!debt || !limit || limit === 0) return 'low';
  const ratio = debt / limit;
  if (ratio > 0.8) return 'high';
  if (ratio >= 0.5) return 'med';
  return 'low';
}

// ─── Modal-based Form ────────────────────────────────────────────────────────
//
// Was an inline <tr> form that swapped in for the row. The row-replacement
// looked cramped (5 fields squeezed into one table cell) and made it easy to
// miss that edit mode had even opened. Modal gives proper breathing room.

function CustomerFormModal({ item, saving, onsave, oncancel, isOpen }: {
  item?: Customer; saving: boolean; onsave: (d: Record<string, unknown>) => void; oncancel: () => void; isOpen: boolean;
}) {
  const [name, setName] = useState(item?.name || '');
  const [taxCode, setTaxCode] = useState((item as any)?.taxCode || (item as any)?.tax_code || '');
  const [contactPerson, setContactPerson] = useState((item as any)?.contactPerson || (item as any)?.contact_person || '');
  const [phone, setPhone] = useState(item?.phone || '');
  const [creditLimit, setCreditLimit] = useState((item as any)?.creditLimit || (item as any)?.credit_limit || '');
  const [status, setStatus] = useState<string>(item?.status || CustomerStatus.ACTIVE);

  useEffect(() => {
    if (isOpen) {
      setName(item?.name || '');
      setTaxCode((item as any)?.taxCode || (item as any)?.tax_code || '');
      setContactPerson((item as any)?.contactPerson || (item as any)?.contact_person || '');
      setPhone(item?.phone || '');
      setCreditLimit((item as any)?.creditLimit || (item as any)?.credit_limit || '');
      setStatus(item?.status || CustomerStatus.ACTIVE);
    }
  }, [isOpen, item?.id]);

  const handleSave = () => {
    if (!name.trim()) return;
    onsave({
      name: name.trim(),
      taxCode: taxCode.trim() || undefined,
      contactPerson: contactPerson.trim() || undefined,
      phone: phone.trim() || undefined,
      creditLimit: creditLimit ? Number(creditLimit) : undefined,
      status,
    });
  };

  const labelStyle = { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 6 } as const;

  return (
    <Modal
      isOpen={isOpen}
      title={item ? `Sửa khách hàng — ${item.name}` : 'Thêm khách hàng'}
      onClose={oncancel}
      onConfirm={handleSave}
      footer={
        <>
          <button className="btn btn--ghost btn--sm" onClick={oncancel}>
            <X size={14} /> Hủy
          </button>
          <button className="btn btn--primary btn--sm" disabled={saving || !name.trim()} onClick={handleSave}>
            {saving ? <Loader2 size={14} className="spin" /> : <Save size={14} />}
            {item ? 'Cập nhật' : 'Thêm khách hàng'}
          </button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="field">
          <label htmlFor="cust-name" style={labelStyle}>
            Tên khách hàng <span style={{ color: 'var(--danger)' }}>*</span>
          </label>
          <input id="cust-name" className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Tên công ty hoặc cá nhân" autoFocus />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="field">
            <label htmlFor="cust-tax" style={labelStyle}>Mã số thuế</label>
            <input id="cust-tax" className="input" value={taxCode} onChange={e => setTaxCode(e.target.value)} placeholder="0312…" />
          </div>
          <div className="field">
            <label htmlFor="cust-status" style={labelStyle}>Trạng thái</label>
            <select id="cust-status" className="input" value={status} onChange={e => setStatus(e.target.value)}>
              {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="field">
            <label htmlFor="cust-contact" style={labelStyle}>Người liên hệ</label>
            <input id="cust-contact" className="input" value={contactPerson} onChange={e => setContactPerson(e.target.value)} placeholder="Anh Tuấn · Kế toán" />
          </div>
          <div className="field">
            <label htmlFor="cust-phone" style={labelStyle}>Điện thoại</label>
            <input id="cust-phone" className="input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="0912…" />
          </div>
        </div>
        <div className="field">
          <label htmlFor="cust-credit" style={labelStyle}>Hạn mức tín dụng (đ)</label>
          <input id="cust-credit" className="input" type="number" value={creditLimit} onChange={e => setCreditLimit(e.target.value)} placeholder="0" />
        </div>
      </div>
    </Modal>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CustomersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null);

  const pageSize = 10;

  const { data: customersData, isLoading: loading, error: queryError, refetch: refetchCustomers } = useCustomers(page, search);
  const { data: ledgerEntries } = useCustomerLedgerEntries();
  const customers = customersData?.items ?? [];
  const total = customersData?.total ?? 0;
  const [mutationError, setMutationError] = useState<string | null>(null);
  const error = queryError ? 'Không thể tải dữ liệu' : mutationError;

  const debtMap = useMemo(() => {
    const map = new Map<number, number>();
    if (!ledgerEntries) return map;
    const byCustomer = new Map<number, { balance: string }>();
    for (const entry of ledgerEntries) {
      if (entry.entityType === 'CUSTOMER' && !byCustomer.has(entry.entityId)) {
        byCustomer.set(entry.entityId, entry);
      }
    }
    for (const [id, entry] of byCustomer) {
      map.set(id, parseFloat(entry.balance));
    }
    return map;
  }, [ledgerEntries]);

  const revenueMap = useMemo(() => {
    const map = new Map<number, number>();
    if (!ledgerEntries) return map;
    for (const entry of ledgerEntries) {
      if (entry.entityType === 'CUSTOMER' && (entry as any).txnType === 'TRIP_REVENUE') {
        const current = map.get(entry.entityId) || 0;
        const amount = parseFloat(entry.debit || '0') || 0;
        map.set(entry.entityId, current + amount);
      }
    }
    return map;
  }, [ledgerEntries]);

  const top4Revenue = useMemo(() => {
    const customerRevenues = customers
      .map(c => ({ id: c.id, name: c.name, revenue: revenueMap.get(c.id) || 0 }))
      .filter(c => c.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 4);
    const totalRevenue = customerRevenues.reduce((s, c) => s + c.revenue, 0);
    return { customers: customerRevenues, total: totalRevenue };
  }, [customers, revenueMap]);

  useEffect(() => {
    if (search === '') { setPage(1); return; }
    const t = setTimeout(() => setPage(1), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { activeCount, lockedCount, filtered } = useMemo(() => {
    const activeCount = customers.filter(c => c.status === CustomerStatus.ACTIVE).length;
    const lockedCount = customers.filter(c => c.status === CustomerStatus.LOCKED).length;
    const filtered = customers.filter(c => {
      if (filter === 'active') return c.status === CustomerStatus.ACTIVE;
      if (filter === 'locked') return c.status === CustomerStatus.LOCKED;
      if (filter === 'risk') {
        const debt = debtMap.get(c.id) ?? 0;
        const limit = Number((c as any).creditLimit || c.creditLimit || 0);
        return limit > 0 && debt / limit > 0.8;
      }
      return true;
    });
    return { activeCount, lockedCount, filtered };
  }, [customers, filter, debtMap]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  async function doCreate(body: Record<string, unknown>) {
    setSaving(true);
    try {
      await api.post('/customers', body);
      setShowAddForm(false);
      await refetchCustomers();
    } catch (e: any) { setMutationError(e?.message || 'Lỗi lưu'); } finally { setSaving(false); }
  }

  async function doUpdate(id: number, body: Record<string, unknown>) {
    setSaving(true);
    try {
      await api.put(`/customers/${id}`, body);
      setEditingId(null);
      setMenuOpenId(null);
      await refetchCustomers();
    } catch (e: any) { setMutationError(e?.message || 'Lỗi cập nhật'); } finally { setSaving(false); }
  }

  async function doDelete(id: number) {
    setDeleting(id);
    try {
      await api.delete(`/customers/${id}`);
      setMenuOpenId(null);
      await refetchCustomers();
    } catch (e: any) { setMutationError(e?.message || 'Lỗi xóa'); } finally { setDeleting(null); }
  }

  return (
    <div className="fade-up customers-page">
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } .spin { animation: spin 0.8s linear infinite; }`}</style>

      <PageHeader
        title="Khách hàng"
        description={`${total} khách hàng đang quản lý`}
        action={
          <>
            <button className="btn btn--secondary" onClick={() => {
              const headers = ['Tên KH', 'MST', 'Người liên hệ', 'Điện thoại', 'Hạn mức TD', 'Trạng thái'];
              const rows = filtered.map(c => [
                c.name,
                (c as any).tax_code || (c as any).taxCode || '',
                (c as any).contact_person || (c as any).contactPerson || '',
                c.phone || '',
                (c as any).credit_limit || (c as any).creditLimit || '',
                STATUS_LABELS[c.status] || c.status,
              ]);
              downloadCSV(`khach-hang-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
            }}>
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
          label="Top 4 KH / doanh thu"
          value={top4Revenue.total > 0 ? formatCompact(top4Revenue.total) : '—'}
          variant={top4Revenue.total > 0 ? 'success' : 'warn'}
          icon={BarChart3}
          meta={top4Revenue.total > 0
            ? `${top4Revenue.customers.length} KH · ${formatCompact(top4Revenue.total)} ₫`
            : 'Chưa có dữ liệu doanh thu'
          }
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
        <div style={{ position: 'relative', width: 240, maxWidth: '100%' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)' }} />
          <input
            type="text"
            placeholder="Tìm theo tên, MST…"
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
            <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--ink-3)' }}>Đang tải…</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--ink-3)' }}>Chưa có dữ liệu</div>
          ) : (
            filtered.map(c => (
              <div key={c.id} className="m-card" onClick={() => { setEditingId(c.id); setShowAddForm(false); }} role="button" tabIndex={0} onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); setEditingId(c.id); setShowAddForm(false); } }}>
                <div className="m-card__top">
                  <span className="m-card__title">
                    <span className={`risk-dot risk-dot--${riskDot(debtMap.get(c.id) ?? 0, Number((c as any).creditLimit || c.creditLimit || 0))}`} />
                    {c.name}
                  </span>
                  <StatusPill variant={c.status === CustomerStatus.ACTIVE ? 'success' : 'danger'}>
                    {STATUS_LABELS[c.status] || c.status}
                  </StatusPill>
                </div>
                {((c as any).taxCode || c.taxCode) && (
                  <div className="m-card__meta" style={{ fontFamily: 'var(--font-mono)' }}>
                    MST {(c as any).taxCode || c.taxCode}
                  </div>
                )}
                {((c as any).contactPerson || c.contactPerson || c.phone) && (
                  <div className="m-card__meta">
                    {(c as any).contactPerson || c.contactPerson}
                    {c.phone && <><span className="m-card__meta-sep">·</span>{c.phone}</>}
                  </div>
                )}
                {((c as any).creditLimit || c.creditLimit) && (
                  <div className="m-card__row">
                    <span className="m-card__row-label">Hạn mức tín dụng</span>
                    <span className="m-card__row-value">{formatCurrency((c as any).creditLimit || c.creditLimit)}</span>
                  </div>
                )}
                <div className="m-card-edit-row">
                  <button className="btn btn--ghost btn--sm" onClick={(e) => { e.stopPropagation(); setEditingId(c.id); setShowAddForm(false); }}>
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
              {loading && (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 32, color: 'var(--ink-3)' }}>
                  <Loader2 size={22} className="spin" style={{ display: 'inline-block', marginBottom: 8 }} />
                  <p style={{ fontSize: 13 }}>Đang tải…</p>
                </td></tr>
              )}
              {error && (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 32, color: 'var(--danger)' }}>
                  <p>{error}</p>
                  <button className="btn btn--secondary btn--sm" style={{ marginTop: 8 }} onClick={() => refetchCustomers()}>Thử lại</button>
                </td></tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 32, color: 'var(--ink-3)' }}>Chưa có dữ liệu</td></tr>
              )}
              {filtered.map(c => (
                  <tr key={c.id} style={{ transition: 'background 0.12s ease', cursor: 'pointer' }}
                    onClick={() => { setEditingId(c.id); setShowAddForm(false); setMenuOpenId(null); }} role="button" tabIndex={0} onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); { setEditingId(c.id); setShowAddForm(false); setMenuOpenId(null);} } }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}
                  >
                    <td style={{ padding: 12, borderBottom: '1px solid var(--line)', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                      <div style={{ fontWeight: 600 }}>
                         <span className={`risk-dot risk-dot--${riskDot(debtMap.get(c.id) ?? 0, Number((c as any).creditLimit || c.creditLimit || 0))}`} />
                        {c.name}
                      </div>
                      {((c as any).taxCode || c.taxCode) && <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>MST {(c as any).taxCode || c.taxCode}</div>}
                    </td>
                    <td style={{ padding: 12, borderBottom: '1px solid var(--line)', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                      {((c as any).contactPerson || c.contactPerson) && <div style={{ fontWeight: 600 }}>{(c as any).contactPerson || c.contactPerson}</div>}
                      {(c.phone || (c as any).contact_info || (c as any).contactInfo) && (
                        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
                          {c.phone || (c as any).contact_info || (c as any).contactInfo}
                        </div>
                      )}
                      {!((c as any).contactPerson || c.contactPerson) && !c.phone && !(c as any).contact_info && !(c as any).contactInfo && <span style={{ color: 'var(--ink-3)' }}>—</span>}
                    </td>
                    <td style={{ padding: 12, borderBottom: '1px solid var(--line)', verticalAlign: 'middle', whiteSpace: 'nowrap', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                      {((c as any).creditLimit || c.creditLimit) ? formatCurrency((c as any).creditLimit || c.creditLimit) : '—'}
                    </td>
                    <td style={{ padding: 12, borderBottom: '1px solid var(--line)', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                      <StatusPill variant={c.status === CustomerStatus.ACTIVE ? 'success' : 'danger'}>
                        {STATUS_LABELS[c.status] || c.status}
                      </StatusPill>
                    </td>
                    <td style={{ padding: 12, borderBottom: '1px solid var(--line)', verticalAlign: 'middle', position: 'relative' }}>
                      <div className="row-actions">
                        <button className="row-action" onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === c.id ? null : c.id); }}>
                          <MoreHorizontal size={14} />
                        </button>
                      </div>
                      {menuOpenId === c.id && (
                        <div style={{
                          position: 'absolute', right: 12, top: '100%', zIndex: 20,
                          background: '#fff', border: '1px solid var(--line)', borderRadius: 8,
                          boxShadow: '0 4px 14px rgba(10,10,10,0.06)', overflow: 'hidden', minWidth: 140,
                        }} onClick={(e) => e.stopPropagation()}>
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
              ))}
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

      {/* Customer add/edit modal */}
      <CustomerFormModal
        key={editingId ?? (showAddForm ? 'add' : 'closed')}
        isOpen={showAddForm || editingId != null}
        saving={saving}
        item={editingId != null ? customers.find(c => c.id === editingId) : undefined}
        onsave={d => {
          if (editingId != null) doUpdate(editingId, d);
          else doCreate(d);
        }}
        oncancel={() => { setEditingId(null); setShowAddForm(false); }}
      />
    </div>
  );
}
