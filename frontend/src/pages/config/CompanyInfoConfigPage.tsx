import { useMemo, useState } from 'react';
import type { CompanyInfo } from '@tingting/shared';
import { useNavigate } from 'react-router-dom';
import { Loader2, Save } from 'lucide-react';
import { PageHeader, Panel } from '../../components/UI';
import { useCompanyInfo, useSaveCompanyInfo } from '../../hooks/useCatalogQueries';
import { usePageAnimations } from '../../hooks/animations';
import './config-page.css';

type CompanyInfoForm = {
  name: string;
  address: string;
  taxCode: string;
  representative: string;
  representativeTitle: string;
  bankAccount: string;
  bankName: string;
};

const EMPTY_FORM: CompanyInfoForm = {
  name: '',
  address: '',
  taxCode: '',
  representative: '',
  representativeTitle: '',
  bankAccount: '',
  bankName: '',
};

const FIELD_LABELS: Array<{ key: keyof CompanyInfoForm; label: string }> = [
  { key: 'name', label: 'Tên công ty' },
  { key: 'address', label: 'Địa chỉ' },
  { key: 'taxCode', label: 'Mã số thuế' },
  { key: 'representative', label: 'Đại diện bởi' },
  { key: 'representativeTitle', label: 'Chức vụ' },
  { key: 'bankAccount', label: 'Số tài khoản' },
  { key: 'bankName', label: 'Ngân hàng' },
];

export default function CompanyInfoConfigPage() {
  const navigate = useNavigate();
  const { rootRef } = usePageAnimations({ ready: true, selectors: ['.cfg-row', '.company-info-preview-row'] });
  const { data, isLoading } = useCompanyInfo();
  const saveCompanyInfo = useSaveCompanyInfo();
  const [form, setForm] = useState<CompanyInfoForm>(EMPTY_FORM);
  // Hydrate the form synchronously when `data` changes (render-time state sync)
  // rather than via useEffect, so inputs never flash EMPTY_FORM for a frame
  // between data arriving and the effect running. React supports a guarded
  // setState during render to "store info from the previous render".
  const [syncedData, setSyncedData] = useState<CompanyInfo | undefined>(undefined);
  if (data !== syncedData) {
    setSyncedData(data);
    setForm(
      data
        ? {
            name: data.name ?? '',
            address: data.address ?? '',
            taxCode: data.taxCode ?? '',
            representative: data.representative ?? '',
            representativeTitle: data.representativeTitle ?? '',
            bankAccount: data.bankAccount ?? '',
            bankName: data.bankName ?? '',
          }
        : EMPTY_FORM,
    );
  }
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSave = useMemo(
    () => FIELD_LABELS.every(({ key }) => form[key].trim().length > 0),
    [form],
  );

  const updateField = (key: keyof CompanyInfoForm, value: string) => {
    setForm(current => ({ ...current, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await saveCompanyInfo.mutateAsync({
        name: form.name.trim(),
        address: form.address.trim(),
        taxCode: form.taxCode.trim(),
        representative: form.representative.trim(),
        representativeTitle: form.representativeTitle.trim(),
        bankAccount: form.bankAccount.trim(),
        bankName: form.bankName.trim(),
      });
      navigate('/config');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lỗi lưu thông tin công ty');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div ref={rootRef} className="cfg-page cfg-page--company-info">
      <PageHeader
        title="Thông tin công ty"
        description="Hồ sơ pháp lý và tài khoản ngân hàng của Công ty TNHH NEPO"
        onBack={() => navigate('/config')}
        iconName="document"
      />

      <Panel
        title="Hồ sơ công ty"
        subtitle="Thông tin mặc định dùng cho các màn hình cấu hình và chứng từ nội bộ"
      >
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 24, color: 'var(--ink-3)' }}>Đang tải…</div>
        ) : (
          <>
            <div className="company-info-layout">
              <div className="company-info-form">
                <div className="cfg-form-grid cfg-row">
                  <div className="field">
                    <label>Tên công ty</label>
                    <input
                      className="input"
                      value={form.name}
                      onChange={e => updateField('name', e.target.value)}
                    />
                  </div>
                  <div className="field">
                    <label>Mã số thuế</label>
                    <input
                      className="input"
                      value={form.taxCode}
                      onChange={e => updateField('taxCode', e.target.value)}
                    />
                  </div>
                </div>

                <div className="field cfg-row">
                  <label>Địa chỉ</label>
                  <textarea
                    className="input"
                    rows={3}
                    value={form.address}
                    onChange={e => updateField('address', e.target.value)}
                  />
                </div>

                <div className="cfg-form-grid cfg-row" style={{ marginTop: 16 }}>
                  <div className="field">
                    <label>Đại diện bởi</label>
                    <input
                      className="input"
                      value={form.representative}
                      onChange={e => updateField('representative', e.target.value)}
                    />
                  </div>
                  <div className="field">
                    <label>Chức vụ</label>
                    <input
                      className="input"
                      value={form.representativeTitle}
                      onChange={e => updateField('representativeTitle', e.target.value)}
                    />
                  </div>
                </div>

                <div className="cfg-form-grid cfg-row">
                  <div className="field">
                    <label>Số tài khoản</label>
                    <input
                      className="input"
                      value={form.bankAccount}
                      onChange={e => updateField('bankAccount', e.target.value)}
                    />
                  </div>
                  <div className="field">
                    <label>Ngân hàng</label>
                    <textarea
                      className="input"
                      rows={2}
                      value={form.bankName}
                      onChange={e => updateField('bankName', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="company-info-preview" aria-label="Bảng thông tin công ty">
                {FIELD_LABELS.map(({ key, label }) => (
                  <div key={key} className="company-info-preview-row">
                    <span className="company-info-preview-row__label">{label}</span>
                    <span className="company-info-preview-row__value">{form[key] || '—'}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="cfg-form-actions">
              <button
                className="btn btn--primary"
                disabled={saving || !canSave}
                onClick={handleSave}
              >
                {saving ? <Loader2 size={14} className="spin" /> : <Save size={14} />}
                Lưu thông tin
              </button>
              {error && <span style={{ color: 'var(--danger)', fontSize: 13 }}>{error}</span>}
            </div>
          </>
        )}
      </Panel>
    </div>
  );
}
