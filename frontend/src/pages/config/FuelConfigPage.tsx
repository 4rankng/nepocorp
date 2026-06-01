import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, Loader2 } from 'lucide-react';
import { Clock, User } from 'lucide-react';
import { api } from '../../lib/api';
import { configClient } from '../../api/configClient';
import { PageHeader, Panel } from '../../components/UI';
import type { FuelConfig, FuelPriceHistory } from '@nepocorp/shared';

export default function FuelConfigPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    loadedNorm: '', emptyNorm: '', supplement: '', unitPrice: '',
    warningThreshold: '37', criticalThreshold: '40',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<FuelPriceHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

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
      }
    });
  }, []);

  useEffect(() => {
    configClient.getFuelPriceHistory().then(setHistory).catch(() => {}).finally(() => setHistoryLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await api.put('/fuel-config', {
        loadedNorm: Number(form.loadedNorm),
        emptyNorm: Number(form.emptyNorm),
        supplement: Number(form.supplement) || 0,
        unitPrice: Number(form.unitPrice),
        warningThreshold: form.warningThreshold ? Number(form.warningThreshold) : 37,
        criticalThreshold: form.criticalThreshold ? Number(form.criticalThreshold) : 40,
      });
      navigate('/config');
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
            <label>Đơn giá nhiên liệu hiện hành (đ/lít)</label>
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
          <button className="btn btn--primary" disabled={saving || !(Number(form.loadedNorm) > 0) || !(Number(form.emptyNorm) > 0) || !(Number(form.unitPrice) > 0)} onClick={handleSave}>
            {saving ? <Loader2 size={14} className="spin" /> : <Save size={14} />}
            Lưu cấu hình
          </button>
        </div>
        {error && <div style={{ textAlign: 'center', color: 'var(--danger)', marginTop: 12 }}>{error}</div>}
      </Panel>
      <Panel title="Lịch sử giá nhiên liệu" subtitle="Theo dõi các lần thay đổi đơn giá nhiên liệu" style={{ marginTop: 20 }}>
        {historyLoading ? (
          <div style={{ textAlign: 'center', padding: 20, color: 'var(--fg-3)' }}>Đang tải…</div>
        ) : history.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 20, color: 'var(--fg-3)', fontSize: 13 }}>Chưa có lịch sử thay đổi giá</div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Ngày hiệu lực</th>
                  <th className="num">Đơn giá (VNĐ/lít)</th>
                  <th>Người thay đổi</th>
                  <th>Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {history.map((row) => (
                  <tr key={row.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>{new Date(row.effectiveDate).toLocaleDateString('vi-VN')}</td>
                    <td className="num" style={{ fontWeight: 600 }}>{Number(row.unitPrice).toLocaleString('vi-VN')}</td>
                    <td style={{ color: 'var(--fg-3)' }}>—</td>
                    <td style={{ color: 'var(--fg-3)', fontSize: 12 }}>{row.note || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
