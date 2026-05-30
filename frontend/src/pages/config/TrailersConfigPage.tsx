import { useState } from 'react';
import { InlineForm, FormActions, Field, CrudTable } from '../../components/config';
import type { Trailer } from '@nepocorp/shared';
import { TrailerType } from '@nepocorp/shared';

const TRAILER_TYPE_LABELS: Record<string, string> = {
  [TrailerType.FT20]: '20ft', [TrailerType.FT40]: '40ft',
};

function TrailerForm({ saving, item, onsave, oncancel }: {
  saving: boolean; item?: Trailer; onsave: (d: Record<string, unknown>) => void; oncancel: () => void;
}) {
  const [plate, setPlate] = useState(item?.license_plate || '');
  const [type, setType] = useState<string>(item?.type || TrailerType.FT20);
  return (
    <InlineForm colSpan={4}>
      <div style={{ flex: 2, minWidth: 160 }}>
        <Field label="Biển số"><input className="input" value={plate} onChange={e => setPlate(e.target.value)} placeholder="VD: 51R-56789" /></Field>
      </div>
      <div style={{ flex: 1, minWidth: 120 }}>
        <Field label="Loại">
          <select className="input" value={type} onChange={e => setType(e.target.value as TrailerType)}>
            {Object.entries(TRAILER_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
      </div>
      <FormActions saving={saving} isedit={!!item} oncancel={oncancel} onsave={() => { if (!plate.trim()) return; onsave({ license_plate: plate.trim(), type: type as TrailerType }); }} />
    </InlineForm>
  );
}

export default function TrailersConfigPage() {
  return (
    <CrudTable<Trailer>
      title="Rơ-moóc" description="Danh mục rơ-moóc loại 20FT và 40FT"
      endpoint="/trailers" colSpan={4}
      columns={[
        { header: 'Biển số', render: (t) => <span style={{ fontWeight: 600, color: 'var(--fg-1)', fontFamily: 'var(--font-mono)' }}>{t.license_plate}</span> },
        { header: 'Loại', render: (t) => <span className="badge badge-outline">{TRAILER_TYPE_LABELS[t.type] || t.type}</span> },
      ]}
      renderForm={(p) => <TrailerForm saving={p.saving} item={p.item} onsave={p.onSave} oncancel={p.onCancel} />}
    />
  );
}
