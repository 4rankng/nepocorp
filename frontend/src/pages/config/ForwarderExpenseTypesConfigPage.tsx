import { useState } from 'react';
import { InlineForm } from '../../components/config/InlineForm';
import { FormActions } from '../../components/config/FormActions';
import { Field } from '../../components/config/Field';
import { CrudTable } from '../../components/config/CrudTable';

interface ForwarderExpenseType {
  id: number;
  code: string;
  name: string;
  status: string;
}

function ExpenseTypeForm({ saving, item, onsave, oncancel, existingItems }: {
  saving: boolean; item?: ForwarderExpenseType; onsave: (d: Record<string, unknown>) => void; oncancel: () => void;
  existingItems: ForwarderExpenseType[];
}) {
  const [code, setCode] = useState(item?.code || '');
  const [name, setName] = useState(item?.name || '');
  const isDuplicate = code.trim().length > 0 && existingItems.some(t =>
    t.id !== item?.id &&
    t.code.trim().toUpperCase() === code.trim().toUpperCase()
  );
  return (
    <InlineForm colSpan={3}>
      <div style={{ flex: 1, minWidth: 140 }}>
        <Field label="Mã (code)">
          <input
            className="input"
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            placeholder="LIFTING"
            style={{ fontFamily: 'var(--font-mono)', ...(isDuplicate ? { borderColor: 'var(--danger)' } : {}) }}
            disabled={!!item}
          />
          {isDuplicate && <span style={{ fontSize: 11, color: 'var(--danger)', marginTop: 2, display: 'block' }}>Mã này đã tồn tại.</span>}
        </Field>
      </div>
      <div style={{ flex: 2, minWidth: 200 }}>
        <Field label="Tên tiếng Việt">
          <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Nâng hạ" />
        </Field>
      </div>
      <FormActions
        saving={saving}
        isedit={!!item}
        oncancel={oncancel}
        onsave={() => {
          if (!code.trim() || !name.trim() || isDuplicate) return;
          onsave({ code: code.trim().toUpperCase(), name: name.trim() });
        }}
      />
    </InlineForm>
  );
}

export default function ForwarderExpenseTypesConfigPage() {
  return (
    <CrudTable<ForwarderExpenseType>
      title="Loại chi phí giao nhận"
      description="Danh mục các loại chi phí phát sinh do nhân viên giao nhận nhập (nâng hạ, hải quan, cân xe…)"
      endpoint="/forwarder-expense-types"
      colSpan={3}
      columns={[
        {
          header: 'Mã',
          render: (t) => <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--fg-1)' }}>{t.code}</span>,
        },
        {
          header: 'Tên',
          render: (t) => <span style={{ fontWeight: 500 }}>{t.name}</span>,
        },
      ]}
      renderForm={(p) => (
        <ExpenseTypeForm
          saving={p.saving}
          item={p.item}
          onsave={p.onSave}
          oncancel={p.onCancel}
          existingItems={p.items as ForwarderExpenseType[]}
        />
      )}
    />
  );
}
