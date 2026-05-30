import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, Loader2 } from 'lucide-react';
import { api } from '../../lib/api';
import { PageHeader, Panel } from '../../components/UI';
import type { FuelConfig } from '@nepocorp/shared';

export default function FuelConfigPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    loadedNorm: '', emptyNorm: '', supplement: '', unitPrice: '',
    warningThreshold: '37', criticalThreshold: '40',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [init, setInit] = useState(false);

  useEffect(() => {
    api.get<FuelConfig | null>('/fuel-config').then(fc => {
      if (fc) {
        const f = fc as any;
        setForm({
          loadedNorm: f.loadedNorm ?? f.loaded_norm ?? '',
          emptyNorm: f.emptyNorm ?? f.empty_norm ?? '',
          supplement: f.supplement ?? '0',
          unitPrice: f.unitPrice ?? f.unit_price ?? '',
          warningThreshold: f.warningThreshold ?? f.warning_threshold ?? '37',
          criticalThreshold: f.criticalThreshold ?? f.critical_threshold ?? '40',
        });
        setInit(true);
      }
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/fuel-config', {
        loaded_norm: Number(form.loadedNorm),
        empty_norm: Number(form.emptyNorm),
        supplement: Number(form.supplement) || 0,
        unit_price: Number(form.unitPrice),
        warning_threshold: form.warningThreshold ? Number(form.warningThreshold) : 37,
        critical_threshold: form.criticalThreshold ? Number(form.criticalThreshold) : 40,
      });
    } catch (e: any) { setError(e?.message || 'Lỗi lưu'); } finally { setSaving(false); }
  };

  return (
    <div className="fade-up">
      <PageHeader title="Định mức dầu" description="Tham số định mức tiêu hao nhiên liệu & đơn giá dầu" onBack={() => navigate('/config')} />
      <Panel title="Cấu hình tính nhiên liệu" subtitle="Thông số dùng để tính toán chi phí nhiên liệu cho mỗi chuyến">
        <div className="row-2" style={{ marginBottom: 16 }}>
          <div className="field">
            <label>Định mức có tải (lít/100km)</label>
            <input className="input" type="number" step="0.1" value={form.loadedNorm} onChange={e => setForm(f => ({ ...f, loadedNorm: e.target.value }))} placeholder="VD: 35" />
          </div>
          <div className="field">
            <label>Định mức xe không (lít/100km)</label>
            <input className="input" type="number" step="0.1" value={form.emptyNorm} onChange={e => setForm(f => ({ ...f, emptyNorm: e.target.value }))} placeholder="VD: 22" />
          </div>
        </div>
        <div className="row-2" style={{ marginBottom: 16 }}>
          <div className="field">
            <label>Bổ sung mặc định (lít)</label>
            <input className="input" type="number" step="0.1" value={form.supplement} onChange={e => setForm(f => ({ ...f, supplement: e.target.value }))} placeholder="VD: 3" />
            <p style={{ fontSize: 11, color: 'var(--fg-3)', marginTop: 4 }}>Số lít bổ sung thêm mặc định cho mỗi chuyến</p>
          </div>
          <div className="field">
            <label>Đơn giá nhiên liệu hiện hành (VNĐ/lít)</label>
            <input className="input" type="number" value={form.unitPrice} onChange={e => setForm(f => ({ ...f, unitPrice: e.target.value }))} placeholder="VD: 23000" />
          </div>
        </div>

        {/* Threshold configuration */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 8, marginBottom: 16 }}>
          <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: 'var(--fg-1)' }}>Ngưỡng cảnh báo tiêu hao (TTBQ)</h4>
          <div className="row-2">
            <div className="field">
              <label>⚠️ Ngưỡng cảnh báo (lít/100km)</label>
              <input className="input" type="number" step="0.1" value={form.warningThreshold} onChange={e => setForm(f => ({ ...f, warningThreshold: e.target.value }))} placeholder="VD: 37" />
              <p style={{ fontSize: 11, color: 'var(--warning)', marginTop: 4 }}>TTBQ vượt ngưỡng này → cảnh báo vàng</p>
            </div>
            <div className="field">
              <label>🔴 Ngưỡng nghiêm trọng (lít/100km)</label>
              <input className="input" type="number" step="0.1" value={form.criticalThreshold} onChange={e => setForm(f => ({ ...f, criticalThreshold: e.target.value }))} placeholder="VD: 40" />
              <p style={{ fontSize: 11, color: 'var(--danger)', marginTop: 4 }}>TTBQ vượt ngưỡng này → cảnh báo đỏ</p>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 8 }}>
          <button className="btn btn--primary" disabled={saving || !form.loadedNorm || !form.emptyNorm || !form.unitPrice} onClick={handleSave}>
            {saving ? <Loader2 size={14} className="spin" /> : <Save size={14} />}
            Lưu cấu hình
          </button>
        </div>
        {error && <div style={{ textAlign: 'center', color: 'var(--danger)', marginTop: 12 }}>{error}</div>}
      </Panel>
    </div>
  );
}
