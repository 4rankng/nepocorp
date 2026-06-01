import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { useConfirm } from '../../components/UI';
import { api } from '../../lib/api';
import { formatCurrency } from '../../lib/format';
import { downloadCSV } from '../../lib/csv';
import { InlineForm } from '../../components/config/InlineForm';
import { FormActions } from '../../components/config/FormActions';
import { useCRUD } from '../../hooks/useCRUD';
import type { Customer, PaginatedResponse } from '@nepocorp/shared';
import { CustomerStatus } from '@nepocorp/shared';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="field"><label>{label} {children}</label></div>;
}

function CustomerForm({ saving, item, onsave, oncancel }: {
  saving: boolean; item?: Customer; onsave: (d: Record<string, unknown>) => void; oncancel: () => void;
}) {
  const [name, setName] = useState(item?.name || '');
  const [contactInfo, setContactInfo] = useState(item?.contactInfo || '');
  return (
    <InlineForm colSpan={7}>
      <div style={{ flex: 2, minWidth: 180 }}>
        <Field label="Tên khách hàng"><input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Nhập tên…" /></Field>
      </div>
      <div style={{ flex: 2, minWidth: 180 }}>
        <Field label="Liên hệ"><input className="input" value={contactInfo} onChange={e => setContactInfo(e.target.value)} placeholder="SĐT, email…" /></Field>
      </div>
      <FormActions saving={saving} isedit={!!item} oncancel={oncancel} onsave={() => onsave({ name: name.trim(), contactInfo: contactInfo.trim() || undefined })} />
    </InlineForm>
  );
}

export default function CustomersConfigPage() {
  const [customerFilter, setCustomerFilter] = useState<'all' | 'high-risk' | 'active' | 'locked'>('all');
  const [search, setSearch] = useState('');

  const { data, refetch } = useQuery({
    queryKey: ['customers-config', search],
    queryFn: async () => {
      const qs = search ? `?search=${encodeURIComponent(search)}&limit=100` : '?limit=100';
      const [custRes, tripRes] = await Promise.all([
        api.get<PaginatedResponse<Customer>>(`/customers${qs}`),
        api.get<{ items: any[] }>('/trips?limit=500').catch(() => ({ items: [] as any[] })),
      ]);
      const now = new Date();
      const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const statsMap = new Map<number, { trips: number; revenue: number }>();
      tripRes.items.forEach((t: any) => {
        const dep = t.departureDate || '';
        if (dep.startsWith(thisMonth)) {
          const cid = t.customerId;
          if (cid) {
            const s = statsMap.get(cid) || { trips: 0, revenue: 0 };
            s.trips++;
            s.revenue += parseFloat(t.revenue || '0');
            statsMap.set(cid, s);
          }
        }
      });
      return { customers: custRes.items, customerTripStats: statsMap };
    },
    staleTime: 2 * 60 * 1000,
  });

  const customers = data?.customers ?? [];
  const customerTripStats = data?.customerTripStats ?? new Map<number, { trips: number; revenue: number }>();

  const crud = useCRUD('/customers', async () => { await refetch(); });
  const { confirm, dialog: confirmDialog } = useConfirm();

  const now = new Date();
  const monthLabel = `${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getFullYear()).slice(-2)}`;
  const totalCount = customers.length;
  const activeCount = customers.filter(c => c.status === CustomerStatus.ACTIVE).length;
  const lockedCount = customers.filter(c => c.status === CustomerStatus.LOCKED).length;

  const allRevenues = customers.map(c => customerTripStats.get(c.id)?.revenue || 0).sort((a, b) => b - a);
  const totalRevenue = allRevenues.reduce((s, v) => s + v, 0);
  const top4Revenue = allRevenues.slice(0, 4).reduce((s, v) => s + v, 0);
  const top4Pct = totalRevenue > 0 ? Math.round((top4Revenue / totalRevenue) * 100) : 0;

  function getRiskLevel(c: Customer): 'high' | 'med' | 'low' {
    const debt = 0;
    const limit = parseFloat(c.creditLimit || '0');
    if (limit > 0 && debt > limit * 0.8) return 'high';
    if (c.status === CustomerStatus.LOCKED) return 'high';
    if (limit > 0 && debt > limit * 0.5) return 'med';
    return 'low';
  }

  const filtered = useMemo(() => customers.filter(c => {
    if (customerFilter === 'active') return c.status === CustomerStatus.ACTIVE;
    if (customerFilter === 'locked') return c.status === CustomerStatus.LOCKED;
    if (customerFilter === 'high-risk') return getRiskLevel(c) === 'high';
    return true;
  }).filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()) || (c.taxCode || '').includes(search)), [customers, customerFilter, search]);

  return (
    <div className="fade-up">
      <div className="page-header">
        <div>
          <h1 className="page-title">Khách hàng</h1>
          <p className="page-subtitle">
            {totalCount} khách hàng đang quản lý
            {top4Pct > 0 && <> · <strong style={{ color: 'var(--danger)' }}>{top4Pct}%</strong> doanh thu tập trung ở 4 KH lớn nhất</>}
          </p>
        </div>
        <div className="page-actions">
          <button className="btn btn--secondary" onClick={() => {
            const headers = ['Khách hàng', 'MST', 'Liên hệ', 'Chuyến ' + monthLabel, 'Doanh thu ' + monthLabel, 'Hạn mức TD', 'Trạng thái'];
            const rows = filtered.map(c => {
              const stats = customerTripStats.get(c.id);
              const creditLimit = parseFloat(c.creditLimit || '0');
              return [
                c.name,
                c.taxCode || '',
                c.contactInfo || c.phone || '',
                stats?.trips ?? '',
                stats?.revenue ?? '',
                creditLimit > 0 ? creditLimit : '',
                c.status === CustomerStatus.LOCKED ? 'Tạm khoá' : 'Hoạt động',
              ];
            });
            downloadCSV('khach-hang.csv', headers, rows);
          }}>
            <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Xuất Excel
          </button>
          <button className="btn btn--primary" onClick={() => crud.setShowAddForm(true)}>
            <Plus size={14} /> Thêm khách hàng
          </button>
        </div>
      </div>

      <div className="kpi-grid" style={{ marginBottom: 20 }}>
        <div className="kpi">
          <div className="kpi__top"><span className="kpi__label">Tổng khách hàng</span></div>
          <div className="kpi__value">{totalCount}</div>
          <div className="kpi__meta kpi__meta--up">Đang quản lý</div>
          <div className="kpi__watermark" aria-hidden="true"><Users size={72} /></div>
        </div>
        <div className="kpi kpi--success">
          <div className="kpi__top"><span className="kpi__label">Đang hoạt động</span></div>
          <div className="kpi__value">{activeCount}<span className="kpi__value-unit">/{totalCount}</span></div>
          <div className="kpi__meta">{totalCount > 0 ? Math.round((activeCount / totalCount) * 100) : 0}% hoạt động đều</div>
          <div className="kpi__watermark" aria-hidden="true"><svg aria-hidden="true" width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="8 12 11 15 16 9"/></svg></div>
        </div>
        <div className="kpi kpi--warn">
          <div className="kpi__top"><span className="kpi__label">Top 4 chiếm</span></div>
          <div className="kpi__value">{top4Pct}<span className="kpi__value-unit">%</span></div>
          <div className="kpi__meta">{top4Pct > 60 ? 'Rủi ro tập trung cao' : 'Doanh thu tháng này'}</div>
          <div className="kpi__watermark" aria-hidden="true"><svg aria-hidden="true" width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg></div>
        </div>
        <div className="kpi kpi--danger">
          <div className="kpi__top"><span className="kpi__label">Tạm khoá</span></div>
          <div className="kpi__value">{lockedCount}</div>
          <div className="kpi__meta">Do nợ quá hạn</div>
          <div className="kpi__watermark" aria-hidden="true"><svg aria-hidden="true" width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></div>
        </div>
      </div>

      <div className="table-wrap">
        <div className="toolbar">
          {(['all', 'high-risk', 'active', 'locked'] as const).map(f => {
            const labels = { all: `Tất cả · ${totalCount}`, 'high-risk': 'Rủi ro cao', active: `Hoạt động · ${activeCount}`, locked: `Tạm khoá · ${lockedCount}` };
            return <button key={f} className={`filter-pill${customerFilter === f ? ' is-active' : ''}`} onClick={() => setCustomerFilter(f)}>{labels[f]}</button>;
          })}
          <div className="toolbar__spacer" />
          <div className="toolbar__search">
            <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
            <input type="text" placeholder="Tìm theo tên, MST…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Khách hàng</th><th>Liên hệ</th><th className="num">Chuyến {monthLabel}</th>
                <th className="num">Doanh thu {monthLabel}</th><th className="num">Hạn mức TD</th><th>Trạng thái</th><th style={{ width: 80 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', padding: '48px 12px', color: 'var(--ink-3)' }}>Chưa có dữ liệu</td></tr>}
              {filtered.map(c => {
                if (crud.editingId === c.id) {
                  return (
                    <tr key={`edit-${c.id}`}>
                      <td colSpan={7} style={{ padding: 0 }}>
                        <CustomerForm saving={crud.saving} item={c} onsave={d => crud.doUpdate(c.id, d)} oncancel={crud.cancelForm} />
                      </td>
                    </tr>
                  );
                }
                const risk = getRiskLevel(c);
                const stats = customerTripStats.get(c.id);
                const creditLimit = parseFloat(c.creditLimit || '0');
                return (
                  <tr key={c.id}>
                    <td>
                      <div className="row-strong"><span className={`risk-dot risk-dot--${risk}`} />{c.name}</div>
                      {c.taxCode && <div className="row-meta">MST {c.taxCode}</div>}
                    </td>
                    <td>
                      {c.contactPerson && <div className="row-strong">{c.contactPerson}</div>}
                      <div className="row-meta">{c.phone || c.contactInfo || '—'}</div>
                    </td>
                    <td className="num">{stats?.trips ?? '—'}</td>
                    <td className="num big">{stats?.revenue ? formatCurrency(stats.revenue) : '—'}</td>
                    <td className="num">{creditLimit > 0 ? formatCurrency(creditLimit) : '—'}</td>
                    <td>
                      {c.status === CustomerStatus.LOCKED
                        ? <span className="pill pill--danger"><span className="dot" />Tạm khoá</span>
                        : <span className="pill pill--success"><span className="dot" />Hoạt động</span>}
                    </td>
                    <td>
                      <div className="row-actions">
                        <button className="row-action" title="Sửa" onClick={() => crud.setEditingId(c.id)}><Pencil size={13} /></button>
                        <button className="row-action" title="Xóa" disabled={crud.deleting === c.id} onClick={() => crud.doDelete(c.id)}>
                          {crud.deleting === c.id ? <Loader2 size={13} className="spin" /> : <Trash2 size={13} style={{ color: 'var(--danger)' }} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="table-foot">
          <span>Đang hiển thị <strong style={{ fontFamily: 'var(--font-mono)' }}>{filtered.length}</strong> trên <strong style={{ fontFamily: 'var(--font-mono)' }}>{totalCount}</strong> khách hàng</span>
        </div>
      </div>
      {crud.error && <div style={{ textAlign: 'center', color: 'var(--danger)', marginTop: 12 }}>{crud.error}</div>}
    {confirmDialog}
    </div>
  );
}
