import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Compass,
  CheckCircle2,
  AlertTriangle,
  Play,
  Plus,
  Pencil,
  X,
  Check,
} from 'lucide-react';
import { api } from '../lib/api';
import { PageHeader, Card, useConfirm } from '../components/UI';
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
  licensePlate: string;
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

// Inline reassign form state for a single trip
interface ReassignState {
  truckId: string;
  driverId: string;
  loading: boolean;
  error: string;
}

export default function DispatchPage() {
  const navigate = useNavigate();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [trucks, setTrucks] = useState<Truck[]>([]);

  // Trips data
  const [pendingTrips, setPendingTrips] = useState<TripDetail[]>([]);
  const [activeTrips, setActiveTrips] = useState<TripDetail[]>([]);

  const [actionLoading, setActionLoading] = useState<number | null>(null);

  // Reassign state: tripId -> form state (null = not open)
  const [reassignOpen, setReassignOpen] = useState<number | null>(null);
  const [reassignState, setReassignState] = useState<ReassignState>({
    truckId: '',
    driverId: '',
    loading: false,
    error: '',
  });

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
    if (!await confirm('Bạn có chắc chắn muốn xuất phát chuyến đi này? Trạng thái sẽ chuyển thành Đang chạy.')) {
      return;
    }
    setActionLoading(tripId);
    try {
      await api.post(`/trips/${tripId}/dispatch`, {});
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

  // Open reassign panel for a trip
  const openReassign = (trip: TripDetail) => {
    setReassignOpen(trip.id);
    setReassignState({
      truckId: String(trip.truckId),
      driverId: String(trip.driverId),
      loading: false,
      error: '',
    });
  };

  const closeReassign = () => {
    setReassignOpen(null);
    setReassignState({ truckId: '', driverId: '', loading: false, error: '' });
  };

  // Save reassignment
  const handleReassign = async (tripId: number) => {
    if (!reassignState.truckId || !reassignState.driverId) {
      setReassignState(s => ({ ...s, error: 'Vui lòng chọn xe và tài xế' }));
      return;
    }
    setReassignState(s => ({ ...s, loading: true, error: '' }));
    try {
      await api.patch(`/trips/${tripId}/reassign`, {
        truck_id: Number(reassignState.truckId),
        driver_id: Number(reassignState.driverId),
      });
      // Reload pending trips
      const pendingRes = await api.get<{ items: TripDetail[] }>(`/trips?status=${TripStatus.CREATED}&limit=100`);
      setPendingTrips(pendingRes.items || []);
      closeReassign();
    } catch (err: any) {
      setReassignState(s => ({ ...s, loading: false, error: err.message || 'Lỗi khi cập nhật' }));
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

  const selectStyle: React.CSSProperties = {
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='none' stroke='%23A1A1AA' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m3 4.5 3 3 3-3'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 10px center',
    paddingRight: 28,
    flex: 1,
    minWidth: 0,
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
            <button
              className="btn btn--primary"
              onClick={() => navigate('/trips/new')}
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
                return (
                  <div key={truck.id} className="vstatus">
                    <div className="vstatus__head">
                      <div>
                        <span className="vstatus__plate" style={{ background: 'var(--warning-soft)', color: 'var(--warning)', border: '1px solid var(--warning)' }}>{truck.licensePlate}</span>
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
                return (
                  <div key={truck.id} className="vstatus" onClick={() => navigate(`/trips/${activeTrip.id}`)} style={{ cursor: 'pointer' }}>
                    <div className="vstatus__head">
                      <div>
                        <span className="vstatus__plate">{truck.licensePlate}</span>
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
                return (
                  <div key={truck.id} className="vstatus">
                    <div className="vstatus__head">
                      <div>
                        <span className="vstatus__plate" style={{ background: 'var(--surface-3)', color: 'var(--ink)', border: '1px solid var(--line-2)' }}>{truck.licensePlate}</span>
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
              Đơn hàng · {pendingTrips.length}
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

                  {/* Inline reassign panel */}
                  {reassignOpen === trip.id ? (
                    <div style={{
                      background: 'var(--surface-2)',
                      border: '1px solid var(--line-2)',
                      borderRadius: 8,
                      padding: '12px 14px',
                      marginTop: 4,
                    }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 8 }}>
                        Đổi xe / tài xế
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <select
                          className="input"
                          style={{ ...selectStyle, fontSize: 13, padding: '6px 28px 6px 10px', height: 34 }}
                          value={reassignState.truckId}
                          onChange={e => setReassignState(s => ({ ...s, truckId: e.target.value }))}
                          disabled={reassignState.loading}
                        >
                          <option value="">Chọn xe đầu</option>
                          {trucks.filter(t => t.status !== 'MAINTENANCE').map(t => (
                            <option key={t.id} value={t.id}>{t.licensePlate}</option>
                          ))}
                        </select>
                        <select
                          className="input"
                          style={{ ...selectStyle, fontSize: 13, padding: '6px 28px 6px 10px', height: 34 }}
                          value={reassignState.driverId}
                          onChange={e => setReassignState(s => ({ ...s, driverId: e.target.value }))}
                          disabled={reassignState.loading}
                        >
                          <option value="">Chọn tài xế</option>
                          {drivers.map(d => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                          ))}
                        </select>
                      </div>
                      {reassignState.error && (
                        <div style={{ fontSize: 12, color: 'var(--danger)', marginTop: 6 }}>
                          {reassignState.error}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                        <button
                          className="btn btn--primary btn--sm"
                          onClick={() => handleReassign(trip.id)}
                          disabled={reassignState.loading}
                        >
                          {reassignState.loading
                            ? <div className="spin" style={{ width: 11, height: 11, border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%' }} />
                            : <Check size={13} />
                          }
                          Lưu
                        </button>
                        <button
                          className="btn btn--secondary btn--sm"
                          onClick={closeReassign}
                          disabled={reassignState.loading}
                        >
                          <X size={13} />
                          Hủy
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="order-card__suggest" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                      <span>Đề xuất xe: <strong>{trip.truckPlate}</strong> · Tài xế: {trip.driverName}</span>
                      <button
                        className="btn btn--secondary btn--sm"
                        onClick={() => openReassign(trip)}
                        disabled={actionLoading === trip.id}
                        title="Đổi xe / tài xế"
                      >
                        <Pencil size={12} />
                        Đổi
                      </button>
                    </div>
                  )}

                  <div>
                    <div className="order-card__time">{formatDate(trip.departureDate)}</div>
                    <div className="order-card__time-label">Ngày xuất phát</div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <button
                      className="btn btn--primary btn--sm"
                      onClick={() => handleDispatch(trip.id)}
                      disabled={actionLoading === trip.id || reassignOpen === trip.id}
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
      {confirmDialog}
    </div>
  );
}
