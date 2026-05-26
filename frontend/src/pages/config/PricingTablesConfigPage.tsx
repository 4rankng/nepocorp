import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { api } from '../../lib/api';
import { formatCurrency } from '../../lib/format';
import { PageHeader, Panel } from '../../components/UI';
import { InlineForm, FormActions, ActionBtns } from '../../components/config';
import { useCRUD } from '../../hooks/useCRUD';
import type { PricingTable, Customer, Route as RouteType, PaginatedResponse } from '@nepocorp/shared';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="field"><label>{label}</label>{children}</div>;
}

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
  const navigate = useNavigate();
  const [pricingTables, setPricingTables] = useState<PricingTable[]>([]);
  const [customerMap, setCustomerMap] = useState<Map<number, string>>(new Map());
  const [routeMap, setRouteMap] = useState<Map<number, string>>(new Map());

  const refresh = useCallback(async () => {
    const [pt, cr, rr] = await Promise.all([
      api.get<PaginatedResponse<PricingTable>>('/pricing-tables'),
      api.get<PaginatedResponse<Customer>>('/customers'),
      api.get<PaginatedResponse<RouteType>>('/routes'),
    ]);
    setPricingTables(pt.items);
    const cm = new Map<number, string>();
    cr.items.forEach(c => cm.set(c.id, c.name));
    setCustomerMap(cm);
    const rm = new Map<number, string>();
    rr.items.forEach(rt => rm.set(rt.id, rt.name));
    setRouteMap(rm);
  }, []);

  const crud = useCRUD('/pricing-tables', refresh);
  useEffect(() => { refresh(); }, [refresh]);

  return (
    <div className="fade-up">
      <PageHeader title="Bảng giá cước" description="Đơn giá thỏa thuận theo Khách hàng × Tuyến đường" onBack={() => navigate('/config')} />
      <Panel flush>
        <div className="toolbar" style={{ borderBottom: 'none', padding: '16px 20px 8px' }}>
          <div style={{ flex: 1 }} />
          <button className="btn btn--primary btn--sm" onClick={() => crud.setShowAddForm(true)}><Plus size={14} /> Thêm mới</button>
        </div>
        <div className="table-scroll">
          <table className="tt-table">
            <thead><tr><th style={{ width: 40 }}>#</th><th>Khách hàng</th><th>Tuyến đường</th><th>Giá</th><th style={{ width: 100 }}>Thao tác</th></tr></thead>
            <tbody>
              {crud.showAddForm && !crud.editingId && <PricingForm saving={crud.saving} onsave={crud.doCreate} oncancel={crud.cancelForm} />}
              {pricingTables.length === 0 && !crud.showAddForm && <tr><td colSpan={5} style={{ textAlign: 'center', padding: 32, color: 'var(--fg-3)' }}>Chưa có dữ liệu</td></tr>}
              {pricingTables.map((pt, i) => crud.editingId === pt.id
                ? <PricingForm key={`edit-${pt.id}`} saving={crud.saving} item={pt} onsave={d => crud.doUpdate(pt.id, d)} oncancel={crud.cancelForm} />
                : <tr key={pt.id}>
                  <td className="num">{i + 1}</td>
                  <td>{customerMap.get(pt.customer_id) || '—'}</td>
                  <td>{routeMap.get(pt.route_id) || '—'}</td>
                  <td className="num" style={{ color: 'var(--fg-1)' }}>{formatCurrency(pt.price)}</td>
                  <td><ActionBtns id={pt.id} deleting={crud.deleting} onedit={() => crud.setEditingId(pt.id)} ondelete={() => crud.doDelete(pt.id)} /></td>
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
