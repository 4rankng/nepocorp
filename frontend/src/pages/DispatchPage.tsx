import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Compass,
  CheckCircle2,
  AlertTriangle,
  Play,
  Plus,
  Map
} from 'lucide-react';
import { api } from '../lib/api';
import { PageHeader, Card } from '../components/UI';
import { formatDate } from '../lib/format';
import { TripStatus } from '@nepocorp/shared';

interface Driver {
  id: number;
  name: string;
  assigned_truck_id?: number | null;
  status: string;
}

interface Truck {
  id: number;
  license_plate: string;
  status: string;
}

interface TripDetail {
  id: number;
  customerId: number;
  customerName: string;
  customerReference?: string;
  truckId: number;
  truckPlate: string;
  driverId: number;
  driverName: string;
  routeId: number;
  routeName: string;
  trailerId: number;
  cargoTypeId: number;
  status: TripStatus;
  departureDate: string;
  notes?: string;
}

export default function DispatchPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [trucks, setTrucks] = useState<Truck[]>([]);

  // Trips data
  const [pendingTrips, setPendingTrips] = useState<TripDetail[]>([]);
  const [activeTrips, setActiveTrips] = useState<TripDetail[]>([]);

  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [driversRes, trucksRes, pendingRes, activeRes] = await Promise.all([
        api.get<{ items: Driver[] }>('/drivers?limit=100'),
        api.get<{ items: Truck[] }>('/trucks?limit=100'),
        api.get<{ items: TripDetail[] }>(`/trips?status=${TripStatus.CREATED}&limit=100`),
        api.get<{ items: TripDetail[] }>(`/trips?status=${TripStatus.IN_TRANSIT}&limit=100`)
      ]);

      setDrivers(driversRes.items || []);
      setTrucks(trucksRes.items || []);
      setPendingTrips(pendingRes.items || []);
      setActiveTrips(activeRes.items || []);
    } catch (err) {
      console.error(err);
      setError('Không thể tải dữ liệu điều vận. Vui lòng tải lại trang.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Dispatch trigger
  const handleDispatch = async (tripId: number) => {
    if (!window.confirm('Bạn có chắc chắn muốn xuất phát chuyến đi này? Trạng thái sẽ chuyển thành Đang chạy.')) {
      return;
    }
    setActionLoading(tripId);
    try {
      await api.post(`/trips/${tripId}/dispatch`, {});
      // Reload trips data
      const [pendingRes, activeRes] = await Promise.all([
        api.get<{ items: TripDetail[] }>(`/trips?status=${TripStatus.CREATED}&limit=100`),
        api.get<{ items: TripDetail[] }>(`/trips?status=${TripStatus.IN_TRANSIT}&limit=100`)
      ]);
      setPendingTrips(pendingRes.items || []);
      setActiveTrips(activeRes.items || []);
    } catch (err: any) {
      alert(err.message || 'Lỗi khi khởi hành chuyến đi.');
    } finally {
      setActionLoading(null);
    }
  };

  // Find active trip for truck
  const getActiveTripForTruck = (truckId: number) => {
    return activeTrips.find(t => t.truckId === truckId);
  };

  // Find default driver for truck
  const getDefaultDriverForTruck = (truckId: number) => {
    return drivers.find(d => d.assigned_truck_id === truckId);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <div className="spin" style={{ width: 32, height: 32, border: '4px solid var(--border-2)', borderTopColor: 'var(--brand)', borderRadius: '50%' }}></div>
      </div>
    );
  }

  return (
    <div className="fade-up" style={{ paddingBottom: 40 }}>
      {/* Header */}
      <PageHeader
        title="Phân xe"
        description={<>{activeTrips.length} xe đang vận hành · <strong style={{ color: 'var(--warning)' }}>{pendingTrips.length} đơn hàng chờ phân</strong></>}
        action={
          <div className="page-actions">
            <button className="btn btn--secondary" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Map size={14} />
              Xem bản đồ
            </button>
            <button
              className="btn btn--primary"
              onClick={() => navigate('/trips/new')}
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <Plus size={14} />
              Tạo đơn mới
            </button>
          </div>
        }
      />

      {error && (
        <div style={{ padding: 16, background: 'var(--danger-soft)', color: 'var(--danger)', borderRadius: 8, marginBottom: 20 }}>
          {error}
        </div>
      )}

      <div>
        {/* Fleet Board */}
        <div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ink-3)', fontWeight: 600, margin: '24px 0 12px' }}>
            Trạng thái đội xe
          </h3>

          <div className="fleet-board">
            {trucks.map(truck => {
              const activeTrip = getActiveTripForTruck(truck.id);
              const defDriver = getDefaultDriverForTruck(truck.id);

              if (truck.status === 'MAINTENANCE') {
                // Maintenance style card
                return (
                  <div key={truck.id} className="vstatus">
                    <div className="vstatus__head">
                      <div>
                        <span className="vstatus__plate" style={{ background: 'var(--warning-soft)', color: 'var(--warning)', border: '1px solid var(--warning)' }}>{truck.license_plate}</span>
                        <div className="vstatus__driver" style={{ marginTop: 8 }}>
                          {defDriver ? defDriver.name : <span style={{ color: 'var(--fg-3)', fontStyle: 'italic' }}>Chưa có tài xế</span>}
                        </div>
                        <div className="vstatus__meta">Bảo dưỡng định kỳ</div>
                      </div>
                      <div className="vstatus__route-icon" style={{ background: 'var(--warning-soft)', color: 'var(--warning)' }}>
                        <AlertTriangle size={18} />
                      </div>
                    </div>
                    <div className="vstatus__body">
                      <span className="pill pill--warn" style={{ marginBottom: 8, display: 'inline-flex' }}><span className="dot"></span>Bảo dưỡng</span>
                      <div>Trạng thái: <strong>Đang sửa chữa / bảo dưỡng</strong></div>
                      <div style={{ color: 'var(--fg-3)', marginTop: 4 }}>Không khả dụng điều vận lúc này</div>
                    </div>
                  </div>
                );
              }

              if (activeTrip) {
                // Transit style card
                return (
                  <div key={truck.id} className="vstatus" onClick={() => navigate(`/trips/${activeTrip.id}`)} style={{ cursor: 'pointer' }}>
                    <div className="vstatus__head">
                      <div>
                        <span className="vstatus__plate">{truck.license_plate}</span>
                        <div className="vstatus__driver" style={{ marginTop: 8 }}>{activeTrip.driverName}</div>
                        <div className="vstatus__meta">Xe chạy chặng · Khởi hành {formatDate(activeTrip.departureDate)}</div>
                      </div>
                      <div className="vstatus__route-icon" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                        <Compass size={18} />
                      </div>
                    </div>
                    <div className="vstatus__body">
                      <span className="pill pill--success" style={{ marginBottom: 8, display: 'inline-flex' }}><span className="dot"></span>Đang chạy</span>
                      <div>Tuyến: <strong>{activeTrip.routeName}</strong></div>
                      <div style={{ marginTop: 4 }}>Khách hàng: <strong>{activeTrip.customerName}</strong></div>
                    </div>
                  </div>
                );
              } else {
                // Available style card
                return (
                  <div key={truck.id} className="vstatus">
                    <div className="vstatus__head">
                      <div>
                        <span className="vstatus__plate" style={{ background: 'var(--surface-3)', color: 'var(--ink)', border: '1px solid var(--line-2)' }}>{truck.license_plate}</span>
                        <div className="vstatus__driver" style={{ marginTop: 8 }}>
                          {defDriver ? defDriver.name : <span style={{ color: 'var(--fg-3)', fontStyle: 'italic' }}>Chưa giao tài xế</span>}
                        </div>
                        <div className="vstatus__meta">Sẵn sàng nhận lệnh điều xe</div>
                      </div>
                      <div className="vstatus__route-icon" style={{ background: 'var(--success-soft)', color: 'var(--success)' }}>
                        <CheckCircle2 size={18} />
                      </div>
                    </div>
                    <div className="vstatus__body">
                      <span className="pill pill--success" style={{ marginBottom: 8, display: 'inline-flex' }}><span className="dot"></span>Sẵn sàng</span>
                      <div>Bãi đỗ: <strong>Long Biên, Hà Nội</strong></div>
                      <div style={{ color: 'var(--fg-3)', marginTop: 4 }}>Đang đỗ tại bãi, chờ lệnh xuất phát</div>
                    </div>
                  </div>
                );
              }
            })}
          </div>
        </div>

        {/* Pending Order Queue */}
        <div style={{ marginTop: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ink-3)', fontWeight: 600, margin: 0 }}>
              Đơn hàng chờ phân · {pendingTrips.length}
            </h3>
            <a href="#" style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>Lịch sử →</a>
          </div>
          
          {pendingTrips.length === 0 ? (
            <Card style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--fg-3)' }}>
              <CheckCircle2 size={32} style={{ color: 'var(--success)', marginBottom: 12, margin: '0 auto' }} />
              <p style={{ margin: 0, fontWeight: 600, color: 'var(--fg-2)' }}>Không có đơn hàng nào chờ khởi hành</p>
              <p style={{ margin: '4px 0 0', fontSize: 12 }}>Tất cả các chuyến đi đã xuất phát hoặc chưa tạo.</p>
            </Card>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {pendingTrips.map(trip => (
                <div key={trip.id} className="order-card">
                  <span className="order-card__id">{trip.routeName}</span>

                  <div className="order-card__main">
                    <div className="order-card__route">{trip.customerName}</div>
                    <div className="order-card__meta">
                      <span>Xe: <strong>{trip.truckPlate}</strong></span>
                      <span>·</span>
                      <span>Tài xế: <strong>{trip.driverName}</strong></span>
                      {trip.customerReference && (
                        <>
                          <span>·</span>
                          <span>Mã KH: <strong>{trip.customerReference}</strong></span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="order-card__suggest">
                    Đề xuất xe: <strong>{trip.truckPlate}</strong> · Tài xế: {trip.driverName}
                  </div>

                  <div>
                    <div className="order-card__time">{formatDate(trip.departureDate)}</div>
                    <div className="order-card__time-label">Ngày xuất phát</div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <button 
                      className="btn btn--primary btn--sm"
                      style={{ display: 'flex', alignItems: 'center', gap: 6, height: 34 }}
                      onClick={() => handleDispatch(trip.id)}
                      disabled={actionLoading === trip.id}
                    >
                      {actionLoading === trip.id ? (
                        <div className="spin" style={{ width: 12, height: 12, border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%' }}></div>
                      ) : (
                        <Play size={12} fill="currentColor" />
                      )}
                      Khởi hành
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
