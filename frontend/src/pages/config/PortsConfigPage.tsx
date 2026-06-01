import { useState } from 'react';
import { InlineForm } from '../../components/config/InlineForm';
import { FormActions } from '../../components/config/FormActions';
import { Field } from '../../components/config/Field';
import { CrudTable } from '../../components/config/CrudTable';
import type { Port } from '@nepocorp/shared';

function PortForm({ saving, item, onsave, oncancel }: {
  saving: boolean; item?: Port; onsave: (d: Record<string, unknown>) => void; oncancel: () => void;
}) {
  const [name, setName] = useState(item?.name || '');
  const [code, setCode] = useState(item?.code || '');
  const [address, setAddress] = useState(item?.address || '');
  const [city, setCity] = useState(item?.city || 'Hải Phòng');
  const [notes, setNotes] = useState(item?.notes || '');
  return (
    <InlineForm colSpan={5}>
      <div style={{ flex: 2, minWidth: 200 }}>
        <Field label="Tên cảng / bãi">
          <input
            className="input"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="VD: Cảng Hải Phòng, Bãi ICD Đình Vũ"
          />
        </Field>
      </div>
      <div style={{ flex: '0 0 100px' }}>
        <Field label="Mã cảng">
          <input
            className="input"
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            placeholder="VD: HPH"
            style={{ fontFamily: 'var(--font-mono)' }}
          />
        </Field>
      </div>
      <div style={{ flex: '0 0 130px' }}>
        <Field label="Thành phố">
          <input
            className="input"
            value={city}
            onChange={e => setCity(e.target.value)}
            placeholder="Hải Phòng"
          />
        </Field>
      </div>
      <div style={{ flex: 2, minWidth: 180 }}>
        <Field label="Địa chỉ">
          <input
            className="input"
            value={address}
            onChange={e => setAddress(e.target.value)}
            placeholder="Địa chỉ (tuỳ chọn)"
          />
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
            code: code.trim() || null,
            address: address.trim() || null,
            city: city.trim() || 'Hải Phòng',
            notes: notes.trim() || null,
          });
        }}
      />
    </InlineForm>
  );
}

export default function PortsConfigPage() {
  return (
    <CrudTable<Port>
      title="Cảng / Bãi tại Hải Phòng"
      description="Danh mục các cảng và bãi container tại khu vực Hải Phòng"
      endpoint="/ports"
      colSpan={5}
      columns={[
        {
          header: 'Tên cảng / bãi',
          render: (p) => <span style={{ fontWeight: 600, color: 'var(--fg-1)' }}>{p.name}</span>,
        },
        {
          header: 'Mã',
          render: (p) => (
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--brand)', fontWeight: 600 }}>
              {p.code || '—'}
            </span>
          ),
        },
        {
          header: 'Thành phố',
          render: (p) => <span style={{ color: 'var(--fg-2)' }}>{p.city || '—'}</span>,
        },
        {
          header: 'Địa chỉ',
          render: (p) => <span style={{ color: 'var(--fg-3)', fontSize: 13 }}>{p.address || '—'}</span>,
        },
      ]}
      renderForm={(p) => (
        <PortForm
          saving={p.saving}
          item={p.item}
          onsave={p.onSave}
          oncancel={p.onCancel}
        />
      )}
    />
  );
}
