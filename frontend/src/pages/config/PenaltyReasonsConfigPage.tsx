import { useState } from 'react';
import { formatCurrency } from '../../lib/format';
import { InlineForm, FormActions, Field, CrudTable } from '../../components/config';
import type { PenaltyReason } from '@nepocorp/shared';

function PenaltyReasonForm({ saving, item, onsave, oncancel, existingReasons }: {
  saving: boolean; item?: PenaltyReason; onsave: (d: Record<string, unknown>) => void; oncancel: () => void;
  existingReasons: PenaltyReason[];
}) {
  const [reason, setReason] = useState(item?.reason_text || '');
  const [amount, setAmount] = useState(item?.default_amount || '');
  const isDuplicate = reason.trim().length > 0 && existingReasons.some(r =>
    r.id !== item?.id &&
    r.reason_text.trim().toLowerCase() === reason.trim().toLowerCase()
  );
  return (
    <InlineForm colSpan={4}>
      <div style={{ flex: 3, minWidth: 200 }}>
        <Field label="Lý do phạt">
          <input className="input" value={reason} onChange={e => setReason(e.target.value)} placeholder="Mô tả lý do..."
            style={isDuplicate ? { borderColor: 'var(--danger)' } : undefined} />
          {isDuplicate && <span style={{ fontSize: 11, color: 'var(--danger)', marginTop: 2, display: 'block' }}>Lý do này đã tồn tại trong danh mục.</span>}
        </Field>
      </div>
      <div style={{ flex: 1, minWidth: 140 }}>
        <Field label="Mức mặc định (VNĐ)"><input className="input" type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" /></Field>
      </div>
      <FormActions saving={saving} isedit={!!item} oncancel={oncancel} onsave={() => { if (!reason.trim() || isDuplicate) return; onsave({ reason_text: reason.trim(), default_amount: Number(amount) || 0 }); }} />
    </InlineForm>
  );
}

export default function PenaltyReasonsConfigPage() {
  return (
    <CrudTable<PenaltyReason>
      title="Lý do phạt" description="Danh mục lỗi vi phạm tài xế và mức phạt mặc định"
      endpoint="/penalty-reasons" colSpan={4}
      columns={[
        { header: 'Lý do', render: (pr) => <span style={{ fontWeight: 600, color: 'var(--fg-1)' }}>{pr.reason_text}</span> },
        { header: 'Mức mặc định', className: 'num', render: (pr) => formatCurrency(pr.default_amount) },
      ]}
      renderForm={(p) => <PenaltyReasonForm saving={p.saving} item={p.item} onsave={p.onSave} oncancel={p.onCancel} existingReasons={p.items as PenaltyReason[]} />}
    />
  );
}
