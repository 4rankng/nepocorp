import { useState, useRef, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { formatNumber } from '../lib/format';
import { downloadCSV } from '../lib/csv';
import { AlertTriangle, CalendarDays } from 'lucide-react';
import { PageHeader } from '../components/UI';
import { Breadcrumbs } from '../components/shared/Breadcrumbs';
import { Alert } from '../components/shared/Alert';
import { AssetIcon } from '../components/AssetIcon';
import { usePnlReport, useYearlyPnl, useMonthlyTrips, useCapTable } from '../hooks/useQueries';
import { useMonth } from '../hooks/useMonth';
import { usePageAnimations, useCounterAnimation } from '../hooks/animations';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import { compactNum, EMPTY_CAP, EMPTY_TRIPS, EMPTY_YEARLY, marginPct, useFinanceDerived, yoyClass, yoyPct } from './finance-derived';
import { groupFinanceTripDetails } from './finance-trip-details';
import { FinanceChartsRow } from '../features/finance/financeChartsRow';
import { FinanceCategoryPanel } from '../features/finance/financeCategoryPanel';
import { TruckBreakdownPanel } from '../features/finance/financeTruckBreakdown';
import './FinancePage.css';

export default function FinancePage() {
  const { month, year } = useMonth();
  const [chartView, setChartView] = useState<'day' | 'month'>('day');
  const [expandedTruckIds, setExpandedTruckIds] = useState<Set<number>>(() => new Set());
  const { data: report, isLoading: loading, error: queryError } = usePnlReport(month, year);
  const { rootRef } = usePageAnimations({ ready: !loading });

  const kpiRefs = useRef<{ revenue: HTMLSpanElement | null; gross: HTMLSpanElement | null; net: HTMLSpanElement | null; margin: HTMLSpanElement | null }>({ revenue: null, gross: null, net: null, margin: null });
  const prefersReduced = usePrefersReducedMotion();

  const { data: prevReport } = usePnlReport(month, year - 1);

  const { data: allTrips = EMPTY_TRIPS } = useMonthlyTrips(year, month); const { data: capTableRaw = EMPTY_CAP } = useCapTable();
  const { data: yearlyData = EMPTY_YEARLY, isLoading: yearlyLoading } = useYearlyPnl(year);

  const error = queryError ? queryError.message || 'Không thể tải báo cáo' : null;

  const {
    fuelCost, roadCost, driverCost, maintenanceCost, companyExpenses,
    totalRevenue, otherRevenue, transRevenue, totalCosts, grossProfit, netProfit,
    totalRevenueLY, otherRevenueLY, transRevenueLY, totalCostsLY, grossProfitLY,
    companyExpensesLY, netProfitLY, activeCapTable, costPieData,
    topTrucks, categoryBreakdown, truckBreakdown, activeChartData, hasChartData,
  } = useFinanceDerived({ allTrips, report, prevReport, capTableRaw, yearlyData, month, chartView });

  const tripDetailsByTruck = useMemo(() => {
    return groupFinanceTripDetails(allTrips, report?.tripDetails);
  }, [allTrips, report?.tripDetails]);

  const toggleTruck = (truckId: number) => {
    setExpandedTruckIds((current) => {
      const next = new Set(current);
      if (next.has(truckId)) next.delete(truckId);
      else next.add(truckId);
      return next;
    });
  };


  // ── KPI counter animation ──
  const { animateCounters } = useCounterAnimation({ duration: 1200, delay: 300, stagger: 100 });

  useEffect(() => {
    if (loading || !report || prefersReduced) return;

    animateCounters([
      { el: kpiRefs.current.revenue, value: totalRevenue },
      { el: kpiRefs.current.gross, value: grossProfit },
      { el: kpiRefs.current.net, value: netProfit },
      { el: kpiRefs.current.margin, value: totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0, format: (val) => val.toFixed(1) },
    ]);
  }, [report, loading, totalRevenue, grossProfit, netProfit, prefersReduced, animateCounters]);

  return (
    <div ref={rootRef} className="finance-page" style={{ paddingBottom: 40 }}>
      <Breadcrumbs
        className="finance-page__crumbs"
        items={[
          { label: 'Tổng quan', to: '/dashboard' },
          { label: 'Báo cáo lãi lỗ' },
        ]}
      />
      <PageHeader
        title="Báo cáo lãi lỗ"
        iconName="profit"
        description={`Báo cáo kết quả kinh doanh Tháng ${month} / ${year} · so sánh với Tháng ${month} / ${year - 1}`}
        action={
          <div className="page-actions">
            <div className="date-chip" data-tour-id="finance-period" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: 'var(--bg-2)', borderRadius: 6, fontSize: 'var(--fs-body)', fontWeight: 600 }}>
              <CalendarDays size={14} style={{ color: 'var(--brand)' }} />
              <span>Tháng {month} · <strong>{year}</strong></span>
            </div>
            <button className="btn btn--primary" onClick={async () => {
              if (!report) return;
              const headers = ['Khoản mục', `Tháng ${String(month).padStart(2,'0')}/${year}`, `Tháng ${String(month).padStart(2,'0')}/${year - 1}`];
              const rows = [
                ['Doanh thu vận tải', transRevenue, transRevenueLY],
                ['Doanh thu điều xe ngoài', report.externalMarginTotal ?? 0, prevReport?.externalMarginTotal ?? 0],
                ['Thu nhập khác', otherRevenue, otherRevenueLY],
                ['Tổng doanh thu', totalRevenue, totalRevenueLY],
                ['Nhiên liệu', fuelCost, ''],
                ['Tiền đi đường', roadCost, ''],
                ['Lương lái xe', driverCost, ''],
                ['Tổng chi phí vận hành', totalCosts, totalCostsLY],
                ['Lợi nhuận gộp', grossProfit, grossProfitLY],
                ['Lợi nhuận ròng', netProfit, netProfitLY],
              ];
              await downloadCSV(`bao-cao-lai-lo-${String(month).padStart(2, '0')}-${String(year).slice(-2)}.csv`, headers, rows, {
                title: 'BÁO CÁO LÃI LỖ',
                subtitle: `Kỳ báo cáo: Tháng ${String(month).padStart(2,'0')}/${year} · so sánh với Tháng ${String(month).padStart(2,'0')}/${year - 1}`,
                columnTypes: ['text', 'currency', 'currency'],
              });
            }}>
              <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Xuất Excel
            </button>
          </div>
        }
      />

      {/* ── KPI Hero Strip ──────────────────────────────────── */}
      <div className="pnl-kpi-strip fade-up-2" data-tour-id="finance-kpis">
        <div className="pnl-kpi">
          <div className="pnl-kpi__label">Tổng doanh thu</div>
          <div className="pnl-kpi__value"><span ref={(el) => { kpiRefs.current.revenue = el; }}>{formatNumber(totalRevenue)}</span><span className="pnl-kpi__unit">₫</span></div>
          {prevReport
            ? <div className={`pnl-kpi__delta ${totalRevenue >= totalRevenueLY ? 'pnl-kpi__delta--up' : 'pnl-kpi__delta--down'}`}>{yoyPct(totalRevenue, totalRevenueLY)} so cùng kỳ</div>
            : <div className="pnl-kpi__delta pnl-kpi__delta--neutral">—</div>
          }
          <AssetIcon name="cashflow" size={54} className="pnl-kpi__asset" />
        </div>
        <div className="pnl-kpi pnl-kpi--profit">
          <div className="pnl-kpi__label">Lợi nhuận gộp</div>
          <div className="pnl-kpi__value"><span ref={(el) => { kpiRefs.current.gross = el; }}>{formatNumber(grossProfit)}</span><span className="pnl-kpi__unit">₫</span></div>
          {prevReport
            ? <div className={`pnl-kpi__delta ${grossProfit >= grossProfitLY ? 'pnl-kpi__delta--up' : 'pnl-kpi__delta--down'}`}>{yoyPct(grossProfit, grossProfitLY)} so cùng kỳ</div>
            : <div className="pnl-kpi__delta pnl-kpi__delta--neutral">—</div>
          }
          <AssetIcon name="profit" size={54} className="pnl-kpi__asset" />
        </div>
        <div className="pnl-kpi">
          <div className="pnl-kpi__label">Biên lợi nhuận gộp</div>
          <div className="pnl-kpi__value"><span ref={(el) => { kpiRefs.current.margin = el; }}>{marginPct(grossProfit, totalRevenue)}</span><span className="pnl-kpi__unit">%</span></div>
          <div className="pnl-kpi__delta pnl-kpi__delta--neutral"
            title="Chốt sổ: chuyến đã chuyển trạng thái 'Đã khóa' trong kỳ — doanh thu và chi phí được ghi nhận vào sổ kế toán"
          >
            {report?.tripCount ?? '—'} chuyến đã khóa
          </div>
          <AssetIcon name="gross-margin" size={54} className="pnl-kpi__asset" />
        </div>
        <div className="pnl-kpi pnl-kpi--net">
          <div className="pnl-kpi__label">Lợi nhuận ròng</div>
          <div className="pnl-kpi__value" style={{ color: netProfit < 0 ? 'var(--danger)' : undefined }}><span ref={(el) => { kpiRefs.current.net = el; }}>{formatNumber(netProfit)}</span><span className="pnl-kpi__unit">₫</span></div>
          {prevReport
            ? <div className={`pnl-kpi__delta ${netProfit >= netProfitLY ? 'pnl-kpi__delta--up' : 'pnl-kpi__delta--down'}`}>{yoyPct(netProfit, netProfitLY)} so cùng kỳ</div>
            : <div className="pnl-kpi__delta pnl-kpi__delta--neutral">—</div>
          }
          <AssetIcon name="paid" size={54} className="pnl-kpi__asset" />
        </div>
      </div>

      {error && (
        <Alert variant="error" style="soft" icon={<AlertTriangle size={16} />} className="mb-5">
          {error}
        </Alert>
      )}

      {/* ── Charts ──────────────────────────────────────────────────── */}
      <FinanceChartsRow
        chartView={chartView}
        onChartViewChange={setChartView}
        month={month}
        year={year}
        yearlyLoading={yearlyLoading}
        hasChartData={hasChartData}
        activeChartData={activeChartData}
        loading={loading}
        costPieData={costPieData}
        topTrucks={topTrucks}
        formatCompact={compactNum}
      />

      {loading ? (
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--fg-3)' }}>
          Đang tổng hợp báo cáo tài chính chặng...
        </div>
      ) : (
        <>
          {/* P&L Table with real data */}
          <div className="pnl-table fade-up-3" style={{ marginBottom: 24 }}>
            <div className="pnl-head">
              <div>Khoản mục</div>
              <div className="pnl-head__amount">Tháng {month} / {year}</div>
              <div className="pnl-head__yoy">Tháng {month} / {year - 1}</div>
              <div className="pnl-head__pct">YoY</div>
            </div>

            {/* REVENUE */}
            <div className="pnl-row pnl-row--section">
              <div>Doanh thu</div>
              <div></div><div></div><div></div>
            </div>

            <div className="pnl-row">
              <div className="pnl-row__label">
                Doanh thu vận tải
                <div className="pnl-row__label-sub">{report?.tripCount ?? 0} chuyến × giá cước chặng</div>
              </div>
              <div className="pnl-row__amount">{formatNumber(transRevenue)}</div>
              <div className="pnl-row__yoy">{prevReport ? formatNumber(transRevenueLY) : '—'}</div>
              <div className={`pnl-row__pct ${prevReport ? yoyClass(transRevenue, transRevenueLY) : ''}`}>{prevReport ? yoyPct(transRevenue, transRevenueLY) : '—'}</div>
            </div>

            {(report?.externalMarginTotal ?? 0) !== 0 && (
            <div className="pnl-row">
              <div className="pnl-row__label">
                Doanh thu điều xe ngoài
                <div className="pnl-row__label-sub">Lãi quản lý từ {report?.externalTripsCount ?? 0} chuyến ngoài</div>
              </div>
              <div className="pnl-row__amount">{formatNumber(report?.externalMarginTotal ?? 0)}</div>
              <div className="pnl-row__yoy">—</div>
              <div className="pnl-row__pct">—</div>
            </div>
            )}

            {(report?.serviceMarginTotal ?? 0) !== 0 && (
            <div className="pnl-row">
              <div className="pnl-row__label">
                Lãi dịch vụ đi kèm
                <div className="pnl-row__label-sub">Lãi từ dịch vụ phụ trợ</div>
              </div>
              <div className="pnl-row__amount">{formatNumber(report?.serviceMarginTotal ?? 0)}</div>
              <div className="pnl-row__yoy">—</div>
              <div className="pnl-row__pct">—</div>
            </div>
            )}

            <div className="pnl-row">
              <div className="pnl-row__label">
                Thu nhập phạt vi phạm
                <div className="pnl-row__label-sub">Phạt vi phạm, điều chỉnh khác</div>
              </div>
              <div className="pnl-row__amount">{formatNumber(otherRevenue)}</div>
              <div className="pnl-row__yoy">{prevReport ? formatNumber(otherRevenueLY) : '—'}</div>
              <div className={`pnl-row__pct ${prevReport ? yoyClass(otherRevenue, otherRevenueLY) : ''}`}>{prevReport ? yoyPct(otherRevenue, otherRevenueLY) : '—'}</div>
            </div>

            <div className="pnl-row pnl-row--subtotal">
              <div className="pnl-row__label">Tổng doanh thu</div>
              <div className="pnl-row__amount">{formatNumber(totalRevenue)}</div>
              <div className="pnl-row__yoy">{prevReport ? formatNumber(totalRevenueLY) : '—'}</div>
              <div className={`pnl-row__pct ${prevReport ? yoyClass(totalRevenue, totalRevenueLY) : ''}`}>{prevReport ? yoyPct(totalRevenue, totalRevenueLY) : '—'}</div>
            </div>

            {/* DIRECT COSTS */}
            <div className="pnl-row pnl-row--section">
              <div>Chi phí trực tiếp</div>
              <div></div><div></div><div></div>
            </div>

            <div className="pnl-row">
              <div className="pnl-row__label">
                Nhiên liệu
                <div className="pnl-row__label-sub">Dầu DO xe đầu kéo chạy chặng</div>
              </div>
              <div className="pnl-row__amount">{formatNumber(fuelCost)}</div>
              <div className="pnl-row__yoy">—</div><div className="pnl-row__pct">—</div>
            </div>

            <div className="pnl-row">
              <div className="pnl-row__label">
                Tiền đi đường
                <div className="pnl-row__label-sub">Vé BOT cầu đường &amp; luật đường</div>
              </div>
              <div className="pnl-row__amount">{formatNumber(roadCost)}</div>
              <div className="pnl-row__yoy">—</div><div className="pnl-row__pct">—</div>
            </div>

            <div className="pnl-row">
              <div className="pnl-row__label">
                Lương lái xe
                <div className="pnl-row__label-sub">Lương cơ bản + khoán chuyến + phụ cấp</div>
              </div>
              <div className="pnl-row__amount">{formatNumber(driverCost)}</div>
              <div className="pnl-row__yoy">—</div><div className="pnl-row__pct">—</div>
            </div>

            {maintenanceCost > 0 && (
            <div className="pnl-row">
              <div className="pnl-row__label">
                Bảo dưỡng &amp; sửa chữa
                <div className="pnl-row__label-sub">Chi phí bảo dưỡng xe đầu kéo</div>
              </div>
              <div className="pnl-row__amount">{formatNumber(maintenanceCost)}</div>
              <div className="pnl-row__yoy">—</div><div className="pnl-row__pct">—</div>
            </div>
            )}

            <div className="pnl-row pnl-row--subtotal">
              <div className="pnl-row__label">Tổng chi phí vận hành</div>
              <div className="pnl-row__amount">{formatNumber(totalCosts)}</div>
              <div className="pnl-row__yoy">{prevReport ? formatNumber(totalCostsLY) : '—'}</div>
              <div className={`pnl-row__pct ${prevReport ? yoyClass(totalCosts, totalCostsLY) : ''}`}>{prevReport ? yoyPct(totalCosts, totalCostsLY) : '—'}</div>
            </div>

            <div className="pnl-row pnl-row--subtotal" style={{ background: 'var(--success-soft)' }}>
              <div className="pnl-row__label" style={{ color: 'var(--success)', fontWeight: 700 }}>
                Lợi nhuận gộp · Biên {marginPct(grossProfit, totalRevenue)}%
              </div>
              <div className="pnl-row__amount" style={{ color: 'var(--success)', fontWeight: 700 }}>{formatNumber(grossProfit)}</div>
              <div className="pnl-row__yoy" style={{ color: 'var(--success)' }}>{prevReport ? formatNumber(grossProfitLY) : '—'}</div>
              <div className={`pnl-row__pct ${prevReport ? yoyClass(grossProfit, grossProfitLY) : ''}`}>{prevReport ? yoyPct(grossProfit, grossProfitLY) : '—'}</div>
            </div>

            {companyExpenses > 0 && (
            <div className="pnl-row">
              <div className="pnl-row__label">
                Chi phí công ty
                <div className="pnl-row__label-sub">Bảo hiểm, đăng kiểm, phí cố định khác</div>
              </div>
              <div className="pnl-row__amount">{formatNumber(companyExpenses)}</div>
              <div className="pnl-row__yoy">{prevReport ? formatNumber(companyExpensesLY) : '—'}</div>
              <div className={`pnl-row__pct ${prevReport ? yoyClass(companyExpenses, companyExpensesLY) : ''}`}>{prevReport ? yoyPct(companyExpenses, companyExpensesLY) : '—'}</div>
            </div>
            )}

            {companyExpenses > 0 && (
              <div className="pnl-row pnl-row--subtotal">
                <div className="pnl-row__label">Tổng chi phí hoạt động</div>
                <div className="pnl-row__amount">{formatNumber(companyExpenses)}</div>
                <div className="pnl-row__yoy">{prevReport ? formatNumber(companyExpensesLY) : '—'}</div>
                <div className={`pnl-row__pct ${prevReport ? yoyClass(companyExpenses, companyExpensesLY) : ''}`}>{prevReport ? yoyPct(companyExpenses, companyExpensesLY) : '—'}</div>
              </div>
            )}

            {/* FINAL NET PROFIT */}
            <div className="pnl-row pnl-row--final">
              <div className="pnl-row__label" style={{ textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, fontSize: 'var(--fs-body)' }}>
                Lợi nhuận ròng
              </div>
              <div className="pnl-row__amount">{formatNumber(netProfit)} ₫</div>
              <div className="pnl-row__yoy">{prevReport ? formatNumber(netProfitLY) : '—'}</div>
              <div className={`pnl-row__pct ${prevReport ? yoyClass(netProfit, netProfitLY) : ''}`}>{prevReport ? yoyPct(netProfit, netProfitLY) : '—'}</div>
            </div>
          </div>

          <p style={{ fontSize: 'var(--fs-body)', color: 'var(--fg-3)', margin: '14px 0 24px', lineHeight: 1.5 }}>
            * Lợi nhuận ròng kế toán: <strong>{formatNumber(netProfit)} ₫</strong>.
            {activeCapTable.length > 0
              ? <> Sau khi kết chuyển chia cổ đông: {activeCapTable.map((p, i) => <span key={i}>{i > 0 ? ' và ' : ''}<strong>{formatNumber(netProfit * p.pct / 100)} ₫</strong> cho {p.name} ({p.pct}%)</span>)}.</>
              : ' Chưa cấu hình bảng cổ phần.'
            }{' '}
            <Link to='/profit'
              style={{ color: 'var(--brand)', display: 'inline-flex', alignItems: 'center', fontWeight: 600, textDecoration: 'none' }}
            >
              Xem chi tiết cổ phần →
            </Link>
          </p>

          <TruckBreakdownPanel
            truckBreakdown={truckBreakdown}
            maintenanceCost={maintenanceCost}
            report={report}
            expandedTruckIds={expandedTruckIds}
            onToggleTruck={toggleTruck}
            tripDetailsByTruck={tripDetailsByTruck}
          />

          <FinanceCategoryPanel
            categoryBreakdown={categoryBreakdown}
            month={month}
            year={year}
          />
        </>
      )}
    </div>
  );
}
