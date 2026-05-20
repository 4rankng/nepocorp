import { useState, useEffect, useCallback } from 'react';
import {
  Users, Truck, Container, MapPin, Package, DollarSign, Route,
  AlertTriangle, UserCheck, Fuel, Plus, Pencil, Trash2, X,
  Search, Save, Loader2, Mountain,
} from 'lucide-react';
import { api } from '../lib/api';
import { formatCurrency } from '../lib/format';
import type {
  Customer, Truck as TruckType, Trailer, Route as RouteType,
  CargoType, PricingTable, RoadAllowance, FuelConfig,
  PenaltyReason, Driver, PaginatedResponse,
} from '@nepocorp/shared';
import { TrailerType } from '@nepocorp/shared';

// ─── Types ────────────────────────────────────────────────────────────────────

type TabKey =
  | 'customers' | 'trucks' | 'trailers' | 'routes'
  | 'cargoTypes' | 'pricingTables' | 'roadAllowances'
  | 'penaltyReasons' | 'drivers' | 'fuelConfig';

interface TabDef {
  key: TabKey;
  label: string;
  icon: React.ElementType;
  searchable?: boolean;
}

const TABS: TabDef[] = [
  { key: 'customers', label: 'Khách hàng', icon: Users, searchable: true },
  { key: 'trucks', label: 'Xe đầu kéo', icon: Truck, searchable: true },
  { key: 'trailers', label: 'Rơ-moóc', icon: Container, searchable: true },
  { key: 'routes', label: 'Tuyến đường', icon: MapPin, searchable: true },
  { key: 'cargoTypes', label: 'Loại hàng', icon: Package },
  { key: 'pricingTables', label: 'Bảng giá', icon: DollarSign },
  { key: 'roadAllowances', label: 'Tiền đi đường', icon: Route },
  { key: 'penaltyReasons', label: 'Lý do phạt', icon: AlertTriangle },
  { key: 'drivers', label: 'Tài xế', icon: UserCheck },
  { key: 'fuelConfig', label: 'Nhiên liệu', icon: Fuel },
];

const TRUCK_STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Hoạt động', MAINTENANCE: 'Bảo trì', INACTIVE: 'Ngưng',
};
const DRIVER_STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Hoạt động', INACTIVE: 'Ngưng',
};
const TRAILER_TYPE_LABELS: Record<string, string> = {
  [TrailerType.FT20]: '20ft', [TrailerType.FT40]: '40ft',
};

function badgeCls(status: string) {
  return status === 'ACTIVE' ? 'badge-success' : status === 'MAINTENANCE' ? 'badge-warning' : 'badge-neutral';
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
    </div>
  );
}

// ─── Inline Form Row ──────────────────────────────────────────────────────────

function InlineForm({ colSpan, children }: { colSpan: number; children: React.ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} style={{ background: 'var(--brand-soft)', padding: '12px 16px' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          {children}
        </div>
      </td>
    </tr>
  );
}

function FormActions({ saving, onsave, oncancel, isedit }: {
  saving: boolean; onsave: () => void; oncancel: () => void; isedit: boolean;
}) {
  return (
    <div style={{ display: 'flex', gap: 6, paddingBottom: 4 }}>
      <button className="btn btn-primary btn-sm" disabled={saving} onClick={onsave}>
        {saving ? <Loader2 size={12} className="spin" /> : <Save size={12} />}
        {isedit ? 'Cập nhật' : 'Thêm'}
      </button>
      <button className="btn btn-ghost btn-sm" onClick={oncancel}>
        <X size={12} /> Huy
      </button>
    </div>
  );
}

function ActionBtns({ id, deleting, onedit, ondelete }: {
  id: number; deleting: number | null; onedit: () => void; ondelete: () => void;
}) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      <button className="btn btn-ghost btn-sm btn-icon" title="Sửa" onClick={onedit}><Pencil size={13} /></button>
      <button className="btn btn-ghost btn-sm btn-icon" title="Xóa" disabled={deleting === id} onClick={ondelete}>
        {deleting === id ? <Loader2 size={13} className="spin" /> : <Trash2 size={13} style={{ color: 'var(--danger)' }} />}
      </button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ConfigPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('customers');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [trucks, setTrucks] = useState<TruckType[]>([]);
  const [trailers, setTrailers] = useState<Trailer[]>([]);
  const [routes, setRoutes] = useState<RouteType[]>([]);
  const [cargoTypes, setCargoTypes] = useState<CargoType[]>([]);
  const [pricingTables, setPricingTables] = useState<PricingTable[]>([]);
  const [roadAllowances, setRoadAllowances] = useState<RoadAllowance[]>([]);
  const [penaltyReasons, setPenaltyReasons] = useState<PenaltyReason[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [fuelConfig, setFuelConfig] = useState<FuelConfig | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);

  // Lookup maps
  const [customerMap, setCustomerMap] = useState<Map<number, string>>(new Map());
  const [routeMap, setRouteMap] = useState<Map<number, string>>(new Map());
  const [truckMap, setTruckMap] = useState<Map<number, string>>(new Map());

  const currentTab = TABS.find(t => t.key === activeTab)!;

  const fetchTabData = useCallback(async (tabKey: TabKey) => {
    setLoading(true);
    setError(null);
    setEditingId(null);
    setShowAddForm(false);
    try {
      switch (tabKey) {
        case 'customers': {
          const qs = search ? `?search=${encodeURIComponent(search)}` : '';
          const r = await api.get<PaginatedResponse<Customer>>(`/customers${qs}`);
          setCustomers(r.items);
          break;
        }
        case 'trucks': {
          const qs = search ? `?search=${encodeURIComponent(search)}` : '';
          const r = await api.get<PaginatedResponse<TruckType>>(`/trucks${qs}`);
          setTrucks(r.items);
          const m = new Map<number, string>();
          r.items.forEach(t => m.set(t.id, t.license_plate));
          setTruckMap(m);
          break;
        }
        case 'trailers': {
          const qs = search ? `?search=${encodeURIComponent(search)}` : '';
          const r = await api.get<PaginatedResponse<Trailer>>(`/trailers${qs}`);
          setTrailers(r.items);
          break;
        }
        case 'routes': {
          const qs = search ? `?search=${encodeURIComponent(search)}` : '';
          const r = await api.get<PaginatedResponse<RouteType>>(`/routes${qs}`);
          setRoutes(r.items);
          const m = new Map<number, string>();
          r.items.forEach(rt => m.set(rt.id, rt.name));
          setRouteMap(m);
          break;
        }
        case 'cargoTypes': {
          const r = await api.get<PaginatedResponse<CargoType>>('/cargo-types');
          setCargoTypes(r.items);
          break;
        }
        case 'pricingTables': {
          const [pt, cr, rr] = await Promise.all([
            api.get<PaginatedResponse<PricingTable>>('/pricing-tables'),
            api.get<PaginatedResponse<Customer>>('/customers'),
            api.get<PaginatedResponse<RouteType>>('/routes'),
          ]);
          setPricingTables(pt.items);
          const cm = new Map<number, string>(); cr.items.forEach(c => cm.set(c.id, c.name));
          setCustomerMap(cm);
          const rm = new Map<number, string>(); rr.items.forEach(rt => rm.set(rt.id, rt.name));
          setRouteMap(rm);
          break;
        }
        case 'roadAllowances': {
          const [ra, rr] = await Promise.all([
            api.get<PaginatedResponse<RoadAllowance>>('/road-allowances'),
            api.get<PaginatedResponse<RouteType>>('/routes'),
          ]);
          setRoadAllowances(ra.items);
          const rm = new Map<number, string>(); rr.items.forEach(rt => rm.set(rt.id, rt.name));
          setRouteMap(rm);
          break;
        }
        case 'penaltyReasons': {
          const r = await api.get<PaginatedResponse<PenaltyReason>>('/penalty-reasons');
          setPenaltyReasons(r.items);
          break;
        }
        case 'drivers': {
          const [d, t] = await Promise.all([
            api.get<{ items: Driver[]; total: number }>('/drivers'),
            api.get<PaginatedResponse<TruckType>>('/trucks'),
          ]);
          setDrivers(d.items);
          const m = new Map<number, string>(); t.items.forEach(tk => m.set(tk.id, tk.license_plate));
          setTruckMap(m);
          break;
        }
        case 'fuelConfig': {
          const r = await api.get<FuelConfig | null>('/fuel-config');
          setFuelConfig(r);
          break;
        }
      }
    } catch {
      setError('Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { fetchTabData(activeTab); }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!currentTab.searchable) return;
    const t = setTimeout(() => fetchTabData(activeTab), 300);
    return () => clearTimeout(t);
  }, [search, activeTab, currentTab.searchable, fetchTabData]);

  async function doCreate(path: string, body: Record<string, unknown>) {
    setSaving(true);
    try {
      await api.post(path, body);
      setShowAddForm(false);
      await fetchTabData(activeTab);
    } catch (e: any) { setError(e?.message || 'Lỗi lưu'); } finally { setSaving(false); }
  }

  async function doUpdate(path: string, id: number, body: Record<string, unknown>) {
    setSaving(true);
    try {
      await api.put(`${path}/${id}`, body);
      setEditingId(null);
      await fetchTabData(activeTab);
    } catch (e: any) { setError(e?.message || 'Lỗi cập nhật'); } finally { setSaving(false); }
  }

  async function doDelete(path: string, id: number) {
    setDeleting(id);
    try {
      await api.delete(`${path}/${id}`);
      await fetchTabData(activeTab);
    } catch (e: any) { setError(e?.message || 'Lỗi xóa'); } finally { setDeleting(null); }
  }

  function switchTab(key: TabKey) {
    setActiveTab(key); setSearch(''); setError(null);
  }

  function cancelForm() { setShowAddForm(false); setEditingId(null); }

  // ─── Toolbar ─────────────────────────────────────────────────────────────

  function renderToolbar() {
    if (activeTab === 'fuelConfig') return null;
    return (
      <div className="toolbar">
        {currentTab.searchable && (
          <div className="topbar-search" style={{ width: 220 }}>
            <Search size={13} />
            <input type="text" placeholder="Tìm kiếm..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        )}
        <div style={{ flex: 1 }} />
        <button className="btn btn-primary btn-sm" onClick={() => setShowAddForm(true)}>
          <Plus size={14} /> Them moi
        </button>
      </div>
    );
  }

  // ─── Customer Form ───────────────────────────────────────────────────────

  function CustomerForm({ item, onsave, oncancel }: { item?: Customer; onsave: (data: Record<string, unknown>) => void; oncancel: () => void }) {
    const [name, setName] = useState(item?.name || '');
    const [contactInfo, setContactInfo] = useState(item?.contact_info || '');
    return (
      <InlineForm colSpan={4}>
        <div style={{ flex: 2, minWidth: 180 }}>
          <Field label="Tên khách hàng">
            <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Nhập tên..." />
          </Field>
        </div>
        <div style={{ flex: 2, minWidth: 180 }}>
          <Field label="Lien he">
            <input className="input" value={contactInfo} onChange={e => setContactInfo(e.target.value)} placeholder="SĐT, email..." />
          </Field>
        </div>
        <FormActions saving={saving} isedit={!!item} oncancel={oncancel} onsave={() => onsave({ name: name.trim(), contact_info: contactInfo.trim() || undefined })} />
      </InlineForm>
    );
  }

  function renderCustomers() {
    const cols = 4;
    return (
      <div className="card-shell fade-up">
        {renderToolbar()}
        <div style={{ overflowX: 'auto' }}>
          <table className="tt-table">
            <thead><tr><th style={{ width: 40 }}>#</th><th>Tên khách hàng</th><th>Liên hệ</th><th style={{ width: 100 }}>Thao tác</th></tr></thead>
            <tbody>
              {showAddForm && !editingId && (
                <CustomerForm onsave={d => doCreate('/customers', d)} oncancel={cancelForm} />
              )}
              {customers.length === 0 && !showAddForm && (
                <tr><td colSpan={cols} style={{ textAlign: 'center', padding: 32, color: 'var(--fg-3)' }}>Chưa có dữ liệu</td></tr>
              )}
              {customers.map((c, i) => editingId === c.id
                ? <CustomerForm key={`edit-${c.id}`} item={c} onsave={d => doUpdate('/customers', c.id, d)} oncancel={cancelForm} />
                : <tr key={c.id}>
                  <td className="num">{i + 1}</td>
                  <td style={{ fontWeight: 600, color: 'var(--fg-1)' }}>{c.name}</td>
                  <td>{c.contact_info || '—'}</td>
                  <td><ActionBtns id={c.id} deleting={deleting} onedit={() => setEditingId(c.id)} ondelete={() => doDelete('/customers', c.id)} /></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ─── Truck Form ──────────────────────────────────────────────────────────

  function TruckForm({ item, onsave, oncancel }: { item?: TruckType; onsave: (d: Record<string, unknown>) => void; oncancel: () => void }) {
    const [plate, setPlate] = useState(item?.license_plate || '');
    const [status, setStatus] = useState(item?.status || 'ACTIVE');
    return (
      <InlineForm colSpan={4}>
        <div style={{ flex: 2, minWidth: 160 }}>
          <Field label="Bien so"><input className="input" value={plate} onChange={e => setPlate(e.target.value)} placeholder="VD: 51C-12345" /></Field>
        </div>
        <div style={{ flex: 1, minWidth: 140 }}>
          <Field label="Trang thai">
            <select className="input" value={status} onChange={e => setStatus(e.target.value)}>
              {Object.entries(TRUCK_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
        </div>
        <FormActions saving={saving} isedit={!!item} oncancel={oncancel} onsave={() => { if (!plate.trim()) return; onsave({ license_plate: plate.trim(), status }); }} />
      </InlineForm>
    );
  }

  function renderTrucks() {
    return (
      <div className="card-shell fade-up">
        {renderToolbar()}
        <div style={{ overflowX: 'auto' }}>
          <table className="tt-table">
            <thead><tr><th style={{ width: 40 }}>#</th><th>Biển số</th><th>Trạng thái</th><th style={{ width: 100 }}>Thao tác</th></tr></thead>
            <tbody>
              {showAddForm && !editingId && <TruckForm onsave={d => doCreate('/trucks', d)} oncancel={cancelForm} />}
              {trucks.length === 0 && !showAddForm && <tr><td colSpan={4} style={{ textAlign: 'center', padding: 32, color: 'var(--fg-3)' }}>Chưa có dữ liệu</td></tr>}
              {trucks.map((t, i) => editingId === t.id
                ? <TruckForm key={`edit-${t.id}`} item={t} onsave={d => doUpdate('/trucks', t.id, d)} oncancel={cancelForm} />
                : <tr key={t.id}>
                  <td className="num">{i + 1}</td>
                  <td style={{ fontWeight: 600, color: 'var(--fg-1)', fontFamily: 'var(--font-mono)' }}>{t.license_plate}</td>
                  <td><span className={`badge ${badgeCls(t.status)}`}>{TRUCK_STATUS_LABELS[t.status] || t.status}</span></td>
                  <td><ActionBtns id={t.id} deleting={deleting} onedit={() => setEditingId(t.id)} ondelete={() => doDelete('/trucks', t.id)} /></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ─── Trailer Form ────────────────────────────────────────────────────────

  function TrailerForm({ item, onsave, oncancel }: { item?: Trailer; onsave: (d: Record<string, unknown>) => void; oncancel: () => void }) {
    const [plate, setPlate] = useState(item?.license_plate || '');
    const [type, setType] = useState<string>(item?.type || TrailerType.FT20);
    return (
      <InlineForm colSpan={4}>
        <div style={{ flex: 2, minWidth: 160 }}>
          <Field label="Bien so"><input className="input" value={plate} onChange={e => setPlate(e.target.value)} placeholder="VD: 51R-56789" /></Field>
        </div>
        <div style={{ flex: 1, minWidth: 120 }}>
          <Field label="Loai">
            <select className="input" value={type} onChange={e => setType(e.target.value as TrailerType)}>
              {Object.entries(TRAILER_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
        </div>
        <FormActions saving={saving} isedit={!!item} oncancel={oncancel} onsave={() => { if (!plate.trim()) return; onsave({ license_plate: plate.trim(), type: type as TrailerType }); }} />
      </InlineForm>
    );
  }

  function renderTrailers() {
    return (
      <div className="card-shell fade-up">
        {renderToolbar()}
        <div style={{ overflowX: 'auto' }}>
          <table className="tt-table">
            <thead><tr><th style={{ width: 40 }}>#</th><th>Biển số</th><th>Loại</th><th style={{ width: 100 }}>Thao tác</th></tr></thead>
            <tbody>
              {showAddForm && !editingId && <TrailerForm onsave={d => doCreate('/trailers', d)} oncancel={cancelForm} />}
              {trailers.length === 0 && !showAddForm && <tr><td colSpan={4} style={{ textAlign: 'center', padding: 32, color: 'var(--fg-3)' }}>Chưa có dữ liệu</td></tr>}
              {trailers.map((t, i) => editingId === t.id
                ? <TrailerForm key={`edit-${t.id}`} item={t} onsave={d => doUpdate('/trailers', t.id, d)} oncancel={cancelForm} />
                : <tr key={t.id}>
                  <td className="num">{i + 1}</td>
                  <td style={{ fontWeight: 600, color: 'var(--fg-1)', fontFamily: 'var(--font-mono)' }}>{t.license_plate}</td>
                  <td><span className="badge badge-outline">{TRAILER_TYPE_LABELS[t.type] || t.type}</span></td>
                  <td><ActionBtns id={t.id} deleting={deleting} onedit={() => setEditingId(t.id)} ondelete={() => doDelete('/trailers', t.id)} /></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ─── Route Form ──────────────────────────────────────────────────────────

  function RouteForm({ item, onsave, oncancel }: { item?: RouteType; onsave: (d: Record<string, unknown>) => void; oncancel: () => void }) {
    const [name, setName] = useState(item?.name || '');
    const [distance, setDistance] = useState(item?.distance_km?.toString() || '');
    const [isMountain, setIsMountain] = useState(item?.is_mountain || false);
    const [fuelAllowance, setFuelAllowance] = useState(item?.fixed_fuel_allowance || '');
    return (
      <InlineForm colSpan={6}>
        <div style={{ flex: 2, minWidth: 160 }}>
          <Field label="Tên tuyến"><input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="VD: TP.HCM - Binh Duong" /></Field>
        </div>
        <div style={{ flex: 1, minWidth: 100 }}>
          <Field label="Khoảng cách (km)"><input className="input" type="number" value={distance} onChange={e => setDistance(e.target.value)} placeholder="0" /></Field>
        </div>
        <div style={{ flex: 1, minWidth: 120, paddingBottom: 4 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
            <input type="checkbox" checked={isMountain} onChange={e => setIsMountain(e.target.checked)} />
            <Mountain size={14} /> Leo núi
          </label>
        </div>
        <div style={{ flex: 1, minWidth: 140 }}>
          <Field label="NL khoán"><input className="input" type="number" value={fuelAllowance} onChange={e => setFuelAllowance(e.target.value)} placeholder="0" /></Field>
        </div>
        <FormActions saving={saving} isedit={!!item} oncancel={oncancel} onsave={() => { if (!name.trim()) return; onsave({ name: name.trim(), distance_km: distance ? Number(distance) : undefined, is_mountain: isMountain, fixed_fuel_allowance: fuelAllowance || null }); }} />
      </InlineForm>
    );
  }

  function renderRoutes() {
    return (
      <div className="card-shell fade-up">
        {renderToolbar()}
        <div style={{ overflowX: 'auto' }}>
          <table className="tt-table">
            <thead><tr><th style={{ width: 40 }}>#</th><th>Tuyến đường</th><th>Khoảng cách</th><th>Leo núi</th><th>NL khoán</th><th style={{ width: 100 }}>Thao tác</th></tr></thead>
            <tbody>
              {showAddForm && !editingId && <RouteForm onsave={d => doCreate('/routes', d)} oncancel={cancelForm} />}
              {routes.length === 0 && !showAddForm && <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--fg-3)' }}>Chưa có dữ liệu</td></tr>}
              {routes.map((r, i) => editingId === r.id
                ? <RouteForm key={`edit-${r.id}`} item={r} onsave={d => doUpdate('/routes', r.id, d)} oncancel={cancelForm} />
                : <tr key={r.id}>
                  <td className="num">{i + 1}</td>
                  <td style={{ fontWeight: 600, color: 'var(--fg-1)' }}>{r.name}</td>
                  <td className="num">{r.distance_km != null ? `${r.distance_km} km` : '—'}</td>
                  <td>{r.is_mountain ? <span className="badge badge-warning">Có</span> : '—'}</td>
                  <td className="num">{r.fixed_fuel_allowance || '—'}</td>
                  <td><ActionBtns id={r.id} deleting={deleting} onedit={() => setEditingId(r.id)} ondelete={() => doDelete('/routes', r.id)} /></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ─── Cargo Type Form ─────────────────────────────────────────────────────

  function CargoTypeForm({ item, onsave, oncancel }: { item?: CargoType; onsave: (d: Record<string, unknown>) => void; oncancel: () => void }) {
    const [name, setName] = useState(item?.name || '');
    return (
      <InlineForm colSpan={3}>
        <div style={{ flex: 2, minWidth: 200 }}>
          <Field label="Tên loại hàng"><input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="VD: Cát, đá..." /></Field>
        </div>
        <FormActions saving={saving} isedit={!!item} oncancel={oncancel} onsave={() => { if (!name.trim()) return; onsave({ name: name.trim() }); }} />
      </InlineForm>
    );
  }

  function renderCargoTypes() {
    return (
      <div className="card-shell fade-up">
        {renderToolbar()}
        <div style={{ overflowX: 'auto' }}>
          <table className="tt-table">
            <thead><tr><th style={{ width: 40 }}>#</th><th>Tên loại hàng</th><th style={{ width: 100 }}>Thao tác</th></tr></thead>
            <tbody>
              {showAddForm && !editingId && <CargoTypeForm onsave={d => doCreate('/cargo-types', d)} oncancel={cancelForm} />}
              {cargoTypes.length === 0 && !showAddForm && <tr><td colSpan={3} style={{ textAlign: 'center', padding: 32, color: 'var(--fg-3)' }}>Chưa có dữ liệu</td></tr>}
              {cargoTypes.map((ct, i) => editingId === ct.id
                ? <CargoTypeForm key={`edit-${ct.id}`} item={ct} onsave={d => doUpdate('/cargo-types', ct.id, d)} oncancel={cancelForm} />
                : <tr key={ct.id}>
                  <td className="num">{i + 1}</td>
                  <td style={{ fontWeight: 600, color: 'var(--fg-1)' }}>{ct.name}</td>
                  <td><ActionBtns id={ct.id} deleting={deleting} onedit={() => setEditingId(ct.id)} ondelete={() => doDelete('/cargo-types', ct.id)} /></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ─── Pricing Table Form ──────────────────────────────────────────────────

  function PricingForm({ item, onsave, oncancel }: { item?: PricingTable; onsave: (d: Record<string, unknown>) => void; oncancel: () => void }) {
    const [customerId, setCustomerId] = useState(item?.customer_id || 0);
    const [routeId, setRouteId] = useState(item?.route_id || 0);
    const [price, setPrice] = useState(item?.price || '');
    const [cl, setCl] = useState<Customer[]>([]);
    const [rl, setRl] = useState<RouteType[]>([]);
    useEffect(() => {
      api.get<PaginatedResponse<Customer>>('/customers').then(r => setCl(r.items));
      api.get<PaginatedResponse<RouteType>>('/routes').then(r => setRl(r.items));
    }, []);
    return (
      <InlineForm colSpan={5}>
        <div style={{ flex: 2, minWidth: 180 }}>
          <Field label="Khach hang">
            <select className="input" value={customerId} onChange={e => setCustomerId(Number(e.target.value))}>
              <option value={0}>-- Chọn --</option>
              {cl.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
        </div>
        <div style={{ flex: 2, minWidth: 180 }}>
          <Field label="Tuyen duong">
            <select className="input" value={routeId} onChange={e => setRouteId(Number(e.target.value))}>
              <option value={0}>-- Chọn --</option>
              {rl.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </Field>
        </div>
        <div style={{ flex: 1, minWidth: 120 }}>
          <Field label="Gia (VND)"><input className="input" type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="0" /></Field>
        </div>
        <FormActions saving={saving} isedit={!!item} oncancel={oncancel} onsave={() => { if (!customerId || !routeId || !price) return; onsave({ customer_id: customerId, route_id: routeId, price: Number(price) }); }} />
      </InlineForm>
    );
  }

  function renderPricingTables() {
    return (
      <div className="card-shell fade-up">
        {renderToolbar()}
        <div style={{ overflowX: 'auto' }}>
          <table className="tt-table">
            <thead><tr><th style={{ width: 40 }}>#</th><th>Khách hàng</th><th>Tuyến đường</th><th>Giá</th><th style={{ width: 100 }}>Thao tác</th></tr></thead>
            <tbody>
              {showAddForm && !editingId && <PricingForm onsave={d => doCreate('/pricing-tables', d)} oncancel={cancelForm} />}
              {pricingTables.length === 0 && !showAddForm && <tr><td colSpan={5} style={{ textAlign: 'center', padding: 32, color: 'var(--fg-3)' }}>Chưa có dữ liệu</td></tr>}
              {pricingTables.map((pt, i) => editingId === pt.id
                ? <PricingForm key={`edit-${pt.id}`} item={pt} onsave={d => doUpdate('/pricing-tables', pt.id, d)} oncancel={cancelForm} />
                : <tr key={pt.id}>
                  <td className="num">{i + 1}</td>
                  <td>{customerMap.get(pt.customer_id) || `#${pt.customer_id}`}</td>
                  <td>{routeMap.get(pt.route_id) || `#${pt.route_id}`}</td>
                  <td className="num" style={{ color: 'var(--fg-1)' }}>{formatCurrency(pt.price)}</td>
                  <td><ActionBtns id={pt.id} deleting={deleting} onedit={() => setEditingId(pt.id)} ondelete={() => doDelete('/pricing-tables', pt.id)} /></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ─── Road Allowance Form ─────────────────────────────────────────────────

  function RoadAllowanceForm({ item, onsave, oncancel }: { item?: RoadAllowance; onsave: (d: Record<string, unknown>) => void; oncancel: () => void }) {
    const [routeId, setRouteId] = useState(item?.route_id || 0);
    const [trailerType, setTrailerType] = useState(item?.trailer_type || TrailerType.FT20);
    const [baseAmount, setBaseAmount] = useState(item?.base_amount || '');
    const [rl, setRl] = useState<RouteType[]>([]);
    useEffect(() => { api.get<PaginatedResponse<RouteType>>('/routes').then(r => setRl(r.items)); }, []);
    return (
      <InlineForm colSpan={5}>
        <div style={{ flex: 2, minWidth: 180 }}>
          <Field label="Tuyen duong">
            <select className="input" value={routeId} onChange={e => setRouteId(Number(e.target.value))}>
              <option value={0}>-- Chọn --</option>
              {rl.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </Field>
        </div>
        <div style={{ flex: 1, minWidth: 120 }}>
          <Field label="Loai ro-mooc">
            <select className="input" value={trailerType} onChange={e => setTrailerType(e.target.value as TrailerType)}>
              {Object.entries(TRAILER_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
        </div>
        <div style={{ flex: 1, minWidth: 120 }}>
          <Field label="Muc co ban (VND)"><input className="input" type="number" value={baseAmount} onChange={e => setBaseAmount(e.target.value)} placeholder="0" /></Field>
        </div>
        <FormActions saving={saving} isedit={!!item} oncancel={oncancel} onsave={() => { if (!routeId || !baseAmount) return; onsave({ route_id: routeId, trailer_type: trailerType, base_amount: Number(baseAmount) }); }} />
      </InlineForm>
    );
  }

  function renderRoadAllowances() {
    return (
      <div className="card-shell fade-up">
        {renderToolbar()}
        <div style={{ overflowX: 'auto' }}>
          <table className="tt-table">
            <thead><tr><th style={{ width: 40 }}>#</th><th>Tuyến đường</th><th>Loại rơ-moóc</th><th>Mức cơ bản</th><th style={{ width: 100 }}>Thao tác</th></tr></thead>
            <tbody>
              {showAddForm && !editingId && <RoadAllowanceForm onsave={d => doCreate('/road-allowances', d)} oncancel={cancelForm} />}
              {roadAllowances.length === 0 && !showAddForm && <tr><td colSpan={5} style={{ textAlign: 'center', padding: 32, color: 'var(--fg-3)' }}>Chưa có dữ liệu</td></tr>}
              {roadAllowances.map((ra, i) => editingId === ra.id
                ? <RoadAllowanceForm key={`edit-${ra.id}`} item={ra} onsave={d => doUpdate('/road-allowances', ra.id, d)} oncancel={cancelForm} />
                : <tr key={ra.id}>
                  <td className="num">{i + 1}</td>
                  <td>{routeMap.get(ra.route_id) || `#${ra.route_id}`}</td>
                  <td><span className="badge badge-outline">{TRAILER_TYPE_LABELS[ra.trailer_type] || ra.trailer_type}</span></td>
                  <td className="num" style={{ color: 'var(--fg-1)' }}>{formatCurrency(ra.base_amount)}</td>
                  <td><ActionBtns id={ra.id} deleting={deleting} onedit={() => setEditingId(ra.id)} ondelete={() => doDelete('/road-allowances', ra.id)} /></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ─── Penalty Reason Form ─────────────────────────────────────────────────

  function PenaltyReasonForm({ item, onsave, oncancel }: { item?: PenaltyReason; onsave: (d: Record<string, unknown>) => void; oncancel: () => void }) {
    const [reason, setReason] = useState(item?.reason_text || '');
    const [amount, setAmount] = useState(item?.default_amount || '');
    return (
      <InlineForm colSpan={4}>
        <div style={{ flex: 3, minWidth: 200 }}>
          <Field label="Ly do phat"><input className="input" value={reason} onChange={e => setReason(e.target.value)} placeholder="Mô tả lý do..." /></Field>
        </div>
        <div style={{ flex: 1, minWidth: 140 }}>
          <Field label="Muc mac dinh (VND)"><input className="input" type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" /></Field>
        </div>
        <FormActions saving={saving} isedit={!!item} oncancel={oncancel} onsave={() => { if (!reason.trim()) return; onsave({ reason_text: reason.trim(), default_amount: Number(amount) || 0 }); }} />
      </InlineForm>
    );
  }

  function renderPenaltyReasons() {
    return (
      <div className="card-shell fade-up">
        {renderToolbar()}
        <div style={{ overflowX: 'auto' }}>
          <table className="tt-table">
            <thead><tr><th style={{ width: 40 }}>#</th><th>Lý do</th><th>Mức mặc định</th><th style={{ width: 100 }}>Thao tác</th></tr></thead>
            <tbody>
              {showAddForm && !editingId && <PenaltyReasonForm onsave={d => doCreate('/penalty-reasons', d)} oncancel={cancelForm} />}
              {penaltyReasons.length === 0 && !showAddForm && <tr><td colSpan={4} style={{ textAlign: 'center', padding: 32, color: 'var(--fg-3)' }}>Chưa có dữ liệu</td></tr>}
              {penaltyReasons.map((pr, i) => editingId === pr.id
                ? <PenaltyReasonForm key={`edit-${pr.id}`} item={pr} onsave={d => doUpdate('/penalty-reasons', pr.id, d)} oncancel={cancelForm} />
                : <tr key={pr.id}>
                  <td className="num">{i + 1}</td>
                  <td style={{ fontWeight: 600, color: 'var(--fg-1)' }}>{pr.reason_text}</td>
                  <td className="num">{formatCurrency(pr.default_amount)}</td>
                  <td><ActionBtns id={pr.id} deleting={deleting} onedit={() => setEditingId(pr.id)} ondelete={() => doDelete('/penalty-reasons', pr.id)} /></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ─── Driver Form ─────────────────────────────────────────────────────────

  function DriverForm({ item, onsave, oncancel }: { item?: Driver; onsave: (d: Record<string, unknown>) => void; oncancel: () => void }) {
    const [name, setName] = useState(item?.name || '');
    const [phone, setPhone] = useState(item?.phone || '');
    const [baseSalary, setBaseSalary] = useState(item?.base_salary || '');
    const [truckId, setTruckId] = useState(item?.assigned_truck_id || 0);
    const [status, setStatus] = useState(item?.status || 'ACTIVE');
    const [tl, setTl] = useState<TruckType[]>([]);
    useEffect(() => { api.get<PaginatedResponse<TruckType>>('/trucks').then(r => setTl(r.items)); }, []);
    return (
      <InlineForm colSpan={6}>
        <div style={{ flex: 2, minWidth: 150 }}>
          <Field label="Tên tài xế"><input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Họ và tên" /></Field>
        </div>
        <div style={{ flex: 1, minWidth: 130 }}>
          <Field label="SDT"><input className="input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="0912..." /></Field>
        </div>
        <div style={{ flex: 1, minWidth: 130 }}>
          <Field label="Lương CB"><input className="input" type="number" value={baseSalary} onChange={e => setBaseSalary(e.target.value)} placeholder="0" /></Field>
        </div>
        <div style={{ flex: 1, minWidth: 130 }}>
          <Field label="Xe phân công">
            <select className="input" value={truckId} onChange={e => setTruckId(Number(e.target.value))}>
              <option value={0}>-- Chưa phân --</option>
              {tl.filter(t => t.status === 'ACTIVE').map(t => <option key={t.id} value={t.id}>{t.license_plate}</option>)}
            </select>
          </Field>
        </div>
        <div style={{ flex: 1, minWidth: 120 }}>
          <Field label="Trang thai">
            <select className="input" value={status} onChange={e => setStatus(e.target.value)}>
              {Object.entries(DRIVER_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
        </div>
        <FormActions saving={saving} isedit={!!item} oncancel={oncancel} onsave={() => { if (!name.trim()) return; onsave({ name: name.trim(), phone: phone.trim() || undefined, base_salary: baseSalary ? Number(baseSalary) : undefined, assigned_truck_id: truckId || null, status }); }} />
      </InlineForm>
    );
  }

  function renderDrivers() {
    return (
      <div className="card-shell fade-up">
        {renderToolbar()}
        <div style={{ overflowX: 'auto' }}>
          <table className="tt-table">
            <thead><tr><th style={{ width: 40 }}>#</th><th>Ten</th><th>SĐT</th><th>Xe phân công</th><th>Trạng thái</th><th style={{ width: 100 }}>Thao tác</th></tr></thead>
            <tbody>
              {showAddForm && !editingId && <DriverForm onsave={d => doCreate('/drivers', d)} oncancel={cancelForm} />}
              {drivers.length === 0 && !showAddForm && <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--fg-3)' }}>Chưa có dữ liệu</td></tr>}
              {drivers.map((d, i) => editingId === d.id
                ? <DriverForm key={`edit-${d.id}`} item={d} onsave={dd => doUpdate('/drivers', d.id, dd)} oncancel={cancelForm} />
                : <tr key={d.id}>
                  <td className="num">{i + 1}</td>
                  <td style={{ fontWeight: 600, color: 'var(--fg-1)' }}>{d.name}</td>
                  <td>{d.phone || '—'}</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{d.assigned_truck_id ? (truckMap.get(d.assigned_truck_id) || `#${d.assigned_truck_id}`) : '—'}</td>
                  <td><span className={`badge ${badgeCls(d.status)}`}>{DRIVER_STATUS_LABELS[d.status] || d.status}</span></td>
                  <td><ActionBtns id={d.id} deleting={deleting} onedit={() => setEditingId(d.id)} ondelete={() => doDelete('/drivers', d.id)} /></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ─── Fuel Config ─────────────────────────────────────────────────────────

  function FuelConfigForm() {
    const [form, setForm] = useState({ loadedNorm: '', emptyNorm: '', supplement: '', unitPrice: '' });
    const [fuelSaving, setFuelSaving] = useState(false);
    const [init, setInit] = useState(false);

    useEffect(() => {
      if (fuelConfig && !init) {
        const fc = fuelConfig as any;
        setForm({ loadedNorm: fc.loadedNorm ?? fc.loaded_norm, emptyNorm: fc.emptyNorm ?? fc.empty_norm, supplement: fc.supplement, unitPrice: fc.unitPrice ?? fc.unit_price });
        setInit(true);
      }
    }, [fuelConfig, init]);

    const handleSave = async () => {
      setFuelSaving(true);
      try {
        await api.put('/fuel-config', {
          loaded_norm: Number(form.loadedNorm), empty_norm: Number(form.emptyNorm),
          supplement: Number(form.supplement) || 0, unit_price: Number(form.unitPrice),
        });
        await fetchTabData('fuelConfig');
      } catch (e: any) { setError(e?.message || 'Lỗi lưu'); } finally { setFuelSaving(false); }
    };

    return (
      <div className="card-shell fade-up">
        <div className="card-header">
          <div>
            <h3>Cấu hình tính nhiên liệu</h3>
            <p>Thông số dùng để tính toán chi phí nhiên liệu cho mỗi lệnh</p>
          </div>
        </div>
        <div style={{ padding: '20px 24px 24px' }}>
          <div className="row-2">
            <div className="field">
              <label>Định mức có tải (lit/100km)</label>
              <input className="input" type="number" step="0.1" value={form.loadedNorm} onChange={e => setForm(f => ({ ...f, loadedNorm: e.target.value }))} placeholder="VD: 35" />
            </div>
            <div className="field">
              <label>Định mức xe không (lit/100km)</label>
              <input className="input" type="number" step="0.1" value={form.emptyNorm} onChange={e => setForm(f => ({ ...f, emptyNorm: e.target.value }))} placeholder="VD: 22" />
            </div>
          </div>
          <div className="row-2">
            <div className="field">
              <label>Bổ sung thêm (lit)</label>
              <input className="input" type="number" step="0.1" value={form.supplement} onChange={e => setForm(f => ({ ...f, supplement: e.target.value }))} placeholder="VD: 3" />
              <p className="field-help">Số lít bổ sung thêm cho mỗi chuyến</p>
            </div>
            <div className="field">
              <label>Đơn giá nhiên liệu (VND/lit)</label>
              <input className="input" type="number" value={form.unitPrice} onChange={e => setForm(f => ({ ...f, unitPrice: e.target.value }))} placeholder="VD: 23000" />
            </div>
          </div>
          <div style={{ marginTop: 8 }}>
            <button className="btn btn-primary" disabled={fuelSaving || !form.loadedNorm || !form.emptyNorm || !form.unitPrice} onClick={handleSave}>
              {fuelSaving ? <Loader2 size={14} className="spin" /> : <Save size={14} />}
              Lưu cấu hình
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Tab content router ──────────────────────────────────────────────────

  function renderTabContent() {
    if (loading) return (
      <div className="card-shell" style={{ padding: 40, textAlign: 'center', color: 'var(--fg-3)' }}>
        <Loader2 size={20} className="spin" style={{ display: 'inline-block' }} />
        <p style={{ marginTop: 8 }}>Đang tải...</p>
      </div>
    );
    if (error) return (
      <div className="card-shell" style={{ padding: 20, textAlign: 'center', color: 'var(--danger)' }}>
        {error}
        <button className="btn btn-sm btn-secondary" style={{ marginLeft: 12 }} onClick={() => fetchTabData(activeTab)}>Thử lại</button>
      </div>
    );
    switch (activeTab) {
      case 'customers': return renderCustomers();
      case 'trucks': return renderTrucks();
      case 'trailers': return renderTrailers();
      case 'routes': return renderRoutes();
      case 'cargoTypes': return renderCargoTypes();
      case 'pricingTables': return renderPricingTables();
      case 'roadAllowances': return renderRoadAllowances();
      case 'penaltyReasons': return renderPenaltyReasons();
      case 'drivers': return renderDrivers();
      case 'fuelConfig': return <FuelConfigForm />;
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Cấu hình hệ thống</h1>
          <p>Quản lý khách hàng, xe, tuyến đường, bảng giá và tham số</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 2, borderBottom: '1px solid var(--border-1)', marginBottom: 16, overflowX: 'auto' }}>
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button key={tab.key} onClick={() => switchTab(tab.key)} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 14px',
              fontSize: 13, fontWeight: isActive ? 600 : 500,
              color: isActive ? 'var(--brand)' : 'var(--fg-2)',
              background: 'transparent', border: 'none',
              borderBottom: isActive ? '2px solid var(--brand)' : '2px solid transparent',
              cursor: 'pointer', whiteSpace: 'nowrap',
              transition: 'color 120ms var(--ease), border-color 120ms var(--ease)',
            }}>
              <Icon size={14} /> {tab.label}
            </button>
          );
        })}
      </div>

      {renderTabContent()}
    </div>
  );
}
