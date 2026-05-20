import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DollarSign,
  TrendingDown,
  TrendingUp,
  Truck,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { api } from '../lib/api';
import { formatCurrency } from '../lib/format';
import type { DashboardStats, TripDetail } from '@nepocorp/shared';
import { TRIP_STATUS_LABELS, TripStatus } from '@nepocorp/shared';

/* -------------------------------------------------------------------------- */
/*  Status badge helper                                                       */
/* -------------------------------------------------------------------------- */

function statusBadge(status: TripStatus) {
  const map: Record<TripStatus, string> = {
    [TripStatus.CREATED]: 'badge-neutral',
    [TripStatus.IN_TRANSIT]: 'badge-info',
    [TripStatus.COMPLETED]: 'badge-warning',
    [TripStatus.LOCKED]: 'badge-success',
    [TripStatus.CANCELED]: 'badge-danger',
  };
  return (
    <span className={`badge ${map[status]}`}>
      {TRIP_STATUS_LABELS[status]}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*  Stat card                                                                 */
/* -------------------------------------------------------------------------- */

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
}

function StatCard({ label, value, icon: Icon }: StatCardProps) {
  return (
    <div className="stat-card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 'var(--radius-md)',
            background: 'var(--brand-soft)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon
            size={14}
            style={{ color: 'var(--brand)', strokeWidth: 2 }}
          />
        </div>
        <span className="typo-caption" style={{ color: 'var(--fg-3)' }}>
          {label}
        </span>
      </div>
      <div
        className="typo-num"
        style={{
          fontSize: 'var(--fs-2xl)',
          fontWeight: 700,
          color: 'var(--fg-1)',
          paddingBottom: 14,
        }}
      >
        {value}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Dashboard page                                                            */
/* -------------------------------------------------------------------------- */

export default function DashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [trips, setTrips] = useState<TripDetail[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<DashboardStats>('/reports/dashboard'),
      api.get<{ items: TripDetail[]; total: number }>('/trips?limit=5'),
    ])
      .then(([s, t]) => {
        setStats(s);
        setTrips(t.items);
      })
      .catch(() => {
        /* silently fail — dashboard is non-critical */
      })
      .finally(() => setLoading(false));
  }, []);

  /* ---- Skeleton ---- */
  if (loading) {
    return (
      <div>
        <div className="page-header">
          <div>
            <h1>Tổng quan</h1>
            <p>Tổng hợp dữ liệu điều hành vận tải</p>
          </div>
        </div>
        <div className="kpi-grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="stat-card" style={{ minHeight: 88 }}>
              <div
                style={{
                  height: 12,
                  width: '60%',
                  background: 'var(--bg-3)',
                  borderRadius: 4,
                  margin: '8px 0 12px',
                }}
              />
              <div
                style={{
                  height: 22,
                  width: '45%',
                  background: 'var(--bg-3)',
                  borderRadius: 4,
                  marginBottom: 14,
                }}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const fleet = stats
    ? { trucks: (stats as DashboardStats & { totalTrucks?: number }).totalTrucks ?? 0,
        drivers: (stats as DashboardStats & { totalDrivers?: number }).totalDrivers ?? 0 }
    : { trucks: 0, drivers: 0 };

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Tổng quan</h1>
          <p>Tổng hợp dữ liệu điều hành vận tải</p>
        </div>
      </div>

      {/* KPI cards */}
      <div className="kpi-grid fade-up">
        <StatCard
          label="Doanh thu"
          value={formatCurrency(stats?.revenue ?? 0)}
          icon={DollarSign}
        />
        <StatCard
          label="Chi phí"
          value={formatCurrency(stats?.costs ?? 0)}
          icon={TrendingDown}
        />
        <StatCard
          label="Lợi nhuận gộp"
          value={formatCurrency(stats?.grossProfit ?? 0)}
          icon={TrendingUp}
        />
        <StatCard
          label="Chuyến đang chạy"
          value={`${stats?.inTransitTrips ?? 0}`}
          icon={Truck}
        />
      </div>

      {/* Recent trips */}
      <div className="card-shell fade-up-2" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <div>
            <h3>Chuyến gần đây</h3>
            <p>5 chuyến mới nhất</p>
          </div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => navigate('/trips')}
          >
            Xem tất cả
          </button>
        </div>
        {trips.length === 0 ? (
          <div className="empty-state" style={{ border: 'none', margin: 0, padding: '36px 16px' }}>
            <img src="/assets/illustrations/empty-trips.svg" alt="No trips" style={{ width: 110, marginBottom: 12 }} />
            <h3 className="empty-state-title">Chưa có chuyến nào</h3>
            <p className="empty-state-desc" style={{ fontSize: 12, marginBottom: 0 }}>
              Hãy tạo chuyến xe đầu tiên để ghi nhận doanh thu và chi phí hoạt động.
            </p>
          </div>
        ) : (
          <table className="tt-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Khách hàng</th>
                <th>Tuyến đường</th>
                <th>Xe</th>
                <th>Trạng thái</th>
                <th className="num">Doanh thu</th>
              </tr>
            </thead>
            <tbody>
              {trips.map((trip) => (
                <tr
                  key={trip.id}
                  onClick={() => navigate(`/trips/${trip.id}`)}
                >
                  <td className="typo-mono">{trip.id}</td>
                  <td>{trip.customer?.name ?? '—'}</td>
                  <td>{trip.route?.name ?? '—'}</td>
                  <td className="typo-mono">{trip.truck?.license_plate ?? '—'}</td>
                  <td>{statusBadge(trip.status)}</td>
                  <td className="num">{formatCurrency(trip.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Fleet summary */}
      <div className="card-shell fade-up-2">
        <div className="card-header">
          <h3>Đội xe & Tài xế</h3>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 0,
          }}
        >
          <div style={{ padding: '16px 20px', borderRight: '1px solid var(--border-2)' }}>
            <div className="typo-caption" style={{ marginBottom: 4 }}>
              Tổng số xe
            </div>
            <div className="typo-num" style={{ fontSize: 'var(--fs-2xl)', fontWeight: 700, color: 'var(--fg-1)' }}>
              {fleet.trucks}
            </div>
          </div>
          <div style={{ padding: '16px 20px' }}>
            <div className="typo-caption" style={{ marginBottom: 4 }}>
              Tổng số tài xế
            </div>
            <div
              className="typo-num"
              style={{ fontSize: 'var(--fs-2xl)', fontWeight: 700, color: 'var(--fg-1)' }}
            >
              {fleet.drivers}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
