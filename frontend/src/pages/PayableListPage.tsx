import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatCurrency, formatCompact } from '../lib/format';
import { downloadCSV } from '../lib/csv';
import type { PayableSummary } from '@tingting/shared';
import { Search, ChevronRight } from 'lucide-react';
import { PageHeader } from '../components/UI';
import { usePayablesSummary } from '../hooks/useQueries';
import { splitKpi } from '../features/dashboard/utils';

interface PayablesResponse {
  items: PayableSummary[];
  totalOutstanding: string;
  totalSuppliers: number;
  overdueSuppliers: number;
}

export default function PayableListPage() {
  const navigate = useNavigate();
  const { data, isLoading: loading, error: queryError } = usePayablesSummary();
  const payables = (data as unknown as PayablesResponse | undefined)?.items ?? [];
  const apiTotal = (data as unknown as PayablesResponse | undefined)?.totalOutstanding;
  const apiSupplierCount = (data as unknown as PayablesResponse | undefined)?.totalSuppliers ?? 0;
  const apiOverdueCount = (data as unknown as PayablesResponse | undefined)?.overdueSuppliers ?? 0;
  const error = queryError ? (queryError as Error).message : null;
  const [search, setSearch] = useState('');

  const totals = useMemo(() => {
    const sum = {
      total: apiTotal ? parseFloat(apiTotal) : 0,
      current: 0,
      d30: 0,
      d60: 0,
      over90: 0,
      currentCount: 0,
      d30Count: 0,
      d60Count: 0,
      over90Count: 0,
      supplierCount: apiSupplierCount,
      overdueCount: apiOverdueCount,
    };

    payables.forEach(d => {
      if (d.totalOutstanding > 0) {
        if (d.aging.current > 0) { sum.current += d.aging.current; sum.currentCount++; }
        if (d.aging.d30 > 0) { sum.d30 += d.aging.d30; sum.d30Count++; }
        if (d.aging.d60 > 0) { sum.d60 += d.aging.d60; sum.d60Count++; }
        if (d.aging.over90 > 0) { sum.over90 += d.aging.over90; sum.over90Count++; }
      }
    });

    return sum;
  }, [payables, apiTotal, apiSupplierCount, apiOverdueCount]);

  const filteredPayables = useMemo(() => {
    let result = payables;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(d =>
        d.supplier.name.toLowerCase().includes(q) ||
        (d.supplier.phone && d.supplier.phone.toLowerCase().includes(q))
      );
    }
    return result;
  }, [payables, search]);

  const kpiTotal = splitKpi(totals.total);
  const kpiCurrent = splitKpi(totals.current);
  const kpiD30 = splitKpi(totals.d30);
  const kpiD60 = splitKpi(totals.d60);
  const kpiOver90 = splitKpi(totals.over90);

  return (
    <div className="fade-up">
      <PageHeader
        title="Công nợ phải trả"
        description={`Tổng nợ: ${formatCurrency(totals.total)} • ${totals.supplierCount} NCC • cập nhật vừa xong`}
        action={
          <div className="page-actions">
            <button className="btn btn--secondary btn--sm" onClick={() => {
              const headers = ['Nhà cung cấp', 'Tổng nợ', '0-30 ngày', '31-60 ngày', '61-90 ngày', '>90 ngày'];
              const rows = filteredPayables.map(d => [
                d.supplier.name,
                d.totalOutstanding,
                d.aging.current,
                d.aging.d30,
                d.aging.d60,
                d.aging.over90,
              ]);
              downloadCSV(`cong-no-phai-tra-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
            }}>
              <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Xuất báo cáo
            </button>
          </div>
        }
      />

      {/* Redesigned Compact KPI Strip */}
      <div className="payables-summary-bar">
        <div className="payables-summary-item">
          <div className="payables-summary-header">
            <span className="payables-summary-dot payables-summary-dot--total"></span>
            <span className="payables-summary-label">Tổng nợ</span>
          </div>
          <div className="payables-summary-main">
            <span className="payables-summary-value">
              {kpiTotal.num}
              <span className="payables-summary-unit">{kpiTotal.suffix && `${kpiTotal.suffix}`} ₫</span>
            </span>
            <span className="payables-summary-count">{totals.supplierCount} NCC</span>
          </div>
        </div>

        <div className="payables-summary-item">
          <div className="payables-summary-header">
            <span className="payables-summary-dot payables-summary-dot--current"></span>
            <span className="payables-summary-label">0–30 ngày</span>
          </div>
          <div className="payables-summary-main">
            <span className="payables-summary-value">
              {kpiCurrent.num}
              <span className="payables-summary-unit">{kpiCurrent.suffix && `${kpiCurrent.suffix}`} ₫</span>
            </span>
            <span className="payables-summary-count">{totals.currentCount} NCC</span>
          </div>
        </div>

        <div className="payables-summary-item">
          <div className="payables-summary-header">
            <span className="payables-summary-dot payables-summary-dot--d30"></span>
            <span className="payables-summary-label">31–60 ngày</span>
          </div>
          <div className="payables-summary-main">
            <span className="payables-summary-value">
              {kpiD30.num}
              <span className="payables-summary-unit">{kpiD30.suffix && `${kpiD30.suffix}`} ₫</span>
            </span>
            <span className="payables-summary-count">{totals.d30Count} NCC</span>
          </div>
        </div>

        <div className="payables-summary-item">
          <div className="payables-summary-header">
            <span className="payables-summary-dot payables-summary-dot--d60"></span>
            <span className="payables-summary-label">61–90 ngày</span>
          </div>
          <div className="payables-summary-main">
            <span className="payables-summary-value">
              {kpiD60.num}
              <span className="payables-summary-unit">{kpiD60.suffix && `${kpiD60.suffix}`} ₫</span>
            </span>
            <span className="payables-summary-count">{totals.d60Count} NCC</span>
          </div>
        </div>

        <div className="payables-summary-item">
          <div className="payables-summary-header">
            <span className="payables-summary-dot payables-summary-dot--over90"></span>
            <span className="payables-summary-label">Trên 90 ngày</span>
          </div>
          <div className="payables-summary-main">
            <span className="payables-summary-value">
              {kpiOver90.num}
              <span className="payables-summary-unit">{kpiOver90.suffix && `${kpiOver90.suffix}`} ₫</span>
            </span>
            <span className="payables-summary-count">{totals.over90Count} NCC</span>
          </div>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="toolbar payables-toolbar">
        <div className="toolbar__spacer" />
        <div className="toolbar__search">
          <Search size={14} style={{ color: 'var(--fg-3)' }} />
          <input
            type="text"
            placeholder="Tìm nhà cung cấp…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <div className="panel" style={{ padding: 16, color: 'var(--danger)', marginBottom: 20 }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--fg-3)' }}>
          Đang tải dữ liệu công nợ phải trả...
        </div>
      ) : (
        <>
        {/* Mobile card list */}
        <div className="mobile-only mobile-table-wrap">
          <div className="m-card-list">
            {filteredPayables.length === 0 ? (
              <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--ink-3)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <img src="/assets/illustrations/empty-payables.svg" alt="" aria-hidden="true" style={{ width: 140, height: 116, objectFit: 'contain' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                Không tìm thấy dữ liệu.
              </div>
            ) : (
              filteredPayables.map(d => {
                const totalAging = d.aging.current + d.aging.d30 + d.aging.d60 + d.aging.over90;
                const pctCurrent = totalAging > 0 ? (d.aging.current / totalAging) * 100 : 100;
                const pct30 = totalAging > 0 ? (d.aging.d30 / totalAging) * 100 : 0;
                const pct60 = totalAging > 0 ? (d.aging.d60 / totalAging) * 100 : 0;
                const pct90 = totalAging > 0 ? (d.aging.over90 / totalAging) * 100 : 0;
                return (
                  <div key={d.supplier.id} className="m-card" onClick={() => navigate(`/payables/${d.supplier.id}`)} role="button" tabIndex={0} onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); navigate(`/payables/${d.supplier.id}`); } }}>
                    <div className="m-card__top">
                      <span className="m-card__title">{d.supplier.name}</span>
                      <span className={`m-card__row-value${d.totalOutstanding > 0 ? '--danger' : '--success'} m-card__row-value`} style={{ fontSize: 13.5 }}>
                        {formatCurrency(d.totalOutstanding)}
                      </span>
                    </div>
                    {d.supplier.phone && (
                      <div className="m-card__meta">{d.supplier.phone}</div>
                    )}
                    {d.totalOutstanding > 0 && (
                      <>
                        <div className="aging-bar" style={{ height: 5, borderRadius: 3, overflow: 'hidden', display: 'flex', marginTop: 8, marginBottom: 4 }}>
                          <div className="aging-bar__seg aging-bar__seg--ok" style={{ width: `${pctCurrent}%` }} />
                          <div className="aging-bar__seg aging-bar__seg--t1" style={{ width: `${pct30}%` }} />
                          <div className="aging-bar__seg aging-bar__seg--t2" style={{ width: `${pct60}%` }} />
                          <div className="aging-bar__seg aging-bar__seg--t4" style={{ width: `${pct90}%` }} />
                        </div>
                        {d.maxOverdueDays > 0 && (
                          <div className="m-card__row">
                            <span className="m-card__row-label">Quá hạn lớn nhất</span>
                            <span style={{ fontSize: 12, fontWeight: 600, color: d.maxOverdueDays > 60 ? 'var(--danger)' : 'var(--warning)' }}>
                              {d.maxOverdueDays} ngày
                            </span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Desktop table */}
        <div className="desktop-only table-wrap">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Nhà cung cấp</th>
                  <th className="num">Tổng nợ</th>
                  <th>0-30 ngày</th>
                  <th>31-60 ngày</th>
                  <th>61-90 ngày</th>
                  <th>&gt;90 ngày</th>
                  <th style={{ width: 48 }}></th>
                </tr>
              </thead>
              <tbody>
                {filteredPayables.map(d => (
                  <tr
                    key={d.supplier.id}
                    onClick={() => navigate(`/payables/${d.supplier.id}`)} role="button" tabIndex={0} onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); navigate(`/payables/${d.supplier.id}`); } }}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', fontWeight: 600, color: 'var(--fg-1)' }}>
                        {d.supplier.name}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--fg-3)' }}>
                        {d.supplier.phone || '—'}
                      </div>
                    </td>
                    <td className="num typo-mono" style={{
                      fontWeight: 700,
                      color: d.totalOutstanding > 0 ? 'var(--danger)' : 'var(--success)'
                    }}>
                      {formatCurrency(d.totalOutstanding)}
                    </td>
                    <td className="num" style={{ fontSize: 13, color: d.aging.current > 0 ? 'var(--fg-1)' : 'var(--fg-3)' }}>
                      {d.aging.current > 0 ? formatCurrency(d.aging.current) : '—'}
                    </td>
                    <td className="num" style={{ fontSize: 13, color: d.aging.d30 > 0 ? 'var(--warning)' : 'var(--fg-3)' }}>
                      {d.aging.d30 > 0 ? formatCurrency(d.aging.d30) : '—'}
                    </td>
                    <td className="num" style={{ fontSize: 13, color: d.aging.d60 > 0 ? '#D97706' : 'var(--fg-3)' }}>
                      {d.aging.d60 > 0 ? formatCurrency(d.aging.d60) : '—'}
                    </td>
                    <td className="num" style={{ fontSize: 13, color: d.aging.over90 > 0 ? 'var(--danger)' : 'var(--fg-3)' }}>
                      {d.aging.over90 > 0 ? formatCurrency(d.aging.over90) : '—'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <ChevronRight size={14} style={{ color: 'var(--fg-3)' }} />
                    </td>
                  </tr>
                ))}

                {filteredPayables.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '24px 40px', color: 'var(--fg-3)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                        <img src="/assets/illustrations/empty-payables.svg" alt="" aria-hidden="true" style={{ width: 130, height: 108, objectFit: 'contain' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        Không tìm thấy dữ liệu công nợ phải trả.
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        </>
      )}
    </div>
  );
}
