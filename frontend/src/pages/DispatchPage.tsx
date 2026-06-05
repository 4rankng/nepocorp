import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, Link } from 'react-router-dom';
import { CheckCircle2, Plus, Download, Filter, ArrowUpDown, Sparkles, TrendingUp, TrendingDown } from 'lucide-react';
import { useDispatchData } from '../hooks/useQueries';
import type { NormalizedTrip } from '../hooks/useTripQueries';
import { useDispatchMutations, useReassignMutations } from '../features/dispatch/hooks/useDispatchMutations';
import { DispatchTripCard } from '../features/dispatch/components/DispatchTripCard';
import { DispatchFilters } from '../features/dispatch/components/DispatchFilters';
import { FleetGrid } from '../features/dispatch/components/FleetGrid';
import { formatFullDate } from '../features/dispatch/utils';
import type { Driver, Truck, FleetFilter } from '../features/dispatch/utils';

export default function DispatchPage() {
  const navigate = useNavigate();
  const { data, isLoading: loading, error: queryError } = useDispatchData();
  const drivers = (data?.drivers ?? []) as Driver[];
  const trucks: Truck[] = (data?.trucks ?? []).map((t: any) => ({ id: t.id, licensePlate: t.licensePlate ?? '', status: t.status ?? '' }));
  const pendingTrips: NormalizedTrip[] = data?.pendingTrips ?? [];
  const activeTrips: NormalizedTrip[] = data?.activeTrips ?? [];
  const pendingTotal: number = data?.pendingTotal ?? 0;
  const error = queryError ? 'Không thể tải dữ liệu điều vận. Vui lòng tải lại trang.' : null;

  const { actionLoading, dispatching, toasts, setToasts, handleDispatch, confirmDialog } = useDispatchMutations(pendingTrips);
  const { reassignOpen, reassignState, setReassignState, openReassign, closeReassign, handleReassign } = useReassignMutations();
  const [fleetFilter, setFleetFilter] = useState<FleetFilter>('all');

  const getActive = (id: number) => activeTrips.find((t) => t.truckId === id);
  const getDefault = (id: number) => drivers.find((d) => d.assignedTruckId === id);

  const fleetCounts = useMemo(() => {
    let running = 0, ready = 0, noassign = 0, maint = 0;
    for (const t of trucks) { if (t.status === 'MAINTENANCE') { maint++; continue; } if (getActive(t.id)) running++; else if (getDefault(t.id)) ready++; else noassign++; }
    return { running, ready, noassign, maint, all: trucks.length };
  }, [trucks, activeTrips, drivers]);

  const utilizationPct = useMemo(() => { const a = fleetCounts.all - fleetCounts.maint; return a <= 0 ? 0 : Math.round((fleetCounts.running / a) * 100); }, [fleetCounts]);
  const noteCount = fleetCounts.maint + fleetCounts.noassign;

  const filteredTrucks = useMemo(() => {
    if (fleetFilter === 'all') return trucks;
    return trucks.filter((t) => { if (fleetFilter === 'maint') return t.status === 'MAINTENANCE'; if (t.status === 'MAINTENANCE') return false; const ha = !!getActive(t.id); if (fleetFilter === 'running') return ha; const hd = !!getDefault(t.id); if (fleetFilter === 'ready') return !ha && hd; if (fleetFilter === 'noassign') return !ha && !hd; return true; });
  }, [trucks, activeTrips, drivers, fleetFilter]);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><div className="spin" style={{ width: 32, height: 32, border: '4px solid var(--border-2)', borderTopColor: 'var(--brand)', borderRadius: '50%' }} /></div>;

  return (
    <div className="dispatch-page fade-up-1" style={{ paddingBottom: 40 }}>
      {toasts.length > 0 && createPortal(
        <div style={{ position: 'fixed', right: 24, bottom: 24, zIndex: 1000, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {toasts.map(t => (<div key={t.id} role="status" style={{ minWidth: 280, maxWidth: 480, padding: '12px 16px', borderRadius: 8, background: t.kind === 'success' ? 'var(--accent)' : 'var(--danger)', color: '#fff', fontSize: 13, fontWeight: 600, boxShadow: '0 10px 28px rgba(0,0,0,0.18)', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}><span style={{ width: 8, height: 8, background: '#fff', borderRadius: '50%', opacity: 0.9 }} /><span style={{ flex: 1 }}>{t.text}</span></div>))}
        </div>, document.body)}
      {error && <div style={{ padding: 16, background: 'var(--danger-soft)', color: 'var(--danger)', borderRadius: 8, marginBottom: 20 }}>{error}</div>}

      <section className="hero">
        <div className="hero-top fade-up-2">
          <div className="hero-title-block">
            <div className="hero-eyebrow">Phiên điều vận đang mở</div>
            <h1 className="hero-h1">Điều vận hôm nay</h1>
            <div className="hero-sub">{formatFullDate(new Date())} · {pendingTotal} đơn hàng chờ phân xe</div>
          </div>
          <div className="hero-actions">
            <button className="btn-d btn-d--ghost-dark" type="button" disabled><Download size={15} /> Xuất báo cáo</button>
            <button className="btn-d btn-d--primary" type="button" onClick={() => navigate('/trips/new')}><Plus size={15} /> Tạo chuyến mới</button>
          </div>
        </div>
        <div className="metrics fade-up-3">
          <div className="metric featured"><div className="metric-label">Tỉ lệ vận dụng</div><div className="metric-value">{utilizationPct}<span className="metric-unit">%</span></div><div className="utilization-bar"><div className="utilization-fill" style={{ width: `${utilizationPct}%` }} /></div></div>
          <div className="metric"><div className="metric-label">Tổng đội xe</div><div className="metric-value d-mono">{fleetCounts.all}</div><div className="metric-delta delta-flat">— xe đăng ký</div></div>
          <div className="metric"><div className="metric-label">Xe đang chạy</div><div className="metric-value d-mono">{fleetCounts.running}<span className="metric-value-unit">/{fleetCounts.all}</span></div><div className="metric-delta delta-up"><TrendingUp size={10} strokeWidth={2.5} /> hoạt động</div></div>
          <div className="metric"><div className="metric-label">Sẵn sàng</div><div className="metric-value d-mono">{fleetCounts.ready}</div><div className="metric-delta delta-up"><TrendingUp size={10} strokeWidth={2.5} /> khả dụng</div></div>
          <div className="metric"><div className="metric-label">Cần lưu ý</div><div className="metric-value d-mono">{noteCount}</div><div className="metric-delta delta-down"><TrendingDown size={10} strokeWidth={2.5} /> {fleetCounts.maint} bảo dưỡng · {fleetCounts.noassign} chờ giao</div></div>
        </div>
      </section>

      <div className="section-head">
        <div className="section-title"><h2>Trạng thái đội xe</h2><span className="count">{fleetCounts.all} xe</span></div>
        <DispatchFilters fleetFilter={fleetFilter} fleetCounts={fleetCounts} onFilterChange={setFleetFilter} />
      </div>
      <div className="fleet-grid fade-up-4"><FleetGrid trucks={filteredTrucks} activeTrips={activeTrips} drivers={drivers} onTripClick={(id) => navigate(`/trips/${id}`)} /></div>

      <div className="section-head"><div className="section-title"><h2>Đơn hàng cần điều vận</h2><span className="count">{pendingTrips.length} đơn</span></div></div>
      <div className="orders-card">
        <div className="orders-toolbar">
          <div className="o-tools desktop-only">
            <button type="button" className="pill-btn" disabled title="Sắp ra mắt"><Filter size={13} /> Lọc</button>
            <button type="button" className="pill-btn" disabled title="Sắp ra mắt"><ArrowUpDown size={13} /> Sắp xếp: Ngày xuất phát</button>
            <button type="button" className="pill-btn" disabled title="Sắp ra mắt"><Sparkles size={13} /> Tự động đề xuất xe</button>
          </div>
          <div className="o-tools desktop-only"><button type="button" className="pill-btn" disabled title="Sắp ra mắt"><Download size={13} /> Xuất CSV</button></div>
        </div>
        {pendingTrips.length > 0 && <div className="orders-head"><div>Ngày</div><div>Tuyến</div><div>Khách hàng</div><div className="col-assign">Xe & Tài xế</div><div className="right">Thao tác</div></div>}
        {pendingTrips.length === 0 ? (
          <div className="orders-empty">
            <img src="/assets/illustrations/empty-dispatch.svg" alt="" aria-hidden="true" style={{ width: 160, height: 132, objectFit: 'contain', marginBottom: 8 }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            <div className="title">Không có đơn hàng nào chờ khởi hành</div>
            <div>Tất cả các chuyến đi đã xuất phát hoặc chưa tạo.</div>
          </div>
        ) : pendingTrips.map((trip) => (
          <DispatchTripCard key={trip.id} trip={trip} isEditing={reassignOpen === trip.id} reassignState={reassignState} setReassignState={setReassignState} trucks={trucks} drivers={drivers} onDispatch={() => handleDispatch(trip.id)} onOpenReassign={() => openReassign(trip)} onCloseReassign={closeReassign} onReassign={() => handleReassign(trip.id)} dispatching={dispatching} actionLoadingId={actionLoading} />
        ))}
        {pendingTrips.length > 0 && <div className="orders-foot"><span>{pendingTotal} đơn hàng</span><Link to='/trips'>Lịch sử điều vận →</Link></div>}
      </div>
      {confirmDialog}
    </div>
  );
}
