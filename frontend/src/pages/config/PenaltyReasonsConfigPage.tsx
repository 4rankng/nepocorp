import { useState } from 'react';
import { formatCurrency } from '../../lib/format';
import { InlineForm } from '../../components/config/InlineForm';
import { FormActions } from '../../components/config/FormActions';
import { Field } from '../../components/config/Field';
import { CrudTable } from '../../components/config/CrudTable';
import type { PenaltyReason } from '@nepocorp/shared';

function PenaltyReasonForm({ saving, item, onsave, oncancel, existingReasons }: {
  saving: boolean; item?: PenaltyReason; onsave: (d: Record<string, unknown>) => void; oncancel: () => void;
  existingReasons: PenaltyReason[];
}) {
  const [reason, setReason] = useState(item?.reasonText || '');
  const [amount, setAmount] = useState(item?.defaultAmount || '');
  const isDuplicate = reason.trim().length > 0 && existingReasons.some(r =>
    r.id !== item?.id &&
    r.reasonText.trim().toLowerCase() === reason.trim().toLowerCase()
  );
  return (
    <InlineForm colSpan={4}>
      <div style={{ flex: 3, minWidth: 200 }}>
        <Field label="Lý do phạt">
          <input className="input" value={reason} onChange={e => setReason(e.target.value)} placeholder="Mô tả lý do…"
            style={isDuplicate ? { borderColor: 'var(--danger)' } : undefined} />
          {isDuplicate && <span style={{ fontSize: 11, color: 'var(--danger)', marginTop: 2, display: 'block' }}>Lý do này đã tồn tại trong danh mục.</span>}
        </Field>
      </div>
      <div style={{ flex: 1, minWidth: 140 }}>
        <Field label="Mức mặc định (đ)"><input className="input" type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" /></Field>
      </div>
      <FormActions saving={saving} isedit={!!item} oncancel={oncancel} onsave={() => { if (!reason.trim() || isDuplicate) return; onsave({ reasonText: reason.trim(), defaultAmount: Number(amount) || 0 }); }} />
    </InlineForm>
  );
}

export default function PenaltyReasonsConfigPage() {
  return (
    <CrudTable<PenaltyReason>
      title="Lý do phạt" description="Danh mục lỗi vi phạm tài xế và mức phạt mặc định"
      endpoint="/penalty-reasons" colSpan={4}
      columns={[
        { header: 'Lý do', render: (pr) => <span style={{ fontWeight: 600, color: 'var(--fg-1)' }}>{pr.reasonText}</span> },
        { header: 'Mức mặc định', className: 'num', render: (pr) => formatCurrency(pr.defaultAmount) },
      ]}
      renderForm={(p) => <PenaltyReasonForm saving={p.saving} item={p.item} onsave={p.onSave} oncancel={p.onCancel} existingReasons={p.items as PenaltyReason[]} />}
    />
  );
}
