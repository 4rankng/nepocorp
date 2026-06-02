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
  defaultMarkup?: boolean;
  billingLabel?: string | null;
  vatRate?: string | null;
}

function ExpenseTypeForm({ saving, item, onsave, oncancel, existingItems }: {
  saving: boolean; item?: ForwarderExpenseType; onsave: (d: Record<string, unknown>) => void; oncancel: () => void;
  existingItems: ForwarderExpenseType[];
}) {
  const [code, setCode] = useState(item?.code || '');
  const [name, setName] = useState(item?.name || '');
  const [defaultMarkup, setDefaultMarkup] = useState<boolean>(item?.defaultMarkup ?? false);
  const [billingLabel, setBillingLabel] = useState(item?.billingLabel || '');
  const [vatRate, setVatRate] = useState(item?.vatRate ? String(parseFloat(item.vatRate) * 100) : '8');
  const isDuplicate = code.trim().length > 0 && existingItems.some(t =>
    t.id !== item?.id &&
    t.code.trim().toUpperCase() === code.trim().toUpperCase()
  );
  return (
    <InlineForm colSpan={5}>
      <div style={{ flex: 1, minWidth: 120 }}>
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
      <div style={{ flex: 2, minWidth: 180 }}>
        <Field label="Tên tiếng Việt">
          <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Nâng hạ" />
        </Field>
      </div>
      <div style={{ flex: 2, minWidth: 180 }}>
        <Field label="Nhãn trên giấy báo nợ">
          <input className="input" value={billingLabel} onChange={e => setBillingLabel(e.target.value)} placeholder="(mặc định: dùng Tên)" />
        </Field>
      </div>
      <div style={{ flex: 1, minWidth: 110 }}>
        <Field label="VAT (%)">
          <input
            className="input"
            type="number"
            value={vatRate}
            onChange={e => setVatRate(e.target.value)}
            placeholder="8"
            min="0"
            max="100"
            step="0.1"
          />
        </Field>
      </div>
      <div style={{ flex: 1, minWidth: 140 }}>
        <Field label="Cho phép cộng lãi">
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, height: 38 }}>
            <input
              type="checkbox"
              checked={defaultMarkup}
              onChange={e => setDefaultMarkup(e.target.checked)}
            />
            <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>Bán ra ≠ Mua vào</span>
          </label>
        </Field>
      </div>
      <FormActions
        saving={saving}
        isedit={!!item}
        oncancel={oncancel}
        onsave={() => {
          if (!code.trim() || !name.trim() || isDuplicate) return;
          const rate = parseFloat(vatRate);
          onsave({
            code: code.trim().toUpperCase(),
            name: name.trim(),
            defaultMarkup,
            billingLabel: billingLabel.trim() || null,
            vatRate: isFinite(rate) ? (rate / 100).toFixed(3) : '0.080',
          });
        }}
      />
    </InlineForm>
  );
}

function formatPercent(rate?: string | null): string {
  if (rate == null) return '—';
  const n = parseFloat(rate);
  if (!isFinite(n)) return '—';
  return `${(n * 100).toFixed(1).replace(/\.0$/, '')}%`;
}

export default function ForwarderExpenseTypesConfigPage() {
  return (
    <CrudTable<ForwarderExpenseType>
      title="Loại chi phí giao nhận"
      description="Danh mục các loại chi phí phát sinh do nhân viên giao nhận nhập (nâng hạ, hải quan, cân xe…)"
      endpoint="/forwarder-expense-types"
      colSpan={5}
      columns={[
        {
          header: 'Mã',
          render: (t) => <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--fg-1)' }}>{t.code}</span>,
        },
        {
          header: 'Tên',
          render: (t) => <span style={{ fontWeight: 500 }}>{t.name}</span>,
        },
        {
          header: 'Nhãn trên giấy báo nợ',
          render: (t) => <span style={{ color: t.billingLabel ? 'var(--fg-1)' : 'var(--fg-3)' }}>{t.billingLabel || '— (dùng Tên)'}</span>,
        },
        {
          header: 'VAT',
          render: (t) => <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatPercent(t.vatRate)}</span>,
        },
        {
          header: 'Cộng lãi',
          render: (t) => (
            <span style={{
              fontSize: 11, fontWeight: 600,
              padding: '2px 8px', borderRadius: 4,
              background: t.defaultMarkup ? 'rgba(0,177,79,0.1)' : 'rgba(120,120,120,0.1)',
              color: t.defaultMarkup ? 'var(--brand)' : 'var(--fg-3)',
            }}>
              {t.defaultMarkup ? 'Có' : 'Giữ giá gốc'}
            </span>
          ),
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
