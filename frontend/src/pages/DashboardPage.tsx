import React from 'react';
import { useNavigate } from 'react-router-dom';
import { formatCompact } from '../lib/format';
import { useAuth } from '../hooks/useAuth';
import type { Role } from '@nepocorp/shared';
import { ROLE_LABELS } from '@nepocorp/shared';
import { SkeletonLine, SkeletonKPIs } from '../components/shared/Skeleton';
import { useDashboardData } from '../features/dashboard/hooks/useDashboardData';
import { KpiCards } from '../features/dashboard/components/KpiCards';
import { PieChartSection } from '../features/dashboard/components/PieChartSection';
import { TripListSection } from '../features/dashboard/components/TripListSection';
import { RenewalWidget } from '../features/dashboard/components/RenewalWidget';
import { ReceivablesWidget } from '../features/dashboard/components/ReceivablesWidget';
import { styles, fmtMoM } from '../features/dashboard/utils';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const {
    currentMonth, currentYear,
    stats, loading, prevPnlReport,
    createdTrips, createdTripsCount,
    renewalReminders, receivablesSummary,
    yearlySeries, topOverdueCustomer, topShareholder,
    fuelWarnings, derived,
    formattedTotalPie, formattedNet,
  } = useDashboardData();

  if (loading) {
    return (
      <div className="fade-up">
        <header className="page-header">
          <div>
            <SkeletonLine width="180px" />
            <div style={styles.thinBar} />
            <SkeletonLine width="260px" />
          </div>
        </header>
        <SkeletonKPIs count={4} />
      </div>
    );
  }

  const d = derived ?? undefined;
  const revenue = d?.revenue ?? 0;
  const prevRevenue = d?.prevRevenue ?? 0;
  const isRevUp = revenue >= prevRevenue;
  const revenueMoM = fmtMoM(revenue, prevRevenue);
  const netProfit = d?.netProfit ?? 0;

  return (
    <div className="fade-up" style={styles.sectionPadding}>
      <header className="page-header">
        <div>
          <h1 className="page-title">{(() => { const h = new Date().getHours(); return h < 12 ? 'Chào buổi sáng' : h < 18 ? 'Chào buổi chiều' : 'Chào buổi tối'; })()}, <em>{user?.fullName || (user?.role && ROLE_LABELS[user.role as Role]) || user?.username || 'bạn'}</em></h1>
          <p className="page-subtitle">
            Tháng {currentMonth} / {currentYear} đang hoạt động — doanh thu{' '}
            {prevPnlReport ? (
              <>
                <strong style={{ color: isRevUp ? 'var(--success)' : 'var(--danger)' }}>{revenueMoM} so với tháng trước</strong>
              </>
            ) : (
              <strong>chưa đủ dữ liệu so sánh</strong>
            )}
            . Lợi nhuận ròng dự kiến <strong>{formatCompact(netProfit)} ₫</strong> sau phí quản lý.
          </p>
        </div>
        <div className="page-actions">
          <button className="btn btn--secondary" onClick={() => navigate('/finance')}>
            <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Báo cáo lãi lỗ
          </button>
          <button className="btn btn--primary" onClick={() => navigate('/dispatch')}>
            <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" rx="2"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
            Phân xe{createdTripsCount > 0 ? ` · ${createdTripsCount} đơn chờ` : ''}
          </button>
        </div>
      </header>

      {d && (
        <KpiCards
          derived={d}
          prevPnlReport={prevPnlReport}
          lockedTrips={stats?.lockedTrips}
          currentMonth={currentMonth}
          currentYear={currentYear}
          onNavigate={navigate}
        />
      )}

      {d && (
        <PieChartSection
          derived={d}
          yearlySeries={yearlySeries}
          currentMonth={currentMonth}
          currentYear={currentYear}
          formattedTotalPie={formattedTotalPie}
        />
      )}

      {d && (
        <TripListSection
          derived={d}
          stats={stats}
          currentMonth={currentMonth}
          currentYear={currentYear}
        />
      )}

      <RenewalWidget renewalReminders={renewalReminders} />

      {d && (
        <ReceivablesWidget
          topOverdueCustomer={topOverdueCustomer}
          topShareholder={topShareholder}
          receivablesSummary={receivablesSummary}
          createdTrips={createdTrips}
          createdTripsCount={createdTripsCount}
          fuelWarnings={fuelWarnings}
          renewalReminders={renewalReminders}
          netProfit={netProfit}
          currentMonth={currentMonth}
          currentYear={currentYear}
          navigate={navigate}
        />
      )}
    </div>
  );
}
