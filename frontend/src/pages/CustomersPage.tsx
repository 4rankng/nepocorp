import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, UserCheck, BarChart3, Lock, Plus, Download, Loader2,
} from 'lucide-react';
import { api } from '../lib/api';
import { downloadCSV } from '../lib/csv';
import { PageHeader, KPI } from '../components/UI';
import { Breadcrumbs } from '../components/shared/Breadcrumbs';
import { EmptyState, Pagination } from '../design-system';
import { formatNumber } from '../lib/format';
import { CustomerStatus } from '@tingting/shared';
import { useAllCustomers, useCustomerBalances, useSuppliers } from '../hooks/useQueries';
import { usePageAnimations } from '../hooks/animations';
import { EmptyIllustration } from '../components/shared';
import { ListFilterBar } from '../components/shared/ListFilterBar';
import { CustomerFormModal } from '../features/customers/CustomerFormModal';
import { CustomerCard, CustomerRow } from '../features/customers/customerRows';
import { STATUS_LABELS } from '../features/customers/customerUtils';

type FilterKey = 'all' | 'locked' | 'active' | 'risk';

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

  const [pageSize, setPageSize] = useState(10);

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

  useEffect(() => { setPage(1); }, [search, filter, pageSize]);

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
  // Infinite scroll: everything loaded so far stays on screen and the sentinel
  // pulls the next batch.
  const visibleCustomers = filtered.slice(0, currentPage * pageSize);
  const loadMoreCustomers = useCallback(() => {
    setPage((current) => (current < totalPages ? current + 1 : current));
  }, [totalPages]);

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
              <CustomerCard
                key={c.id}
                customer={c}
                debt={debtMap.get(c.id) ?? 0}
                onOpen={() => navigate(`/customers/${c.id}`)}
                onEdit={() => { setEditingId(c.id); setShowAddForm(false); }}
              />
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
                <CustomerRow
                  key={c.id}
                  customer={c}
                  index={index}
                  debt={debtMap.get(c.id) ?? 0}
                  visibleCount={visibleCustomers.length}
                  menuOpen={menuOpenId === c.id}
                  deleting={deleting === c.id}
                  onOpen={() => navigate(`/customers/${c.id}`)}
                  onEdit={() => { setEditingId(c.id); setShowAddForm(false); }}
                  onDelete={() => doDelete(c.id)}
                  onToggleMenu={() => setMenuOpenId(menuOpenId === c.id ? null : c.id)}
                />
              ))}
            </tbody>
          </table>
        </div>

      </div>
      <Pagination
        mode="infinite"
        page={currentPage}
        totalPages={totalPages}
        totalItems={filtered.length}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
        onChange={setPage}
        hasMore={currentPage < totalPages}
        onLoadMore={loadMoreCustomers}
        summary={<span>Hiển thị <strong>{visibleCustomers.length}</strong> trên <strong>{filtered.length}</strong> khách hàng</span>}
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
