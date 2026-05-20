import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { api } from '../../lib/api';
import { PageHeader, Panel, StatusPill } from '../../components/UI';
import { InlineForm, FormActions, ActionBtns } from '../../components/config';
import { useCRUD } from '../../hooks/useCRUD';
import type { Driver, Truck, PaginatedResponse } from '@nepocorp/shared';

const DRIVER_STATUS_LABELS: Record<string, string> = { ACTIVE: 'Hoạt động', INACTIVE: 'Ngưng' };

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="field"><label>{label}</label>{children}</div>;
}

function DriverForm({ saving, item, onsave, oncancel }: {
  saving: boolean; item?: Driver; onsave: (d: Record<string, unknown>) => void; oncancel: () => void;
}) {
  const [name, setName] = useState(item?.name || '');
  const [phone, setPhone] = useState(item?.phone || '');
  const [baseSalary, setBaseSalary] = useState(item?.base_salary || '');
  const [truckId, setTruckId] = useState(item?.assigned_truck_id || 0);
  const [status, setStatus] = useState(item?.status || 'ACTIVE');
  const [tl, setTl] = useState<Truck[]>([]);
  useEffect(() => { api.get<PaginatedResponse<Truck>>('/trucks').then(r => setTl(r.items)); }, []);
  return (
    <InlineForm colSpan={6}>
      <div style={{ flex: 2, minWidth: 150 }}>
        <Field label="Tên tài xế"><input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Họ và tên" /></Field>
      </div>
      <div style={{ flex: 1, minWidth: 130 }}>
        <Field label="SĐT"><input className="input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="0912..." /></Field>
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

export default function DriversConfigPage() {
  const navigate = useNavigate();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [truckMap, setTruckMap] = useState<Map<number, string>>(new Map());

  const refresh = useCallback(async () => {
    const [d, t] = await Promise.all([
      api.get<{ items: Driver[]; total: number }>('/drivers'),
      api.get<PaginatedResponse<Truck>>('/trucks'),
    ]);
    setDrivers(d.items);
    const m = new Map<number, string>();
    t.items.forEach(tk => m.set(tk.id, tk.license_plate));
    setTruckMap(m);
  }, []);

  const crud = useCRUD('/drivers', refresh);
  useEffect(() => { refresh(); }, [refresh]);

  return (
    <div className="fade-up">
      <PageHeader title="Tài xế" description="Danh sách tài xế, lương cơ bản và xe phụ trách" onBack={() => navigate('/config')} />
      <Panel flush>
        <div className="toolbar" style={{ borderBottom: 'none', padding: '16px 20px 8px' }}>
          <div style={{ flex: 1 }} />
          <button className="btn btn--primary btn--sm" onClick={() => crud.setShowAddForm(true)}><Plus size={14} /> Thêm mới</button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="tt-table">
            <thead><tr><th style={{ width: 40 }}>#</th><th>Tên tài xế</th><th>SĐT</th><th>Xe phân công</th><th>Trạng thái</th><th style={{ width: 100 }}>Thao tác</th></tr></thead>
            <tbody>
              {crud.showAddForm && !crud.editingId && <DriverForm saving={crud.saving} onsave={crud.doCreate} oncancel={crud.cancelForm} />}
              {drivers.length === 0 && !crud.showAddForm && <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--fg-3)' }}>Chưa có dữ liệu</td></tr>}
              {drivers.map((d, i) => crud.editingId === d.id
                ? <DriverForm key={`edit-${d.id}`} saving={crud.saving} item={d} onsave={dd => crud.doUpdate(d.id, dd)} oncancel={crud.cancelForm} />
                : <tr key={d.id}>
                  <td className="num">{i + 1}</td>
                  <td style={{ fontWeight: 600, color: 'var(--fg-1)' }}>{d.name}</td>
                  <td>{d.phone || '—'}</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{d.assigned_truck_id ? (truckMap.get(d.assigned_truck_id) || '—') : '—'}</td>
                  <td><StatusPill variant={d.status === 'ACTIVE' ? 'success' : 'danger'}>{DRIVER_STATUS_LABELS[d.status] || d.status}</StatusPill></td>
                  <td><ActionBtns id={d.id} deleting={crud.deleting} onedit={() => crud.setEditingId(d.id)} ondelete={() => crud.doDelete(d.id)} /></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
      {crud.error && <div style={{ textAlign: 'center', color: 'var(--danger)', marginTop: 12 }}>{crud.error}</div>}
    </div>
  );
}
