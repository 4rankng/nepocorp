import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { formatCurrency } from '../../lib/format';
import { InlineForm, FormActions, Field, CrudTable } from '../../components/config';
import type { RoadAllowance, Route as RouteType, PaginatedResponse } from '@nepocorp/shared';
import { TrailerType } from '@nepocorp/shared';

const TRAILER_TYPE_LABELS: Record<string, string> = {
  [TrailerType.FT20]: '20ft', [TrailerType.FT40]: '40ft',
};

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
  const [routeMap, setRouteMap] = useState<Map<number, string>>(new Map());
  useEffect(() => {
    api.get<PaginatedResponse<RouteType>>('/routes').then(r => {
      const rm = new Map<number, string>();
      r.items.forEach(rt => rm.set(rt.id, rt.name));
      setRouteMap(rm);
    });
  }, []);

  return (
    <CrudTable<RoadAllowance>
      title="Tiền đi đường" description="Định mức tiền dọc đường theo Tuyến × Loại rơ-moóc"
      endpoint="/road-allowances" colSpan={5}
      columns={[
        { header: 'Tuyến đường', render: (ra) => routeMap.get(ra.route_id) || '—' },
        { header: 'Loại rơ-moóc', render: (ra) => <span className="badge badge-outline">{TRAILER_TYPE_LABELS[ra.trailer_type] || ra.trailer_type}</span> },
        { header: 'Mức cơ bản', className: 'num', render: (ra) => <span style={{ color: 'var(--fg-1)' }}>{formatCurrency(ra.base_amount)}</span> },
      ]}
      renderForm={(p) => <RoadAllowanceForm saving={p.saving} item={p.item} onsave={p.onSave} oncancel={p.onCancel} />}
    />
  );
}
