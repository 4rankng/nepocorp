import { useState } from 'react';
import { formatCurrency } from '../../lib/format';
import { InlineForm } from '../../components/config/InlineForm';
import { FormActions } from '../../components/config/FormActions';
import { Field } from '../../components/config/Field';
import { CrudTable } from '../../components/config/CrudTable';
import type { ManagementFee } from '@tingting/shared';

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

function ManagementFeeForm({ saving, item, onsave, oncancel }: {
  saving: boolean; item?: ManagementFee; onsave: (d: Record<string, unknown>) => void; oncancel: () => void;
}) {
  const [month, setMonth] = useState(item?.month || new Date().getMonth() + 1);
  const [year, setYear] = useState(item?.year || new Date().getFullYear());
  const [amount, setAmount] = useState(item?.amount || '');
  return (
    <InlineForm colSpan={5}>
      <div style={{ display: 'flex', gap: 12, minWidth: 320 }}>
        <Field label="Tháng">
          <select className="input" value={month} onChange={e => setMonth(Number(e.target.value))}>
            {MONTHS.map(m => <option key={m} value={m}>Tháng {m}</option>)}
          </select>
        </Field>
        <Field label="Năm"><input className="input" type="number" value={year} onChange={e => setYear(Number(e.target.value))} style={{ width: 100 }} /></Field>
        <Field label="Số tiền (đ)"><input className="input" type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="VD: 24000000" style={{ width: 160 }} /></Field>
      </div>
      <FormActions saving={saving} isedit={!!item} oncancel={oncancel} onsave={() => {
        if (!amount || Number(amount) <= 0) return;
        onsave({ month, year, amount: Number(amount) });
      }} />
    </InlineForm>
  );
}

export default function ManagementFeesConfigPage() {
  return (
    <CrudTable<ManagementFee>
      title="Phí quản lý" description="Cấu hình phí quản lý vận hành theo tháng/năm — dùng cho báo cáo lãi lỗ"
      endpoint="/management-fees" colSpan={5}
      onDelete={() => {}}
      pageSlug="management-fees"
      emptyIllustration="empty-pie.svg"
      emptyTitle="Chưa có khoản phí"
      emptyHint="Thêm phí quản lý đầu tiên để tính vào báo cáo lãi lỗ."
      columns={[
        { header: 'Tháng', render: (f) => <span style={{ fontWeight: 600 }}>Tháng {f.month}</span> },
        { header: 'Năm', render: (f) => f.year },
        { header: 'Số tiền', className: 'num', render: (f) => <span style={{ fontWeight: 600, color: 'var(--fg-1)' }}>{formatCurrency(f.amount)}</span> },
      ]}
      renderForm={(p) => <ManagementFeeForm saving={p.saving} item={p.item} onsave={p.onSave} oncancel={p.onCancel} />}
    />
  );
}
