import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { api } from '../../lib/api';
import { PageHeader, Panel, StatusPill } from '../../components/UI';
import { InlineForm, FormActions, ActionBtns } from '../../components/config';
import { useCRUD } from '../../hooks/useCRUD';
import type { Truck, PaginatedResponse } from '@nepocorp/shared';

const TRUCK_STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Hoạt động', MAINTENANCE: 'Bảo trì', INACTIVE: 'Ngưng',
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="field"><label>{label}</label>{children}</div>;
}

function TruckForm({ saving, item, onsave, oncancel }: {
  saving: boolean; item?: Truck; onsave: (d: Record<string, unknown>) => void; oncancel: () => void;
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

export default function TrucksConfigPage() {
  const navigate = useNavigate();
  const [trucks, setTrucks] = useState<Truck[]>([]);

  const refresh = useCallback(async () => {
    const r = await api.get<PaginatedResponse<Truck>>('/trucks');
    setTrucks(r.items);
  }, []);

  const crud = useCRUD('/trucks', refresh);
  useEffect(() => { refresh(); }, [refresh]);

  return (
    <div className="fade-up">
      <PageHeader title="Xe đầu kéo" description="Danh sách xe đầu kéo và trạng thái hoạt động" onBack={() => navigate('/config')} />
      <Panel flush>
        <div className="toolbar" style={{ borderBottom: 'none', padding: '16px 20px 8px' }}>
          <div style={{ flex: 1 }} />
          <button className="btn btn--primary btn--sm" onClick={() => crud.setShowAddForm(true)}><Plus size={14} /> Thêm mới</button>
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
      </Panel>
      {crud.error && <div style={{ textAlign: 'center', color: 'var(--danger)', marginTop: 12 }}>{crud.error}</div>}
    </div>
  );
}
