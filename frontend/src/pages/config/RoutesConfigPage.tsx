import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MapPin, Route, Plus, Pencil, Trash2, Loader2, Save, X, Mountain } from 'lucide-react';
import { api } from '../../lib/api';
import { formatCurrency } from '../../lib/format';
import { PageHeader } from '../../components/UI';
import { useCRUD } from '../../hooks/useCRUD';
import type { Route as RouteType, RoadAllowance, PaginatedResponse } from '@nepocorp/shared';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="field"><label>{label}</label>{children}</div>;
}

function RouteInlineAdd({ saving, item, onsave, oncancel }: {
  saving: boolean; item?: RouteType; onsave: (d: Record<string, unknown>) => void; oncancel: () => void;
}) {
  const [name, setName] = useState(item?.name || '');
  const [distance, setDistance] = useState(item?.distanceKm?.toString() || '');
  const [isMountain, setIsMountain] = useState(item?.isMountain || false);
  const [fuelAllowance, setFuelAllowance] = useState(item?.fixedFuelAllowance || '');
  return (
    <>
      <div style={{ flex: 2, minWidth: 160 }}>
        <Field label="Tên tuyến"><input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="VD: TP.HCM - Bình Dương" /></Field>
      </div>
      <div style={{ flex: 1, minWidth: 100 }}>
        <Field label="Khoảng cách (km)"><input className="input" type="number" value={distance} onChange={e => setDistance(e.target.value)} placeholder="0" /></Field>
      </div>
      <div style={{ flex: 1, minWidth: 120, display: 'flex', alignItems: 'center', paddingBottom: 4 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
          <input type="checkbox" checked={isMountain} onChange={e => setIsMountain(e.target.checked)} style={{ width: 15, height: 15 }} />
          <Mountain size={14} /> Leo núi
        </label>
      </div>
      <div style={{ flex: 1, minWidth: 140 }}>
        <Field label="NL khoán (lít)"><input className="input" type="number" value={fuelAllowance} onChange={e => setFuelAllowance(e.target.value)} placeholder="0" /></Field>
      </div>
      <div style={{ display: 'flex', gap: 6, paddingBottom: 4, alignItems: 'flex-end' }}>
        <button className="btn btn--primary btn--sm" disabled={saving} onClick={() => { if (!name.trim()) return; onsave({ name: name.trim(), distanceKm: distance ? Number(distance) : undefined, isMountain: isMountain, fixedFuelAllowance: fuelAllowance || null }); }}>
          {saving ? <Loader2 size={12} className="spin" /> : <Save size={12} />}
          {item ? 'Cập nhật' : 'Thêm'}
        </button>
        <button className="btn btn--ghost btn--sm" onClick={oncancel}><X size={12} /> Hủy</button>
      </div>
    </>
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

  const now = new Date();
  const monthLabel = `T${now.getMonth() + 1}`;
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
          <div className="kpi__watermark" aria-hidden="true"><svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg></div>
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

      {crud.showAddForm && !crud.editingId && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ background: 'var(--brand-soft)', borderRadius: 8, padding: '12px 16px' }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <RouteInlineAdd saving={crud.saving} onsave={crud.doCreate} oncancel={crud.cancelForm} />
            </div>
          </div>
        </div>
      )}

      <div className="table-wrap">
        <div className="toolbar">
          {(['all', 'plain', 'mountain'] as const).map(f => {
            const labels = { all: `Tất cả · ${totalCount}`, plain: `Đồng bằng · ${totalCount - mountainCount}`, mountain: `Tuyến núi · ${mountainCount}` };
            return <button key={f} className={`filter-pill${routeFilter === f ? ' is-active' : ''}`} onClick={() => setRouteFilter(f)}>{labels[f]}</button>;
          })}
          <div className="toolbar__spacer" />
          <div className="toolbar__search">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
            <input type="text" placeholder="Tìm tuyến đường..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Tuyến đường</th><th className="num">KM</th><th>Loại</th><th className="num">Chuẩn 20ft</th>
                <th className="num">Chuẩn 40ft</th><th className="num">Sử dụng {monthLabel}</th><th style={{ width: 80 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', padding: '48px 12px', color: 'var(--ink-3)' }}>Chưa có dữ liệu</td></tr>}
              {filtered.map(r => {
                if (crud.editingId === r.id) {
                  return (
                    <tr key={`edit-${r.id}`}>
                      <td colSpan={7} style={{ padding: 0 }}>
                        <div style={{ background: 'var(--brand-soft)', padding: '12px 16px' }}>
                          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                            <RouteInlineAdd saving={crud.saving} item={r} onsave={d => crud.doUpdate(r.id, d)} oncancel={crud.cancelForm} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                }
                const prices = routePriceMap.get(r.id);
                const trips = routeTripStats.get(r.id) || 0;
                return (
                  <tr key={r.id}>
                    <td>
                      <div className="row-strong">{r.name}</div>
                      {r.fixedFuelAllowance && <div className="row-meta">NL khoán: {r.fixedFuelAllowance} L</div>}
                    </td>
                    <td className="num">{r.distanceKm != null ? `${r.distanceKm}` : '—'}</td>
                    <td>
                      {r.isMountain
                        ? <span className="pill pill--warn"><span className="dot" />Tuyến núi</span>
                        : <span className="pill pill--neutral">Đồng bằng</span>}
                    </td>
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
    </div>
  );
}
