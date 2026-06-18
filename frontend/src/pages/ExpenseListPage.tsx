import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ChevronRight, ChevronLeft, Receipt, AlertTriangle, CheckCircle2, X, Loader2 } from 'lucide-react';
import { api } from '../lib/api';
import { configClient } from '../api/configClient';
import { formatCurrency, formatCompact, formatDate } from '../lib/format';
import { splitKpi } from '../features/dashboard/utils';
import { PageHeader } from '../components/UI';
import { ClickableCard } from '../components/shared/ClickableCard';
import { StatusStrip } from '../components/shared/StatusStrip';
import { useCatalogs } from '../hooks/useCatalogs';
import { useQuery } from '@tanstack/react-query';
import { usePageAnimations, useListAnimations } from '../hooks/animations';
import { FINANCIAL } from '@tingting/shared';
import type { ExpenseWithRefs, PaginatedResponse, Supplier, ExpenseCategory } from '@tingting/shared';
import { qk } from '../api/keys';
import './ExpenseListPage.css';

const PAGE_SIZE = 20;

const EXPENSE_STATUS_COLORS: Record<string, string> = {
  PAID: '#059669',
  UNPAID: '#D97706',
};

// eslint-disable-next-line react-refresh/only-export-components -- page-scoped query hook co-located with its consumer page
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
    queryKey: qk.financial.expenses(params),
    queryFn: () => api.get(`${FINANCIAL.EXPENSES}?${qs}`),
  });
}

export default function ExpenseListPage() {
  const navigate = useNavigate();

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

  const { rootRef } = usePageAnimations({ ready: !isLoading });

  const { data: catalogData } = useCatalogs();
  const trucks = catalogData?.trucks ?? [];

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [catalogsLoaded, setCatalogsLoaded] = useState(false);

  useQuery({
    // eslint-disable-next-line @tingting/no-bare-query-key -- compound query combining suppliers + expense categories; no single qk domain key fits
    queryKey: ['expense-catalogs'],
    queryFn: async () => {
      const [suppliers, categories] = await Promise.all([
        configClient.getAllSuppliers(),
        configClient.getAllExpenseCategories(),
      ]);
      setSuppliers(suppliers);
      setCategories(categories);
      setCatalogsLoaded(true);
      return { suppliers, categories };
    },
    enabled: !catalogsLoaded,
    staleTime: 5 * 60 * 1000,
  });

  const expenses = expenseData?.items ?? [];
  const total = expenseData?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const error = queryError ? 'Không thể tải dữ liệu' : null;

  useListAnimations({
    itemSelector: '.expense-table tbody tr',
    mode: 'rows',
    deps: [expenses, isLoading],
  });
  useListAnimations({
    itemSelector: '.m-card',
    mode: 'cards',
    deps: [expenses, isLoading],
  });

  const resetFilters = () => {
    setSupplierId('');
    setCategoryId('');
    setTruckId('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const stats = useMemo(() => {
    const items = expenseData?.items ?? [];
    const totalAmount = items.reduce((s, e) => s + parseFloat(String(e.amount)), 0);
    const unpaidItems = items.filter(e => e.paymentStatus === 'UNPAID');
    const paidItems = items.filter(e => e.paymentStatus === 'PAID');
    const unpaidAmount = unpaidItems.reduce((s, e) => s + parseFloat(String(e.amount)), 0);
    const paidAmount = paidItems.reduce((s, e) => s + parseFloat(String(e.amount)), 0);
    return { totalAmount, unpaidCount: unpaidItems.length, unpaidAmount, paidCount: paidItems.length, paidAmount };
  }, [expenseData]);

  const hasFilters = supplierId || categoryId || truckId || dateFrom || dateTo;
  const kpiTotal = splitKpi(stats.totalAmount);

  const renderStatusBadge = (status: string) => status === 'PAID' ? (
    <span className="expense-status expense-status--paid">
      <span className="expense-status__dot" /> Đã trả
    </span>
  ) : (
    <span className="expense-status expense-status--unpaid">
      <span className="expense-status__dot" /> Ghi nợ
    </span>
  );

  const renderEmptyState = () => (
    <div className="expense-empty">
      <img src="/assets/illustrations/empty-expenses.svg" alt="" aria-hidden="true" style={{ width: 160, height: 132, objectFit: 'contain', marginBottom: 8 }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
      <p className="expense-empty__text">Chưa có khoản chi phí nào.</p>
    </div>
  );

  const renderLoadingState = () => (
    <div className="expense-loading">
      <Loader2 size={22} className="spin" style={{ display: 'inline-block', marginBottom: 8 }} />
      <p>Đang tải…</p>
    </div>
  );

  return (
    <div ref={rootRef} className="expense-list-page">
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } .spin { animation: spin 0.8s linear infinite; }`}</style>

      <PageHeader
        title="Chi phí phát sinh"
        description={`${total} khoản chi phí`}
        action={
          <button className="btn btn--primary" onClick={() => navigate('/expenses/new')}>
            <Plus size={15} /> Thêm phiếu chi
          </button>
        }
      />

      {/* ── KPI Cards ────────────────────────────────────────────────── */}
      <div className="expense-kpi-grid">
        <div className="expense-kpi-card expense-kpi-card--total">
          <div className="expense-kpi-label">
            <span className="expense-kpi-label__icon">
              <Receipt size={14} />
            </span>
            Tổng chi phí
          </div>
          <div className="expense-kpi-value">
            {kpiTotal.num}
            {kpiTotal.suffix && <span className="expense-kpi-value-unit">{kpiTotal.suffix} ₫</span>}
            {!kpiTotal.suffix && <span className="expense-kpi-value-unit">₫</span>}
          </div>
        </div>

        <div className="expense-kpi-card expense-kpi-card--unpaid">
          <div className="expense-kpi-label">
            <span className="expense-kpi-label__icon">
              <AlertTriangle size={14} />
            </span>
            Chưa thanh toán
          </div>
          <div className="expense-kpi-value">
            {stats.unpaidCount}
            <span className="expense-kpi-value-unit">phiếu</span>
          </div>
          <div className="expense-kpi-meta">{formatCompact(stats.unpaidAmount)}</div>
        </div>

        <div className="expense-kpi-card expense-kpi-card--paid">
          <div className="expense-kpi-label">
            <span className="expense-kpi-label__icon">
              <CheckCircle2 size={14} />
            </span>
            Đã thanh toán
          </div>
          <div className="expense-kpi-value">
            {stats.paidCount}
            <span className="expense-kpi-value-unit">phiếu</span>
          </div>
          <div className="expense-kpi-meta">{formatCompact(stats.paidAmount)}</div>
        </div>
      </div>

      {/* ── Filter Bar ───────────────────────────────────────────────── */}
      <div className="expense-filter-bar">
        <select
          className="expense-filter-bar__select"
          value={supplierId}
          onChange={e => { setSupplierId(e.target.value ? Number(e.target.value) : ''); setPage(1); }}
        >
          <option value="">Tất cả NCC</option>
          {suppliers.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>

        <select
          className="expense-filter-bar__select"
          value={categoryId}
          onChange={e => { setCategoryId(e.target.value ? Number(e.target.value) : ''); setPage(1); }}
        >
          <option value="">Tất cả hạng mục</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <select
          className="expense-filter-bar__select"
          value={truckId}
          onChange={e => { setTruckId(e.target.value ? Number(e.target.value) : ''); setPage(1); }}
        >
          <option value="">Tất cả xe</option>
          {trucks.map(t => (
            <option key={t.id} value={t.id}>{t.licensePlate}</option>
          ))}
        </select>

        <div className="expense-filter-bar__divider" />

        <input
          type="date"
          className="expense-filter-bar__date"
          value={dateFrom}
          onChange={e => { setDateFrom(e.target.value); setPage(1); }}
          placeholder="Từ ngày"
        />
        <input
          type="date"
          className="expense-filter-bar__date"
          value={dateTo}
          onChange={e => { setDateTo(e.target.value); setPage(1); }}
          placeholder="Đến ngày"
        />

        {hasFilters && (
          <button className="expense-filter-bar__reset" onClick={resetFilters}>
            <X size={12} /> Xóa bộ lọc
          </button>
        )}
      </div>

      {error && (
        <div className="panel" style={{ padding: 16, color: 'var(--danger)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12, background: 'var(--danger-soft)', border: '1px solid rgba(227,36,52,0.2)', borderRadius: 12 }}>
          <AlertTriangle size={16} style={{ flexShrink: 0 }} />
          <span style={{ flex: 1 }}>{error}</span>
          <button className="btn btn--secondary btn--sm" onClick={() => refetch()}>Thử lại</button>
        </div>
      )}

      {/* Mobile card view */}
      <div className="mobile-only mobile-table-wrap">
        <div className="m-card-list">
          {isLoading ? (
            renderLoadingState()
          ) : expenses.length === 0 ? (
            renderEmptyState()
          ) : (
            expenses.map(e => (
              <ClickableCard
                key={e.id}
                to={`/expenses/${e.id}/edit`}
                className="m-card m-card--strip"
                style={{ cursor: 'pointer' }}
              >
                <StatusStrip color={EXPENSE_STATUS_COLORS[e.paymentStatus] ?? '#999'} />
                <div className="m-card__top">
                  <span className="m-card__title">
                    {(e.supplier?.name) || '—'}
                  </span>
                  {renderStatusBadge(e.paymentStatus)}
                </div>
                <div className="m-card__meta">
                  {formatDate(e.expenseDate)}
                  {e.category && <><span className="m-card__meta-sep">·</span>{e.category.name}</>}
                </div>
                <div className="expense-mobile-card__summary">
                  <span className={`expense-amount expense-amount--${e.paymentStatus === 'PAID' ? 'paid' : 'unpaid'}`}>
                    {formatCurrency(e.amount)}
                  </span>
                  <span className="expense-mobile-card__vehicle">
                    {(e.truck || e.trailer) ? (
                      <span className="expense-plate">
                        {e.vehicleComponent === 'TRAILER'
                          ? (e.trailer?.licensePlate || '—')
                          : (e.truck?.licensePlate || '—')
                        }
                      </span>
                    ) : (
                      <span className="expense-mobile-card__muted">Không gắn xe</span>
                    )}
                    {e.vehicleComponent && (
                      <span className="expense-mobile-card__component">
                        {e.vehicleComponent === 'TRAILER' ? 'Rơ-mooc' : 'Đầu kéo'}
                      </span>
                    )}
                  </span>
                </div>
              </ClickableCard>
            ))
          )}
        </div>
      </div>

      {/* Desktop table */}
      <div className="desktop-only expense-table-wrap">
        <div className="expense-table-scroll">
          <table className="expense-table">
            <thead>
              <tr>
                <th>Ngày</th>
                <th>Nhà cung cấp</th>
                <th>Hạng mục</th>
                <th>Xe</th>
                <th>Thành phần</th>
                <th className="num">Số tiền</th>
                <th>Trạng thái</th>
                <th style={{ width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8}>{renderLoadingState()}</td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={8}>{renderEmptyState()}</td>
                </tr>
              ) : (
                expenses.map(e => (
                  <tr key={e.id} role="button" tabIndex={0}
                    className="expense-row--strip"
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/expenses/${e.id}/edit`)}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}
                    onKeyDown={ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); navigate(`/expenses/${e.id}/edit`); } }}
                  >
                    <td style={{ whiteSpace: 'nowrap', color: 'var(--ink-2)', position: 'relative' }}>
                      <StatusStrip color={EXPENSE_STATUS_COLORS[e.paymentStatus] ?? '#999'} />
                      {formatDate(e.expenseDate)}
                    </td>
                    <td style={{ fontWeight: 600 }}>{e.supplier?.name || '—'}</td>
                    <td style={{ color: 'var(--ink-2)' }}>{e.category?.name || '—'}</td>
                    <td>
                      {e.vehicleComponent === 'TRAILER'
                        ? (e.trailer?.licensePlate ? <span className="expense-plate">{e.trailer.licensePlate}</span> : <span style={{ color: 'var(--ink-4)' }}>—</span>)
                        : (e.truck?.licensePlate ? <span className="expense-plate">{e.truck.licensePlate}</span> : <span style={{ color: 'var(--ink-4)' }}>—</span>)
                      }
                    </td>
                    <td style={{ color: 'var(--ink-2)' }}>{e.vehicleComponent === 'TRAILER' ? 'Rơ-mooc' : e.vehicleComponent === 'TRUCK' ? 'Đầu kéo' : ''}</td>
                    <td className={`num expense-amount expense-amount--${e.paymentStatus === 'PAID' ? 'paid' : 'unpaid'}`}>
                      {formatCurrency(e.amount)}
                    </td>
                    <td>
                      {renderStatusBadge(e.paymentStatus)}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <ChevronRight size={14} style={{ color: 'var(--ink-4)' }} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="expense-table-foot">
          <span>
            Đang hiển thị{' '}
            <strong style={{ color: 'var(--ink)', fontFamily: 'var(--font-mono)' }}>
              {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, total)}
            </strong>{' '}
            trên <strong style={{ color: 'var(--ink)', fontFamily: 'var(--font-mono)' }}>{total}</strong> phiếu
          </span>
          <div className="expense-pagination">
            <button className="expense-page-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft size={14} />
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const p = i + 1;
              return (
                <button key={p} className={`expense-page-btn${p === page ? ' is-active' : ''}`} onClick={() => setPage(p)}>
                  {p}
                </button>
              );
            })}
            <button className="expense-page-btn" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
