import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MapPin, Route, Plus, Pencil, Trash2, Loader2, Save, X, Mountain, ArrowLeft } from 'lucide-react';
import { configClient } from '../../api/configClient';
import { tripClient } from '../../api/tripClient';
import { formatCurrency } from '../../lib/format';
import { PageHeader, useConfirm, Modal } from '../../components/UI';
import { LocationAutocomplete } from '../../components/LocationAutocomplete';
import { calculateRoute } from '../../lib/maps';
import { LeafletMap } from '../../components/shared/LeafletMap';
import { useCRUD } from '../../hooks/useCRUD';
import type { Route as RouteType, RoadAllowance } from '@tingting/shared';
import { LoadingType } from '@tingting/shared';
import './config-page.css';

/**
 * RouteFormModal — replaces the tr-based inline add form, which was visually
 * cramped (6 fields squeezed into a single flex row) and hid the
 * route-config fields the trip-creation tooltip is promising. The modal
 * gives each field its own row with grouping (basic info / pricing
 * defaults), proper labels, and a clear save/cancel footer.
 */
function RouteFormModal({ isOpen, saving, item, onsave, oncancel }: {
  isOpen: boolean; saving: boolean; item?: RouteType; onsave: (d: Record<string, unknown>) => void; oncancel: () => void;
}) {
  const [name, setName] = useState('');
  const [distance, setDistance] = useState('');
  const [isMountain, setIsMountain] = useState(false);
  const [fuelAllowance, setFuelAllowance] = useState('');
  const [tollsStations, setTollsStations] = useState('');
  const [driverSalary, setDriverSalary] = useState('');
  
  type DefaultLeg = { id: string; origin: string; destination: string; km: string; loadingType: LoadingType; polylinePath?: string | null };
  const [defaultLegs, setDefaultLegs] = useState<DefaultLeg[]>([]);

  useEffect(() => {
    if (isOpen) {
      setName(item?.name || '');
      setDistance(item?.distanceKm?.toString() || '');
      setIsMountain(item?.isMountain || false);
      setFuelAllowance(item?.fixedFuelAllowance || '');
      setTollsStations(item?.tollsStations?.toString() || '');
      setDriverSalary(item?.driverSalary || '');
      
      if (item?.defaultLegs && Array.isArray(item.defaultLegs)) {
        const mapped = item.defaultLegs.map(l => ({
          id: Math.random().toString(),
          origin: l.origin,
          destination: l.destination,
          km: l.km.toString(),
          loadingType: l.loadingType as LoadingType,
          polylinePath: null as string | null
        }));
        setDefaultLegs(mapped);

        // Polyline fetch is decorative; a 4xx/5xx must not block saving.
        mapped.forEach(async (leg) => {
          if (leg.origin && leg.destination && leg.origin !== leg.destination) {
            try {
              const res = await calculateRoute(leg.origin, leg.destination);
              if (res.polylinePath) {
                setDefaultLegs(prev => prev.map(l => l.id === leg.id ? { ...l, polylinePath: res.polylinePath } : l));
              }
            } catch (err) {
              console.warn('[RoutesConfigPage] polyline fetch failed for', leg.origin, '→', leg.destination, err);
            }
          }
        });
      } else {
        setDefaultLegs([]);
      }
    }
  }, [isOpen, item?.id]);

  const handleSave = () => {
    if (!name.trim()) return;
    onsave({
      name: name.trim(),
      distanceKm: distance && Number(distance) > 0 ? Number(distance) : undefined,
      isMountain,
      fixedFuelAllowance: fuelAllowance || null,
      tollsStations: tollsStations ? Number(tollsStations) : null,
      driverSalary: driverSalary || null,
      defaultLegs: defaultLegs.length > 0 ? defaultLegs.map(l => ({
        origin: l.origin,
        destination: l.destination,
        km: Number(l.km) || 0,
        loadingType: l.loadingType
      })) : null
    });
  };

  const addLeg = () => {
    setDefaultLegs([...defaultLegs, { id: Math.random().toString(), origin: '', destination: '', km: '', loadingType: LoadingType.HANG, polylinePath: null }]);
  };
  
  const updateLeg = async (id: string, field: keyof DefaultLeg, val: string) => {
    setDefaultLegs(prev => prev.map(l => l.id === id ? { ...l, [field]: val } : l));

    // Fetch polyline for map visualization only — km is manual
    if (field === 'origin' || field === 'destination') {
      const legToUpdate = defaultLegs.find(l => l.id === id);
      if (legToUpdate) {
        const origin = field === 'origin' ? val : legToUpdate.origin;
        const destination = field === 'destination' ? val : legToUpdate.destination;
        if (origin && destination && origin !== destination) {
          try {
            const result = await calculateRoute(origin, destination);
            if (result.polylinePath) {
              setDefaultLegs(prev => prev.map(l => l.id === id ? {
                ...l,
                polylinePath: result.polylinePath
              } : l));
            }
          } catch (err) {
            // Polyline is decorative; a failure here must not block the leg save.
            console.warn('[RoutesConfigPage] polyline fetch failed for', origin, '→', destination, err);
          }
        }
      }
    }
  };
  
  const removeLeg = (id: string) => {
    setDefaultLegs(defaultLegs.filter(l => l.id !== id));
  };

  const labelStyle = { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--fg-2)', marginBottom: 6 } as const;
  const hintStyle = { fontSize: 11, color: 'var(--fg-3)', marginTop: 4 } as const;
  const sectionLabelStyle = {
    fontSize: 10.5, fontWeight: 700, color: 'var(--fg-3)', textTransform: 'uppercase' as const,
    letterSpacing: '0.08em', marginBottom: 8, marginTop: 4,
  };

  return (
    <Modal
      isOpen={isOpen}
      title={item ? `Sửa tuyến — ${item.name}` : 'Thêm tuyến đường mới'}
      maxWidth={1000}
      onClose={oncancel}
      onConfirm={handleSave}
      footer={
        <>
          <button className="btn btn--ghost btn--sm" onClick={oncancel}>
            <X size={14} /> Hủy
          </button>
          <button className="btn btn--primary btn--sm" disabled={saving || !name.trim()} onClick={handleSave}>
            {saving ? <Loader2 size={14} className="spin" /> : <Save size={14} />}
            {item ? 'Cập nhật' : 'Thêm tuyến'}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-8 items-start">
        
        {/* COLUMN 1: Basic Info & Fuel/Salary */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Basic Info */}
          <div>
            <div style={sectionLabelStyle}>Thông tin cơ bản</div>
            <div className="field" style={{ marginBottom: 14 }}>
              <label htmlFor="route-name" style={labelStyle}>
                Tên tuyến <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <input
                id="route-name"
                className="input"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="VD: Hà Nội - Hải Phòng"
                autoFocus
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="field">
                <label htmlFor="route-distance" style={labelStyle}>Khoảng cách (km)</label>
                <input
                  id="route-distance"
                  className="input"
                  type="number"
                  value={distance}
                  onChange={e => setDistance(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="field">
                <label style={labelStyle}>Loại địa hình</label>
                <label style={{
                  display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                  padding: '9px 12px', border: '1px solid var(--line)',
                  borderRadius: 'var(--radius-md)', background: isMountain ? 'var(--warning-soft, #fef3c7)' : 'transparent',
                }}>
                  <input
                    type="checkbox"
                    checked={isMountain}
                    onChange={e => setIsMountain(e.target.checked)}
                    style={{ width: 16, height: 16, cursor: 'pointer' }}
                  />
                  <Mountain size={14} />
                  <span style={{ fontSize: 13 }}>Tuyến leo núi</span>
                </label>
              </div>
            </div>
          </div>

          {/* Fuel & Salary */}
          <div style={{ borderTop: '1px solid var(--line)', paddingTop: 20 }}>
            <div style={sectionLabelStyle}>Định mức nhiên liệu & Tiền lương</div>
            <p style={{ fontSize: 12, color: 'var(--fg-3)', margin: '0 0 12px' }}>
              Các giá trị này sẽ được dùng để gợi ý khi tạo / sửa lệnh trên tuyến này.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="field">
                <label htmlFor="route-fuel" style={labelStyle}>Định mức dầu (lít)</label>
                <input
                  id="route-fuel"
                  className="input"
                  type="number"
                  step="0.01"
                  value={fuelAllowance}
                  onChange={e => setFuelAllowance(e.target.value)}
                  placeholder="0"
                />
                <p style={hintStyle}>Định mức cố định riêng cho tuyến (vd. tuyến núi).</p>
              </div>
              <div className="field">
                <label htmlFor="route-stations" style={labelStyle}>Số trạm thu phí</label>
                <input
                  id="route-stations"
                  className="input"
                  type="number"
                  value={tollsStations}
                  onChange={e => setTollsStations(e.target.value)}
                  placeholder="0"
                />
                <p style={hintStyle}>Trừ vào tiền đi đường.</p>
              </div>
            </div>
            <div className="field" style={{ marginTop: 12 }}>
              <label htmlFor="route-salary" style={labelStyle}>Tiền kết hợp (đ / chuyến)</label>
              <input
                id="route-salary"
                className="input"
                type="number"
                value={driverSalary}
                onChange={e => setDriverSalary(e.target.value)}
                placeholder="VD: 500000"
              />
              <p style={hintStyle}>Tiền kết hợp mặc định cho tuyến này. Để trống nếu dùng giá trị chung.</p>
            </div>
          </div>
        </div>

        {/* COLUMN 2: Default Legs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div>
              <div style={{ ...sectionLabelStyle, margin: 0 }}>Hành trình chi tiết (Mặc định)</div>
              <p style={{ fontSize: 12, color: 'var(--fg-3)', margin: '4px 0 0' }}>
                Khai báo sẵn các chặng để tự động điền khi tạo lệnh.
              </p>
            </div>
            <button type="button" className="btn btn--secondary btn--sm" onClick={addLeg} style={{ height: 26, padding: '0 8px' }}>
              <Plus size={14} /> Thêm chặng
            </button>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {defaultLegs.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', background: 'var(--bg-2)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--line)' }}>
                <span style={{ color: 'var(--fg-3)', fontSize: 13 }}>Chưa có chặng mặc định</span>
              </div>
            ) : defaultLegs.map((leg, i) => (
              <div key={leg.id} className="flex flex-wrap lg:grid lg:grid-cols-[1fr_1fr_70px_100px_30px] gap-2 items-center p-2 rounded-md" style={{ background: 'var(--bg-2)' }}>
                <div className="flex-1 min-w-[140px]">
                  <LocationAutocomplete className="input input--sm w-full" placeholder="Điểm đi" value={leg.origin} onChange={val => updateLeg(leg.id, 'origin', val)} />
                </div>
                <div className="flex-1 min-w-[140px]">
                  <LocationAutocomplete className="input input--sm w-full" placeholder="Điểm đến" value={leg.destination} onChange={val => updateLeg(leg.id, 'destination', val)} />
                </div>
                <div className="w-[70px] shrink-0">
                  <input className="input input--sm w-full" type="number" placeholder="Km" value={leg.km} onChange={e => updateLeg(leg.id, 'km', e.target.value)} />
                </div>
                <div className="w-[100px] shrink-0">
                  <select className="input input--sm w-full" value={leg.loadingType} onChange={e => updateLeg(leg.id, 'loadingType', e.target.value)}>
                    <option value={LoadingType.HANG}>Có hàng</option>
                    <option value={LoadingType.VO}>Vỏ rỗng</option>
                  </select>
                </div>
                <div className="w-[30px] shrink-0 flex justify-center">
                  <button type="button" className="btn btn--ghost btn--icon btn--sm" onClick={() => removeLeg(leg.id)} style={{ color: 'var(--danger)' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Live Map in RouteFormModal */}
          <div style={{ marginTop: 12 }}>
            <div style={sectionLabelStyle}>Bản đồ trực quan</div>
            {defaultLegs.some(l => l.polylinePath) ? (
              <LeafletMap legs={defaultLegs} height="240px" />
            ) : (
              <div style={{
                height: '240px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--bg-2)',
                borderRadius: 'var(--radius-lg, 12px)',
                border: '1px dashed var(--line)',
                color: 'var(--fg-3)',
                fontSize: '13px'
              }}>
                Nhập địa điểm cho các chặng để trực quan hóa lộ trình trên bản đồ
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default function RoutesConfigPage() {
  const navigate = useNavigate();
  const [routeFilter, setRouteFilter] = useState<'all' | 'plain' | 'mountain'>('all');
  const [search, setSearch] = useState('');
  const [selectedRouteId, setSelectedRouteId] = useState<number | null>(null);
  const [selectedRouteLegs, setSelectedRouteLegs] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    const [routeList, tripRes, allowances] = await Promise.all([
      configClient.getRoutesList(search || undefined),
      tripClient.fetchAllTrips({}).then(r => r.items).catch(() => [] as any[]),
      configClient.getRoadAllowances().catch(() => [] as any[]),
    ]);
    return {
      routes: routeList,
      trips: tripRes,
      allowances,
    };
  }, [search]);

  const { data, refetch } = useQuery({
    queryKey: ['routes-config', search],
    queryFn: fetchData,
    staleTime: 2 * 60 * 1000,
  });

  const routes = data?.routes ?? [];

  const selectedRoute = useMemo(() => {
    return routes.find(r => r.id === selectedRouteId);
  }, [routes, selectedRouteId]);

  useEffect(() => {
    if (selectedRoute && selectedRoute.defaultLegs && Array.isArray(selectedRoute.defaultLegs)) {
      const legs = (selectedRoute.defaultLegs as NonNullable<RouteType['defaultLegs']>).map((l) => ({
        ...l,
        polylinePath: null as string | null
      }));
      setSelectedRouteLegs(legs);

      legs.forEach(async (leg, idx) => {
        if (leg.origin && leg.destination && leg.origin !== leg.destination) {
          try {
            const res = await calculateRoute(leg.origin, leg.destination);
            if (res.polylinePath) {
              setSelectedRouteLegs(prev => prev.map((l, i) => i === idx ? { ...l, polylinePath: res.polylinePath } : l));
            }
          } catch (e) {}
        }
      });
    } else {
      setSelectedRouteLegs([]);
    }
  }, [selectedRoute]);

  const routeTripStats = useMemo(() => {
    const stats = new Map<number, number>();
    if (!data?.trips) return stats;
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    data.trips.forEach((t: any) => {
      const dep = t.departureDate || '';
      if (dep.startsWith(thisMonth)) {
        const rid = t.routeId;
        if (rid) stats.set(rid, (stats.get(rid) || 0) + 1);
      }
    });
    return stats;
  }, [data?.trips]);

  const routePriceMap = useMemo(() => {
    const priceMap = new Map<number, { ft20?: number; ft40?: number }>();
    if (!data?.allowances) return priceMap;
    data.allowances.forEach((ra: any) => {
      const rid = ra.routeId ?? ra.routeId;
      const type = ra.trailer_type ?? ra.trailerType;
      if (!rid) return;
      const p = priceMap.get(rid) || {};
      if (type === '20FT') p.ft20 = parseFloat(ra.base_amount ?? ra.baseAmount ?? '0');
      if (type === '40FT') p.ft40 = parseFloat(ra.base_amount ?? ra.baseAmount ?? '0');
      priceMap.set(rid, p);
    });
    return priceMap;
  }, [data?.allowances]);

  const crud = useCRUD('/routes', async () => { await refetch(); });
  const { confirm, dialog: confirmDialog } = useConfirm();

  const now = new Date();
  const monthLabel = `${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getFullYear()).slice(-2)}`;
  const totalCount = routes.length;
  const mountainCount = routes.filter(r => r.isMountain).length;
  const usedThisMonth = routes.filter(r => (routeTripStats.get(r.id) || 0) > 0).length;

  let popularRoute: RouteType | undefined;
  let popularCount = 0;
  routes.forEach(r => { const c = routeTripStats.get(r.id) || 0; if (c > popularCount) { popularCount = c; popularRoute = r; } });

  const filtered = routes.filter(r => {
    if (routeFilter === 'plain') return !r.isMountain;
    if (routeFilter === 'mountain') return r.isMountain;
    return true;
  });

  return (
    <div className="fade-up cfg-page cfg-page--routes routes-config-page">
      <div className="page-header">
        <button
          type="button"
          onClick={() => navigate('/config')}
          aria-label="Quay lại danh sách cấu hình"
          className="page-header__back-btn"
          style={{ marginRight: 4 }}
        >
          <ArrowLeft size={18} />
        </button>
        <div className="page-header-main">
          <h1 className="page-title">Tuyến đường & Cự ly</h1>
          <p className="page-subtitle"><strong>{totalCount}</strong> tuyến đang quản lý · {mountainCount} tuyến núi · {usedThisMonth} tuyến chạy trong {monthLabel}</p>
        </div>
        <div className="page-actions">
          <button className="btn btn--primary" onClick={() => crud.setShowAddForm(true)}><Plus size={14} /> Thêm tuyến</button>
        </div>
      </div>

      <div className="kpi-grid" style={{ marginBottom: 20 }}>
        <div className="kpi">
          <div className="kpi__top"><span className="kpi__label">Tổng tuyến</span></div>
          <div className="kpi__value">{totalCount}</div>
          <div className="kpi__meta kpi__meta--up">Tất cả tuyến đang hoạt động</div>
          <div className="kpi__watermark" aria-hidden="true"><MapPin size={72} /></div>
        </div>
        <div className="kpi kpi--success">
          <div className="kpi__top"><span className="kpi__label">Đang sử dụng {monthLabel}</span></div>
          <div className="kpi__value">{usedThisMonth}<span className="kpi__value-unit">/{totalCount}</span></div>
          <div className="kpi__meta">{totalCount > 0 ? Math.round((usedThisMonth / totalCount) * 100) : 0}% tuyến có chuyến</div>
          <div className="kpi__watermark" aria-hidden="true"><svg aria-hidden="true" width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg></div>
        </div>
        <div className="kpi kpi--warn">
          <div className="kpi__top"><span className="kpi__label">Tuyến núi</span></div>
          <div className="kpi__value">{mountainCount}</div>
          <div className="kpi__meta">Định mức dầu cao hơn</div>
          <div className="kpi__watermark" aria-hidden="true"><Mountain size={72} /></div>
        </div>
        <div className="kpi">
          <div className="kpi__top"><span className="kpi__label">Phổ biến nhất</span></div>
          <div className="kpi__value" style={{ fontSize: 16, lineHeight: 1.3 }}>{popularRoute ? popularRoute.name.split(' - ')[0] : '—'}</div>
          <div className="kpi__meta">{popularCount > 0 ? `${popularCount} chuyến ${monthLabel}` : 'Chưa có dữ liệu'}</div>
          <div className="kpi__watermark" aria-hidden="true"><Route size={72} /></div>
        </div>
      </div>

      {/* Modal-based create/edit — was an inline tr form earlier; the cramped
          layout hid the toll-station / fuel-allowance / driver-salary fields
          that the trip-creation tip refers to, so users couldn't configure
          them. Modal exposes them clearly with section grouping + hints. */}
      <RouteFormModal
        key={crud.editingId ?? (crud.showAddForm ? 'add' : 'closed')}
        isOpen={crud.showAddForm || crud.editingId != null}
        saving={crud.saving}
        item={crud.editingId != null ? routes.find(r => r.id === crud.editingId) : undefined}
        onsave={d => {
          if (crud.editingId != null) crud.doUpdate(crud.editingId, d);
          else crud.doCreate(d);
        }}
        oncancel={crud.cancelForm}
      />

      <div className="routes-config-grid" style={{
        display: 'grid',
        gridTemplateColumns: selectedRoute ? '1fr 380px' : '1fr',
        gap: '20px',
        alignItems: 'start',
        transition: 'grid-template-columns 0.3s ease'
      }}>
        <div className="table-wrap" style={{ margin: 0 }}>
          <div className="toolbar">
            {(['all', 'plain', 'mountain'] as const).map(f => {
              const labels = { all: `Tất cả · ${totalCount}`, plain: `Đồng bằng · ${totalCount - mountainCount}`, mountain: `Tuyến núi · ${mountainCount}` };
              return <button key={f} className={`filter-pill${routeFilter === f ? ' is-active' : ''}`} onClick={() => setRouteFilter(f)}>{labels[f]}</button>;
            })}
            <div className="toolbar__spacer" />
            <div className="toolbar__search">
              <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
              <input type="text" placeholder="Tìm tuyến đường…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
          <div style={{ padding: '6px 12px 8px', display: 'flex', alignItems: 'center', gap: 6, color: 'var(--fg-3)', fontSize: 12 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
            Nhấn vào một hàng để xem chi tiết và chỉnh sửa tuyến đường
          </div>
          <div className="table-scroll">
            <table className="routes-table">
              <thead>
                <tr>
                  <th>Tuyến đường</th><th className="num">KM</th><th>Loại</th>
                  <th className="num">Trạm thu phí</th><th className="num">Tiền KH</th>
                  <th className="num">Chuẩn 20ft</th>
                  <th className="num">Chuẩn 40ft</th><th className="num">Sử dụng {monthLabel}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && <tr><td colSpan={8} style={{ textAlign: 'center', padding: '48px 12px', color: 'var(--ink-3)' }}>Chưa có dữ liệu</td></tr>}
                {filtered.map(r => {
                  const prices = routePriceMap.get(r.id);
                  const trips = routeTripStats.get(r.id) || 0;
                  const isSelected = selectedRouteId === r.id;
                  return (
                    <tr
                      key={r.id}
                      onClick={() => setSelectedRouteId(isSelected ? null : r.id)}
                      style={{
                        cursor: 'pointer',
                        background: isSelected ? 'var(--bg-2)' : undefined,
                      }}
                    >
                      <td data-label="Tuyến đường">
                        <div className="row-strong">{r.name}</div>
                        {r.fixedFuelAllowance && <div className="row-meta">Định mức dầu: {r.fixedFuelAllowance} L</div>}
                      </td>
                      <td className="num" data-label="KM">{r.distanceKm != null ? `${r.distanceKm}` : '—'}</td>
                      <td data-label="Loại">
                        {r.isMountain
                          ? <span className="pill pill--warn"><span className="dot" />Tuyến núi</span>
                          : <span className="pill pill--neutral">Đồng bằng</span>}
                      </td>
                      <td className="num" data-label="Trạm">{r.tollsStations != null ? r.tollsStations : '—'}</td>
                      <td className="num" data-label="Tiền KH">{r.driverSalary ? formatCurrency(Number(r.driverSalary)) : '—'}</td>
                      <td className="num" data-label="20ft">{prices?.ft20 ? formatCurrency(prices.ft20) : '—'}</td>
                      <td className="num" data-label="40ft">{prices?.ft40 ? formatCurrency(prices.ft40) : '—'}</td>
                      <td className="num" data-label={`Dùng ${monthLabel}`}>
                        {trips > 0 ? <strong style={{ color: 'var(--success)' }}>{trips}</strong> : <span style={{ color: 'var(--ink-3)' }}>0</span>}
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="table-foot">
            <span>Đang hiển thị <strong style={{ fontFamily: 'var(--font-mono)' }}>{filtered.length}</strong> trên <strong style={{ fontFamily: 'var(--font-mono)' }}>{totalCount}</strong> tuyến đường</span>
          </div>
        </div>

        {selectedRoute && (
          <div className="card sticky-card" style={{
            position: 'sticky',
            top: '20px',
            background: 'var(--bg-1)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            boxShadow: 'var(--shadow-md)',
            animation: 'slide-left 0.3s ease-out'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--fg-1)', margin: 0 }}>
                Chi tiết tuyến đường
              </h3>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <button
                  className="btn btn--ghost btn--icon btn--sm"
                  title="Sửa tuyến"
                  onClick={() => { crud.setEditingId(selectedRoute.id); setSelectedRouteId(null); }}
                  style={{ color: 'var(--primary)' }}
                >
                  <Pencil size={15} />
                </button>
                <button
                  className="btn btn--ghost btn--icon btn--sm"
                  title="Xóa tuyến"
                  disabled={crud.deleting === selectedRoute.id}
                  onClick={async () => {
                    const ok = await confirm(`Xóa tuyến "${selectedRoute.name}"?`, { confirmLabel: 'Xóa', variant: 'danger' });
                    if (ok) { setSelectedRouteId(null); crud.doDelete(selectedRoute.id); }
                  }}
                  style={{ color: 'var(--danger)' }}
                >
                  {crud.deleting === selectedRoute.id ? <Loader2 size={15} className="spin" /> : <Trash2 size={15} />}
                </button>
                <div style={{ width: 1, height: 16, background: 'var(--line)', margin: '0 2px' }} />
                <button
                  className="btn btn--ghost btn--icon btn--sm"
                  title="Đóng"
                  onClick={() => setSelectedRouteId(null)}
                  style={{ color: 'var(--fg-3)' }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div style={{ borderBottom: '1px solid var(--line)', paddingBottom: '12px' }}>
              <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--fg-1)', marginBottom: '4px' }}>
                {selectedRoute.name}
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <span className="pill pill--neutral">
                  {selectedRoute.distanceKm ? `${selectedRoute.distanceKm} km` : '— km'}
                </span>
                {selectedRoute.isMountain ? (
                  <span className="pill pill--warn"><span className="dot" />Tuyến núi</span>
                ) : (
                  <span className="pill pill--neutral">Đồng bằng</span>
                )}
              </div>
            </div>

            {/* Map Visualization */}
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--fg-3)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Bản đồ tuyến đường
              </div>
              {selectedRouteLegs.length > 0 ? (
                <LeafletMap legs={selectedRouteLegs} height="220px" />
              ) : (
                <div style={{
                  height: '220px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'var(--bg-2)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px dashed var(--line)',
                  color: 'var(--fg-3)',
                  fontSize: '13px'
                }}>
                  Chưa khai báo chặng để hiển thị bản đồ
                </div>
              )}
            </div>

            {/* Configuration default values */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'var(--bg-2)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: 'var(--fg-3)' }}>Định mức dầu:</span>
                <strong style={{ color: 'var(--fg-1)' }}>
                  {selectedRoute.fixedFuelAllowance ? `${selectedRoute.fixedFuelAllowance} L` : 'Theo công thức'}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: 'var(--fg-3)' }}>Trạm thu phí:</span>
                <strong style={{ color: 'var(--fg-1)' }}>
                  {selectedRoute.tollsStations != null ? `${selectedRoute.tollsStations} trạm` : '—'}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: 'var(--fg-3)' }}>Tiền kết hợp:</span>
                <strong style={{ color: 'var(--fg-1)' }}>
                  {selectedRoute.driverSalary ? formatCurrency(Number(selectedRoute.driverSalary)) : 'Theo công thức'}
                </strong>
              </div>
            </div>

            {/* Default legs itinerary */}
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--fg-3)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Lộ trình chi tiết ({selectedRouteLegs.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                {selectedRouteLegs.length === 0 ? (
                  <div style={{ fontSize: '13px', color: 'var(--fg-3)', fontStyle: 'italic' }}>Chưa cấu hình chặng mặc định.</div>
                ) : (
                  selectedRouteLegs.map((leg, i) => (
                    <div key={i} style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      background: 'var(--bg-2)',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-sm)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--fg-2)' }}>Chặng {i + 1}</span>
                        <span style={{ fontSize: '11px', color: 'var(--fg-3)' }}>
                          {leg.km} km · {leg.loadingType === 'HANG' ? 'Có hàng' : 'Vỏ rỗng'}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--fg-1)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ color: 'var(--success)' }}>●</span> {leg.origin}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--fg-1)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ color: 'var(--danger)' }}>●</span> {leg.destination}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      {crud.error && <div style={{ textAlign: 'center', color: 'var(--danger)', marginTop: 12 }}>{crud.error}</div>}
      {confirmDialog}
    </div>
  );
}
