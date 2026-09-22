import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, UserCheck, BarChart3, Lock, Plus, Download,
  MoreHorizontal, Pencil, Trash2, X, Save, Loader2, Truck,
} from 'lucide-react';
import { api } from '../lib/api';
import { downloadCSV } from '../lib/csv';
import { labelStyle } from '../utils/formStyles';
import { PageHeader, KPI, StatusPill, Modal } from '../components/UI';
import { Breadcrumbs } from '../components/shared/Breadcrumbs';
import { EmptyState, Pagination } from '../design-system';
import { formatCurrency, formatNumber } from '../lib/format';
import type { Customer, Supplier } from '@tingting/shared';
import { CustomerStatus } from '@tingting/shared';
import { useAllCustomers, useCustomerBalances, useSuppliers } from '../hooks/useQueries';
import { usePageAnimations } from '../hooks/animations';
import { ClickableCard } from '../components/shared/ClickableCard';
import { StatusStrip } from '../components/shared/StatusStrip';
import { Money } from '../components/shared/Money';
import { EmptyIllustration } from '../components/shared';
import { ListFilterBar } from '../components/shared/ListFilterBar';

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

export function buildCustomerDebtMap(entries: Array<{
  entityType: string;
  entityId: number;
  txnType: string;
  debit?: string | null;
  credit?: string | null;
  note?: string | null;
}>): Map<number, number> {
  // Mirror of the SQL rule in financial.service.getEntityBalances' arDebt
  // aggregate (kept here as the reference implementation for the unit test):
  // Σ debit − Σ credit per customer, excluding carrier-payable activity.
  const map = new Map<number, number>();
  for (const entry of entries) {
    if (entry.entityType !== 'CUSTOMER') continue;
    const isCarrierPayable =
      entry.txnType === 'EXTERNAL_CARRIER_COST'
      || entry.txnType === 'VENDOR_PAYMENT'
      || (
        entry.txnType === 'UNLOCK_REVERSAL'
        && entry.note?.startsWith('Cước thuê ngoài')
      );
    if (isCarrierPayable) continue;

    const current = map.get(entry.entityId) ?? 0;
    map.set(
      entry.entityId,
      current + (Number(entry.debit ?? 0) || 0) - (Number(entry.credit ?? 0) || 0),
    );
  }
  return map;
}

// ─── Modal-based Form ────────────────────────────────────────────────────────
//
// Was an inline <tr> form that swapped in for the row. The row-replacement
// looked cramped (5 fields squeezed into one table cell) and made it easy to
// miss that edit mode had even opened. Modal gives proper breathing room.

function CustomerFormModal({ item, saving, onsave, oncancel, isOpen, suppliers, error }: {
  item?: Customer; saving: boolean; onsave: (d: Record<string, unknown>) => void; oncancel: () => void; isOpen: boolean; suppliers: Supplier[]; error?: string | null;
}) {
  const [name, setName] = useState(item?.name || '');
  const [taxCode, setTaxCode] = useState(item?.taxCode || '');
  const [contactPerson, setContactPerson] = useState(item?.contactPerson || '');
  const [phone, setPhone] = useState(item?.phone || '');
  const [creditLimit, setCreditLimit] = useState(item?.creditLimit || '');
  const [status, setStatus] = useState<string>(item?.status || CustomerStatus.ACTIVE);
  const [isCarrier, setIsCarrier] = useState(item?.isCarrier ?? false);
  const [debitNoteMode, setDebitNoteMode] = useState<string>(item?.debitNoteMode ?? 'MONTHLY');
  const [linkedSupplierId, setLinkedSupplierId] = useState<number | null>(item?.linkedSupplierId ?? null);

  useEffect(() => {
    if (isOpen) {
      setName(item?.name || '');
      setTaxCode(item?.taxCode || '');
      setContactPerson(item?.contactPerson || '');
      setPhone(item?.phone || '');
      setCreditLimit(item?.creditLimit || '');
      setStatus(item?.status || CustomerStatus.ACTIVE);
      setIsCarrier(item?.isCarrier ?? false);
      setDebitNoteMode(item?.debitNoteMode ?? 'MONTHLY');
      setLinkedSupplierId(item?.linkedSupplierId ?? null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally re-sync only when the target customer ID changes, not on every prop update
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
      isCarrier,
      debitNoteMode,
      linkedSupplierId: linkedSupplierId ?? null,
    });
  };

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
        {error && <p role="alert" style={{ color: 'var(--danger)', margin: 0 }}>{error}</p>}
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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="field">
            <label htmlFor="cust-debit-mode" style={labelStyle}>Giấy báo nợ</label>
            <select id="cust-debit-mode" className="input" value={debitNoteMode} onChange={e => setDebitNoteMode(e.target.value)}>
              <option value="MONTHLY">Theo tháng</option>
              <option value="PER_BATCH">Theo lô</option>
            </select>
          </div>
          <div className="field" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', paddingBottom: 4 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={isCarrier}
                onChange={e => setIsCarrier(e.target.checked)}
                style={{ width: 14, height: 14 }}
              />
              <span style={{ fontSize: 'var(--fs-body)', fontWeight: 600, color: 'var(--ink-2)' }}>Đối tác vận tải (xe ngoài)</span>
            </label>
          </div>
        </div>
        <div className="field">
          <label htmlFor="cust-linked-supplier" style={labelStyle}>Nhà cung cấp liên quan</label>
          <select
            id="cust-linked-supplier"
            className="input"
            value={linkedSupplierId ?? ''}
            onChange={e => setLinkedSupplierId(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">-- Không liên kết --</option>
            {suppliers.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
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
  const navigate = useNavigate();

  const pageSize = 10;

  const { data: customersData, isLoading: loading, error: queryError, refetch: refetchCustomers } = useAllCustomers();
  const { rootRef } = usePageAnimations({ ready: !loading });
  const { data: customerBalances, isLoading: balancesLoading, error: balancesError, refetch: refetchBalances } = useCustomerBalances();
  const { data: suppliersData } = useSuppliers(1, '');
  const allSuppliers = suppliersData?.items ?? [];
  const customers = useMemo(() => customersData ?? [], [customersData]);
  const total = customers.length;
  const [mutationError, setMutationError] = useState<string | null>(null);

  // Server-side aggregates from /ledger/balances — replaced the former
  // load-all-ledger-entries client-side reduces (arDebt excludes carrier AP).
  const debtMap = useMemo(() => {
    const map = new Map<number, number>();
    for (const b of customerBalances ?? []) map.set(b.entityId, b.arDebt);
    return map;
  }, [customerBalances]);

  const revenueMap = useMemo(() => {
    const map = new Map<number, number>();
    for (const b of customerBalances ?? []) map.set(b.entityId, b.tripRevenue);
    return map;
  }, [customerBalances]);

  const top4Revenue = useMemo(() => {
    const customerRevenues = customers
      .map(c => ({ id: c.id, name: c.name, revenue: revenueMap.get(c.id) || 0 }))
      .filter(c => c.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 4);
    const totalRevenue = customerRevenues.reduce((s, c) => s + c.revenue, 0);
    return { customers: customerRevenues, total: totalRevenue };
  }, [customers, revenueMap]);

  useEffect(() => { setPage(1); }, [search, filter]);

  const { activeCount, lockedCount, filtered } = useMemo(() => {
    const activeCount = customers.filter(c => c.status === CustomerStatus.ACTIVE).length;
    const lockedCount = customers.filter(c => c.status === CustomerStatus.LOCKED).length;
    const needle = search.trim().toLocaleLowerCase('vi');
    const filtered = customers.filter(c => {
      if (needle && ![c.name, c.taxCode, c.contactPerson, c.phone].some(value => value?.toLocaleLowerCase('vi').includes(needle))) return false;
      if (filter === 'active') return c.status === CustomerStatus.ACTIVE;
      if (filter === 'locked') return c.status === CustomerStatus.LOCKED;
      if (filter === 'risk') {
        const debt = debtMap.get(c.id) ?? 0;
        const limit = Number(c.creditLimit || 0);
        if (debt <= 0) return false;
        // No credit limit + outstanding debt = unlimited risk exposure
        if (limit <= 0) return true;
        return debt / limit > 0.8;
      }
      return true;
    });
    return { activeCount, lockedCount, filtered };
  }, [customers, filter, search, debtMap]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleCustomers = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  async function doCreate(body: Record<string, unknown>) {
    setSaving(true);
    setMutationError(null);
    try {
      await api.post('/customers', body);
      setShowAddForm(false);
      await refetchCustomers();
    } catch (e: unknown) { setMutationError(e instanceof Error ? e.message : 'Lỗi lưu'); } finally { setSaving(false); }
  }

  async function doUpdate(id: number, body: Record<string, unknown>) {
    setSaving(true);
    setMutationError(null);
    try {
      await api.put(`/customers/${id}`, body);
      await refetchCustomers();
      setEditingId(null);
      setMenuOpenId(null);
    } catch (e: unknown) { setMutationError(e instanceof Error ? e.message : 'Lỗi cập nhật'); } finally { setSaving(false); }
  }

  async function doDelete(id: number) {
    setDeleting(id);
    setMutationError(null);
    try {
      await api.delete(`/customers/${id}`);
      setMenuOpenId(null);
      await refetchCustomers();
    } catch (e: unknown) { setMutationError(e instanceof Error ? e.message : 'Lỗi xóa'); } finally { setDeleting(null); }
  }

  if (queryError || balancesError) return (
    <div className="customers-page">
      <PageHeader title="Khách hàng" iconName="customer" />
      <div role="alert">
        <p>Không thể tải danh sách hoặc công nợ khách hàng.</p>
        <button className="btn btn--secondary" onClick={() => { void Promise.all([refetchCustomers(), refetchBalances()]); }}>Thử lại</button>
      </div>
    </div>
  );
  if (loading || balancesLoading) return (
    <div className="customers-page">
      <PageHeader title="Khách hàng" iconName="customer" />
      <p role="status">Đang tải khách hàng và công nợ…</p>
    </div>
  );

  return (
    <div className="customers-page" ref={rootRef}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } .spin { animation: spin 0.8s linear infinite; }`}</style>

      <Breadcrumbs
        className="customers-page__crumbs"
        items={[
          { label: 'Tổng quan', to: '/dashboard' },
          { label: 'Khách hàng' },
        ]}
      />
      <PageHeader
        title="Khách hàng"
        iconName="customer"
        description={`${total} khách hàng đang quản lý`}
        action={
          <>
            <button className="btn btn--secondary" onClick={async () => {
              const headers = ['Tên KH', 'MST', 'Người liên hệ', 'Điện thoại', 'Hạn mức TD', 'Trạng thái'];
              const rows = filtered.map(c => [
                c.name,
                c.taxCode || '',
                c.contactPerson || '',
                c.phone || '',
                c.creditLimit || '',
                STATUS_LABELS[c.status] || c.status,
              ]);
              await downloadCSV(`khach-hang-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows, {
                title: 'DANH SÁCH KHÁCH HÀNG',
                subtitle: `${filtered.length} khách hàng đang quản lý`,
                columnTypes: ['text', 'text', 'text', 'text', 'currency', 'text'],
              });
            }}>
              <Download size={14} /> Xuất Excel
            </button>
            <button className="btn btn--primary" onClick={() => { setShowAddForm(true); setEditingId(null); }}>
              <Plus size={14} /> Thêm khách hàng
            </button>
          </>
        }
      />

      {mutationError && !showAddForm && editingId == null && <p role="alert" style={{ color: 'var(--danger)' }}>{mutationError}</p>}

      {/* KPI strip */}
      <div className="kpi-grid">
        <KPI
          label="Tổng khách hàng"
          value={total}
          icon={Users}
          assetIconName="customer"
          meta={<span>{total} khách hàng</span>}
        />
        <KPI
          label="Đang hoạt động"
          value={`${activeCount}`}
          unit={`/ ${total}`}
          variant="success"
          icon={UserCheck}
          assetIconName="active-customer"
          meta={total > 0 ? `${Math.round((activeCount / total) * 100)}% hoạt động đều` : ''}
        />
        <KPI
          label="Top 4 KH / doanh thu"
          value={top4Revenue.total > 0 ? formatNumber(top4Revenue.total) : '—'}
          variant={top4Revenue.total > 0 ? 'success' : 'warn'}
          icon={BarChart3}
          assetIconName="profit"
          meta={top4Revenue.total > 0
            ? `${top4Revenue.customers.length} KH · ${formatNumber(top4Revenue.total)} ₫`
            : 'Chưa có dữ liệu doanh thu'
          }
        />
        <KPI
          label="Tạm khoá"
          value={lockedCount}
          variant="danger"
          icon={Lock}
          assetIconName="overdue"
          meta="Đang tạm khóa giao dịch"
        />
      </div>

      <ListFilterBar<FilterKey>
        label="Lọc khách hàng"
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'all', label: 'Tất cả', count: total },
          { value: 'risk', label: 'Rủi ro cao' },
          { value: 'active', label: 'Hoạt động', count: activeCount },
          { value: 'locked', label: 'Tạm khoá', count: lockedCount },
        ]}
        search={{ value: search, onChange: setSearch, label: 'Tìm khách hàng theo tên hoặc mã số thuế', placeholder: 'Tìm theo tên, MST…' }}
      />

      {/* ── Mobile card list (≤820px) ──────────────────────────────────── */}
      <div className="mobile-only mobile-table-wrap">
        <div className="m-card-list">
          {loading ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--ink-3)' }}>Đang tải…</div>
          ) : filtered.length === 0 ? (
            <EmptyState
              illustration="/assets/illustrations/empty-clients.svg"
              title={total ? "Không có khách hàng phù hợp" : "Chưa có khách hàng"}
              description={total ? "Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm." : "Thêm khách hàng đầu tiên để bắt đầu quản lý công nợ."}
              action={<button className="btn btn--primary" onClick={() => { setShowAddForm(true); setEditingId(null); }}><Plus size={14} /> Thêm khách hàng</button>}
            />
          ) : (
            visibleCustomers.map(c => (
              <ClickableCard key={c.id} className="m-card" style={{ position: 'relative' }} onClick={() => navigate(`/customers/${c.id}`)}>
                <StatusStrip status={c.status} />
                <div className="m-card__top">
                  <span className="m-card__title">
                    <span className={`risk-dot risk-dot--${riskDot(debtMap.get(c.id) ?? 0, Number(c.creditLimit || 0))}`} />
                    {c.name}
                    {c.linkedSupplierId && (
                      <span style={{ marginLeft: 6, fontSize: 'var(--fs-body)', fontWeight: 700, color: '#16a34a', background: '#dcfce7', border: '1px solid #bbf7d0', borderRadius: 4, padding: '1px 5px', letterSpacing: '0.02em', verticalAlign: 'middle' }}>
                        2 chiều
                      </span>
                    )}
                    {/* TODO: extract a shared <Badge> component for "2 chiều" / "Xe ngoài" */}
                    {c.isCarrier && (
                      <span style={{ marginLeft: 6, fontSize: 'var(--fs-body)', fontWeight: 700, color: '#1d4ed8', background: '#dbeafe', border: '1px solid #bfdbfe', borderRadius: 4, padding: '1px 5px', letterSpacing: '0.02em', verticalAlign: 'middle', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                        <Truck size={11} aria-hidden="true" /> Xe ngoài
                      </span>
                    )}
                  </span>
                  <StatusPill variant={c.status === CustomerStatus.ACTIVE ? 'success' : 'danger'}>
                    {STATUS_LABELS[c.status] || c.status}
                  </StatusPill>
                </div>
                {c.taxCode && (
                  <div className="m-card__meta" style={{ fontFamily: 'var(--font-mono)' }}>
                    MST {c.taxCode}
                  </div>
                )}
                {(c.contactPerson || c.phone) && (
                  <div className="m-card__meta">
                    {c.contactPerson}
                    {c.phone && <><span className="m-card__meta-sep">·</span>{c.phone}</>}
                  </div>
                )}
                {c.creditLimit && (
                  <div className="m-card__row">
                    <span className="m-card__row-label">Hạn mức tín dụng</span>
                    <span className="m-card__row-value">{formatCurrency(c.creditLimit)}</span>
                  </div>
                )}
                <div className="m-card__row">
                  <span className="m-card__row-label">Công nợ</span>
                  <span className="m-card__row-value" style={debtMap.get(c.id) ? { color: 'var(--danger)' } : undefined}>
                    <Money value={debtMap.get(c.id) ?? 0} />
                  </span>
                </div>
                <div className="m-card-edit-row">
                  <button className="btn btn--ghost btn--sm" onClick={(e) => { e.stopPropagation(); setEditingId(c.id); setShowAddForm(false); }}>
                    Sửa
                  </button>
                </div>
              </ClickableCard>
            ))
          )}
        </div>
      </div>

      {/* ── Desktop table (>640px) ──────────────────────────────────────── */}
      <div className="desktop-only table-wrap">
        <div className="table-scroll">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--fs-table)', minWidth: 900, tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: '44%' }} />
              <col style={{ width: '22%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: 60 }} />
            </colgroup>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '11px 12px', background: 'var(--surface-2)', borderBottom: '1px solid var(--line)', fontSize: 'var(--fs-label)', fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>Khách hàng</th>
                <th style={{ textAlign: 'left', padding: '11px 12px', background: 'var(--surface-2)', borderBottom: '1px solid var(--line)', fontSize: 'var(--fs-label)', fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>Liên hệ</th>
                <th style={{ textAlign: 'right', padding: '11px 12px', background: 'var(--surface-2)', borderBottom: '1px solid var(--line)', fontSize: 'var(--fs-label)', fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap', fontFamily: 'var(--font-body)' }}>Hạn mức TD</th>
                <th style={{ textAlign: 'right', padding: '11px 12px', background: 'var(--surface-2)', borderBottom: '1px solid var(--line)', fontSize: 'var(--fs-label)', fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap', fontFamily: 'var(--font-body)' }}>Công nợ</th>
                <th style={{ width: 60 }}></th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 32, color: 'var(--ink-3)' }}>
                  <Loader2 size={22} className="spin" style={{ display: 'inline-block', marginBottom: 8 }} />
                  <p style={{ fontSize: 'var(--fs-body)' }}>Đang tải…</p>
                </td></tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 32, color: 'var(--ink-3)' }}>
                  <EmptyIllustration name="empty-clients" width={140} height={116} style={{ margin: '0 auto 8px', display: 'block' }} />
                  <div>Chưa có dữ liệu</div>
                </td></tr>
              )}
              {visibleCustomers.map((c, index) => (
                  <tr key={c.id} role="button" tabIndex={0}
                    style={{ cursor: 'pointer', transition: 'background 0.12s ease' }}
                    onClick={() => navigate(`/customers/${c.id}`)}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/customers/${c.id}`); } }}
                  >
                    <td style={{ padding: 12, borderBottom: '1px solid var(--line)', position: 'relative', verticalAlign: 'middle' }}>
                      <StatusStrip status={c.status} />
                      <div style={{ fontWeight: 600, display: 'flex', alignItems: 'flex-start', gap: 6, width: '100%', minWidth: 0, flexWrap: 'wrap' }}>
                        <span style={{ wordBreak: 'break-word', whiteSpace: 'normal', minWidth: 0 }}>
                          {c.name}
                        </span>
                        {c.linkedSupplierId && (
                          <span style={{ flexShrink: 0, fontSize: 'var(--fs-body)', fontWeight: 700, color: '#16a34a', background: '#dcfce7', border: '1px solid #bbf7d0', borderRadius: 4, padding: '1px 5px', letterSpacing: '0.02em', marginTop: 1 }}>
                            2 chiều
                          </span>
                        )}
                        {c.isCarrier && (
                          <span style={{ flexShrink: 0, fontSize: 'var(--fs-body)', fontWeight: 700, color: '#1d4ed8', background: '#dbeafe', border: '1px solid #bfdbfe', borderRadius: 4, padding: '1px 5px', letterSpacing: '0.02em', marginTop: 1, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                            <Truck size={11} aria-hidden="true" /> Xe ngoài
                          </span>
                        )}
                      </div>
                      {c.taxCode && <div style={{ fontSize: 'var(--fs-body)', lineHeight: 1.35, color: 'var(--ink-3)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>MST {c.taxCode}</div>}
                    </td>
                    <td style={{ padding: 12, borderBottom: '1px solid var(--line)', verticalAlign: 'middle', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                      {c.contactPerson && <div style={{ fontWeight: 600 }}>{c.contactPerson}</div>}
                      {(c.phone || c.contactInfo) && (
                        <div style={{ fontSize: 'var(--fs-body)', lineHeight: 1.35, color: 'var(--ink-3)', marginTop: 2, fontFamily: c.phone ? 'var(--font-mono)' : 'var(--font-body)' }}>
                          {c.phone || c.contactInfo}
                        </div>
                      )}
                      {!c.contactPerson && !c.phone && !c.contactInfo && <span style={{ color: 'var(--ink-3)' }}>—</span>}
                    </td>
                    <td style={{ padding: 12, borderBottom: '1px solid var(--line)', verticalAlign: 'middle', whiteSpace: 'nowrap', textAlign: 'right', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {c.creditLimit ? formatCurrency(c.creditLimit) : '—'}
                    </td>
                    <td style={{ padding: 12, borderBottom: '1px solid var(--line)', verticalAlign: 'middle', whiteSpace: 'nowrap', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      <span style={debtMap.get(c.id) ? { color: 'var(--danger)', fontFamily: 'var(--font-mono)' } : { color: 'var(--ink-3)' }}>
                        <Money value={debtMap.get(c.id) ?? 0} />
                      </span>
                    </td>
                    <td style={{ padding: 12, borderBottom: '1px solid var(--line)', verticalAlign: 'middle', position: 'relative' }}>
                      <div className="row-actions">
                        <button className="row-action" aria-label={`Mở thao tác cho ${c.name}`} onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === c.id ? null : c.id); }}>
                          <MoreHorizontal size={14} />
                        </button>
                      </div>
                      {menuOpenId === c.id && (
                        <div style={{
                          position: 'absolute', right: 12, zIndex: 20,
                          background: '#fff', border: '1px solid var(--line)', borderRadius: 8,
                          boxShadow: '0 4px 14px rgba(10,10,10,0.06)', overflow: 'hidden', minWidth: 140,
                          ...(index >= visibleCustomers.length - 2 && visibleCustomers.length > 2
                            ? { bottom: '100%', marginBottom: 4 }
                            : { top: '100%' }),
                        }} onClick={(e) => e.stopPropagation()}>
                          <button style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 12px', fontSize: 'var(--fs-control)', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', color: 'var(--ink)' }}
                            onClick={() => { setEditingId(c.id); setShowAddForm(false); }}>
                            <Pencil size={13} /> Sửa
                          </button>
                          <button style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 12px', fontSize: 'var(--fs-control)', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', color: 'var(--danger)' }}
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

      </div>
      <Pagination
        page={currentPage}
        totalPages={totalPages}
        onChange={setPage}
        summary={<span>Hiển thị <strong>{filtered.length ? (currentPage - 1) * pageSize + 1 : 0}–{Math.min(currentPage * pageSize, filtered.length)}</strong> trên <strong>{filtered.length}</strong> khách hàng</span>}
      />

      {/* Customer add/edit modal */}
      <CustomerFormModal
        key={editingId ?? (showAddForm ? 'add' : 'closed')}
        isOpen={showAddForm || editingId != null}
        saving={saving}
        item={editingId != null ? customers.find(c => c.id === editingId) : undefined}
        suppliers={allSuppliers}
        error={mutationError}
        onsave={d => {
          if (editingId != null) doUpdate(editingId, d);
          else doCreate(d);
        }}
        oncancel={() => { setEditingId(null); setShowAddForm(false); }}
      />
    </div>
  );
}
