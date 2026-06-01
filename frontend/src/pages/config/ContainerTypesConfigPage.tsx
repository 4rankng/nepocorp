import { useState } from 'react';
import { InlineForm } from '../../components/config/InlineForm';
import { FormActions } from '../../components/config/FormActions';
import { Field } from '../../components/config/Field';
import { CrudTable } from '../../components/config/CrudTable';
import type { ContainerType } from '@nepocorp/shared';

function ContainerTypeForm({ saving, item, onsave, oncancel }: {
  saving: boolean; item?: ContainerType; onsave: (d: Record<string, unknown>) => void; oncancel: () => void;
}) {
  const [code, setCode] = useState(item?.code || '');
  const [name, setName] = useState(item?.name || '');
  const [notes, setNotes] = useState(item?.notes || '');
  return (
    <InlineForm colSpan={4}>
      <div style={{ flex: '0 0 140px' }}>
        <Field label="Mã loại">
          <input
            className="input"
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            placeholder="VD: 20DC, 40HC"
            style={{ fontFamily: 'var(--font-mono)' }}
          />
        </Field>
      </div>
      <div style={{ flex: 1, minWidth: 160 }}>
        <Field label="Tên hiển thị">
          <input
            className="input"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="VD: 20'DC, 40'HC"
          />
        </Field>
      </div>
      <div style={{ flex: 2, minWidth: 200 }}>
        <Field label="Ghi chú">
          <input
            className="input"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Mô tả thêm (tuỳ chọn)"
          />
        </Field>
      </div>
      <FormActions
        saving={saving}
        isedit={!!item}
        oncancel={oncancel}
        onsave={() => {
          if (!code.trim() || !name.trim()) return;
          onsave({ code: code.trim(), name: name.trim(), notes: notes.trim() || null });
        }}
      />
    </InlineForm>
  );
}

export default function ContainerTypesConfigPage() {
  return (
    <CrudTable<ContainerType>
      title="Loại container"
      description="Danh mục các loại container: 20'DC, 20'OT, 20'RF, 40'DC, 40'HC…"
      endpoint="/container-types"
      colSpan={4}
      columns={[
        {
          header: 'Mã loại',
          render: (ct) => (
            <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--brand)' }}>
              {ct.code}
            </span>
          ),
        },
        {
          header: 'Tên hiển thị',
          render: (ct) => <span style={{ fontWeight: 600, color: 'var(--fg-1)' }}>{ct.name}</span>,
        },
        {
          header: 'Ghi chú',
          render: (ct) => <span style={{ color: 'var(--fg-3)', fontSize: 13 }}>{ct.notes || '—'}</span>,
        },
      ]}
      renderForm={(p) => (
        <ContainerTypeForm
          saving={p.saving}
          item={p.item}
          onsave={p.onSave}
          oncancel={p.onCancel}
        />
      )}
    />
  );
}
