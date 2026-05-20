import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { api } from '../../lib/api';
import { PageHeader, Panel } from '../../components/UI';
import { InlineForm, FormActions, ActionBtns } from '../../components/config';
import { useCRUD } from '../../hooks/useCRUD';
import type { Trailer, PaginatedResponse } from '@nepocorp/shared';
import { TrailerType } from '@nepocorp/shared';

const TRAILER_TYPE_LABELS: Record<string, string> = {
  [TrailerType.FT20]: '20ft', [TrailerType.FT40]: '40ft',
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="field"><label>{label}</label>{children}</div>;
}

function TrailerForm({ saving, item, onsave, oncancel }: {
  saving: boolean; item?: Trailer; onsave: (d: Record<string, unknown>) => void; oncancel: () => void;
}) {
  const [plate, setPlate] = useState(item?.license_plate || '');
  const [type, setType] = useState<string>(item?.type || TrailerType.FT20);
  return (
    <InlineForm colSpan={4}>
      <div style={{ flex: 2, minWidth: 160 }}>
        <Field label="Biển số"><input className="input" value={plate} onChange={e => setPlate(e.target.value)} placeholder="VD: 51R-56789" /></Field>
      </div>
      <div style={{ flex: 1, minWidth: 120 }}>
        <Field label="Loại">
          <select className="input" value={type} onChange={e => setType(e.target.value as TrailerType)}>
            {Object.entries(TRAILER_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
      </div>
      <FormActions saving={saving} isedit={!!item} oncancel={oncancel} onsave={() => { if (!plate.trim()) return; onsave({ license_plate: plate.trim(), type: type as TrailerType }); }} />
    </InlineForm>
  );
}

export default function TrailersConfigPage() {
  const navigate = useNavigate();
  const [trailers, setTrailers] = useState<Trailer[]>([]);

  const refresh = useCallback(async () => {
    const r = await api.get<PaginatedResponse<Trailer>>('/trailers');
    setTrailers(r.items);
  }, []);

  const crud = useCRUD('/trailers', refresh);
  useEffect(() => { refresh(); }, [refresh]);

  return (
    <div className="fade-up">
      <PageHeader title="Rơ-moóc" description="Danh mục rơ-moóc loại 20FT và 40FT" onBack={() => navigate('/config')} />
      <Panel flush>
        <div className="toolbar" style={{ borderBottom: 'none', padding: '16px 20px 8px' }}>
          <div style={{ flex: 1 }} />
          <button className="btn btn--primary btn--sm" onClick={() => crud.setShowAddForm(true)}><Plus size={14} /> Thêm mới</button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="tt-table">
            <thead><tr><th style={{ width: 40 }}>#</th><th>Biển số</th><th>Loại</th><th style={{ width: 100 }}>Thao tác</th></tr></thead>
            <tbody>
              {crud.showAddForm && !crud.editingId && <TrailerForm saving={crud.saving} onsave={crud.doCreate} oncancel={crud.cancelForm} />}
              {trailers.length === 0 && !crud.showAddForm && <tr><td colSpan={4} style={{ textAlign: 'center', padding: 32, color: 'var(--fg-3)' }}>Chưa có dữ liệu</td></tr>}
              {trailers.map((t, i) => crud.editingId === t.id
                ? <TrailerForm key={`edit-${t.id}`} saving={crud.saving} item={t} onsave={d => crud.doUpdate(t.id, d)} oncancel={crud.cancelForm} />
                : <tr key={t.id}>
                  <td className="num">{i + 1}</td>
                  <td style={{ fontWeight: 600, color: 'var(--fg-1)', fontFamily: 'var(--font-mono)' }}>{t.license_plate}</td>
                  <td><span className="badge badge-outline">{TRAILER_TYPE_LABELS[t.type] || t.type}</span></td>
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
