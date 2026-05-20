import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { api } from '../lib/api';
import { formatCurrency, formatDate } from '../lib/format';
import {
  TRIP_STATUS_LABELS,
  TripStatus,
} from '@nepocorp/shared';
import type { TripDetail, PaginatedResponse } from '@nepocorp/shared';

/* -------------------------------------------------------------------------- */
/*  Status badge                                                              */
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
/*  Skeleton                                                                  */
/* -------------------------------------------------------------------------- */

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <tr key={i}>
          {Array.from({ length: 8 }).map((_, j) => (
            <td key={j}>
              <div
                style={{
                  height: 12,
                  width: j === 0 ? 32 : j === 7 ? 90 : '70%',
                  background: 'var(--bg-3)',
                  borderRadius: 4,
                }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export default function TripListPage() {
  const navigate = useNavigate();

  const [trips, setTrips] = useState<TripDetail[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  /* Filters */
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const pageSize = 20;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  /* ---- Fetch ---- */
  const fetchTrips = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });
    if (statusFilter) params.set('status', statusFilter);
    if (dateFrom) params.set('from', dateFrom);
    if (dateTo) params.set('to', dateTo);

    api
      .get<PaginatedResponse<TripDetail>>(`/trips?${params.toString()}`)
      .then((res) => {
        setTrips(res.items);
        setTotal(res.total);
      })
      .catch(() => {
        /* non-critical */
      })
      .finally(() => setLoading(false));
  }, [page, statusFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  /* Reset to page 1 when filters change */
  useEffect(() => {
    setPage(1);
  }, [statusFilter, dateFrom, dateTo]);

  /* ---- Handlers ---- */
  function applyFilters() {
    setPage(1);
    fetchTrips();
  }

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Lệnh vận chuyển</h1>
          <p>Quản lý tất cả lệnh vận chuyển</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => navigate('/trips/new')}
        >
          <Plus size={15} />
          Tạo lệnh
        </button>
      </div>

      {/* Filter bar */}
      <div className="card-shell" style={{ marginBottom: 16 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 16px',
            flexWrap: 'wrap',
          }}
        >
          {/* Status */}
          <select
            className="input"
            style={{ width: 160, height: 34, fontSize: 13 }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">Tất cả trạng thái</option>
            {Object.values(TripStatus).map((s) => (
              <option key={s} value={s}>
                {TRIP_STATUS_LABELS[s]}
              </option>
            ))}
          </select>

          {/* Date from */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="typo-caption">Từ</span>
            <input
              type="date"
              className="input"
              style={{ width: 150, height: 34, fontSize: 13 }}
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>

          {/* Date to */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="typo-caption">Đến</span>
            <input
              type="date"
              className="input"
              style={{ width: 150, height: 34, fontSize: 13 }}
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>

          {/* Apply */}
          <button
            className="btn btn-secondary btn-sm"
            onClick={applyFilters}
          >
            <Search size={13} />
            Tìm kiếm
          </button>
        </div>

        {/* Table or Empty State */}
        {!loading && trips.length === 0 ? (
          <div className="empty-state" style={{ border: 'none', margin: 0, padding: '56px 24px' }}>
            <img src="/assets/illustrations/empty-trips.svg" alt="No trips" />
            <h3 className="empty-state-title">Chưa có chuyến đi nào</h3>
            <p className="empty-state-desc">
              Không tìm thấy lệnh vận chuyển nào khớp với bộ lọc hiện tại. Hãy thử thay đổi bộ lọc hoặc tạo chuyến mới.
            </p>
            <button
              className="btn btn-primary"
              onClick={() => navigate('/trips/new')}
            >
              <Plus size={14} />
              Tạo lệnh vận chuyển
            </button>
          </div>
        ) : (
          <>
            <table className="tt-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Khách hàng</th>
                  <th>Tuyến đường</th>
                  <th>Xe</th>
                  <th>Ngày đi</th>
                  <th>Trạng thái</th>
                  <th className="num">Doanh thu</th>
                  <th className="num">Lợi nhuận</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <TableSkeleton />
                ) : (
                  trips.map((trip) => {
                    const profit = Number(trip.gross_profit ?? 0);
                    return (
                      <tr
                        key={trip.id}
                        onClick={() => navigate(`/trips/${trip.id}`)}
                      >
                        <td className="typo-mono">{trip.id}</td>
                        <td>{trip.customer?.name ?? '—'}</td>
                        <td>{trip.route?.name ?? '—'}</td>
                        <td className="typo-mono">
                          {trip.truck?.license_plate ?? '—'}
                        </td>
                        <td>{formatDate(trip.departure_date)}</td>
                        <td>{statusBadge(trip.status)}</td>
                        <td className="num">{formatCurrency(trip.revenue)}</td>
                        <td
                          className="num"
                          style={{
                            color: profit >= 0
                              ? 'var(--success)'
                              : 'var(--danger)',
                          }}
                        >
                          {formatCurrency(trip.gross_profit)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 16px',
                  borderTop: '1px solid var(--border-2)',
                }}
              >
                <span className="typo-caption" style={{ color: 'var(--fg-3)' }}>
                  Tổng số: <strong>{total}</strong> kết quả &middot; Trang {page}/{totalPages}
                </span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    className="btn btn-outline btn-sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft size={14} />
                    Trước
                  </button>
                  <button
                    className="btn btn-outline btn-sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Sau
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
