import { useState, useEffect, useCallback } from 'react';
import { Truck, Container, UserCheck, Plus } from 'lucide-react';
import { api } from '../lib/api';
import { PageHeader, Panel, StatusPill } from '../components/UI';
import { InlineForm, FormActions, ActionBtns } from '../components/config';
import { useCRUD } from '../hooks/useCRUD';
import { TrailerType } from '@nepocorp/shared';
import type { Truck as TruckType, Trailer, Driver, PaginatedResponse } from '@nepocorp/shared';

// ─── Shared helpers ────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="field"><label>{label}</label>{children}</div>;
}

const TRUCK_STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Hoạt động', MAINTENANCE: 'Bảo trì', INACTIVE: 'Ngưng',
};
const DRIVER_STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Hoạt động', INACTIVE: 'Ngưng',
};
const TRAILER_TYPE_LABELS: Record<string, string> = {
  [TrailerType.FT20]: '20ft', [TrailerType.FT40]: '40ft',
};

// ─── Trucks tab ────────────────────────────────────────────────────────────────

function TruckForm({ saving, item, onsave, oncancel }: {
  saving: boolean; item?: TruckType; onsave: (d: Record<string, unknown>) => void; oncancel: () => void;
}) {
  const [plate, setPlate] = useState(item?.license_plate || '');
  const [status, setStatus] = useState(item?.status || 'ACTIVE');
  return (
    <InlineForm colSpan={4}>
      <div style={{ flex: 2, minWidth: 160 }}>
        <Field label="Biển số"><input className="input" value={plate} onChange={e => setPlate(e.target.value)} placeholder="VD: 51C-12345" /></Field>
      </div>
      <div style={{ flex: 1, minWidth: 140 }}>
        <Field label="Trạng thái">
          <select className="input" value={status} onChange={e => setStatus(e.target.value)}>
            {Object.entries(TRUCK_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
      </div>
      <FormActions saving={saving} isedit={!!item} oncancel={oncancel} onsave={() => { if (!plate.trim()) return; onsave({ license_plate: plate.trim(), status }); }} />
    </InlineForm>
  );
}

function TrucksTab() {
  const [trucks, setTrucks] = useState<TruckType[]>([]);
  const refresh = useCallback(async () => {
    const r = await api.get<PaginatedResponse<TruckType>>('/trucks');
    setTrucks(r.items);
  }, []);
  const crud = useCRUD('/trucks', refresh);
  useEffect(() => { refresh(); }, [refresh]);

  return (
    <Panel flush>
      <div className="toolbar" style={{ borderBottom: 'none', padding: '16px 20px 8px' }}>
        <div style={{ flex: 1 }} />
        <button className="btn btn--primary btn--sm" onClick={() => crud.setShowAddForm(true)}><Plus size={14} /> Thêm xe</button>
      </div>
      <div className="table-scroll">
        <table className="tt-table">
          <thead><tr><th style={{ width: 40 }}>#</th><th>Biển số</th><th>Trạng thái</th><th style={{ width: 100 }}>Thao tác</th></tr></thead>
          <tbody>
            {crud.showAddForm && !crud.editingId && <TruckForm saving={crud.saving} onsave={crud.doCreate} oncancel={crud.cancelForm} />}
            {trucks.length === 0 && !crud.showAddForm && <tr><td colSpan={4} style={{ textAlign: 'center', padding: 32, color: 'var(--fg-3)' }}>Chưa có dữ liệu</td></tr>}
            {trucks.map((t, i) => crud.editingId === t.id
              ? <TruckForm key={`edit-${t.id}`} saving={crud.saving} item={t} onsave={d => crud.doUpdate(t.id, d)} oncancel={crud.cancelForm} />
              : <tr key={t.id}>
                <td className="num">{i + 1}</td>
                <td style={{ fontWeight: 600, color: 'var(--fg-1)', fontFamily: 'var(--font-mono)' }}>{t.license_plate}</td>
                <td><StatusPill variant={t.status === 'ACTIVE' ? 'success' : t.status === 'MAINTENANCE' ? 'warn' : 'neutral'}>{TRUCK_STATUS_LABELS[t.status] || t.status}</StatusPill></td>
                <td><ActionBtns id={t.id} deleting={crud.deleting} onedit={() => crud.setEditingId(t.id)} ondelete={() => crud.doDelete(t.id)} /></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {crud.error && <div style={{ textAlign: 'center', color: 'var(--danger)', padding: '8px 20px' }}>{crud.error}</div>}
    </Panel>
  );
}

// ─── Trailers tab ──────────────────────────────────────────────────────────────

function TrailerForm({ saving, item, onsave, oncancel }: {
  saving: boolean; item?: Trailer; onsave: (d: Record<string, unknown>) => void; oncancel: () => void;
}) {
  const [plate, setPlate] = useState(item?.license_plate || '');
  const [type, setType] = useState<string>(item?.type || TrailerType.FT40);
  const [status, setStatus] = useState(item?.status || 'ACTIVE');
  return (
    <InlineForm colSpan={5}>
      <div style={{ flex: 2, minWidth: 160 }}>
        <Field label="Biển số"><input className="input" value={plate} onChange={e => setPlate(e.target.value)} placeholder="VD: 51R-56789" /></Field>
      </div>
      <div style={{ flex: 1, minWidth: 110 }}>
        <Field label="Loại">
          <select className="input" value={type} onChange={e => setType(e.target.value as TrailerType)}>
            {Object.entries(TRAILER_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
      </div>
      <div style={{ flex: 1, minWidth: 130 }}>
        <Field label="Trạng thái">
          <select className="input" value={status} onChange={e => setStatus(e.target.value)}>
            <option value="ACTIVE">Hoạt động</option>
            <option value="MAINTENANCE">Bảo trì</option>
            <option value="INACTIVE">Ngưng</option>
          </select>
        </Field>
      </div>
      <FormActions saving={saving} isedit={!!item} oncancel={oncancel} onsave={() => { if (!plate.trim()) return; onsave({ license_plate: plate.trim(), type: type as TrailerType, status }); }} />
    </InlineForm>
  );
}

function TrailersTab() {
  const [trailers, setTrailers] = useState<Trailer[]>([]);
  const refresh = useCallback(async () => {
    const r = await api.get<PaginatedResponse<Trailer>>('/trailers');
    setTrailers(r.items);
  }, []);
  const crud = useCRUD('/trailers', refresh);
  useEffect(() => { refresh(); }, [refresh]);

  return (
    <Panel flush>
      <div className="toolbar" style={{ borderBottom: 'none', padding: '16px 20px 8px' }}>
        <div style={{ flex: 1 }} />
        <button className="btn btn--primary btn--sm" onClick={() => crud.setShowAddForm(true)}><Plus size={14} /> Thêm rơ-moóc</button>
      </div>
      <div className="table-scroll">
        <table className="tt-table">
          <thead><tr><th style={{ width: 40 }}>#</th><th>Biển số</th><th>Loại</th><th>Trạng thái</th><th style={{ width: 100 }}>Thao tác</th></tr></thead>
          <tbody>
            {crud.showAddForm && !crud.editingId && <TrailerForm saving={crud.saving} onsave={crud.doCreate} oncancel={crud.cancelForm} />}
            {trailers.length === 0 && !crud.showAddForm && <tr><td colSpan={5} style={{ textAlign: 'center', padding: 32, color: 'var(--fg-3)' }}>Chưa có dữ liệu</td></tr>}
            {trailers.map((t, i) => crud.editingId === t.id
              ? <TrailerForm key={`edit-${t.id}`} saving={crud.saving} item={t} onsave={d => crud.doUpdate(t.id, d)} oncancel={crud.cancelForm} />
              : <tr key={t.id}>
                <td className="num">{i + 1}</td>
                <td style={{ fontWeight: 600, color: 'var(--fg-1)', fontFamily: 'var(--font-mono)' }}>{t.license_plate}</td>
                <td><span className="badge badge-outline">{TRAILER_TYPE_LABELS[t.type] || t.type}</span></td>
                <td><StatusPill variant={t.status === 'ACTIVE' ? 'success' : t.status === 'MAINTENANCE' ? 'warn' : 'neutral'}>{t.status === 'ACTIVE' ? 'Hoạt động' : t.status === 'MAINTENANCE' ? 'Bảo trì' : 'Ngưng'}</StatusPill></td>
                <td><ActionBtns id={t.id} deleting={crud.deleting} onedit={() => crud.setEditingId(t.id)} ondelete={() => crud.doDelete(t.id)} /></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {crud.error && <div style={{ textAlign: 'center', color: 'var(--danger)', padding: '8px 20px' }}>{crud.error}</div>}
    </Panel>
  );
}

// ─── Drivers tab ───────────────────────────────────────────────────────────────

function DriverForm({ saving, item, onsave, oncancel }: {
  saving: boolean; item?: Driver; onsave: (d: Record<string, unknown>) => void; oncancel: () => void;
}) {
  const [name, setName] = useState(item?.name || '');
  const [phone, setPhone] = useState(item?.phone || '');
  const [baseSalary, setBaseSalary] = useState<string | number>(item?.base_salary || '');
  const [truckId, setTruckId] = useState<number>(item?.assigned_truck_id || 0);
  const [status, setStatus] = useState(item?.status || 'ACTIVE');
  const [trucks, setTrucks] = useState<TruckType[]>([]);
  useEffect(() => { api.get<PaginatedResponse<TruckType>>('/trucks').then(r => setTrucks(r.items)); }, []);

  return (
    <InlineForm colSpan={6}>
      <div style={{ flex: 2, minWidth: 150 }}>
        <Field label="Tên tài xế"><input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Họ và tên" /></Field>
      </div>
      <div style={{ flex: 1, minWidth: 130 }}>
        <Field label="SĐT"><input className="input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="0912..." /></Field>
      </div>
      <div style={{ flex: 1, minWidth: 130 }}>
        <Field label="Lương CB (VNĐ)"><input className="input" type="number" value={baseSalary} onChange={e => setBaseSalary(e.target.value)} placeholder="0" /></Field>
      </div>
      <div style={{ flex: 1, minWidth: 140 }}>
        <Field label="Xe phân công">
          <select className="input" value={truckId} onChange={e => setTruckId(Number(e.target.value))}>
            <option value={0}>-- Chưa phân --</option>
            {trucks.filter(t => t.status === 'ACTIVE').map(t => <option key={t.id} value={t.id}>{t.license_plate}</option>)}
          </select>
        </Field>
      </div>
      <div style={{ flex: 1, minWidth: 120 }}>
        <Field label="Trạng thái">
          <select className="input" value={status} onChange={e => setStatus(e.target.value)}>
            {Object.entries(DRIVER_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
      </div>
      <FormActions saving={saving} isedit={!!item} oncancel={oncancel} onsave={() => {
        if (!name.trim()) return;
        onsave({ name: name.trim(), phone: phone.trim() || undefined, base_salary: baseSalary ? Number(baseSalary) : undefined, assigned_truck_id: truckId || null, status });
      }} />
    </InlineForm>
  );
}

function DriversTab() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [truckMap, setTruckMap] = useState<Map<number, string>>(new Map());

  const refresh = useCallback(async () => {
    const [d, t] = await Promise.all([
      api.get<{ items: Driver[]; total: number }>('/drivers'),
      api.get<PaginatedResponse<TruckType>>('/trucks'),
    ]);
    setDrivers(d.items);
    const m = new Map<number, string>();
    t.items.forEach(tk => m.set(tk.id, tk.license_plate));
    setTruckMap(m);
  }, []);

  const crud = useCRUD('/drivers', refresh);
  useEffect(() => { refresh(); }, [refresh]);

  return (
    <Panel flush>
      <div className="toolbar" style={{ borderBottom: 'none', padding: '16px 20px 8px' }}>
        <div style={{ flex: 1 }} />
        <button className="btn btn--primary btn--sm" onClick={() => crud.setShowAddForm(true)}><Plus size={14} /> Thêm tài xế</button>
      </div>
      <div className="table-scroll">
        <table className="tt-table">
          <thead>
            <tr>
              <th style={{ width: 40 }}>#</th>
              <th>Tên tài xế</th>
              <th>SĐT</th>
              <th>Xe phân công</th>
              <th>Lương CB</th>
              <th>Trạng thái</th>
              <th style={{ width: 100 }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {crud.showAddForm && !crud.editingId && <DriverForm saving={crud.saving} onsave={crud.doCreate} oncancel={crud.cancelForm} />}
            {drivers.length === 0 && !crud.showAddForm && <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--fg-3)' }}>Chưa có dữ liệu</td></tr>}
            {drivers.map((d, i) => crud.editingId === d.id
              ? <DriverForm key={`edit-${d.id}`} saving={crud.saving} item={d} onsave={dd => crud.doUpdate(d.id, dd)} oncancel={crud.cancelForm} />
              : <tr key={d.id}>
                <td className="num">{i + 1}</td>
                <td style={{ fontWeight: 600, color: 'var(--fg-1)' }}>{d.name}</td>
                <td>{d.phone || '—'}</td>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>
                  {d.assigned_truck_id ? (truckMap.get(d.assigned_truck_id) || '—') : <span style={{ color: 'var(--fg-3)' }}>Chưa phân</span>}
                </td>
                <td style={{ fontSize: 13 }}>
                  {d.base_salary ? Number(d.base_salary).toLocaleString('vi-VN') + ' ₫' : '—'}
                </td>
                <td><StatusPill variant={d.status === 'ACTIVE' ? 'success' : 'danger'}>{DRIVER_STATUS_LABELS[d.status] || d.status}</StatusPill></td>
                <td><ActionBtns id={d.id} deleting={crud.deleting} onedit={() => crud.setEditingId(d.id)} ondelete={() => crud.doDelete(d.id)} /></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {crud.error && <div style={{ textAlign: 'center', color: 'var(--danger)', padding: '8px 20px' }}>{crud.error}</div>}
    </Panel>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

type TabKey = 'trucks' | 'trailers' | 'drivers';

const TABS: { key: TabKey; label: string; icon: React.ElementType; desc: string }[] = [
  { key: 'trucks',   label: 'Xe đầu kéo', icon: Truck,     desc: 'Quản lý đầu kéo và trạng thái hoạt động' },
  { key: 'trailers', label: 'Rơ-moóc',    icon: Container, desc: 'Danh mục sơ mi rơ-moóc (20ft / 40ft)' },
  { key: 'drivers',  label: 'Tài xế',     icon: UserCheck, desc: 'Nhân sự lái xe, lương cơ bản và phân công xe' },
];

export default function FleetPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('trucks');
  const activeTabMeta = TABS.find(t => t.key === activeTab)!;

  return (
    <div className="fade-up">
      <PageHeader
        title="Đội xe & Nhân sự"
        description="Quản lý xe đầu kéo, rơ-moóc và tài xế"
      />

      {/* Tab bar */}
      <div style={{
        display: 'flex',
        gap: 4,
        marginBottom: 20,
        background: 'var(--bg-2)',
        borderRadius: 'var(--radius-lg)',
        padding: 4,
        border: '1px solid var(--border-1)',
        width: 'fit-content',
      }}>
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = tab.key === activeTab;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 18px',
                borderRadius: 'var(--radius-md)',
                border: 'none',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: isActive ? 600 : 400,
                background: isActive ? 'var(--bg-0)' : 'transparent',
                color: isActive ? 'var(--fg-1)' : 'var(--fg-3)',
                boxShadow: isActive ? 'var(--shadow-sm)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <Icon size={15} style={{ color: isActive ? 'var(--brand)' : 'var(--fg-3)' }} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Active tab description */}
      <p style={{ fontSize: 13, color: 'var(--fg-3)', marginBottom: 16, marginTop: -8 }}>
        {activeTabMeta.desc}
      </p>

      {/* Tab content */}
      {activeTab === 'trucks'   && <TrucksTab />}
      {activeTab === 'trailers' && <TrailersTab />}
      {activeTab === 'drivers'  && <DriversTab />}
    </div>
  );
}
