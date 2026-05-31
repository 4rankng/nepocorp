import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, ChevronRight, Loader2 } from 'lucide-react';
import { api } from '../lib/api';
import { formatCurrency, formatDate } from '../lib/format';
import { PageHeader, StatusPill } from '../components/UI';
import { useCatalogs } from '../hooks/useCatalogs';
import { useToast } from '../components/shared/Toast';
import { useQuery } from '@tanstack/react-query';
import { FINANCIAL, CONFIG } from '@nepocorp/shared';
import type { ExpenseWithRefs, PaginatedResponse, Supplier, ExpenseCategory } from '@nepocorp/shared';

const PAGE_SIZE = 20;

export function useExpenses(params: {
  page: number;
  supplierId?: number;
  categoryId?: number;
  truckId?: number;
  dateFrom?: string;
  dateTo?: string;
}) {
  const qs = new URLSearchParams({
    page: String(params.page),
    pageSize: String(PAGE_SIZE),
  });
  if (params.supplierId) qs.set('supplierId', String(params.supplierId));
  if (params.categoryId) qs.set('categoryId', String(params.categoryId));
  if (params.truckId) qs.set('truckId', String(params.truckId));
  if (params.dateFrom) qs.set('dateFrom', params.dateFrom);
  if (params.dateTo) qs.set('dateTo', params.dateTo);

  return useQuery<PaginatedResponse<ExpenseWithRefs>>({
    queryKey: ['expenses', params],
    queryFn: () => api.get(`${FINANCIAL.EXPENSES}?${qs}`),
  });
}

export default function ExpenseListPage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [page, setPage] = useState(1);
  const [supplierId, setSupplierId] = useState<number | ''>('');
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [truckId, setTruckId] = useState<number | ''>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { data: expenseData, isLoading, error: queryError, refetch } = useExpenses({
    page,
    supplierId: supplierId || undefined,
    categoryId: categoryId || undefined,
    truckId: truckId || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  });

  const { data: catalogData } = useCatalogs();
  const trucks = catalogData?.trucks ?? [];

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [catalogsLoaded, setCatalogsLoaded] = useState(false);

  useQuery({
    queryKey: ['expense-catalogs'],
    queryFn: async () => {
      const [supRes, catRes] = await Promise.all([
        api.get<PaginatedResponse<Supplier>>(CONFIG.SUPPLIERS),
        api.get<PaginatedResponse<ExpenseCategory>>(CONFIG.EXPENSE_CATEGORIES),
      ]);
      setSuppliers(supRes.items);
      setCategories(catRes.items);
      setCatalogsLoaded(true);
      return { suppliers: supRes.items, categories: catRes.items };
    },
    enabled: !catalogsLoaded,
    staleTime: 5 * 60 * 1000,
  });

  const expenses = expenseData?.items ?? [];
  const total = expenseData?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const error = queryError ? 'Không thể tải dữ liệu' : null;

  const resetFilters = () => {
    setSupplierId('');
    setCategoryId('');
    setTruckId('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const hasFilters = supplierId || categoryId || truckId || dateFrom || dateTo;

  return (
    <div className="fade-up">
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } .spin { animation: spin 0.8s linear infinite; }`}</style>

      <PageHeader
        title="Phiếu chi phí"
        description={`${total} phiếu chi phí`}
        action={
          <button className="btn btn--primary btn--sm" onClick={() => navigate('/expenses/new')}>
            <Plus size={14} /> Thêm phiếu chi
          </button>
        }
      />

      {/* Filter toolbar */}
      <div className="toolbar" style={{ flexWrap: 'wrap', gap: 8 }}>
        <select
          className="input"
          value={supplierId}
          onChange={e => { setSupplierId(e.target.value ? Number(e.target.value) : ''); setPage(1); }}
          style={{ fontSize: 12.5, minWidth: 140 }}
        >
          <option value="">Tất cả NCC</option>
          {suppliers.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>

        <select
          className="input"
          value={categoryId}
          onChange={e => { setCategoryId(e.target.value ? Number(e.target.value) : ''); setPage(1); }}
          style={{ fontSize: 12.5, minWidth: 140 }}
        >
          <option value="">Tất cả hạng mục</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <select
          className="input"
          value={truckId}
          onChange={e => { setTruckId(e.target.value ? Number(e.target.value) : ''); setPage(1); }}
          style={{ fontSize: 12.5, minWidth: 130 }}
        >
          <option value="">Tất cả xe</option>
          {trucks.map(t => (
            <option key={t.id} value={t.id}>{t.licensePlate}</option>
          ))}
        </select>

        <input
          type="date"
          className="input"
          value={dateFrom}
          onChange={e => { setDateFrom(e.target.value); setPage(1); }}
          style={{ fontSize: 12.5, width: 140 }}
          placeholder="Từ ngày"
        />
        <input
          type="date"
          className="input"
          value={dateTo}
          onChange={e => { setDateTo(e.target.value); setPage(1); }}
          style={{ fontSize: 12.5, width: 140 }}
          placeholder="Đến ngày"
        />

        {hasFilters && (
          <button className="btn btn--ghost btn--sm" onClick={resetFilters}>
            Xóa bộ lọc
          </button>
        )}
      </div>

      {error && (
        <div className="panel" style={{ padding: 16, color: 'var(--danger)', marginBottom: 20 }}>
          {error}
          <button className="btn btn--secondary btn--sm" style={{ marginLeft: 12 }} onClick={() => refetch()}>Thử lại</button>
        </div>
      )}

      {/* Mobile card view */}
      <div className="mobile-only mobile-table-wrap">
        <div className="m-card-list">
          {isLoading ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--ink-3)' }}>
              <Loader2 size={22} className="spin" style={{ display: 'inline-block', marginBottom: 8 }} />
              <p>Đang tải...</p>
            </div>
          ) : expenses.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--ink-3)' }}>
              Chưa có phiếu chi phí nào.
            </div>
          ) : (
            expenses.map(e => (
              <div
                key={e.id}
                className="m-card"
                onClick={() => navigate(`/expenses/${e.id}/edit`)}
                style={{ cursor: 'pointer' }}
              >
                <div className="m-card__top">
                  <span className="m-card__title">
                    {(e.supplier?.name) || '—'}
                  </span>
                  <StatusPill variant={e.paymentStatus === 'PAID' ? 'success' : 'warn'}>
                    {e.paymentStatus === 'PAID' ? 'Đã trả' : 'Ghi nợ'}
                  </StatusPill>
                </div>
                <div className="m-card__meta">
                  {formatDate(e.expenseDate)}
                  {e.category && <><span className="m-card__meta-sep">·</span>{e.category.name}</>}
                </div>
                <div className="m-card__row">
                  <span className="m-card__row-label">Số tiền</span>
                  <span className="m-card__row-value" style={{ fontWeight: 700, color: 'var(--danger)' }}>
                    {formatCurrency(e.amount)}
                  </span>
                </div>
                {e.truck && (
                  <div className="m-card__row">
                    <span className="m-card__row-label">Xe</span>
                    <span className="m-card__row-value">{e.truck.licensePlate}</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Desktop table */}
      <div className="desktop-only table-wrap">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Ngày</th>
                <th>Nhà cung cấp</th>
                <th>Hạng mục</th>
                <th>Xe</th>
                <th className="num">Số tiền</th>
                <th>Trạng thái</th>
                <th style={{ width: 48 }}></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--ink-3)' }}>
                    <Loader2 size={22} className="spin" style={{ display: 'inline-block', marginBottom: 8 }} />
                    <p>Đang tải...</p>
                  </td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--ink-3)' }}>
                    Chưa có phiếu chi phí nào.
                  </td>
                </tr>
              ) : (
                expenses.map(e => (
                  <tr
                    key={e.id}
                    onClick={() => navigate(`/expenses/${e.id}/edit`)}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={ev => (ev.currentTarget.style.background = 'var(--surface-2)')}
                    onMouseLeave={ev => (ev.currentTarget.style.background = '')}
                  >
                    <td style={{ whiteSpace: 'nowrap' }}>{formatDate(e.expenseDate)}</td>
                    <td style={{ fontWeight: 600 }}>{e.supplier?.name || '—'}</td>
                    <td>{e.category?.name || '—'}</td>
                    <td>{e.truck?.licensePlate || <span style={{ color: 'var(--fg-3)' }}>—</span>}</td>
                    <td className="num typo-mono" style={{ fontWeight: 700, color: 'var(--danger)' }}>
                      {formatCurrency(e.amount)}
                    </td>
                    <td>
                      <StatusPill variant={e.paymentStatus === 'PAID' ? 'success' : 'warn'}>
                        {e.paymentStatus === 'PAID' ? 'Đã trả' : 'Ghi nợ'}
                      </StatusPill>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <ChevronRight size={14} style={{ color: 'var(--fg-3)' }} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="table-foot">
          <span>
            Đang hiển thị{' '}
            <strong style={{ color: 'var(--ink)', fontFamily: 'var(--font-mono)' }}>
              {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, total)}
            </strong>{' '}
            trên <strong style={{ color: 'var(--ink)', fontFamily: 'var(--font-mono)' }}>{total}</strong> phiếu
          </span>
          <div className="pagination">
            <button className="page-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>‹</button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const p = i + 1;
              return (
                <button key={p} className={`page-btn${p === page ? ' is-active' : ''}`} onClick={() => setPage(p)}>
                  {p}
                </button>
              );
            })}
            <button className="page-btn" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>›</button>
          </div>
        </div>
      </div>
    </div>
  );
}
