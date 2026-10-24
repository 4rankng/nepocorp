import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { formatCurrency, moneyParts } from '../lib/format';
import { oldestAgingBucketIdx } from '../lib/aging';
import { api } from '../lib/api';
import { downloadBlob } from '../lib/download';
import { useToast } from '../components/shared/Toast';
import {
  Clock,
  Building2,
  Phone,
  Loader2,
} from 'lucide-react';
import { PageHeader } from '../components/UI';
import { Breadcrumbs } from '../components/shared/Breadcrumbs';
import { ListFilterBar } from '../components/shared/ListFilterBar';
import { ClickableCard } from '../components/shared/ClickableCard';
import { useAutoHideColumn } from '../design-system';
import { useCustomerAging } from '../hooks/useQueries';
import type { CustomerAging } from '../hooks/useQueries';
import {
  usePageAnimations,
  useListAnimations,
} from '../hooks/animations';
import './DebtListPage.css';
import { resolveEmptyIllustration } from '../lib/emptyIllustrations';

interface CustomerDebtInfo {
  customerId: number;
  customerName: string;
  contactInfo: string | null;
  linkedSupplierId: number | null;
  linkedSupplierApBalance: number;
  netBalance: number;
  totalOutstanding: number;
  aging: {
    current: number;
    d30: number;
    d60: number;
    over90: number;
  };
  maxOverdueDays: number;
  riskClass: 'high' | 'med' | 'low';
}

function classifyRisk(totalOutstanding: number, aging: CustomerAging['aging'], _maxOverdueDays: number): 'high' | 'med' | 'low' {
  if (totalOutstanding <= 0) return 'low';
  if (aging.over90 > 0 || totalOutstanding > 100_000_000) return 'high';
  if (aging.d30 > 0 || aging.d60 > 0) return 'med';
  return 'low';
}

/**
 * The one-line status the customer rows used to spell out on a second line
 * under every name (NEPO-18): the label now rides the colored dot beside the
 * name (title + aria-label). Same overload rule as everywhere else — the
 * status reads from the aging buckets via `oldestAgingBucketIdx`.
 */
function debtStatus(d: CustomerDebtInfo): { key: 'overdue' | 'ontime' | 'prepaid' | 'paid'; label: string } {
  if (d.totalOutstanding > 0) {
    const overdue = oldestAgingBucketIdx([d.aging.current, d.aging.d30, d.aging.d60, d.aging.over90]) > 0;
    return overdue ? { key: 'overdue', label: 'Nợ quá hạn' } : { key: 'ontime', label: 'Trong hạn' };
  }
  // "Cân bằng" disagreed with the detail header's badge for the same
  // zero-balance state (kanban 091026010110).
  return d.totalOutstanding < 0
    ? { key: 'prepaid', label: 'Trả trước' }
    : { key: 'paid', label: 'Đã thanh toán đủ' };
}

/* ─── Aging bucket config ────────────────────────────────────────────────── */

interface AgingBucket {
  key: string;
  label: string;
  amountKey: 'current' | 'd30' | 'd60' | 'over90';
  countKey: 'currentCusts' | 'd30Custs' | 'd60Custs' | 'over90Custs';
  dotClass: string;
  color: string;
  /** Each bucket owns its own filter — never grouped. */
  filterMode: BucketFilterMode;
}

/**
 * One filter mode per bucket. The four aging buckets must filter independently
 * so clicking "31–60 ngày" shows only customers in that bucket, etc.
 * `'all'` is the unfiltered default.
 */
type BucketFilterMode = 'all' | 'current' | 'd30' | 'd60' | 'over90';

const AGING_BUCKETS: AgingBucket[] = [
  { key: 'current', label: '0–30 NGÀY', amountKey: 'current', countKey: 'currentCusts', dotClass: 'debt-aging__dot--ok', color: '#00B14F', filterMode: 'current' },
  { key: 'd30', label: '31–60 NGÀY', amountKey: 'd30', countKey: 'd30Custs', dotClass: 'debt-aging__dot--warn', color: 'var(--warning)', filterMode: 'd30' },
  { key: 'd60', label: '61–90 NGÀY', amountKey: 'd60', countKey: 'd60Custs', dotClass: 'debt-aging__dot--deep', color: '#DD5A1F', filterMode: 'd60' },
  { key: 'over90', label: 'TRÊN 90 NGÀY', amountKey: 'over90', countKey: 'over90Custs', dotClass: 'debt-aging__dot--danger', color: '#E32434', filterMode: 'over90' },
];

/* Map bucket → band dot color class (the cards are gone; the band shows the
   four bucket amounts and the ListFilterBar tabs carry the filtering). */
const BUCKET_DOT_CLASSES: Record<string, string> = {
  current: 'debt-band__dot--ok',
  d30: 'debt-band__dot--warn',
  d60: 'debt-band__dot--deep',
  over90: 'debt-band__dot--danger',
};

/* ─── Component ──────────────────────────────────────────────────────────── */

export default function DebtListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const { data, isLoading: loading, error: queryError } = useCustomerAging(search);
  const { toast: showToast } = useToast();
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const q = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : '';
      const blob = await api.getBlob(`/reports/receivables-aging/export${q}`);
      downloadBlob(blob, `cong-no-phai-thu-${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (err) {
      showToast({ kind: 'error', message: (err as Error).message || 'Lỗi xuất báo cáo' });
    } finally {
      setExporting(false);
    }
  };
  const rawCustomers = useMemo(() => data?.customers ?? [], [data?.customers]);
  const error = queryError ? (queryError as Error).message : null;
  // The active bucket tab lives in the ?filter= param so a reload keeps the
  // user's selection — the dashboard links here as /debt?filter=over90. The
  // page used to read the param once into useState but never wrote it back, so
  // every reload dropped the tab to "Tất cả" and the list jumped (kanban
  // 091026235510).
  const filterParam = searchParams.get('filter');
  const filterMode: BucketFilterMode =
    filterParam === 'current' || filterParam === 'd30' || filterParam === 'd60' || filterParam === 'over90'
      ? filterParam
      : 'all';
  const setFilterMode = (mode: BucketFilterMode) => {
    const next = new URLSearchParams(searchParams);
    if (mode === 'all') next.delete('filter');
    else next.set('filter', mode);
    setSearchParams(next, { replace: true });
  };

  /* ── Animation hooks ── */
  const compact = false; // full VND everywhere — no short form (e.g. "12,5 tr")
  const { rootRef } = usePageAnimations({
    ready: !loading,
    selectors: ['.debt-band', '.debt-data-card'],
  });

  /* ── Data processing (preserved exactly) ── */
  const customerDebts = useMemo<CustomerDebtInfo[]>(() => {
    return rawCustomers.map(c => {
      return {
      customerId: c.customerId,
      customerName: c.customerName,
      contactInfo: c.contactInfo,
      linkedSupplierId: c.linkedSupplierId ?? null,
      linkedSupplierApBalance: c.linkedSupplierApBalance,
      netBalance: c.netBalance,
      totalOutstanding: c.totalOutstanding,
      aging: c.aging,
      maxOverdueDays: c.maxOverdueDays,
      riskClass: classifyRisk(c.totalOutstanding, c.aging, c.maxOverdueDays),
      };
    });
  }, [rawCustomers]);

  const totals = useMemo(() => {
    const sum = {
      total: 0,
      current: 0,
      d30: 0,
      d60: 0,
      over90: 0,
      currentCusts: 0,
      d30Custs: 0,
      d60Custs: 0,
      over90Custs: 0,
      overdueCount: 0,
      highRiskCount: 0,
    };

    customerDebts.forEach(d => {
      if (d.totalOutstanding > 0) {
        sum.total += d.totalOutstanding;
        if (d.aging.current > 0) { sum.current += d.aging.current; sum.currentCusts++; }
        if (d.aging.d30 > 0) { sum.d30 += d.aging.d30; sum.d30Custs++; }
        if (d.aging.d60 > 0) { sum.d60 += d.aging.d60; sum.d60Custs++; }
        if (d.aging.over90 > 0) { sum.over90 += d.aging.over90; sum.over90Custs++; }
        // Same overload rule as the row label and every detail surface — read
        // from the buckets so list and detail can never disagree again
        // (kanban 101026203130). Equivalent to maxOverdueDays > 30.
        if (oldestAgingBucketIdx([d.aging.current, d.aging.d30, d.aging.d60, d.aging.over90]) > 0) { sum.overdueCount++; }
        if (d.riskClass === 'high') { sum.highRiskCount++; }
      }
    });

    return sum;
  }, [customerDebts]);

  const filteredDebts = useMemo(() => {
    let result = customerDebts;
    if (filterMode === 'current') {
      // 0–30 ngày — on-time/current balance (no overdue amount, but has outstanding).
      result = result.filter(d => d.aging.current > 0 && d.totalOutstanding > 0);
    } else if (filterMode === 'd30') {
      // 31–60 ngày — has balance in the d30 aging bucket specifically.
      result = result.filter(d => d.aging.d30 > 0 && d.totalOutstanding > 0);
    } else if (filterMode === 'd60') {
      // 61–90 ngày — has balance in the d60 aging bucket specifically.
      result = result.filter(d => d.aging.d60 > 0 && d.totalOutstanding > 0);
    } else if (filterMode === 'over90') {
      // Trên 90 ngày — has balance in the over90 aging bucket specifically.
      result = result.filter(d => d.aging.over90 > 0 && d.totalOutstanding > 0);
    }
    return result;
  }, [customerDebts, filterMode]);

  const { rootRef: listRef } = useListAnimations({ itemSelector: '.m-card, table tbody tr', deps: [filteredDebts] });

  // SỔ RÒNG auto-hide (NEPO-18): the column is only meaningful for customers
  // linked to a supplier (net = AR − linked AP). When every row would render
  // "—" the column is removed entirely; a single linked supplier brings it
  // back. Individual rows without a link still show "—" while the column is
  // visible — that per-row N/A stays honest.

  /* ── Helpers ── */
  // No count-up animation on the money figures. The hero card and the four
  // aging buckets used to be filled in by an anime.js counter that wrote
  // textContent out-of-band of React over ~1.2s with a per-bucket stagger, so
  // a reload caught the page mid-animation: the card briefly showed 0₫ and the
  // buckets did not sum to it. The counters are removed here for the same
  // reason as on /payables — money must render authoritatively from React so
  // the card and the buckets can never describe two different totals
  // (kanban 091026010100, re-verified as 091026211500 on /debt).
  //
  // While the first aging report is still in flight the summary renders "—"
  // placeholders instead of zeros: a 0 ₫ total (and "0 khách hàng") that later
  // jumps to the real figures is exactly the flicker QA logged, so the card
  // shows "no value yet", never a wrong one (kanban 091026010100).
  const heroMoney = moneyParts(totals.total, false);

  // NEPO-16 AutoHideColumn: when no customer in the filtered set links to a
  // supplier the "Số ròng" column rendered a full run of '—' (audit 24/10).
  // Hide it until one row carries a linked-AP net balance.
  const showNetColumn = useAutoHideColumn(
    useMemo(() => filteredDebts.map(d => (d.linkedSupplierId == null ? null : formatCurrency(d.netBalance))), [filteredDebts]),
  );

  return (
    <div ref={rootRef} className="debt-list-page">
      <Breadcrumbs
        className="debt-list-page__crumbs"
        items={[
          { label: 'Tổng quan', to: '/dashboard' },
          { label: 'Công nợ phải thu' },
        ]}
        renderLink={(to, children) => (
          <a onClick={() => navigate(to)} style={{ cursor: 'pointer' }}>{children}</a>
        )}
      />
      <PageHeader
        title="Công nợ phải thu"
        // The customer count lives in one place — the "Tất cả N" filter tab
        // below (NEPO-18). The header and the summary band repeat neither the
        // count nor the amount, so every figure has exactly one source.
        description={loading ? 'Đang tải dữ liệu công nợ…' : 'Cập nhật vừa xong'}
        iconName="receivables"
        action={
          <div className="page-actions">
            <button 
              className="btn btn--secondary btn--sm" 
              onClick={handleExport}
              disabled={exporting}
            >
              {exporting ? 'Đang xuất...' : (
                <>
                  <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Xuất báo cáo
                </>
              )}
            </button>
          </div>
        }
      />

      {/* ══════════════════════════════════════════════════════════════════════
        *  ZONE 1 — Summary band (NEPO-18): one ≤96px band replaces the 160px
        *  hero + illustration, the 2 mini cards and the 4 aging cards. Numbers
        *  only — no customer count (it lives once, in the "Tất cả N" tab).
        * ══════════════════════════════════════════════════════════════════════ */}
      <div className="debt-band" data-tour-id="debt-aging">
        <div className="debt-band__total">
          <span className="debt-band__label">Tổng công nợ phải thu (gồm VAT)</span>
          <span className="debt-band__amount">
            <span>{loading ? '—' : heroMoney.num}</span>
            <span className="debt-band__unit">{heroMoney.unit}</span>
          </span>
        </div>
        <span className="debt-band__chip debt-band__chip--danger">
          <span className="debt-band__chip-value">{loading ? '—' : totals.overdueCount}</span>
          {' quá hạn'}
        </span>
        <span className="debt-band__chip debt-band__chip--warning">
          <span className="debt-band__chip-value">{loading ? '—' : totals.highRiskCount}</span>
          {' rủi ro cao'}
        </span>
        <div className="debt-band__aging" aria-label="Phân bổ tuổi nợ">
          {AGING_BUCKETS.map((bucket) => {
            const money = moneyParts(totals[bucket.amountKey], compact);
            return (
              <span key={bucket.key} className="debt-band__bucket">
                <span className={`debt-band__dot ${BUCKET_DOT_CLASSES[bucket.key]}`} />
                <span className="debt-band__bucket-label">{bucket.label}</span>
                <span className="debt-band__bucket-amount">
                  {loading ? '—' : money.num}
                  <span className="debt-band__bucket-unit">{' '}{money.unit}</span>
                </span>
                <span className="debt-band__bucket-count">{loading ? '—' : totals[bucket.countKey]} KH</span>
              </span>
            );
          })}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
        *  ZONE 2 — Filter tabs + search (the four aging buckets filter from
        *  here now, same per-bucket modes and ?filter= param as before).
        * ══════════════════════════════════════════════════════════════════════ */}
      <ListFilterBar<BucketFilterMode>
        label="Lọc công nợ khách hàng"
        value={filterMode}
        onChange={setFilterMode}
        // While the report is loading, render no count rather than a misleading
        // "Tất cả 0" (same rule as the payables chip row, kanban 091026235510).
        options={[
          { value: 'all', label: 'Tất cả', count: loading ? undefined : customerDebts.length },
          ...AGING_BUCKETS.map(bucket => ({
            value: bucket.filterMode,
            label: bucket.label,
            count: loading ? undefined : totals[bucket.countKey],
          })),
        ]}
        search={{ value: search, onChange: setSearch, label: 'Tìm công nợ theo khách hàng', placeholder: 'Tìm khách hàng…' }}
      />
      <div className="debt-data-card" data-tour-id="debt-customer-list">
        {error && (
          <div style={{ padding: 16, color: 'var(--danger)', marginBottom: 20 }}>
            {error}
          </div>
        )}

        {loading ? (
          <div className="debt-loading">
            <Loader2 size={28} className="debt-loading__spin" aria-hidden="true" />
            <span>Đang tải dữ liệu công nợ…</span>
          </div>
        ) : (
          <>
            {/* ── Mobile card list (<=640px) ── */}
            <div className="mobile-only mobile-table-wrap" ref={listRef}>
              <div className="m-card-list">
                {filteredDebts.length === 0 ? (
                  <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--ink-3)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <img src={resolveEmptyIllustration('empty-debts')} alt="" aria-hidden="true" style={{ width: 140, height: 116, objectFit: 'contain' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    {/* Same sentence as the desktop table's empty row — the
                        mobile card list used a shorter variant (kanban 091026010110). */}
                    Không tìm thấy dữ liệu công nợ thỏa mãn bộ lọc.
                  </div>
                ) : (
                  filteredDebts.map(d => {
                    return (
                      <ClickableCard key={d.customerId} to={`/debt/${d.customerId}`} className="m-card">
                        <div className="m-card__top">
                          <span className="m-card__title">
                            <span className={`risk-dot risk-dot--${d.riskClass}`} />
                            <Building2 size={15} aria-hidden="true" style={{ color: 'var(--ink-3)', flex: '0 0 auto' }} />
                            {d.customerName}
                            {d.linkedSupplierId != null && (
                              <span style={{ marginLeft: 6, fontSize: 'var(--fs-body)', fontWeight: 700, color: '#16a34a', background: '#dcfce7', border: '1px solid #bbf7d0', borderRadius: 4, padding: '1px 5px', letterSpacing: '0.02em', verticalAlign: 'middle' }}>
                                2 chiều
                              </span>
                            )}
                          </span>
                          <span className={`m-card__row-value${d.totalOutstanding > 0 ? '--danger' : '--success'} m-card__row-value debt-list-page__amount`}>
                            {formatCurrency(d.totalOutstanding)}
                          </span>
                        </div>
                        {d.totalOutstanding > 0 && (
                          <>
                            {d.contactInfo && (
                              <div className="m-card__meta">
                                <Phone size={12} aria-hidden="true" style={{ marginRight: 5, verticalAlign: '-1px', color: 'var(--ink-3)' }} />
                                {d.contactInfo}
                              </div>
                            )}
                            {d.maxOverdueDays > 0 && (
                              <div className="m-card__row">
                                <span className="m-card__row-label">
                                  <Clock size={12} aria-hidden="true" style={{ marginRight: 5, verticalAlign: '-1px' }} />
                                  Tuổi nợ
                                </span>
                                <span style={{ fontSize: 'var(--fs-body)', fontWeight: 600, color: d.maxOverdueDays > 60 ? 'var(--danger)' : d.maxOverdueDays > 30 ? 'var(--warning)' : 'var(--ink-2)' }}>
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
                <table className={`debt-list-table${showNetColumn ? '' : ' debt-list-table--no-net'}`}>
                    <thead>
                      <tr>
                        <th>Khách hàng</th>
                        <th className="num">Tổng nợ (gồm VAT)</th>
                        {/* "Số ròng" matches the same figure's label on the AR
                            detail's linked-AP summary; "Net công nợ" was the
                            only English word in the row (kanban 091026010110).
                            Auto-hidden while no row links a supplier
                            (NEPO-16). */}
                        {showNetColumn && <th className="num">Số ròng (gồm VAT)</th>}
                        {showNetColumn && <th className="num">Số ròng (gồm VAT)</th>}
                        <th className="num" style={{ textAlign: 'center' }}>Tuổi nợ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDebts.map(d => {
                        return (
                          <tr
                            key={d.customerId}
                            role="button"
                            tabIndex={0}
                            style={{ cursor: 'pointer' }}
                            onClick={() => navigate(`/debt/${d.customerId}`)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                navigate(`/debt/${d.customerId}`);
                              }
                            }}
                          >
                          <td className="debt-list-table__customer">
                            <div className="debt-list-table__customer-main">
                              {/* The status the old second line used to spell
                                  out ("Nợ quá hạn" / "Trong hạn" / …) rides the
                                  colored dot beside the name — tooltip on hover,
                                  aria-label for screen readers (NEPO-18). */}
                              <span
                                className={`debt-status-dot debt-status-dot--${debtStatus(d).key}`}
                                title={debtStatus(d).label}
                                aria-label={debtStatus(d).label}
                              />
                              <Building2 size={14} aria-hidden="true" style={{ color: 'var(--fg-3)', flex: '0 0 auto' }} />
                              <span className="debt-list-table__customer-name">{d.customerName}</span>
                              {d.linkedSupplierId != null && (
                                <span style={{ fontSize: 'var(--fs-body)', lineHeight: 1.35, fontWeight: 700, color: '#16a34a', background: '#dcfce7', border: '1px solid #bbf7d0', borderRadius: 4, padding: '3px 7px', letterSpacing: '0.02em' }}>
                                  2 chiều
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="num typo-mono" style={{
                            fontWeight: 700,
                            color: d.totalOutstanding > 0 ? 'var(--danger)' : 'var(--success)'
                          }}>
                            {formatCurrency(d.totalOutstanding)}
                          </td>

                          {showNetColumn && (
                            <td className="num typo-mono" style={{
                              fontWeight: 600,
                              color: d.linkedSupplierId == null
                                ? 'var(--fg-3)'
                                : (d.netBalance > 0 ? 'var(--danger)' : d.netBalance < 0 ? 'var(--success)' : 'var(--fg-3)')
                            }}>
                              {d.linkedSupplierId == null
                                ? <span style={{ color: 'var(--fg-3)' }}>&mdash;</span>
                                : formatCurrency(d.netBalance)}
                            </td>
                          )}

                          <td className="num" style={{ textAlign: 'center', fontWeight: 600 }}>
                            {d.maxOverdueDays > 0 ? (
                              <span style={{ color: d.maxOverdueDays > 60 ? 'var(--danger)' : d.maxOverdueDays > 30 ? 'var(--warning)' : 'var(--ink-2)' }}>
                                {d.maxOverdueDays} ngày
                              </span>
                            ) : (
                              <span style={{ color: 'var(--fg-3)' }}>&mdash;</span>
                            )}
                          </td>

                        </tr>
                      );
                    })}

                    {filteredDebts.length === 0 && (
                      <tr>
                        <td colSpan={showNetColumn ? 4 : 3} style={{ textAlign: 'center', padding: '24px 40px', color: 'var(--fg-3)' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                            <img src={resolveEmptyIllustration('empty-debts')} alt="" aria-hidden="true" style={{ width: 130, height: 108, objectFit: 'contain' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                            Không tìm thấy dữ liệu công nợ thỏa mãn bộ lọc.
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
