import { useState } from 'react';
import { StatusPill } from '../../components/UI';
import { InlineForm, FormActions, Field, CrudTable } from '../../components/config';
import type { Truck } from '@nepocorp/shared';

const TRUCK_STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Hoạt động', MAINTENANCE: 'Bảo trì', INACTIVE: 'Ngưng',
};

function TruckForm({ saving, item, onsave, oncancel }: {
  saving: boolean; item?: Truck; onsave: (d: Record<string, unknown>) => void; oncancel: () => void;
}) {
  const [plate, setPlate] = useState(item?.licensePlate || '');
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
      <FormActions saving={saving} isedit={!!item} oncancel={oncancel} onsave={() => { if (!plate.trim()) return; onsave({ licensePlate: plate.trim(), status }); }} />
    </InlineForm>
  );
}

export default function TrucksConfigPage() {
  return (
    <CrudTable<Truck>
      title="Xe đầu kéo" description="Danh sách xe đầu kéo và trạng thái hoạt động"
      endpoint="/trucks" colSpan={4}
      columns={[
        { header: 'Biển số', render: (t) => <span style={{ fontWeight: 600, color: 'var(--fg-1)', fontFamily: 'var(--font-mono)' }}>{t.licensePlate}</span> },
        { header: 'Trạng thái', render: (t) => <StatusPill variant={t.status === 'ACTIVE' ? 'success' : t.status === 'MAINTENANCE' ? 'warn' : 'neutral'}>{TRUCK_STATUS_LABELS[t.status] || t.status}</StatusPill> },
      ]}
      renderForm={(p) => <TruckForm saving={p.saving} item={p.item} onsave={p.onSave} oncancel={p.onCancel} />}
    />
  );
}
