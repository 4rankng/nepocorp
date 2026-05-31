import { useState, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  Play,
  Plus,
  X,
  Check,
  Download,
  ArrowRight,
  Building2,
  Clock,
  MapPin,
  UserX,
  Wrench,
  RefreshCw,
  Filter,
  ArrowUpDown,
  Sparkles,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { api } from '../lib/api';
import { getInitials } from '../lib/avatar';
import { formatDayMonth } from '../lib/date';
import { splitRoute } from '../lib/route';
import { useConfirm } from '../components/UI';
import { useDispatchData, normalizeTrip } from '../hooks/useQueries';
import type { NormalizedTrip } from '../hooks/useQueries';

interface Driver {
  id: number;
  name: string;
  assignedTruckId?: number | null;
  status: string;
}

interface Truck {
  id: number;
  licensePlate: string;
  status: string;
}

interface ReassignState {
  truckId: string;
  driverId: string;
  loading: boolean;
  error: string;
}

type FleetFilter = 'all' | 'running' | 'ready' | 'noassign' | 'maint';

const VN_WEEKDAYS = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
const VN_MONTHS = ['tháng 1', 'tháng 2', 'tháng 3', 'tháng 4', 'tháng 5', 'tháng 6', 'tháng 7', 'tháng 8', 'tháng 9', 'tháng 10', 'tháng 11', 'tháng 12'];

// ─── Helpers ──────────────────────────────────────────────────────────────

function avatarColorClass(id: number): string {
  return `da-${(id % 5) + 1}`;
}

function formatFullDate(d: Date): string {
  return `${VN_WEEKDAYS[d.getDay()]} · ${d.getDate()} ${VN_MONTHS[d.getMonth()]}, ${d.getFullYear()}`;
}

function isUrgent(iso: string, now: Date = new Date()): boolean {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const diffMs = d.getTime() - now.getTime();
  return diffMs > 0 && diffMs < 36 * 60 * 60 * 1000;
}

// ─── Component ────────────────────────────────────────────────────────────
export default function DispatchPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const { data, isLoading: loading, error: queryError } = useDispatchData();
  const drivers = (data?.drivers ?? []) as Driver[];
  const trucks = (data?.trucks ?? []).map((t: any) => ({
    id: t.id,
    licensePlate: t.licensePlate ?? '',
    status: t.status ?? '',
  }));
  const pendingTrips: NormalizedTrip[] = data?.pendingTrips ?? [];
  const activeTrips: NormalizedTrip[] = data?.activeTrips ?? [];
  const error = queryError ? 'Không thể tải dữ liệu điều vận. Vui lòng tải lại trang.' : null;

  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [dispatching, setDispatching] = useState(false);
  const [fleetFilter, setFleetFilter] = useState<FleetFilter>('all');
  const [toasts, setToasts] = useState<Array<{ id: number; kind: 'success' | 'error'; text: string }>>([]);
  const addToast = useCallback((kind: 'success' | 'error', text: string) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, kind, text }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4500);
  }, []);

  const [reassignOpen, setReassignOpen] = useState<number | null>(null);
  const [reassignState, setReassignState] = useState<ReassignState>({
    truckId: '',
    driverId: '',
    loading: false,
    error: '',
  });

  // ── Trip dispatch ─────────────────────────────────────────────────────
  const handleDispatch = async (tripId: number) => {
    const trip = pendingTrips.find((t) => t.id === tripId);
    if (!(await confirm('Bạn có chắc chắn muốn xuất phát chuyến đi này? Trạng thái sẽ chuyển thành Đang chạy.'))) {
      return;
    }
    setDispatching(true);
    setActionLoading(tripId);
    try {
      await api.post(`/trips/${tripId}/dispatch`, {});
      const code = trip?.tripCode || `#${tripId}`;
      addToast('success', `Đã xuất phát chuyến ${code}`);
      await queryClient.invalidateQueries({ queryKey: ['dispatch'] });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi khởi hành chuyến đi.';
      addToast('error', msg);
    } finally {
      setActionLoading(null);
      setDispatching(false);
    }
  };

  // ── Reassign flow ─────────────────────────────────────────────────────
  const openReassign = (trip: NormalizedTrip) => {
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

  const handleReassign = async (tripId: number) => {
    if (!reassignState.truckId || !reassignState.driverId) {
      setReassignState((s) => ({ ...s, error: 'Vui lòng chọn xe và tài xế' }));
      return;
    }
    setReassignState((s) => ({ ...s, loading: true, error: '' }));
    try {
      await api.patch(`/trips/${tripId}/reassign`, {
        truckId: Number(reassignState.truckId),
        driverId: Number(reassignState.driverId),
      });
      await queryClient.invalidateQueries({ queryKey: ['dispatch'] });
      closeReassign();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi cập nhật';
      setReassignState((s) => ({ ...s, loading: false, error: msg }));
    }
  };

  // ── Derived data ──────────────────────────────────────────────────────
  const getActiveTripForTruck = (truckId: number) =>
    activeTrips.find((t) => t.truckId === truckId);
  const getDefaultDriverForTruck = (truckId: number) =>
    drivers.find((d) => d.assignedTruckId === truckId);

  const fleetCounts = useMemo(() => {
    let running = 0;
    let ready = 0;
    let noassign = 0;
    let maint = 0;
    for (const t of trucks) {
      if (t.status === 'MAINTENANCE') {
        maint++;
        continue;
      }
      if (getActiveTripForTruck(t.id)) {
        running++;
      } else if (getDefaultDriverForTruck(t.id)) {
        ready++;
      } else {
        noassign++;
      }
    }
    return { running, ready, noassign, maint, all: trucks.length };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trucks, activeTrips, drivers]);

  const utilizationPct = useMemo(() => {
    const available = fleetCounts.all - fleetCounts.maint;
    if (available <= 0) return 0;
    return Math.round((fleetCounts.running / available) * 100);
  }, [fleetCounts]);

  const noteCount = fleetCounts.maint + fleetCounts.noassign;

  const filteredTrucks = useMemo(() => {
    if (fleetFilter === 'all') return trucks;
    return trucks.filter((t) => {
      if (fleetFilter === 'maint') return t.status === 'MAINTENANCE';
      if (t.status === 'MAINTENANCE') return false;
      const hasActive = !!getActiveTripForTruck(t.id);
      if (fleetFilter === 'running') return hasActive;
      const hasDriver = !!getDefaultDriverForTruck(t.id);
      if (fleetFilter === 'ready') return !hasActive && hasDriver;
      if (fleetFilter === 'noassign') return !hasActive && !hasDriver;
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trucks, activeTrips, drivers, fleetFilter]);

  const today = new Date();

  // ── Render ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <div
          className="spin"
          style={{
            width: 32,
            height: 32,
            border: '4px solid var(--border-2)',
            borderTopColor: 'var(--brand)',
            borderRadius: '50%',
          }}
        />
      </div>
    );
  }

  return (
    <div className="dispatch-page fade-up-1" style={{ paddingBottom: 40 }}>
      {toasts.length > 0 && createPortal(
        <div style={{
          position: 'fixed', right: 24, bottom: 24, zIndex: 1000,
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          {toasts.map(t => (
            <div
              key={t.id}
              role="status"
              style={{
                minWidth: 280, maxWidth: 480,
                padding: '12px 16px', borderRadius: 8,
                background: t.kind === 'success' ? 'var(--accent)' : 'var(--danger)',
                color: '#fff', fontSize: 13, fontWeight: 600,
                boxShadow: '0 10px 28px rgba(0,0,0,0.18)',
                display: 'flex', alignItems: 'center', gap: 10,
                cursor: 'pointer',
              }}
              onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
            >
              <span style={{ width: 8, height: 8, background: '#fff', borderRadius: '50%', opacity: 0.9 }} />
              <span style={{ flex: 1 }}>{t.text}</span>
            </div>
          ))}
        </div>,
        document.body,
      )}
      {error && (
        <div
          style={{
            padding: 16,
            background: 'var(--danger-soft)',
            color: 'var(--danger)',
            borderRadius: 8,
            marginBottom: 20,
          }}
        >
          {error}
        </div>
      )}

      {/* ── Hero command bar ─────────────────────────────────────────── */}
      <section className="hero">
        <div className="hero-top fade-up-2">
          <div className="hero-title-block">
            <div className="hero-eyebrow">Phiên điều vận đang mở</div>
            <h1 className="hero-h1">Điều vận hôm nay</h1>
            <div className="hero-sub">
              {formatFullDate(today)} · {pendingTrips.length} đơn hàng chờ phân xe
            </div>
          </div>
          <div className="hero-actions">
            <button className="btn-d btn-d--ghost-dark" type="button" disabled>
              <Download size={15} />
              Xuất báo cáo
            </button>
            <button
              className="btn-d btn-d--primary"
              type="button"
              onClick={() => navigate('/trips/new')}
            >
              <Plus size={15} />
              Tạo chuyến mới
            </button>
          </div>
        </div>

        <div className="metrics fade-up-3">
          <div className="metric featured">
            <div className="metric-label">Tỉ lệ vận dụng</div>
            <div className="metric-value">
              {utilizationPct}
              <span className="metric-unit">%</span>
            </div>
            <div className="utilization-bar">
              <div className="utilization-fill" style={{ width: `${utilizationPct}%` }} />
            </div>
          </div>
          <div className="metric">
            <div className="metric-label">Tổng đội xe</div>
            <div className="metric-value d-mono">{fleetCounts.all}</div>
            <div className="metric-delta delta-flat">— xe đăng ký</div>
          </div>
          <div className="metric">
            <div className="metric-label">Xe đang chạy</div>
            <div className="metric-value d-mono">{fleetCounts.running}<span className="metric-value-unit">/{fleetCounts.all}</span></div>
            <div className="metric-delta delta-up">
              <TrendingUp size={10} strokeWidth={2.5} />
              hoạt động
            </div>
          </div>
          <div className="metric">
            <div className="metric-label">Sẵn sàng</div>
            <div className="metric-value d-mono">{fleetCounts.ready}</div>
            <div className="metric-delta delta-up">
              <TrendingUp size={10} strokeWidth={2.5} />
              khả dụng
            </div>
          </div>
          <div className="metric">
            <div className="metric-label">Cần lưu ý</div>
            <div className="metric-value d-mono">{noteCount}</div>
            <div className="metric-delta delta-down">
              <TrendingDown size={10} strokeWidth={2.5} />
              {fleetCounts.maint} bảo dưỡng · {fleetCounts.noassign} chờ giao
            </div>
          </div>
        </div>
      </section>

      {/* ── Fleet section ────────────────────────────────────────────── */}
      <div className="section-head">
        <div className="section-title">
          <h2>Trạng thái đội xe</h2>
          <span className="count">{fleetCounts.all} xe</span>
        </div>
        <div className="filter-tabs">
          <button
            type="button"
            className={`tab${fleetFilter === 'all' ? ' active' : ''}`}
            onClick={() => setFleetFilter('all')}
          >
            Tất cả <span className="tc">{fleetCounts.all}</span>
          </button>
          <button
            type="button"
            className={`tab${fleetFilter === 'running' ? ' active' : ''}`}
            onClick={() => setFleetFilter('running')}
          >
            Đang chạy <span className="tc">{fleetCounts.running}</span>
          </button>
          <button
            type="button"
            className={`tab${fleetFilter === 'ready' ? ' active' : ''}`}
            onClick={() => setFleetFilter('ready')}
          >
            Sẵn sàng <span className="tc">{fleetCounts.ready}</span>
          </button>
          <button
            type="button"
            className={`tab${fleetFilter === 'noassign' ? ' active' : ''}`}
            onClick={() => setFleetFilter('noassign')}
          >
            Chưa giao tài xế <span className="tc">{fleetCounts.noassign}</span>
          </button>
          <button
            type="button"
            className={`tab${fleetFilter === 'maint' ? ' active' : ''}`}
            onClick={() => setFleetFilter('maint')}
          >
            Bảo dưỡng <span className="tc">{fleetCounts.maint}</span>
          </button>
        </div>
      </div>

      <div className="fleet-grid fade-up-4">
        {filteredTrucks.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', padding: 40, textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
            Không có xe nào trong nhóm này.
          </div>
        ) : (
          filteredTrucks.map((truck) => {
            const activeTrip = getActiveTripForTruck(truck.id);
            const defDriver = getDefaultDriverForTruck(truck.id);
            const isMaint = truck.status === 'MAINTENANCE';

            const onClickCard = activeTrip ? () => navigate(`/trips/${activeTrip.id}`) : undefined;

            // status pill
            let pill: { cls: string; text: string };
            if (isMaint) pill = { cls: 'pill-maint', text: 'Bảo dưỡng' };
            else if (activeTrip) pill = { cls: 'pill-running', text: 'Đang chạy' };
            else if (defDriver) pill = { cls: 'pill-ready', text: 'Sẵn sàng' };
            else pill = { cls: 'pill-noassign', text: 'Chưa giao' };

            return (
              <div
                key={truck.id}
                className={`vcard${onClickCard ? ' is-clickable' : ''}`}
                onClick={onClickCard}
              >
                <div className="vcard-top">
                  <span className={`plate${isMaint ? ' maint' : ''}`}>{truck.licensePlate}</span>
                  <span className={`status-pill ${pill.cls}`}>
                    <span className="sd" />
                    {pill.text}
                  </span>
                </div>

                <div className="v-driver-row">
                  {isMaint ? (
                    <div className="no-driver">
                      <Wrench size={14} />
                      Bảo dưỡng định kỳ
                    </div>
                  ) : activeTrip ? (
                    <>
                      <div className={`driver-avatar ${avatarColorClass(activeTrip.driverId)}`}>
                        {getInitials(activeTrip.driverName)}
                      </div>
                      <div>
                        <div className="driver-name">{activeTrip.driverName}</div>
                        <div className="driver-meta">Tài xế đang chạy</div>
                      </div>
                    </>
                  ) : defDriver ? (
                    <>
                      <div className={`driver-avatar ${avatarColorClass(defDriver.id)}`}>
                        {getInitials(defDriver.name)}
                      </div>
                      <div>
                        <div className="driver-name">{defDriver.name}</div>
                        <div className="driver-meta">Tài xế chính</div>
                      </div>
                    </>
                  ) : (
                    <div className="no-driver">
                      <UserX size={14} />
                      Chưa giao tài xế
                    </div>
                  )}
                </div>

                <div className="v-body">
                  {activeTrip ? (
                    <>
                      <div className="vrow">
                        <span className="lab">Tuyến</span>
                        <span className="val">{activeTrip.routeName}</span>
                      </div>
                      <div className="vrow">
                        <span className="lab">Khách</span>
                        <span className="val">{activeTrip.customerName}</span>
                      </div>
                    </>
                  ) : isMaint ? (
                    <>
                      <div className="vrow">
                        <span className="lab">Trạng thái</span>
                        <span className="val">Đang sửa chữa / bảo dưỡng định kỳ</span>
                      </div>
                      <div className="vrow">
                        <span className="lab">Lưu ý</span>
                        <span className="val">Không khả dụng điều vận lúc này</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="vrow">
                        <span className="lab">Bãi đỗ</span>
                        <span className="val">Long Biên, Hà Nội</span>
                      </div>
                      <div className="vrow">
                        <span className="lab">Trạng thái</span>
                        <span className="val">Đỗ tại bãi, chờ lệnh xuất phát</span>
                      </div>
                    </>
                  )}
                </div>

                <div className="v-bottom-meta">
                  {activeTrip ? (
                    <>
                      <Clock size={12} />
                      Khởi hành {formatDayMonth(activeTrip.departureDate)}
                    </>
                  ) : isMaint ? (
                    <>
                      <Wrench size={12} />
                      Bảo dưỡng đang diễn ra
                    </>
                  ) : (
                    <>
                      <MapPin size={12} />
                      Sẵn sàng nhận lệnh điều vận
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Orders queue ─────────────────────────────────────────────── */}
      <div className="section-head">
        <div className="section-title">
          <h2>Đơn hàng cần điều vận</h2>
          <span className="count">{pendingTrips.length} đơn</span>
        </div>
      </div>

      <div className="orders-card">
        <div className="orders-toolbar">
          <div className="o-tools">
            <button type="button" className="pill-btn" disabled title="Sắp ra mắt">
              <Filter size={13} />
              Lọc
            </button>
            <button type="button" className="pill-btn" disabled title="Sắp ra mắt">
              <ArrowUpDown size={13} />
              Sắp xếp: Ngày xuất phát
            </button>
            <button type="button" className="pill-btn" disabled title="Sắp ra mắt">
              <Sparkles size={13} />
              Tự động đề xuất xe
            </button>
          </div>
          <div className="o-tools">
            <button type="button" className="pill-btn" disabled title="Sắp ra mắt">
              <Download size={13} />
              Xuất CSV
            </button>
          </div>
        </div>

        {pendingTrips.length > 0 && (
          <div className="orders-head">
            <div>Ngày</div>
            <div>Tuyến</div>
            <div>Khách hàng</div>
            <div className="col-assign">Xe & Tài xế đề xuất</div>
            <div className="right">Thao tác</div>
          </div>
        )}

        {pendingTrips.length === 0 ? (
          <div className="orders-empty">
            <div className="ico">
              <CheckCircle2 size={32} />
            </div>
            <div className="title">Không có đơn hàng nào chờ khởi hành</div>
            <div>Tất cả các chuyến đi đã xuất phát hoặc chưa tạo.</div>
          </div>
        ) : (
          pendingTrips.map((trip) => {
            const route = splitRoute(trip.routeName);
            const urgent = isUrgent(trip.departureDate);
            const editing = reassignOpen === trip.id;

            return (
              <div key={trip.id} className="order-row">
                <div className={`o-date${urgent ? ' urgent' : ''}`}>
                  <span className="day">{formatDayMonth(trip.departureDate)}</span>
                  <span className="lbl">Khởi hành</span>
                </div>

                <div className="o-route">
                  {route ? (
                    <>
                      <span className="from">{route.from}</span>
                      <span className="arr">
                        <ArrowRight size={14} />
                      </span>
                      <span className="to">{route.to}</span>
                    </>
                  ) : (
                    <span className="single">{trip.routeName}</span>
                  )}
                </div>

                <div className="o-customer">
                  <div className="cust-icon">
                    <Building2 size={15} />
                  </div>
                  <div className="info">
                    <div className="name">{trip.customerName}</div>
                    {trip.customerReference && (
                      <div className="meta">Mã KH: {trip.customerReference}</div>
                    )}
                  </div>
                </div>

                <div className="o-assign">
                  {editing ? (
                    <div className="o-assign-editor">
                      <div className="row">
                        <select
                          value={reassignState.truckId}
                          onChange={(e) =>
                            setReassignState((s) => ({ ...s, truckId: e.target.value }))
                          }
                          disabled={reassignState.loading}
                        >
                          <option value="">Chọn xe đầu</option>
                          {trucks
                            .filter((t) => t.status !== 'MAINTENANCE')
                            .map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.licensePlate}
                              </option>
                            ))}
                        </select>
                        <select
                          value={reassignState.driverId}
                          onChange={(e) =>
                            setReassignState((s) => ({ ...s, driverId: e.target.value }))
                          }
                          disabled={reassignState.loading}
                        >
                          <option value="">Chọn tài xế</option>
                          {drivers.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      {reassignState.error && (
                        <div className="err">{reassignState.error}</div>
                      )}
                      <div className="acts">
                        <button
                          type="button"
                          className="save"
                          onClick={() => handleReassign(trip.id)}
                          disabled={reassignState.loading}
                        >
                          {reassignState.loading ? (
                            <div
                              className="spin"
                              style={{
                                width: 10,
                                height: 10,
                                border: '2px solid #fff',
                                borderTopColor: 'transparent',
                                borderRadius: '50%',
                              }}
                            />
                          ) : (
                            <Check size={12} />
                          )}
                          Lưu
                        </button>
                        <button
                          type="button"
                          className="cancel"
                          onClick={closeReassign}
                          disabled={reassignState.loading}
                        >
                          <X size={12} />
                          Hủy
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="assign-card">
                        <span className="ap">
                          {trip.truckPlate || '—'}
                        </span>
                        <div className="ai">
                          <div className="dn">
                            {trip.driverName || <span style={{ color: 'var(--fg-3)', fontWeight: 400 }}>Chưa phân tài xế</span>}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="swap-btn"
                        title="Đổi xe / tài xế"
                        onClick={() => openReassign(trip)}
                        disabled={dispatching || actionLoading === trip.id}
                      >
                        <RefreshCw size={12} />
                        Đổi xe
                      </button>
                    </>
                  )}
                </div>

                <div className="o-actions">
                  <button
                    type="button"
                    className="dispatch-btn"
                    onClick={() => handleDispatch(trip.id)}
                    disabled={dispatching || actionLoading === trip.id || editing}
                  >
                    {actionLoading === trip.id ? (
                      <div
                        className="spin"
                        style={{
                          width: 12,
                          height: 12,
                          border: '2px solid #fff',
                          borderTopColor: 'transparent',
                          borderRadius: '50%',
                        }}
                      />
                    ) : (
                      <Play size={12} fill="currentColor" />
                    )}
                    Khởi hành
                  </button>
                </div>
              </div>
            );
          })
        )}

        {pendingTrips.length > 0 && (
          <div className="orders-foot">
            <span>Hiển thị {pendingTrips.length} đơn hàng</span>
            <a href="#" onClick={(e) => { e.preventDefault(); navigate('/trips'); }}>
              Lịch sử điều vận →
            </a>
          </div>
        )}
      </div>

      {confirmDialog}
    </div>
  );
}
