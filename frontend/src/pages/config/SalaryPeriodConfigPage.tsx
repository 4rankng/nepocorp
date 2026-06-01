import { useState, useEffect } from 'react';
import { InlineForm } from '../../components/config/InlineForm';
import { FormActions } from '../../components/config/FormActions';
import { Field } from '../../components/config/Field';
import { CrudTable } from '../../components/config/CrudTable';
import { api } from '../../lib/api';

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

interface SalaryPeriodOverride {
  id: number;
  month: number;
  year: number;
  startDate: string;
  endDate: string;
  label: string | null;
}

function SalaryPeriodOverrideForm({ saving, item, onsave, oncancel }: {
  saving: boolean; item?: SalaryPeriodOverride; onsave: (d: Record<string, unknown>) => void; oncancel: () => void;
}) {
  const [month, setMonth] = useState(item?.month || new Date().getMonth() + 1);
  const [year, setYear] = useState(item?.year || new Date().getFullYear());
  const [startDate, setStartDate] = useState(item?.startDate || '');
  const [endDate, setEndDate] = useState(item?.endDate || '');
  const [label, setLabel] = useState(item?.label || '');

  return (
    <InlineForm colSpan={6}>
      <div style={{ display: 'flex', gap: 12, minWidth: 520, flexWrap: 'wrap' }}>
        <Field label="Tháng">
          <select className="input" value={month} onChange={e => setMonth(Number(e.target.value))}>
            {MONTHS.map(m => <option key={m} value={m}>Tháng {m}</option>)}
          </select>
        </Field>
        <Field label="Năm">
          <input className="input" type="number" value={year} onChange={e => setYear(Number(e.target.value))} style={{ width: 100 }} />
        </Field>
        <Field label="Ngày bắt đầu">
          <input className="input" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ width: 160 }} />
        </Field>
        <Field label="Ngày kết thúc">
          <input className="input" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ width: 160 }} />
        </Field>
        <Field label="Ghi chú">
          <input className="input" value={label} onChange={e => setLabel(e.target.value)} placeholder="VD: Kỳ Tết" style={{ width: 140 }} />
        </Field>
      </div>
      <FormActions saving={saving} isedit={!!item} oncancel={oncancel} onsave={() => {
        if (!startDate || !endDate) return;
        onsave({ month, year, startDate: startDate, endDate: endDate, label: label || undefined });
      }} />
    </InlineForm>
  );
}

export default function SalaryPeriodConfigPage() {
  const [defaultConfig, setDefaultConfig] = useState<{ defaultStartDay: number; defaultEndDay: number } | null>(null);
  const [startDay, setStartDay] = useState(26);
  const [endDay, setEndDay] = useState(25);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get<{ defaultStartDay: number; defaultEndDay: number } | null>('/salary-periods/default').then(row => {
      if (row) {
        setDefaultConfig(row);
        setStartDay(row.defaultStartDay ?? 26);
        setEndDay(row.defaultEndDay ?? 25);
      }
    }).catch(() => {});
  }, []);

  async function saveDefault() {
    setSaving(true);
    try {
      const result = await api.put<{ defaultStartDay: number; defaultEndDay: number }>('/salary-periods/default', { defaultStartDay: startDay, defaultEndDay: endDay });
      setDefaultConfig(result);
    } finally {
      setSaving(false);
    }
  }

  const daysInMonth = Array.from({ length: 31 }, (_, i) => i + 1);
  const startDays = daysInMonth.filter(d => d <= 28); // start day max 28 to avoid month-length issues

  return (
    <div className="fade-up" style={{ maxWidth: 960 }}>
      {/* Global Default */}
      <div style={{ marginBottom: 32, padding: 20, border: '1px solid var(--border-2)', borderRadius: 10, background: 'var(--bg-0)' }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4, color: 'var(--fg-1)' }}>Quy tắc mặc định</h3>
        <p style={{ fontSize: 13, color: 'var(--fg-3)', marginBottom: 16 }}>
          Kỳ lương mặc định cho tất cả các tháng. Ví dụ: ngày 26 tháng trước đến ngày 25 tháng này = kỳ lương tháng hiện tại.
        </p>
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <Field label="Ngày bắt đầu (tháng trước)">
            <select className="input" value={startDay} onChange={e => setStartDay(Number(e.target.value))} style={{ width: 100 }}>
              {startDays.map(d => <option key={d} value={d}>Ngày {d}</option>)}
            </select>
          </Field>
          <Field label="Ngày kết thúc (tháng này)">
            <select className="input" value={endDay} onChange={e => setEndDay(Number(e.target.value))} style={{ width: 100 }}>
              {daysInMonth.map(d => <option key={d} value={d}>Ngày {d}</option>)}
            </select>
          </Field>
          <button className="btn btn--primary" onClick={saveDefault} disabled={saving} style={{ height: 38 }}>
            {saving ? 'Đang lưu…' : 'Lưu mặc định'}
          </button>
        </div>
        {defaultConfig && (
          <p style={{ fontSize: 13, color: 'var(--brand)', marginTop: 12 }}>
            Hiện tại: Ngày {defaultConfig.defaultStartDay} tháng trước → Ngày {defaultConfig.defaultEndDay} tháng này
          </p>
        )}
      </div>

      {/* Per-month overrides */}
      <CrudTable<SalaryPeriodOverride>
        title="Ghi đè kỳ lương theo tháng"
        description="Thiết lập kỳ lương riêng cho tháng cần điều chỉnh (VD: Tết, cuối năm)"
        endpoint="/salary-periods"
        colSpan={6}
        columns={[
          { header: 'Tháng', render: (r) => <span style={{ fontWeight: 600 }}>Tháng {r.month}</span> },
          { header: 'Năm', render: (r) => r.year },
          { header: 'Ngày bắt đầu', render: (r) => r.startDate },
          { header: 'Ngày kết thúc', render: (r) => r.endDate },
          { header: 'Ghi chú', render: (r) => r.label || '—' },
        ]}
        renderForm={(p) => <SalaryPeriodOverrideForm saving={p.saving} item={p.item} onsave={p.onSave} oncancel={p.onCancel} />}
      />
    </div>
  );
}
