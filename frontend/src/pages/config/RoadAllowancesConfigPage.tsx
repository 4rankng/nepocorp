import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { api } from '../../lib/api';
import { formatCurrency } from '../../lib/format';
import { PageHeader, Panel } from '../../components/UI';
import { InlineForm, FormActions, ActionBtns } from '../../components/config';
import { useCRUD } from '../../hooks/useCRUD';
import type { RoadAllowance, Route as RouteType, PaginatedResponse } from '@nepocorp/shared';
import { TrailerType } from '@nepocorp/shared';

const TRAILER_TYPE_LABELS: Record<string, string> = {
  [TrailerType.FT20]: '20ft', [TrailerType.FT40]: '40ft',
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="field"><label>{label}</label>{children}</div>;
}

function RoadAllowanceForm({ saving, item, onsave, oncancel }: {
  saving: boolean; item?: RoadAllowance; onsave: (d: Record<string, unknown>) => void; oncancel: () => void;
}) {
  const [routeId, setRouteId] = useState(item?.route_id || 0);
  const [trailerType, setTrailerType] = useState(item?.trailer_type || TrailerType.FT20);
  const [baseAmount, setBaseAmount] = useState(item?.base_amount || '');
  const [rl, setRl] = useState<RouteType[]>([]);
  useEffect(() => { api.get<PaginatedResponse<RouteType>>('/routes').then(r => setRl(r.items)); }, []);
  return (
    <InlineForm colSpan={5}>
      <div style={{ flex: 2, minWidth: 180 }}>
        <Field label="Tuyến đường">
          <select className="input" value={routeId} onChange={e => setRouteId(Number(e.target.value))}>
            <option value={0}>-- Chọn --</option>
            {rl.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </Field>
      </div>
      <div style={{ flex: 1, minWidth: 120 }}>
        <Field label="Loại rơ-moóc">
          <select className="input" value={trailerType} onChange={e => setTrailerType(e.target.value as TrailerType)}>
            {Object.entries(TRAILER_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
      </div>
      <div style={{ flex: 1, minWidth: 120 }}>
        <Field label="Mức cơ bản (VNĐ)"><input className="input" type="number" value={baseAmount} onChange={e => setBaseAmount(e.target.value)} placeholder="0" /></Field>
      </div>
      <FormActions saving={saving} isedit={!!item} oncancel={oncancel} onsave={() => { if (!routeId || !baseAmount) return; onsave({ route_id: routeId, trailer_type: trailerType, base_amount: Number(baseAmount) }); }} />
    </InlineForm>
  );
}

export default function RoadAllowancesConfigPage() {
  const navigate = useNavigate();
  const [roadAllowances, setRoadAllowances] = useState<RoadAllowance[]>([]);
  const [routeMap, setRouteMap] = useState<Map<number, string>>(new Map());

  const refresh = useCallback(async () => {
    const [ra, rr] = await Promise.all([
      api.get<PaginatedResponse<RoadAllowance>>('/road-allowances'),
      api.get<PaginatedResponse<RouteType>>('/routes'),
    ]);
    setRoadAllowances(ra.items);
    const rm = new Map<number, string>();
    rr.items.forEach(rt => rm.set(rt.id, rt.name));
    setRouteMap(rm);
  }, []);

  const crud = useCRUD('/road-allowances', refresh);
  useEffect(() => { refresh(); }, [refresh]);

  return (
    <div className="fade-up">
      <PageHeader title="Tiền đi đường" description="Định mức tiền dọc đường theo Tuyến × Loại rơ-moóc" onBack={() => navigate('/config')} />
      <Panel flush>
        <div className="toolbar" style={{ borderBottom: 'none', padding: '16px 20px 8px' }}>
          <div style={{ flex: 1 }} />
          <button className="btn btn--primary btn--sm" onClick={() => crud.setShowAddForm(true)}><Plus size={14} /> Thêm mới</button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="tt-table">
            <thead><tr><th style={{ width: 40 }}>#</th><th>Tuyến đường</th><th>Loại rơ-moóc</th><th>Mức cơ bản</th><th style={{ width: 100 }}>Thao tác</th></tr></thead>
            <tbody>
              {crud.showAddForm && !crud.editingId && <RoadAllowanceForm saving={crud.saving} onsave={crud.doCreate} oncancel={crud.cancelForm} />}
              {roadAllowances.length === 0 && !crud.showAddForm && <tr><td colSpan={5} style={{ textAlign: 'center', padding: 32, color: 'var(--fg-3)' }}>Chưa có dữ liệu</td></tr>}
              {roadAllowances.map((ra, i) => crud.editingId === ra.id
                ? <RoadAllowanceForm key={`edit-${ra.id}`} saving={crud.saving} item={ra} onsave={d => crud.doUpdate(ra.id, d)} oncancel={crud.cancelForm} />
                : <tr key={ra.id}>
                  <td className="num">{i + 1}</td>
                  <td>{routeMap.get(ra.route_id) || '—'}</td>
                  <td><span className="badge badge-outline">{TRAILER_TYPE_LABELS[ra.trailer_type] || ra.trailer_type}</span></td>
                  <td className="num" style={{ color: 'var(--fg-1)' }}>{formatCurrency(ra.base_amount)}</td>
                  <td><ActionBtns id={ra.id} deleting={crud.deleting} onedit={() => crud.setEditingId(ra.id)} ondelete={() => crud.doDelete(ra.id)} /></td>
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
