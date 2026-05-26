import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Loader2 } from 'lucide-react';
import { api } from '../../lib/api';
import { PageHeader, Panel } from '../../components/UI';
import { InlineForm, FormActions, ActionBtns } from '../../components/config';
import { useCRUD } from '../../hooks/useCRUD';
import type { CargoType, PaginatedResponse } from '@nepocorp/shared';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="field"><label>{label}</label>{children}</div>;
}

function CargoTypeForm({ saving, item, onsave, oncancel }: {
  saving: boolean; item?: CargoType; onsave: (d: Record<string, unknown>) => void; oncancel: () => void;
}) {
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

export default function CargoTypesConfigPage() {
  const navigate = useNavigate();
  const [cargoTypes, setCargoTypes] = useState<CargoType[]>([]);

  const refresh = useCallback(async () => {
    const r = await api.get<PaginatedResponse<CargoType>>('/cargo-types');
    setCargoTypes(r.items);
  }, []);

  const crud = useCRUD('/cargo-types', refresh);
  useEffect(() => { refresh(); }, [refresh]);

  return (
    <div className="fade-up">
      <PageHeader title="Loại hàng hóa" description="Phân loại hàng hóa (Chè, nông sản, vỏ rỗng...)" onBack={() => navigate('/config')} />
      <Panel flush>
        <div className="toolbar" style={{ borderBottom: 'none', padding: '16px 20px 8px' }}>
          <div style={{ flex: 1 }} />
          <button className="btn btn--primary btn--sm" onClick={() => crud.setShowAddForm(true)}><Plus size={14} /> Thêm mới</button>
        </div>
        <div className="table-scroll">
          <table className="tt-table">
            <thead><tr><th style={{ width: 40 }}>#</th><th>Tên loại hàng</th><th style={{ width: 100 }}>Thao tác</th></tr></thead>
            <tbody>
              {crud.showAddForm && !crud.editingId && <CargoTypeForm saving={crud.saving} onsave={crud.doCreate} oncancel={crud.cancelForm} />}
              {cargoTypes.length === 0 && !crud.showAddForm && <tr><td colSpan={3} style={{ textAlign: 'center', padding: 32, color: 'var(--fg-3)' }}>Chưa có dữ liệu</td></tr>}
              {cargoTypes.map((ct, i) => crud.editingId === ct.id
                ? <CargoTypeForm key={`edit-${ct.id}`} saving={crud.saving} item={ct} onsave={d => crud.doUpdate(ct.id, d)} oncancel={crud.cancelForm} />
                : <tr key={ct.id}>
                  <td className="num">{i + 1}</td>
                  <td style={{ fontWeight: 600, color: 'var(--fg-1)' }}>{ct.name}</td>
                  <td><ActionBtns id={ct.id} deleting={crud.deleting} onedit={() => crud.setEditingId(ct.id)} ondelete={() => crud.doDelete(ct.id)} /></td>
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
