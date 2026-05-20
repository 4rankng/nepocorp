import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Compass, 
  Truck, 
  User, 
  Search, 
  ArrowRight, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  Play,
  Plus
} from 'lucide-react';
import { api, ApiError } from '../lib/api';
import { PageHeader, Card, Badge, KPI } from '../components/UI';
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

interface RouteType {
  id: number;
  name: string;
}

interface Trailer {
  id: number;
  license_plate: string;
}

interface CargoType {
  id: number;
  name: string;
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

  // Options
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [routes, setRoutes] = useState<RouteType[]>([]);
  const [trailers, setTrailers] = useState<Trailer[]>([]);
  const [cargoTypes, setCargoTypes] = useState<CargoType[]>([]);

  // Trips data
  const [pendingTrips, setPendingTrips] = useState<TripDetail[]>([]);
  const [activeTrips, setActiveTrips] = useState<TripDetail[]>([]);

  // Search/Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [
        driversRes,
        trucksRes,
        routesRes,
        trailersRes,
        cargoRes,
        pendingRes,
        activeRes
      ] = await Promise.all([
        api.get<{ items: Driver[] }>('/drivers?limit=100'),
        api.get<{ items: Truck[] }>('/trucks?limit=100'),
        api.get<{ items: RouteType[] }>('/routes?limit=100'),
        api.get<{ items: Trailer[] }>('/trailers?limit=100'),
        api.get<{ items: CargoType[] }>('/cargo-types?limit=100'),
        api.get<{ items: TripDetail[] }>(`/trips?status=${TripStatus.CREATED}&limit=100`),
        api.get<{ items: TripDetail[] }>(`/trips?status=${TripStatus.IN_TRANSIT}&limit=100`)
      ]);

      setDrivers(driversRes.items || []);
      setTrucks(trucksRes.items || []);
      setRoutes(routesRes.items || []);
      setTrailers(trailersRes.items || []);
      setCargoTypes(cargoRes.items || []);
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
      await api.post(`/trips/${tripId}/dispatch`);
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

  // Filter trucks by search
  const filteredTrucks = trucks.filter(truck => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const activeTrip = getActiveTripForTruck(truck.id);
    const defDriver = getDefaultDriverForTruck(truck.id);
    return (
      truck.license_plate.toLowerCase().includes(q) ||
      (activeTrip && activeTrip.driverName.toLowerCase().includes(q)) ||
      (defDriver && defDriver.name.toLowerCase().includes(q))
    );
  });

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <div className="spin" style={{ width: 32, height: 32, border: '4px solid var(--border-2)', borderTopColor: 'var(--brand)', borderRadius: '50%' }}></div>
      </div>
    );
  }

  const idleTruckCount = trucks.length - activeTrips.length;

  return (
    <div className="fade-up" style={{ paddingBottom: 40 }}>
      {/* Header */}
      <PageHeader 
        title="Điều vận & Phân xe" 
        description="Theo dõi hoạt động thời gian thực của đội xe và xuất phát các lệnh vận chuyển."
        action={
          <button 
            className="btn btn-primary"
            onClick={() => navigate('/trips/new')}
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <Plus size={16} />
            Tạo chuyến đi mới
          </button>
        }
      />

      {error && (
        <div style={{ padding: 16, background: 'var(--danger-soft)', color: 'var(--danger)', borderRadius: 8, marginBottom: 20 }}>
          {error}
        </div>
      )}

      {/* KPIs */}
      <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        <KPI 
          label="Tổng đội xe" 
          value={trucks.length} 
          unit="đầu xe"
          icon={Truck}
          variant="default"
        />
        <KPI 
          label="Đang di chuyển" 
          value={activeTrips.length} 
          unit="xe hoạt động"
          icon={Compass}
          variant="accent"
          meta={<span style={{ color: 'var(--brand)', fontWeight: 600 }}>Tỷ lệ: {trucks.length ? Math.round((activeTrips.length / trucks.length) * 100) : 0}%</span>}
        />
        <KPI 
          label="Sẵn sàng lệnh" 
          value={idleTruckCount} 
          unit="xe rảnh"
          icon={CheckCircle2}
          variant="success"
          meta="Đang đỗ tại bãi xe"
        />
        <KPI 
          label="Chờ khởi hành" 
          value={pendingTrips.length} 
          unit="đơn hàng"
          icon={Clock}
          variant="warn"
          meta="Cần duyệt xuất phát"
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 28 }}>
        {/* Left / Main: Fleet Board */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Trạng thái đội xe (Thời gian thực)</h2>
            <div className="search-box" style={{ position: 'relative', width: 260 }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-3)' }} />
              <input 
                className="input" 
                style={{ paddingLeft: 30, height: 32, fontSize: 13 }}
                placeholder="Tìm biển số hoặc tài xế..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="fleet-board">
            {filteredTrucks.map(truck => {
              const activeTrip = getActiveTripForTruck(truck.id);
              const defDriver = getDefaultDriverForTruck(truck.id);

              if (activeTrip) {
                // Transit style card
                return (
                  <div key={truck.id} className="vstatus" style={{ borderLeft: '3px solid var(--brand)' }} onClick={() => navigate(`/trips/${activeTrip.id}`)}>
                    <div className="vstatus__head">
                      <div className="vstatus__plate">{truck.license_plate}</div>
                      <div className="vstatus__route-icon">
                        <Compass size={16} style={{ color: 'var(--brand)' }} />
                      </div>
                    </div>
                    <div className="vstatus__driver" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <User size={13} style={{ color: 'var(--fg-3)' }} />
                      {activeTrip.driverName}
                    </div>
                    <div className="vstatus__meta">Khởi hành: {formatDate(activeTrip.departureDate)}</div>
                    
                    <div className="vstatus__body">
                      <div>Tuyến: <strong>{activeTrip.routeName}</strong></div>
                      <div style={{ marginTop: 4 }}>Khách hàng: <strong>{activeTrip.customerName}</strong></div>
                      
                      <div className="vstatus__progress">
                        <div className="vstatus__progress-bar" style={{ width: '65%' }}></div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--fg-3)', marginTop: 4 }}>
                        <span>Đang di chuyển</span>
                        <span>65%</span>
                      </div>
                    </div>
                  </div>
                );
              } else {
                // Available style card
                return (
                  <div key={truck.id} className="vstatus" style={{ borderLeft: '3px solid var(--success)' }}>
                    <div className="vstatus__head">
                      <div className="vstatus__plate" style={{ background: 'var(--bg-3)', color: 'var(--fg-1)', border: '1px solid var(--border-2)' }}>{truck.license_plate}</div>
                      <div className="vstatus__route-icon" style={{ background: 'var(--success-soft)', color: 'var(--success)' }}>
                        <CheckCircle2 size={16} />
                      </div>
                    </div>
                    <div className="vstatus__driver" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <User size={13} style={{ color: 'var(--fg-3)' }} />
                      {defDriver ? defDriver.name : <span style={{ color: 'var(--fg-3)', fontStyle: 'italic' }}>Chưa có tài xế phụ trách</span>}
                    </div>
                    <div className="vstatus__meta">Trạng thái: Sẵn sàng lệnh</div>
                    
                    <div className="vstatus__body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg-3)', fontStyle: 'italic', minHeight: 60 }}>
                      Đang ở bãi, chờ lệnh xuất phát...
                    </div>
                  </div>
                );
              }
            })}
          </div>
        </div>

        {/* Right / Bottom: Pending Order Queue */}
        <div style={{ marginTop: 12 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Đơn hàng chờ khởi hành ({pendingTrips.length})</h2>
          
          {pendingTrips.length === 0 ? (
            <Card style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--fg-3)' }}>
              <CheckCircle2 size={32} style={{ color: 'var(--success)', marginBottom: 12, margin: '0 auto' }} />
              <p style={{ margin: 0, fontWeight: 600, color: 'var(--fg-2)' }}>Không có đơn hàng nào chờ khởi hành</p>
              <p style={{ margin: '4px 0 0', fontSize: 12 }}>Tất cả các chuyến đi đã xuất phát hoặc chưa tạo.</p>
            </Card>
          ) : (
            <div>
              {pendingTrips.map(trip => (
                <div key={trip.id} className="order-card">
                  <div className="order-card__id">#{trip.id}</div>
                  
                  <div className="order-card__main">
                    <div className="order-card__route" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>{trip.routeName}</span>
                      <ArrowRight size={14} style={{ color: 'var(--fg-3)' }} />
                      <span style={{ color: 'var(--fg-3)', fontSize: 13, fontWeight: 400 }}>{trip.customerName}</span>
                    </div>
                    <div className="order-card__meta">
                      <span>Tài xế: <strong>{trip.driverName}</strong></span>
                      <span>•</span>
                      <span>Xe: <strong>{trip.truckPlate}</strong></span>
                      {trip.customerReference && (
                        <>
                          <span>•</span>
                          <span>Mã KH: <strong>{trip.customerReference}</strong></span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="order-card__time">
                    <div>{formatDate(trip.departureDate)}</div>
                    <div className="order-card__time-label">Ngày xuất phát</div>
                  </div>

                  <div>
                    <button 
                      className="btn btn-sm btn-primary"
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
