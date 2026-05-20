import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { formatCurrency } from '../lib/format';
import { TripStatus } from '@nepocorp/shared';
import type { TripDetail } from '@nepocorp/shared';


/* -------------------------------------------------------------------------- */
/*  Status Badge - Translates exactly to wireframe classes                    */
/* -------------------------------------------------------------------------- */

function statusBadge(status: TripStatus) {
  const map: Record<TripStatus, string> = {
    [TripStatus.CREATED]: 'pill',
    [TripStatus.IN_TRANSIT]: 'pill pill--info',
    [TripStatus.COMPLETED]: 'pill pill--warn',
    [TripStatus.LOCKED]: 'pill pill--success',
    [TripStatus.CANCELED]: 'pill pill--danger',
  };
  const labelMap: Record<TripStatus, string> = {
    [TripStatus.CREATED]: 'Lên lịch',
    [TripStatus.IN_TRANSIT]: 'Đang chạy',
    [TripStatus.COMPLETED]: 'Chờ duyệt',
    [TripStatus.LOCKED]: 'Đã chốt',
    [TripStatus.CANCELED]: 'Đã huỷ',
  };
  return (
    <span className={map[status] || 'pill'}>
      <span className="dot"></span>
      {labelMap[status] || status}
    </span>
  );
}

export default function TripListPage() {
  const navigate = useNavigate();

  const [trips, setTrips] = useState<TripDetail[]>([]);
  const [loading, setLoading] = useState(true);

  /* Toolbar Filters */
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [monthYearFilter, setMonthYearFilter] = useState<string>('');
  const [truckFilter, setTruckFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    setLoading(true);
    api.get<{ items: TripDetail[]; total: number }>('/trips?limit=200')
      .then((res) => {
        setTrips(res.items);
      })
      .catch((err) => {
        console.error('Error fetching trips:', err);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleExport = () => {
    alert('Đang xuất Excel sổ chuyến đi...');
  };

  // Perform client-side filtering to mimic advanced search bar immediately
  const filteredTrips = trips.filter((trip) => {
    if (statusFilter === 'WARNING') {
      // Warnings means missing fuel receipt or abnormally high consumption
      const distance = Number(trip.route?.distance ?? 120);
      const fuel = trip.fuel_consumption ? Number(trip.fuel_consumption) : null;
      const cons = fuel ? (fuel / distance) * 100 : 0;
      return !fuel || cons > 37;
    }
    if (statusFilter && trip.status !== statusFilter) return false;
    
    if (monthYearFilter) {
      const depDate = trip.departure_date || '';
      if (!depDate.startsWith(monthYearFilter)) return false;
    }
    
    if (truckFilter && trip.truck?.license_plate !== truckFilter) return false;
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchId = String(trip.id).includes(q);
      const matchCustomer = trip.customer?.name?.toLowerCase().includes(q) ?? false;
      const matchRoute = trip.route?.name?.toLowerCase().includes(q) ?? false;
      const matchDriver = trip.driver?.name?.toLowerCase().includes(q) ?? false;
      if (!matchId && !matchCustomer && !matchRoute && !matchDriver) return false;
    }

    return true;
  });

  const totalCount = trips.length;
  const completedCount = trips.filter(t => t.status === TripStatus.COMPLETED).length;
  
  // Calculate warning trips
  const warningCount = trips.filter(t => {
    const distance = Number(t.route?.distance ?? 120);
    const fuel = t.fuel_consumption ? Number(t.fuel_consumption) : null;
    const cons = fuel ? (fuel / distance) * 100 : 0;
    return !fuel || cons > 37;
  }).length;

  return (
    <div className="fade-up">
      {/* Header closely matching wireframe */}
      <header className="page-header">
        <div>
          <h1 className="page-title">Sổ chuyến đi</h1>
          <p className="page-subtitle">
            {totalCount} chuyến trong tháng này · <strong style={{ color: 'var(--warning)' }}>{completedCount} chờ xác nhận</strong> · <strong style={{ color: 'var(--danger)' }}>{warningCount} cảnh báo tiêu hao</strong>
          </p>
        </div>
        <div className="page-actions">
          <button className="btn btn--secondary" onClick={handleExport}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Xuất Excel
          </button>
          <button className="btn btn--primary" onClick={() => navigate('/trips/new')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Thêm chuyến
          </button>
        </div>
      </header>

      {/* Toolbar exactly matching wireframe structure */}
      <div className="toolbar">
        <button 
          className={`filter-pill ${statusFilter === '' ? 'is-active' : ''}`}
          onClick={() => setStatusFilter('')}
        >
          Tất cả <strong>· {totalCount}</strong>
        </button>
        <button 
          className={`filter-pill ${statusFilter === TripStatus.COMPLETED ? 'is-active' : ''}`}
          onClick={() => setStatusFilter(TripStatus.COMPLETED)}
        >
          Chờ xác nhận <strong>· {completedCount}</strong>
        </button>
        <button 
          className={`filter-pill ${statusFilter === 'WARNING' ? 'is-active' : ''}`}
          onClick={() => setStatusFilter('WARNING')}
        >
          Cảnh báo <strong style={{ color: 'var(--danger)' }}>· {warningCount}</strong>
        </button>

        {/* Month Selector Dropdown styled as filter pill */}
        <select 
          className="filter-pill"
          value={monthYearFilter}
          onChange={(e) => setMonthYearFilter(e.target.value)}
          style={{ background: 'var(--bg-2)', border: 'none', padding: '0 8px', height: 28, borderRadius: 99, fontSize: 12, fontWeight: 500, color: 'var(--fg-1)', cursor: 'pointer' }}
        >
          <option value="">Tất cả thời gian</option>
          <option value="2026-05">Tháng 5/2026</option>
          <option value="2026-06">Tháng 6/2026</option>
        </select>

        {/* Truck/Plate Dropdown styled as filter pill */}
        <select 
          className="filter-pill"
          value={truckFilter}
          onChange={(e) => setTruckFilter(e.target.value)}
          style={{ background: 'var(--bg-2)', border: 'none', padding: '0 8px', height: 28, borderRadius: 99, fontSize: 12, fontWeight: 500, color: 'var(--fg-1)', cursor: 'pointer' }}
        >
          <option value="">Tất cả xe</option>
          {Array.from(new Set(trips.map(t => t.truck?.license_plate).filter(Boolean))).map(plate => (
            <option key={plate} value={plate!}>{plate}</option>
          ))}
        </select>

        <div className="toolbar__spacer"></div>
        <div className="toolbar__search">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
          <input 
            type="text" 
            placeholder="Tìm theo mã chuyến, KH..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Table Wrap matching wireframe class */}
      <div className="table-wrap">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th style={{ width: 36 }}><div className="checkbox" id="selectAll"></div></th>
                <th>Chuyến</th>
                <th>Xe</th>
                <th>Tuyến · Khách hàng</th>
                <th className="num">Km</th>
                <th className="num">Dầu (L)</th>
                <th className="num">Tiêu hao <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'var(--fg-3)' }}>L/100km</span></th>
                <th className="num">Tiền đi đường</th>
                <th>Trạng thái</th>
                <th style={{ width: 80 }}></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: 30, color: 'var(--fg-3)' }}>
                    Đang tải danh sách chuyến đi...
                  </td>
                </tr>
              ) : filteredTrips.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: 40, color: 'var(--fg-3)' }}>
                    Không tìm thấy chuyến đi nào.
                  </td>
                </tr>
              ) : (
                filteredTrips.map((trip) => {
                  const distance = Number(trip.route?.distance ?? 124);
                  const fuel = trip.fuel_consumption ? Number(trip.fuel_consumption) : null;
                  const cons = fuel ? (fuel / distance) * 100 : 0;
                  
                  let consClass = 'ttbq-cell--ok';
                  let fillPct = '78%';
                  if (cons > 40) {
                    consClass = 'ttbq-cell--danger';
                    fillPct = '100%';
                  } else if (cons > 36) {
                    consClass = 'ttbq-cell--warn';
                    fillPct = '92%';
                  }

                  return (
                    <tr 
                      key={trip.id} 
                      onClick={() => navigate(`/trips/${trip.id}`)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="checkbox"></div>
                      </td>
                      <td>
                        <div className="row-strong">CT-{trip.id}</div>
                        <div className="row-meta">
                          {trip.departure_date ? new Date(trip.departure_date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) : '—'}
                        </div>
                      </td>
                      <td>
                        <span className="plate">{trip.truck?.license_plate ?? '—'}</span>
                      </td>
                      <td>
                        <div className="row-strong">{trip.route?.name ?? '—'}</div>
                        <div className="row-meta">
                          {trip.customer?.name ?? '—'} · {trip.trailer_type || '40ft'}
                        </div>
                      </td>
                      <td className="num">{distance}</td>
                      <td className="num">
                        {fuel ? fuel.toFixed(1) : '—'}
                        {!fuel && (
                          <span className="missing-flag" title="Thiếu hoá đơn dầu">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                          </span>
                        )}
                      </td>
                      <td className="num">
                        {fuel ? (
                          <div className={`ttbq-cell ${consClass}`}>
                            <div className="ttbq-cell__bar">
                              <div className="ttbq-cell__bar-fill" style={{ width: fillPct }}></div>
                            </div>
                            <span style={{ fontWeight: 600 }}>{cons.toFixed(1)}</span>
                          </div>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="num big">{formatCurrency(trip.road_allowance ?? 0).replace(' ₫', '')}</td>
                      <td>{statusBadge(trip.status)}</td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="row-actions">
                          <button 
                            className="row-action" 
                            aria-label="Sửa"
                            onClick={() => navigate(`/trips/${trip.id}/edit`)}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          </button>
                          <button 
                            className="row-action" 
                            aria-label="Chi tiết"
                            onClick={() => navigate(`/trips/${trip.id}`)}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
