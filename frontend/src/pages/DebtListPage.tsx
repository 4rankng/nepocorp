import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { formatCurrency, formatCompact } from '../lib/format';
import { downloadCSV } from '../lib/csv';
import type { Customer, LedgerEntry } from '@nepocorp/shared';
import { Search, ChevronRight, Users, Wallet, AlertCircle } from 'lucide-react';
import { KPI, PageHeader, Card } from '../components/UI';
import { useCustomerDebts } from '../hooks/useQueries';
import { computeFifoAging } from '@nepocorp/shared';

interface CustomerDebtInfo {
  customer: Customer;
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

export default function DebtListPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data, isLoading: loading, error: queryError } = useCustomerDebts();
  const customers = data?.customers ?? [];
  const ledgerEntries = data?.ledgerEntries ?? [];
  const error = queryError ? (queryError as any).message : null;
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'overdue' | 'high-risk'>(
    searchParams.get('filter') === 'overdue' ? 'overdue' : searchParams.get('filter') === 'high-risk' ? 'high-risk' : 'all',
  );
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(t);
  }, [toast]);

  const customerDebts = useMemo<CustomerDebtInfo[]>(() => {
    const now = new Date();
    const ledgerByCustomer = new Map<number, LedgerEntry[]>();
    for (const entry of ledgerEntries) {
      if (entry.entity_type === 'CUSTOMER') {
        const list = ledgerByCustomer.get(entry.entity_id);
        if (list) list.push(entry);
        else ledgerByCustomer.set(entry.entity_id, [entry]);
      }
    }

    return customers.map(c => {
      const cLedger = ledgerByCustomer.get(c.id) ?? [];

      const latestRow = cLedger[0];
      const totalOutstanding = latestRow ? parseFloat(latestRow.balance) : 0;

      let maxOverdueDays = 0;

      const { aging, openInvoices } = computeFifoAging(
        cLedger.map(e => ({
          timestamp: e.timestamp,
          debit: e.debit || '0',
          credit: e.credit || '0',
        })),
        now,
      );

      for (const inv of openInvoices) {
        if (inv.open > 0) {
          const ageInDays = Math.floor((now.getTime() - new Date(inv.ts).getTime()) / (1000 * 60 * 60 * 24));
          if (ageInDays > maxOverdueDays) maxOverdueDays = ageInDays;
        }
      }

      let riskClass: 'high' | 'med' | 'low' = 'low';
      if (totalOutstanding > 0) {
        if (aging.over90 > 0 || totalOutstanding > 100000000) {
          riskClass = 'high';
        } else if (aging.d30 > 0 || aging.d60 > 0) {
          riskClass = 'med';
        }
      }

      return {
        customer: c,
        totalOutstanding,
        aging,
        maxOverdueDays,
        riskClass,
      };
    });
  }, [customers, ledgerEntries]);

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
        if (d.aging.current > 0) {
          sum.current += d.aging.current;
          sum.currentCusts++;
        }
        if (d.aging.d30 > 0) {
          sum.d30 += d.aging.d30;
          sum.d30Custs++;
        }
        if (d.aging.d60 > 0) {
          sum.d60 += d.aging.d60;
          sum.d60Custs++;
        }
        if (d.aging.over90 > 0) {
          sum.over90 += d.aging.over90;
          sum.over90Custs++;
        }

        if (d.maxOverdueDays > 30) {
          sum.overdueCount++;
        }
        if (d.riskClass === 'high') {
          sum.highRiskCount++;
        }
      }
    });

    return sum;
  }, [customerDebts]);

  const filteredDebts = useMemo(() => {
    let result = customerDebts;

    if (filterMode === 'overdue') {
      result = result.filter(d => d.maxOverdueDays > 30 && d.totalOutstanding > 0);
    } else if (filterMode === 'high-risk') {
      result = result.filter(d => d.riskClass === 'high' && d.totalOutstanding > 0);
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(d =>
        d.customer.name.toLowerCase().includes(q) ||
        (d.customer.contact_info && d.customer.contact_info.toLowerCase().includes(q))
      );
    }

    return result;
  }, [customerDebts, search, filterMode]);

  return (
    <div className="fade-up">
      {toast && (
        <div
          role="status"
          style={{
            position: 'fixed', right: 24, bottom: 24, zIndex: 1000,
            minWidth: 280, maxWidth: 480,
            padding: '12px 16px', borderRadius: 8,
            background: toast.kind === 'success' ? 'var(--accent)' : 'var(--danger)',
            color: '#fff', fontSize: 13, fontWeight: 600,
            boxShadow: '0 10px 28px rgba(0,0,0,0.18)',
            display: 'flex', alignItems: 'center', gap: 10,
          }}
          onClick={() => setToast(null)}
        >
          <span style={{ width: 8, height: 8, background: '#fff', borderRadius: '50%', opacity: 0.9 }} />
          <span style={{ flex: 1 }}>{toast.text}</span>
        </div>
      )}
      <PageHeader
        title="Công nợ phải thu"
        description={`Tổng nợ: ${formatCurrency(totals.total)} • ${customers.length} khách hàng • cập nhật vừa xong`}
        action={
          <div className="page-actions">
            <button className="btn btn--secondary btn--sm" onClick={() => {
              const headers = ['Khách hàng', 'Tổng nợ', 'Trong hạn', '31-60 ngày', '61-90 ngày', 'Trên 90 ngày', 'Rủi ro'];
              const rows = filteredDebts.map(d => [
                d.customer.name,
                d.totalOutstanding,
                d.aging.current,
                d.aging.d30,
                d.aging.d60,
                d.aging.over90,
                d.riskClass,
              ]);
              downloadCSV(`cong-no-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Xuất báo cáo
            </button>
            <button className="btn btn--primary btn--sm" onClick={() => setToast({ kind: 'success', text: 'Đã gửi nhắc nợ hàng loạt thành công!' })}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              Gửi nhắc nợ hàng loạt
            </button>
          </div>
        }
      />

      {/* Aging buckets matching the wireframe */}
      <div className="aging-buckets">
        <div className="bucket" onClick={() => setFilterMode('all')} style={{ borderColor: filterMode === 'all' ? 'var(--brand)' : undefined }}>
          <div className="bucket__label"><span className="bucket__dot bucket__dot--ok"></span>Trong hạn</div>
          <div className="bucket__value">{formatCompact(totals.current)} ₫</div>
          <div className="bucket__count">{totals.currentCusts} khách hàng</div>
        </div>
        <div className="bucket" onClick={() => setFilterMode('overdue')} style={{ borderColor: filterMode === 'overdue' ? 'var(--brand)' : undefined }}>
          <div className="bucket__label"><span className="bucket__dot bucket__dot--t1"></span>31–60 ngày</div>
          <div className="bucket__value">{formatCompact(totals.d30)} ₫</div>
          <div className="bucket__count">{totals.d30Custs} khách hàng</div>
        </div>
        <div className="bucket" onClick={() => setFilterMode('overdue')} style={{ borderColor: filterMode === 'overdue' ? 'var(--brand)' : undefined }}>
          <div className="bucket__label"><span className="bucket__dot bucket__dot--t2"></span>61–90 ngày</div>
          <div className="bucket__value">{formatCompact(totals.d60)} ₫</div>
          <div className="bucket__count">{totals.d60Custs} khách hàng</div>
        </div>
        <div className="bucket" onClick={() => setFilterMode('high-risk')} style={{ borderColor: filterMode === 'high-risk' ? 'var(--brand)' : undefined }}>
          <div className="bucket__label"><span className="bucket__dot bucket__dot--t4"></span>Trên 90 ngày</div>
          <div className="bucket__value">{formatCompact(totals.over90)} ₫</div>
          <div className="bucket__count">{totals.over90Custs} khách hàng</div>
        </div>
      </div>

      {/* Filter toolbar matching the wireframe */}
      <div className="toolbar">
        <button
          className={`filter-pill ${filterMode === 'all' ? 'is-active' : ''}`}
          onClick={() => setFilterMode('all')}
        >
          Tất cả <strong>· {customerDebts.length}</strong>
        </button>
        <button
          className={`filter-pill ${filterMode === 'overdue' ? 'is-active' : ''}`}
          onClick={() => setFilterMode('overdue')}
        >
          Quá hạn <strong style={{ color: 'var(--danger)' }}>· {totals.overdueCount}</strong>
        </button>
        <button
          className={`filter-pill ${filterMode === 'high-risk' ? 'is-active' : ''}`}
          onClick={() => setFilterMode('high-risk')}
        >
          Rủi ro cao <strong style={{ color: 'var(--warning)' }}>· {totals.highRiskCount}</strong>
        </button>
        <div className="toolbar__spacer" />
        <div className="toolbar__search">
          <Search size={14} style={{ color: 'var(--fg-3)' }} />
          <input
            type="text"
            placeholder="Tìm khách hàng..."
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
          Đang tải dữ liệu công nợ...
        </div>
      ) : (
        <>
        {/* ── Mobile card list (≤640px) ──────────────────────────────────── */}
        <div className="mobile-only mobile-table-wrap">
          <div className="m-card-list">
            {filteredDebts.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--ink-3)' }}>
                Không tìm thấy dữ liệu.
              </div>
            ) : (
              filteredDebts.map(d => {
                const totalAging = d.aging.current + d.aging.d30 + d.aging.d60 + d.aging.over90;
                const pctCurrent = totalAging > 0 ? (d.aging.current / totalAging) * 100 : 100;
                const pct30     = totalAging > 0 ? (d.aging.d30    / totalAging) * 100 : 0;
                const pct60     = totalAging > 0 ? (d.aging.d60    / totalAging) * 100 : 0;
                const pct90     = totalAging > 0 ? (d.aging.over90 / totalAging) * 100 : 0;
                return (
                  <div key={d.customer.id} className="m-card" onClick={() => navigate(`/debt/${d.customer.id}`)}>
                    <div className="m-card__top">
                      <span className="m-card__title">
                        <span className={`risk-dot risk-dot--${d.riskClass}`} />
                        {d.customer.name}
                      </span>
                      <span className={`m-card__row-value${d.totalOutstanding > 0 ? '--danger' : '--success'} m-card__row-value`} style={{ fontSize: 13.5 }}>
                        {formatCurrency(d.totalOutstanding)}
                      </span>
                    </div>
                    {d.customer.contact_info && (
                      <div className="m-card__meta">{d.customer.contact_info}</div>
                    )}
                    {d.totalOutstanding > 0 && (
                      <>
                        <div className="aging-bar" style={{ height: 5, borderRadius: 3, overflow: 'hidden', display: 'flex', marginTop: 8, marginBottom: 4 }}>
                          <div className="aging-bar__seg aging-bar__seg--ok"  style={{ width: `${pctCurrent}%` }} />
                          <div className="aging-bar__seg aging-bar__seg--t1"  style={{ width: `${pct30}%` }} />
                          <div className="aging-bar__seg aging-bar__seg--t2"  style={{ width: `${pct60}%` }} />
                          <div className="aging-bar__seg aging-bar__seg--t4"  style={{ width: `${pct90}%` }} />
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

        {/* ── Desktop table (>640px) ──────────────────────────────────────── */}
        <div className="desktop-only table-wrap">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Khách hàng</th>
                  <th className="num">Tổng nợ</th>
                  <th>Phân bổ tuổi nợ</th>
                  <th className="num" style={{ textAlign: 'center' }}>Quá hạn lớn nhất</th>
                  <th>Thông tin liên hệ</th>
                  <th style={{ width: 48 }}></th>
                </tr>
              </thead>
              <tbody>
                {filteredDebts.map(d => {
                  const totalAging = d.aging.current + d.aging.d30 + d.aging.d60 + d.aging.over90;
                  const pctCurrent = totalAging > 0 ? (d.aging.current / totalAging) * 100 : 100;
                  const pct30 = totalAging > 0 ? (d.aging.d30 / totalAging) * 100 : 0;
                  const pct60 = totalAging > 0 ? (d.aging.d60 / totalAging) * 100 : 0;
                  const pct90 = totalAging > 0 ? (d.aging.over90 / totalAging) * 100 : 0;

                  return (
                    <tr
                      key={d.customer.id}
                      onClick={() => navigate(`/debt/${d.customer.id}`)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', fontWeight: 600, color: 'var(--fg-1)' }}>
                          <span className={`risk-dot risk-dot--${d.riskClass}`} />
                          {d.customer.name}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--fg-3)', marginLeft: 16 }}>
                          Nợ quá hạn
                        </div>
                      </td>

                      <td className="num typo-mono" style={{
                        fontWeight: 700,
                        color: d.totalOutstanding > 0 ? 'var(--danger)' : 'var(--success)'
                      }}>
                        {formatCurrency(d.totalOutstanding)}
                      </td>

                      <td style={{ verticalAlign: 'middle' }}>
                        {d.totalOutstanding > 0 ? (
                          <div
                            className="aging-bar"
                            title={`Trong hạn: ${Math.round(pctCurrent)}% | 31-60 ngày: ${Math.round(pct30)}% | 61-90 ngày: ${Math.round(pct60)}% | Trên 90 ngày: ${Math.round(pct90)}%`}
                          >
                            <div className="aging-bar__seg aging-bar__seg--ok" style={{ width: `${pctCurrent}%` }} />
                            <div className="aging-bar__seg aging-bar__seg--t1" style={{ width: `${pct30}%` }} />
                            <div className="aging-bar__seg aging-bar__seg--t2" style={{ width: `${pct60}%` }} />
                            <div className="aging-bar__seg aging-bar__seg--t4" style={{ width: `${pct90}%` }} />
                          </div>
                        ) : (
                          <div className="aging-bar" title="Không có công nợ">
                            <div className="aging-bar__seg aging-bar__seg--ok" style={{ width: '100%' }} />
                          </div>
                        )}
                      </td>

                      <td className="num" style={{ textAlign: 'center', fontWeight: 600 }}>
                        {d.maxOverdueDays > 0 ? (
                          <span style={{ color: d.maxOverdueDays > 60 ? 'var(--danger)' : 'var(--warning)' }}>
                            {d.maxOverdueDays} ngày
                          </span>
                        ) : (
                          <span style={{ color: 'var(--fg-3)' }}>—</span>
                        )}
                      </td>

                      <td style={{ fontSize: 13, color: 'var(--fg-2)' }}>
                        {d.customer.contact_info || <span style={{ color: 'var(--fg-3)' }}>Chưa cấu hình</span>}
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        <ChevronRight size={14} style={{ color: 'var(--fg-3)' }} />
                      </td>
                    </tr>
                  );
                })}

                {filteredDebts.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--fg-3)' }}>
                      Không tìm thấy dữ liệu công nợ thỏa mãn bộ lọc.
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
