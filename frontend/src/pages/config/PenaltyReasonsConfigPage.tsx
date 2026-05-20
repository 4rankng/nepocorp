import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { api } from '../../lib/api';
import { formatCurrency } from '../../lib/format';
import { PageHeader, Panel } from '../../components/UI';
import { InlineForm, FormActions, ActionBtns } from '../../components/config';
import { useCRUD } from '../../hooks/useCRUD';
import type { PenaltyReason, PaginatedResponse } from '@nepocorp/shared';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="field"><label>{label}</label>{children}</div>;
}

function PenaltyReasonForm({ saving, item, onsave, oncancel }: {
  saving: boolean; item?: PenaltyReason; onsave: (d: Record<string, unknown>) => void; oncancel: () => void;
}) {
  const [reason, setReason] = useState(item?.reason_text || '');
  const [amount, setAmount] = useState(item?.default_amount || '');
  return (
    <InlineForm colSpan={4}>
      <div style={{ flex: 3, minWidth: 200 }}>
        <Field label="Lý do phạt"><input className="input" value={reason} onChange={e => setReason(e.target.value)} placeholder="Mô tả lý do..." /></Field>
      </div>
      <div style={{ flex: 1, minWidth: 140 }}>
        <Field label="Mức mặc định (VNĐ)"><input className="input" type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" /></Field>
      </div>
      <FormActions saving={saving} isedit={!!item} oncancel={oncancel} onsave={() => { if (!reason.trim()) return; onsave({ reason_text: reason.trim(), default_amount: Number(amount) || 0 }); }} />
    </InlineForm>
  );
}

export default function PenaltyReasonsConfigPage() {
  const navigate = useNavigate();
  const [penaltyReasons, setPenaltyReasons] = useState<PenaltyReason[]>([]);

  const refresh = useCallback(async () => {
    const r = await api.get<PaginatedResponse<PenaltyReason>>('/penalty-reasons');
    setPenaltyReasons(r.items);
  }, []);

  const crud = useCRUD('/penalty-reasons', refresh);
  useEffect(() => { refresh(); }, [refresh]);

  return (
    <div className="fade-up">
      <PageHeader title="Lý do phạt" description="Danh mục lỗi vi phạm tài xế và mức phạt mặc định" onBack={() => navigate('/config')} />
      <Panel flush>
        <div className="toolbar" style={{ borderBottom: 'none', padding: '16px 20px 8px' }}>
          <div style={{ flex: 1 }} />
          <button className="btn btn--primary btn--sm" onClick={() => crud.setShowAddForm(true)}><Plus size={14} /> Thêm mới</button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="tt-table">
            <thead><tr><th style={{ width: 40 }}>#</th><th>Lý do</th><th>Mức mặc định</th><th style={{ width: 100 }}>Thao tác</th></tr></thead>
            <tbody>
              {crud.showAddForm && !crud.editingId && <PenaltyReasonForm saving={crud.saving} onsave={crud.doCreate} oncancel={crud.cancelForm} />}
              {penaltyReasons.length === 0 && !crud.showAddForm && <tr><td colSpan={4} style={{ textAlign: 'center', padding: 32, color: 'var(--fg-3)' }}>Chưa có dữ liệu</td></tr>}
              {penaltyReasons.map((pr, i) => crud.editingId === pr.id
                ? <PenaltyReasonForm key={`edit-${pr.id}`} saving={crud.saving} item={pr} onsave={d => crud.doUpdate(pr.id, d)} oncancel={crud.cancelForm} />
                : <tr key={pr.id}>
                  <td className="num">{i + 1}</td>
                  <td style={{ fontWeight: 600, color: 'var(--fg-1)' }}>{pr.reason_text}</td>
                  <td className="num">{formatCurrency(pr.default_amount)}</td>
                  <td><ActionBtns id={pr.id} deleting={crud.deleting} onedit={() => crud.setEditingId(pr.id)} ondelete={() => crud.doDelete(pr.id)} /></td>
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
