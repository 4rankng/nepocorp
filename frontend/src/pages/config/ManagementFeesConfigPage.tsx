import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { api } from '../../lib/api';
import { formatCurrency } from '../../lib/format';
import { PageHeader, Panel } from '../../components/UI';
import { InlineForm, FormActions, ActionBtns } from '../../components/config';
import { useCRUD } from '../../hooks/useCRUD';
import type { ManagementFee, PaginatedResponse } from '@nepocorp/shared';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="field"><label>{label}</label>{children}</div>;
}

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

function ManagementFeeForm({ saving, item, onsave, oncancel }: {
  saving: boolean; item?: ManagementFee; onsave: (d: Record<string, unknown>) => void; oncancel: () => void;
}) {
  const [month, setMonth] = useState(item?.month || new Date().getMonth() + 1);
  const [year, setYear] = useState(item?.year || new Date().getFullYear());
  const [amount, setAmount] = useState(item?.amount || '');
  return (
    <InlineForm colSpan={4}>
      <div style={{ display: 'flex', gap: 12, minWidth: 320 }}>
        <Field label="Tháng">
          <select className="input" value={month} onChange={e => setMonth(Number(e.target.value))}>
            {MONTHS.map(m => <option key={m} value={m}>Tháng {m}</option>)}
          </select>
        </Field>
        <Field label="Năm"><input className="input" type="number" value={year} onChange={e => setYear(Number(e.target.value))} style={{ width: 100 }} /></Field>
        <Field label="Số tiền (VNĐ)"><input className="input" type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="VD: 24000000" style={{ width: 160 }} /></Field>
      </div>
      <FormActions saving={saving} isedit={!!item} oncancel={oncancel} onsave={() => {
        if (!amount || Number(amount) <= 0) return;
        onsave({ month, year, amount: Number(amount) });
      }} />
    </InlineForm>
  );
}

export default function ManagementFeesConfigPage() {
  const navigate = useNavigate();
  const [fees, setFees] = useState<ManagementFee[]>([]);

  const refresh = useCallback(async () => {
    const r = await api.get<PaginatedResponse<ManagementFee>>('/management-fees');
    setFees(r.items);
  }, []);

  const crud = useCRUD('/management-fees', refresh);
  useEffect(() => { refresh(); }, [refresh]);

  return (
    <div className="fade-up">
      <PageHeader title="Phí quản lý" description="Cấu hình phí quản lý vận hành theo tháng/năm" onBack={() => navigate('/config')} />
      <Panel flush>
        <div className="toolbar" style={{ borderBottom: 'none', padding: '16px 20px 8px' }}>
          <div style={{ flex: 1 }} />
          <button className="btn btn--primary btn--sm" onClick={() => crud.setShowAddForm(true)}><Plus size={14} /> Thêm mới</button>
        </div>
        <div className="table-scroll">
          <table className="tt-table">
            <thead><tr><th style={{ width: 40 }}>#</th><th>Tháng</th><th>Năm</th><th>Số tiền</th><th style={{ width: 80 }}>Thao tác</th></tr></thead>
            <tbody>
              {crud.showAddForm && !crud.editingId && <ManagementFeeForm saving={crud.saving} onsave={crud.doCreate} oncancel={crud.cancelForm} />}
              {fees.length === 0 && !crud.showAddForm && <tr><td colSpan={5} style={{ textAlign: 'center', padding: 32, color: 'var(--fg-3)' }}>Chưa có dữ liệu</td></tr>}
              {fees.map((f, i) => crud.editingId === f.id
                ? <ManagementFeeForm key={`edit-${f.id}`} saving={crud.saving} item={f} onsave={d => crud.doUpdate(f.id, d)} oncancel={crud.cancelForm} />
                : <tr key={f.id}>
                  <td className="num">{i + 1}</td>
                  <td style={{ fontWeight: 600 }}>Tháng {f.month}</td>
                  <td>{f.year}</td>
                  <td className="num" style={{ fontWeight: 600, color: 'var(--fg-1)' }}>{formatCurrency(f.amount)}</td>
                  <td><ActionBtns id={f.id} deleting={crud.deleting} onedit={() => crud.setEditingId(f.id)} ondelete={() => {}} /></td>
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
