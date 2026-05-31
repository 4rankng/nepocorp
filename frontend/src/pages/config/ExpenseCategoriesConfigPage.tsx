import { useState } from 'react';
import { InlineForm } from '../../components/config/InlineForm';
import { FormActions } from '../../components/config/FormActions';
import { Field } from '../../components/config/Field';
import { CrudTable } from '../../components/config/CrudTable';
import type { ExpenseCategory } from '@nepocorp/shared';

function ExpenseCategoryForm({ saving, item, onsave, oncancel }: {
  saving: boolean; item?: ExpenseCategory; onsave: (d: Record<string, unknown>) => void; oncancel: () => void;
}) {
  const [name, setName] = useState(item?.name || '');
  const [isRenewable, setIsRenewable] = useState(item?.isRenewable ?? false);
  const [reminderLeadDays, setReminderLeadDays] = useState(item?.reminderLeadDays ?? 7);
  const [status, setStatus] = useState(item?.status || 'ACTIVE');

  return (
    <InlineForm colSpan={5}>
      <div style={{ flex: 2, minWidth: 180 }}>
        <Field label="Tên hạng mục">
          <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="VD: Bảo hiểm, Đăng kiểm..." />
        </Field>
      </div>
      <div style={{ flex: 1, minWidth: 100, display: 'flex', alignItems: 'flex-end', paddingBottom: 18 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
          <input type="checkbox" checked={isRenewable} onChange={e => setIsRenewable(e.target.checked)} />
          Định kỳ
        </label>
      </div>
      {isRenewable && (
        <div style={{ flex: 1, minWidth: 100 }}>
          <Field label="Nhắc trước (ngày)">
            <input className="input" type="number" min={0} value={reminderLeadDays} onChange={e => setReminderLeadDays(Number(e.target.value))} />
          </Field>
        </div>
      )}
      <div style={{ flex: 1, minWidth: 120 }}>
        <Field label="Trạng thái">
          <select className="input" value={status} onChange={e => setStatus(e.target.value)}>
            <option value="ACTIVE">Hoạt động</option>
            <option value="INACTIVE">Ngừng</option>
          </select>
        </Field>
      </div>
      <FormActions
        saving={saving}
        isedit={!!item}
        oncancel={oncancel}
        onsave={() => {
          if (!name.trim()) return;
          onsave({
            name: name.trim(),
            isRenewable,
            reminderLeadDays: isRenewable ? reminderLeadDays : 0,
            status,
          });
        }}
      />
    </InlineForm>
  );
}

export default function ExpenseCategoriesConfigPage() {
  return (
    <CrudTable<ExpenseCategory>
      title="Hạng mục chi phí"
      description="Phân loại chi phí vận hành — bật định kỳ để theo dõi gia hạn"
      endpoint="/expense-categories"
      colSpan={5}
      columns={[
        {
          header: 'Tên',
          render: (cat) => <span style={{ fontWeight: 600, color: 'var(--fg-1)' }}>{cat.name}</span>,
        },
        {
          header: 'Định kỳ',
          className: 'center',
          render: (cat) => (
            <span style={{
              display: 'inline-block',
              padding: '2px 10px',
              borderRadius: 10,
              fontSize: 11,
              fontWeight: 600,
              background: cat.isRenewable ? 'var(--success-soft, #ecfdf5)' : 'var(--bg-2)',
              color: cat.isRenewable ? 'var(--success)' : 'var(--fg-3)',
            }}>
              {cat.isRenewable ? 'Có' : 'Không'}
            </span>
          ),
        },
        {
          header: 'Nhắc trước',
          className: 'num',
          render: (cat) => cat.isRenewable ? `${cat.reminderLeadDays} ngày` : '—',
        },
        {
          header: 'Trạng thái',
          render: (cat) => (
            <span style={{
              display: 'inline-block',
              padding: '2px 10px',
              borderRadius: 10,
              fontSize: 11,
              fontWeight: 600,
              background: cat.status === 'ACTIVE' ? 'var(--success-soft, #ecfdf5)' : 'var(--bg-2)',
              color: cat.status === 'ACTIVE' ? 'var(--success)' : 'var(--fg-3)',
            }}>
              {cat.status === 'ACTIVE' ? 'Hoạt động' : 'Ngừng'}
            </span>
          ),
        },
      ]}
      renderForm={(p) => (
        <ExpenseCategoryForm
          saving={p.saving}
          item={p.item}
          onsave={p.onSave}
          oncancel={p.onCancel}
        />
      )}
    />
  );
}
