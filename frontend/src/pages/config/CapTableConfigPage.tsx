import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { api } from '../../lib/api';
import { PageHeader, Panel } from '../../components/UI';
import { InlineForm, FormActions, ActionBtns } from '../../components/config';
import { useCRUD } from '../../hooks/useCRUD';
import type { CapTableHistory, PaginatedResponse } from '@nepocorp/shared';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="field"><label>{label}</label>{children}</div>;
}

function CapTableForm({ saving, item, onsave, oncancel }: {
  saving: boolean; item?: CapTableHistory; onsave: (d: Record<string, unknown>) => void; oncancel: () => void;
}) {
  const [partnerName, setPartnerName] = useState(item?.partner_name || '');
  const [percentage, setPercentage] = useState(item?.percentage || '');
  const [effectiveDate, setEffectiveDate] = useState(item ? item.effective_date.split('T')[0] : '');
  return (
    <InlineForm colSpan={5}>
      <div style={{ flex: 2, minWidth: 180 }}>
        <Field label="Tên cổ đông"><input className="input" value={partnerName} onChange={e => setPartnerName(e.target.value)} placeholder="Nhập tên cổ đông..." /></Field>
      </div>
      <div style={{ flex: 1, minWidth: 100 }}>
        <Field label="Tỷ lệ cổ phần (%)"><input className="input" type="number" step="0.01" value={percentage} onChange={e => setPercentage(e.target.value)} placeholder="0.00" /></Field>
      </div>
      <div style={{ flex: 1.5, minWidth: 150 }}>
        <Field label="Ngày hiệu lực"><input className="input" type="date" value={effectiveDate} onChange={e => setEffectiveDate(e.target.value)} /></Field>
      </div>
      <FormActions saving={saving} isedit={!!item} oncancel={oncancel} onsave={() => {
        if (!partnerName.trim() || !percentage || !effectiveDate) return;
        onsave({ partner_name: partnerName.trim(), percentage: Number(percentage), effective_date: effectiveDate });
      }} />
    </InlineForm>
  );
}

export default function CapTableConfigPage() {
  const navigate = useNavigate();
  const [capTable, setCapTable] = useState<CapTableHistory[]>([]);

  const refresh = useCallback(async () => {
    const r = await api.get<PaginatedResponse<CapTableHistory>>('/cap-table');
    setCapTable(r.items || []);
  }, []);

  const crud = useCRUD('/cap-table', refresh);
  useEffect(() => { refresh(); }, [refresh]);

  return (
    <div className="fade-up">
      <PageHeader title="Tỷ lệ cổ phần (Cap Table)" description="Lịch sử tỷ lệ góp vốn cổ đông công ty" onBack={() => navigate('/config')} />
      <Panel flush>
        <div className="toolbar" style={{ borderBottom: 'none', padding: '16px 20px 8px' }}>
          <div style={{ flex: 1 }} />
          <button className="btn btn--primary btn--sm" onClick={() => crud.setShowAddForm(true)}><Plus size={14} /> Thêm mới</button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="tt-table">
            <thead><tr><th style={{ width: 40 }}>#</th><th>Tên cổ đông</th><th className="num">Tỷ lệ (%)</th><th>Ngày hiệu lực</th><th style={{ width: 100 }}>Thao tác</th></tr></thead>
            <tbody>
              {crud.showAddForm && !crud.editingId && <CapTableForm saving={crud.saving} onsave={crud.doCreate} oncancel={crud.cancelForm} />}
              {capTable.length === 0 && !crud.showAddForm && <tr><td colSpan={5} style={{ textAlign: 'center', padding: 32, color: 'var(--fg-3)' }}>Chưa có dữ liệu</td></tr>}
              {capTable.map((ct, i) => crud.editingId === ct.id
                ? <CapTableForm key={`edit-${ct.id}`} saving={crud.saving} item={ct} onsave={d => crud.doUpdate(ct.id, d)} oncancel={crud.cancelForm} />
                : <tr key={ct.id}>
                  <td className="num">{i + 1}</td>
                  <td style={{ fontWeight: 600, color: 'var(--fg-1)' }}>{ct.partner_name}</td>
                  <td className="num" style={{ fontWeight: 600, color: 'var(--brand)' }}>{Number(ct.percentage).toFixed(2)}%</td>
                  <td>{ct.effective_date ? new Date(ct.effective_date).toLocaleDateString('vi-VN') : '—'}</td>
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
