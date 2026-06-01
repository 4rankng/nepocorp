import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MapPin, Route, Plus, Pencil, Trash2, Loader2, Save, X, Mountain } from 'lucide-react';
import { api } from '../../lib/api';
import { formatCurrency } from '../../lib/format';
import { PageHeader, useConfirm, Modal } from '../../components/UI';
import { useCRUD } from '../../hooks/useCRUD';
import type { Route as RouteType, RoadAllowance, PaginatedResponse } from '@nepocorp/shared';
import { LoadingType } from '@nepocorp/shared';

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
  
  type DefaultLeg = { id: string; origin: string; destination: string; km: string; loadingType: LoadingType };
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
        setDefaultLegs(item.defaultLegs.map(l => ({
          id: Math.random().toString(),
          origin: l.origin,
          destination: l.destination,
          km: l.km.toString(),
          loadingType: l.loadingType as LoadingType
        })));
      } else {
        setDefaultLegs([]);
      }
    }
  }, [isOpen, item?.id]);

  const handleSave = () => {
    if (!name.trim()) return;
    onsave({
      name: name.trim(),
      distanceKm: distance ? Number(distance) : undefined,
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
    setDefaultLegs([...defaultLegs, { id: Math.random().toString(), origin: '', destination: '', km: '', loadingType: LoadingType.HANG }]);
  };
  
  const updateLeg = (id: string, field: keyof DefaultLeg, val: string) => {
    setDefaultLegs(defaultLegs.map(l => l.id === id ? { ...l, [field]: val } : l));
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxHeight: '70vh', overflowY: 'auto', padding: '0 4px' }}>
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
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
        
        <div style={{ borderTop: '1px solid var(--line)', paddingTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ ...sectionLabelStyle, margin: 0 }}>Hành trình chi tiết (Mặc định)</div>
            <button type="button" className="btn btn--secondary btn--sm" onClick={addLeg} style={{ height: 26, padding: '0 8px' }}>
              <Plus size={14} /> Thêm chặng
            </button>
          </div>
          <p style={{ fontSize: 12, color: 'var(--fg-3)', margin: '0 0 12px' }}>
            Khai báo sẵn các chặng để tự động điền khi tạo lệnh vận chuyển trên tuyến này.
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {defaultLegs.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', background: 'var(--bg-2)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--line)' }}>
                <span style={{ color: 'var(--fg-3)', fontSize: 13 }}>Chưa có chặng mặc định</span>
              </div>
            ) : defaultLegs.map((leg, i) => (
              <div key={leg.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr) 70px 100px 30px', gap: 8, alignItems: 'center', background: 'var(--bg-2)', padding: '8px', borderRadius: 'var(--radius-md)' }}>
                <input className="input input--sm" placeholder="Điểm đi" value={leg.origin} onChange={e => updateLeg(leg.id, 'origin', e.target.value)} />
                <input className="input input--sm" placeholder="Điểm đến" value={leg.destination} onChange={e => updateLeg(leg.id, 'destination', e.target.value)} />
                <input className="input input--sm" type="number" placeholder="Km" value={leg.km} onChange={e => updateLeg(leg.id, 'km', e.target.value)} />
                <select className="input input--sm" value={leg.loadingType} onChange={e => updateLeg(leg.id, 'loadingType', e.target.value)}>
                  <option value={LoadingType.HANG}>Có hàng</option>
                  <option value={LoadingType.VO}>Vỏ rỗng</option>
                </select>
                <button type="button" className="btn btn--ghost btn--icon btn--sm" onClick={() => removeLeg(leg.id)} style={{ color: 'var(--danger)' }}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--line)', paddingTop: 16 }}>
          <div style={sectionLabelStyle}>Định mức nhiên liệu & Tiền lương</div>
          <p style={{ fontSize: 12, color: 'var(--fg-3)', margin: '0 0 12px' }}>
            Các giá trị này sẽ được dùng để gợi ý khi tạo / sửa lệnh trên tuyến này.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
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
              <p style={hintStyle}>Định mức cố định riêng cho tuyến (vd. tuyến núi). Để trống để dùng định mức chung.</p>
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
              <p style={hintStyle}>Số trạm BOT trên tuyến · trừ vào tiền đường.</p>
            </div>
          </div>
          <div className="field" style={{ marginTop: 12 }}>
            <label htmlFor="route-salary" style={labelStyle}>Lương sản lượng tài xế (VNĐ / chuyến)</label>
            <input
              id="route-salary"
              className="input"
              type="number"
              value={driverSalary}
              onChange={e => setDriverSalary(e.target.value)}
              placeholder="VD: 500000"
            />
            <p style={hintStyle}>Mức lương khoán cho 1 chuyến trên tuyến này. Để trống nếu tính theo công thức chung.</p>
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

  const fetchData = useCallback(async () => {
    const qs = search ? `?search=${encodeURIComponent(search)}&limit=100` : '?limit=100';
    const [routeRes, tripRes, raRes] = await Promise.all([
      api.get<PaginatedResponse<RouteType>>(`/routes${qs}`),
      api.get<{ items: any[] }>('/trips?limit=500').catch(() => ({ items: [] as any[] })),
      api.get<PaginatedResponse<RoadAllowance>>('/road-allowances?limit=200').catch(() => ({ items: [] as any[] })),
    ]);
    return {
      routes: routeRes.items,
      trips: (tripRes as any).items as any[],
      allowances: (raRes as any).items as any[],
    };
  }, [search]);

  const { data, refetch } = useQuery({
    queryKey: ['routes-config', search],
    queryFn: fetchData,
    staleTime: 2 * 60 * 1000,
  });

  const routes = data?.routes ?? [];

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
  }).filter(r => !search || r.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="fade-up">
      <div className="page-header">
        <div>
          <h1 className="page-title">Tuyến đường</h1>
          <p className="page-subtitle">{totalCount} tuyến đang quản lý · {mountainCount} tuyến núi · {usedThisMonth} tuyến chạy trong {monthLabel}</p>
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

      <div className="table-wrap">
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
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Tuyến đường</th><th className="num">KM</th><th>Loại</th>
                <th className="num">Trạm thu phí</th><th className="num">Lương SL</th>
                <th className="num">Chuẩn 20ft</th>
                <th className="num">Chuẩn 40ft</th><th className="num">Sử dụng {monthLabel}</th><th style={{ width: 80 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={9} style={{ textAlign: 'center', padding: '48px 12px', color: 'var(--ink-3)' }}>Chưa có dữ liệu</td></tr>}
              {filtered.map(r => {
                const prices = routePriceMap.get(r.id);
                const trips = routeTripStats.get(r.id) || 0;
                return (
                  <tr key={r.id}>
                    <td>
                      <div className="row-strong">{r.name}</div>
                      {r.fixedFuelAllowance && <div className="row-meta">Định mức dầu: {r.fixedFuelAllowance} L</div>}
                    </td>
                    <td className="num">{r.distanceKm != null ? `${r.distanceKm}` : '—'}</td>
                    <td>
                      {r.isMountain
                        ? <span className="pill pill--warn"><span className="dot" />Tuyến núi</span>
                        : <span className="pill pill--neutral">Đồng bằng</span>}
                    </td>
                    <td className="num">{r.tollsStations != null ? r.tollsStations : '—'}</td>
                    <td className="num">{r.driverSalary ? formatCurrency(Number(r.driverSalary)) : '—'}</td>
                    <td className="num">{prices?.ft20 ? formatCurrency(prices.ft20) : '—'}</td>
                    <td className="num">{prices?.ft40 ? formatCurrency(prices.ft40) : '—'}</td>
                    <td className="num">
                      {trips > 0 ? <strong style={{ color: 'var(--success)' }}>{trips}</strong> : <span style={{ color: 'var(--ink-3)' }}>0</span>}
                    </td>
                    <td>
                      <div className="row-actions">
                        <button className="row-action" title="Sửa" onClick={() => crud.setEditingId(r.id)}><Pencil size={13} /></button>
                        <button className="row-action" title="Xóa" disabled={crud.deleting === r.id} onClick={() => crud.doDelete(r.id)}>
                          {crud.deleting === r.id ? <Loader2 size={13} className="spin" /> : <Trash2 size={13} style={{ color: 'var(--danger)' }} />}
                        </button>
                      </div>
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
      {crud.error && <div style={{ textAlign: 'center', color: 'var(--danger)', marginTop: 12 }}>{crud.error}</div>}
    {confirmDialog}
    </div>
  );
}
