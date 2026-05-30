import { useState } from 'react';
import { InlineForm, FormActions, Field, CrudTable } from '../../components/config';
import type { CargoType } from '@nepocorp/shared';

function CargoTypeForm({ saving, item, onsave, oncancel }: {
  saving: boolean; item?: CargoType; onsave: (d: Record<string, unknown>) => void; oncancel: () => void;
}) {
  const [name, setName] = useState(item?.name || '');
  return (
    <InlineForm colSpan={3}>
      <div style={{ flex: 2, minWidth: 200 }}>
        <Field label="Tên loại hàng"><input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="VD: Cát, đá..." /></Field>
      </div>
      <FormActions saving={saving} isedit={!!item} oncancel={oncancel} onsave={() => { if (!name.trim()) return; onsave({ name: name.trim() }); }} />
    </InlineForm>
  );
}

export default function CargoTypesConfigPage() {
  return (
    <CrudTable<CargoType>
      title="Loại hàng hóa" description="Phân loại hàng hóa (Chè, nông sản, vỏ rỗng...)"
      endpoint="/cargo-types" colSpan={3}
      columns={[
        { header: 'Tên loại hàng', render: (ct) => <span style={{ fontWeight: 600, color: 'var(--fg-1)' }}>{ct.name}</span> },
      ]}
      renderForm={(p) => <CargoTypeForm saving={p.saving} item={p.item} onsave={p.onSave} oncancel={p.onCancel} />}
    />
  );
}
