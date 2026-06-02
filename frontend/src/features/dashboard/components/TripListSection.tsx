import React from 'react';
import { Link } from 'react-router-dom';
import { Panel, KPI } from '../../../components/UI';
import { styles } from '../utils';
import { FleetStatusCards } from './PieChartSection';
import type { ExtendedDashboardStats } from '../../../hooks/useQueries';
import type { DerivedData } from '../hooks/useDashboardData';

interface TripListSectionProps {
  derived: DerivedData;
  stats: ExtendedDashboardStats | undefined;
  currentMonth: number;
  currentYear: number;
}

export function TripListSection({ derived, stats, currentMonth, currentYear }: TripListSectionProps) {
  const {
    displayTrucks = [],
    maxTruckProfit = 1,
    displayRoutes = [],
  } = derived;

  return (
    <div className="dash-grid">
      <Panel
        title={`Lợi nhuận theo xe · ${String(currentMonth).padStart(2, '0')}/${currentYear}`}
        subtitle="Biên lợi nhuận gộp từng đầu kéo"
      >
        <div className="stack" style={styles.gap6}>
          {displayTrucks.length === 0 ? (
            <div style={{ ...styles.noDataMsg, flexDirection: 'column', gap: 6 }}>
              <img src="/assets/illustrations/empty-trucks.svg" alt="" aria-hidden="true" style={{ width: 120, height: 100, objectFit: 'contain' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              Chưa có dữ liệu xe tháng này
            </div>
          ) : displayTrucks.map((t: any, idx: number) => {
            const pctWidth = Math.max(8, Math.min(100, (t.profit / maxTruckProfit) * 100));
            let barClass = 'hbar-row__bar';
            if (t.profit < 80000000) {
              barClass = 'hbar-row__bar hbar-row__bar--low';
            }
            return (
              <div key={idx} className="hbar-row">
                <div className="hbar-row__label">
                  {t.plate}
                  <div className="hbar-row__label-sub">{t.driver}</div>
                </div>
                <div className="hbar-row__track">
                  <div className={barClass} style={{ width: `${pctWidth}%` }} />
                </div>
                <div className="hbar-row__value">{Math.round(t.profit / 1000000)}<small style={styles.smallUnit}>tr ₫</small></div>
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel
        title={`Top tuyến sinh lời · ${String(currentMonth).padStart(2, '0')}/${currentYear}`}
        subtitle="Theo tổng lợi nhuận gộp"
        action={<Link to='/routes' style={styles.linkAction}>Tất cả →</Link>}
      >
        <div className="toplist">
          {displayRoutes.length === 0 ? (
            <div style={{ ...styles.noDataMsg, flexDirection: 'column', gap: 6 }}>
              <img src="/assets/illustrations/empty-routes.svg" alt="" aria-hidden="true" style={{ width: 120, height: 100, objectFit: 'contain' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              Chưa có dữ liệu tuyến đường tháng này
            </div>
          ) : displayRoutes.map((r: any, idx: number) => (
            <div key={idx} className="toplist__row">
              <div className={`toplist__rank ${idx < 3 ? 'toplist__rank--top' : ''}`}>{idx + 1}</div>
              <div className="toplist__body">
                <div className="toplist__title">{r.name}</div>
                <div className="toplist__meta">{r.meta}</div>
              </div>
              <div>
                <div className="toplist__value">{Math.round(r.profit / 1000000)}<small style={styles.smallUnit}>tr ₫</small></div>
                <div className="toplist__value-sub">{Math.round((r.profit / (r.trips || 1)) / 1000000).toFixed(1)}<small style={styles.smallUnitLg}>tr</small> / chuyến</div>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel
        title="Tình trạng đội xe"
        subtitle={stats?.totalDrivers
          ? `${stats?.totalTrucks ?? 0} đầu kéo · ${stats.totalDrivers} tài xế`
          : `${stats?.totalTrucks ?? 0} đầu kéo · chưa đăng ký tài xế`}
        style={styles.fullWidth}
      >
        <FleetStatusCards fleetStatus={stats?.fleetStatus} inTransitTrips={stats?.inTransitTrips} />
      </Panel>
    </div>
  );
}
