import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { formatCurrency } from '../../lib/format';
import { InlineForm, FormActions, Field, CrudTable } from '../../components/config';
import type { PricingTable, Customer, Route as RouteType, PaginatedResponse } from '@nepocorp/shared';

function PricingForm({ saving, item, onsave, oncancel }: {
  saving: boolean; item?: PricingTable; onsave: (d: Record<string, unknown>) => void; oncancel: () => void;
}) {
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
        <Field label="Khách hàng">
          <select className="input" value={customerId} onChange={e => setCustomerId(Number(e.target.value))}>
            <option value={0}>-- Chọn --</option>
            {cl.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
      </div>
      <div style={{ flex: 2, minWidth: 180 }}>
        <Field label="Tuyến đường">
          <select className="input" value={routeId} onChange={e => setRouteId(Number(e.target.value))}>
            <option value={0}>-- Chọn --</option>
            {rl.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </Field>
      </div>
      <div style={{ flex: 1, minWidth: 120 }}>
        <Field label="Giá (VNĐ)"><input className="input" type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="0" /></Field>
      </div>
      <FormActions saving={saving} isedit={!!item} oncancel={oncancel} onsave={() => { if (!customerId || !routeId || !price) return; onsave({ customer_id: customerId, route_id: routeId, price: Number(price) }); }} />
    </InlineForm>
  );
}

export default function PricingTablesConfigPage() {
  const [customerMap, setCustomerMap] = useState<Map<number, string>>(new Map());
  const [routeMap, setRouteMap] = useState<Map<number, string>>(new Map());
  useEffect(() => {
    api.get<PaginatedResponse<Customer>>('/customers').then(r => {
      const cm = new Map<number, string>();
      r.items.forEach(c => cm.set(c.id, c.name));
      setCustomerMap(cm);
    });
    api.get<PaginatedResponse<RouteType>>('/routes').then(r => {
      const rm = new Map<number, string>();
      r.items.forEach(rt => rm.set(rt.id, rt.name));
      setRouteMap(rm);
    });
  }, []);

  return (
    <CrudTable<PricingTable>
      title="Bảng giá cước" description="Đơn giá thỏa thuận theo Khách hàng × Tuyến đường"
      endpoint="/pricing-tables" colSpan={5}
      columns={[
        { header: 'Khách hàng', render: (pt) => customerMap.get(pt.customer_id) || '—' },
        { header: 'Tuyến đường', render: (pt) => routeMap.get(pt.route_id) || '—' },
        { header: 'Giá', className: 'num', render: (pt) => <span style={{ color: 'var(--fg-1)' }}>{formatCurrency(pt.price)}</span> },
      ]}
      renderForm={(p) => <PricingForm saving={p.saving} item={p.item} onsave={p.onSave} oncancel={p.onCancel} />}
    />
  );
}
