import React from 'react';
import { formatCompact } from '../../../lib/format';
import { styles, splitKpi, fmtMoM } from '../utils';
import type { DerivedData } from '../hooks/useDashboardData';

interface KpiCardsProps {
  derived: DerivedData;
  prevPnlReport: any;
  lockedTrips: number | undefined;
  currentMonth: number;
  currentYear: number;
  onNavigate: (path: string) => void;
}

export function KpiCards({ derived, prevPnlReport, lockedTrips, currentMonth, currentYear, onNavigate: navigate }: KpiCardsProps) {
  const {
    revenue = 0, costs = 0, grossProfit = 0, netProfit = 0,
    prevRevenue = 0, prevCosts = 0, prevGross = 0,
  } = derived;

  const kpiRevenue = splitKpi(revenue);
  const kpiCosts = splitKpi(costs);
  const kpiGross = splitKpi(grossProfit);
  const kpiNet = splitKpi(netProfit);

  const revenueMoM = fmtMoM(revenue, prevRevenue);
  const costsMoM = fmtMoM(costs, prevCosts);
  const grossMoM = fmtMoM(grossProfit, prevGross);
  const isRevUp = revenue >= prevRevenue;
  const isCostUp = costs > prevCosts;
  const isGrossUp = grossProfit >= prevGross;

  return (
    <div className="kpi-grid">
      <div className="kpi" onClick={() => navigate('/finance')}>
        <div className="kpi__top">
          <span className="kpi__label">Doanh thu {String(currentMonth).padStart(2, '0')}/{currentYear}</span>
        </div>
        <div className="kpi__value">{kpiRevenue.num}<span className="kpi__value-unit">{kpiRevenue.suffix && ` ${kpiRevenue.suffix}`} ₫</span></div>
        <div className={`kpi__meta ${prevPnlReport ? (isRevUp ? 'kpi__meta--up' : 'kpi__meta--down') : ''}`}>
          {(lockedTrips ?? 0) > 0 && <><strong>{lockedTrips}</strong> chuyến ĐÃ CHỐT · </>}
          {prevPnlReport && (
            <svg aria-hidden="true" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              {isRevUp
                ? <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></>
                : <><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></>
              }
            </svg>
          )}
          <strong>{revenueMoM}</strong> so với tháng trước
        </div>
        <div className="kpi__watermark" aria-hidden="true">
          <svg aria-hidden="true" width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
        </div>
      </div>

      <div className="kpi" onClick={() => navigate('/finance')}>
        <div className="kpi__top">
          <span className="kpi__label">Tổng chi phí</span>
        </div>
        <div className="kpi__value">{kpiCosts.num}<span className="kpi__value-unit">{kpiCosts.suffix && ` ${kpiCosts.suffix}`} ₫</span></div>
        <div className="kpi__meta">
          {((costs / (revenue || 1)) * 100).toFixed(1)}% doanh thu
          {prevPnlReport && (
            <> · <span style={{ color: isCostUp ? 'var(--warning)' : 'var(--success)', fontWeight: 600 }}>{costsMoM} so với tháng trước</span></>
          )}
        </div>
        <div className="kpi__watermark" aria-hidden="true">
          <svg aria-hidden="true" width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="22" x2="15" y2="22"/><line x1="4" y1="9" x2="14" y2="9"/><path d="M14 22V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v18"/></svg>
        </div>
      </div>

      <div className="kpi kpi--success" onClick={() => navigate('/finance')}>
        <div className="kpi__top">
          <span className="kpi__label">Lợi nhuận gộp</span>
        </div>
        <div className="kpi__value">{kpiGross.num}<span className="kpi__value-unit">{kpiGross.suffix && ` ${kpiGross.suffix}`} ₫</span></div>
        <div className={`kpi__meta ${prevPnlReport ? (isGrossUp ? 'kpi__meta--up' : 'kpi__meta--down') : ''}`}>
          {prevPnlReport && (
            <svg aria-hidden="true" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              {isGrossUp
                ? <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></>
                : <><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></>
              }
            </svg>
          )}
          <strong>{grossMoM}</strong> · biên {((grossProfit / (revenue || 1)) * 100).toFixed(1)}%
        </div>
        <div className="kpi__watermark" aria-hidden="true">
          <svg aria-hidden="true" width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
        </div>
      </div>

      <div className="kpi kpi--accent" onClick={() => navigate('/profit')}>
        <div className="kpi__top">
          <span className="kpi__label">Lợi nhuận ròng</span>
        </div>
        <div className="kpi__value">{kpiNet.num}<span className="kpi__value-unit">{kpiNet.suffix && ` ${kpiNet.suffix}`} ₫</span></div>
        <div className="kpi__meta">
          Sau phí QL · <span style={styles.brandBold}>Phân chia →</span>
        </div>
        <div className="kpi__watermark" aria-hidden="true">
          <svg aria-hidden="true" width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="8 12 11 15 16 9"/></svg>
        </div>
      </div>
    </div>
  );
}
