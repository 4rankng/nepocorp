import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatCurrency, formatCompact } from '../lib/format';
import { downloadCSV } from '../lib/csv';
import type { PayableSummary } from '@tingting/shared';
import { Search, ChevronRight, Wallet, AlertTriangle, Users } from 'lucide-react';
import { PageHeader } from '../components/UI';
import { ClickableCard } from '../components/shared/ClickableCard';
import { usePayablesSummary } from '../hooks/useQueries';
import { usePageAnimations } from '../hooks/animations';
import { useCounterAnimation } from '../hooks/animations/useCounterAnimation';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import './PayableListPage.css';
import '../components/shared/HeroKpiRow.css';

/* ─── Types ───────────────────────────────────────────────────────────────── */

interface PayablesResponse {
  items: PayableSummary[];
  totalOutstanding: string;
  totalSuppliers: number;
  overdueSuppliers: number;
}

/* ─── Component ───────────────────────────────────────────────────────────── */

export default function PayableListPage() {
  const navigate = useNavigate();
  const { data, isLoading: loading, error: queryError } = usePayablesSummary();
  const payables = (data as unknown as PayablesResponse | undefined)?.items ?? [];
  const apiTotal = (data as unknown as PayablesResponse | undefined)?.totalOutstanding;
  const apiSupplierCount = (data as unknown as PayablesResponse | undefined)?.totalSuppliers ?? 0;
  const apiOverdueCount = (data as unknown as PayablesResponse | undefined)?.overdueSuppliers ?? 0;
  const error = queryError ? (queryError as Error).message : null;
  const [search, setSearch] = useState('');
  const prefersReduced = usePrefersReducedMotion();

  /* ── Page entrance animation (custom selectors for bento zones) ── */
  const { rootRef } = usePageAnimations({
    ready: !loading,
    selectors: [
      '.payables-hero',
      '.payables-kpi-mini',
      '.aging-card',
      '.payables-data-card',
    ],
  });

  /* ── Counter animation ── */
  const { animateCounters } = useCounterAnimation({ duration: 1200, delay: 400 });

  const heroTotalRef = useRef<HTMLSpanElement>(null);
  const overdueRef = useRef<HTMLSpanElement>(null);
  const activeSuppliersRef = useRef<HTMLSpanElement>(null);
  const agingCurrentRef = useRef<HTMLSpanElement>(null);
  const agingD30Ref = useRef<HTMLSpanElement>(null);
  const agingD60Ref = useRef<HTMLSpanElement>(null);
  const agingOver90Ref = useRef<HTMLSpanElement>(null);

  /* ── Derived data ── */
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

  /* ── Kick counter animations when data settles ── */
  useEffect(() => {
    if (loading || payables.length === 0 || prefersReduced) return;

    animateCounters([
      { el: heroTotalRef.current, value: totals.total, format: (v) => formatCompact(v) },
      { el: overdueRef.current, value: totals.overdueCount },
      { el: activeSuppliersRef.current, value: totals.supplierCount },
      { el: agingCurrentRef.current, value: totals.current, format: (v) => formatCompact(v) },
      { el: agingD30Ref.current, value: totals.d30, format: (v) => formatCompact(v) },
      { el: agingD60Ref.current, value: totals.d60, format: (v) => formatCompact(v) },
      { el: agingOver90Ref.current, value: totals.over90, format: (v) => formatCompact(v) },
    ]);
  }, [loading, payables.length, totals, animateCounters, prefersReduced]);

  /* ── Aging progress percentages ── */
  const agingTotal = totals.current + totals.d30 + totals.d60 + totals.over90 || 1;
  const pctCurrent = (totals.current / agingTotal) * 100;
  const pctD30 = (totals.d30 / agingTotal) * 100;
  const pctD60 = (totals.d60 / agingTotal) * 100;
  const pctOver90 = (totals.over90 / agingTotal) * 100;

  /* ── CSV export ── */
  const handleExport = () => {
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
  };

  return (
    <div ref={rootRef} className="payables-page">
      <PageHeader
        title="Công nợ phải trả"
        description={`Tổng nợ: ${formatCurrency(totals.total)} · ${totals.supplierCount} NCC · cập nhật vừa xong`}
        action={
          <div className="page-actions">
            <button className="btn btn--secondary btn--sm" onClick={handleExport}>
              <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Xuất báo cáo
            </button>
          </div>
        }
      />

      {/* ── Zone 1: Hero KPI Row ────────────────────────────────────────── */}
      <div className="payables-hero-row">
        {/* Hero card — span 3 */}
        <div className="payables-hero">
          <span className="payables-hero__eyebrow">Tổng công nợ phải trả</span>
          <span className="payables-hero__amount">
            <span ref={heroTotalRef}>{formatCompact(totals.total)}</span>{' '}₫
          </span>
          <span className="payables-hero__subtitle">
            {totals.supplierCount} nhà cung cấp · cập nhật vừa xong
          </span>
          <Wallet
            size={72}
            className="payables-hero__watermark"
            aria-hidden="true"
          />
        </div>

        {/* Stacked mini-KPI cards — span 1 */}
        <div className="payables-kpi-stack">
          <div className="payables-kpi-mini payables-kpi-mini--danger">
            <div className="payables-kpi-mini__icon">
              <AlertTriangle size={16} />
            </div>
            <div className="payables-kpi-mini__body">
              <span className="payables-kpi-mini__value" ref={overdueRef}>
                {prefersReduced ? totals.overdueCount : 0}
              </span>
              <span className="payables-kpi-mini__label">quá hạn</span>
            </div>
          </div>
          <div className="payables-kpi-mini payables-kpi-mini--accent">
            <div className="payables-kpi-mini__icon">
              <Users size={16} />
            </div>
            <div className="payables-kpi-mini__body">
              <span className="payables-kpi-mini__value" ref={activeSuppliersRef}>
                {prefersReduced ? totals.supplierCount : 0}
              </span>
              <span className="payables-kpi-mini__label">nhà cung cấp</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Zone 2: Aging Distribution ──────────────────────────────────── */}
      <div className="payables-aging-grid">
        {/* 0–30 days */}
        <div className="aging-card aging-card--ok">
          <div className="aging-card__header">
            <span className="aging-card__dot aging-card__dot--ok" />
            <span className="aging-card__label">0–30 ngày</span>
          </div>
          <span className="aging-card__value">
            <span ref={agingCurrentRef}>{formatCompact(totals.current)}</span>{' '}₫
          </span>
          <span className="aging-card__count">{totals.currentCount} NCC</span>
          <div className="aging-card__bar-track">
            <div className="aging-card__bar aging-card__bar--ok" style={{ width: `${pctCurrent}%` }} />
          </div>
        </div>

        {/* 31–60 days */}
        <div className="aging-card aging-card--warn">
          <div className="aging-card__header">
            <span className="aging-card__dot aging-card__dot--warn" />
            <span className="aging-card__label">31–60 ngày</span>
          </div>
          <span className="aging-card__value">
            <span ref={agingD30Ref}>{formatCompact(totals.d30)}</span>{' '}₫
          </span>
          <span className="aging-card__count">{totals.d30Count} NCC</span>
          <div className="aging-card__bar-track">
            <div className="aging-card__bar aging-card__bar--warn" style={{ width: `${pctD30}%` }} />
          </div>
        </div>

        {/* 61–90 days */}
        <div className="aging-card aging-card--deep">
          <div className="aging-card__header">
            <span className="aging-card__dot aging-card__dot--deep" />
            <span className="aging-card__label">61–90 ngày</span>
          </div>
          <span className="aging-card__value">
            <span ref={agingD60Ref}>{formatCompact(totals.d60)}</span>{' '}₫
          </span>
          <span className="aging-card__count">{totals.d60Count} NCC</span>
          <div className="aging-card__bar-track">
            <div className="aging-card__bar aging-card__bar--deep" style={{ width: `${pctD60}%` }} />
          </div>
        </div>

        {/* Over 90 days */}
        <div className="aging-card aging-card--danger">
          <div className="aging-card__header">
            <span className="aging-card__dot aging-card__dot--danger" />
            <span className="aging-card__label">Trên 90 ngày</span>
          </div>
          <span className="aging-card__value">
            <span ref={agingOver90Ref}>{formatCompact(totals.over90)}</span>{' '}₫
          </span>
          <span className="aging-card__count">{totals.over90Count} NCC</span>
          <div className="aging-card__bar-track">
            <div className="aging-card__bar aging-card__bar--danger" style={{ width: `${pctOver90}%` }} />
          </div>
        </div>
      </div>

      {/* ── Zone 3: Data Card ───────────────────────────────────────────── */}
      <div className="payables-data-card">
        {/* Toolbar row */}
        <div className="payables-toolbar">
          <div className="payables-toolbar__spacer" />
          <div className="payables-toolbar__search">
            <Search size={14} style={{ color: 'var(--ink-3)' }} />
            <input
              type="text"
              placeholder="Tìm nhà cung cấp..."
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
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--ink-3)' }}>
            Đang tải dữ liệu công nợ phải trả...
          </div>
        ) : (
          <>
            {/* ── Mobile card list (<=640px) ── */}
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
                    const pctCur = totalAging > 0 ? (d.aging.current / totalAging) * 100 : 100;
                    const pct30 = totalAging > 0 ? (d.aging.d30 / totalAging) * 100 : 0;
                    const pct60 = totalAging > 0 ? (d.aging.d60 / totalAging) * 100 : 0;
                    const pct90 = totalAging > 0 ? (d.aging.over90 / totalAging) * 100 : 0;
                    return (
                      <ClickableCard key={d.supplier.id} to={`/payables/${d.supplier.id}`} className="m-card">
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
                              <div className="aging-bar__seg aging-bar__seg--ok" style={{ width: `${pctCur}%` }} />
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
                      </ClickableCard>
                    );
                  })
                )}
              </div>
            </div>

            {/* ── Desktop table (>640px) ── */}
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
                      <ClickableCard
                        as="tr"
                        key={d.supplier.id}
                        to={`/payables/${d.supplier.id}`}
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
                      </ClickableCard>
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
    </div>
  );
}
