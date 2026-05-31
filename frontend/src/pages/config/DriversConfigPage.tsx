import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { StatusPill } from '../../components/UI';
import { InlineForm, FormActions, Field, CrudTable } from '../../components/config';
import type { Driver, Truck, PaginatedResponse } from '@nepocorp/shared';

const DRIVER_STATUS_LABELS: Record<string, string> = { ACTIVE: 'Hoạt động', INACTIVE: 'Ngưng' };

function DriverForm({ saving, item, onsave, oncancel }: {
  saving: boolean; item?: Driver; onsave: (d: Record<string, unknown>) => void; oncancel: () => void;
}) {
  const [name, setName] = useState(item?.name || '');
  const [phone, setPhone] = useState(item?.phone || '');
  const [baseSalary, setBaseSalary] = useState(item?.baseSalary || '');
  const [truckId, setTruckId] = useState(item?.assignedTruckId || 0);
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
            {tl.filter(t => t.status === 'ACTIVE').map(t => <option key={t.id} value={t.id}>{t.licensePlate}</option>)}
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
        onsave({ name: name.trim(), phone: phone.trim() || undefined, baseSalary: baseSalary ? Number(baseSalary) : undefined, assignedTruckId: truckId || null, status });
      }} />
    </InlineForm>
  );
}

export default function DriversConfigPage() {
  const [truckMap, setTruckMap] = useState<Map<number, string>>(new Map());
  useEffect(() => {
    api.get<PaginatedResponse<Truck>>('/trucks').then(r => {
      const m = new Map<number, string>();
      r.items.forEach(tk => m.set(tk.id, tk.licensePlate));
      setTruckMap(m);
    });
  }, []);

  return (
    <CrudTable<Driver>
      title="Tài xế" description="Danh sách tài xế, lương cơ bản và xe phụ trách"
      endpoint="/drivers" colSpan={6}
      columns={[
        { header: 'Tên tài xế', render: (d) => <span style={{ fontWeight: 600, color: 'var(--fg-1)' }}>{d.name}</span> },
        { header: 'SĐT', render: (d) => d.phone || '—' },
        { header: 'Xe phân công', render: (d) => <span style={{ fontFamily: 'var(--font-mono)' }}>{d.assignedTruckId ? (truckMap.get(d.assignedTruckId) || '—') : '—'}</span> },
        { header: 'Trạng thái', render: (d) => <StatusPill variant={d.status === 'ACTIVE' ? 'success' : 'danger'}>{DRIVER_STATUS_LABELS[d.status] || d.status}</StatusPill> },
      ]}
      renderForm={(p) => <DriverForm saving={p.saving} item={p.item} onsave={p.onSave} oncancel={p.onCancel} />}
    />
  );
}
