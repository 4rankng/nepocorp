import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Save, Loader2 } from 'lucide-react';
import { api } from '../../lib/api';
import { PageHeader, Panel } from '../../components/UI';
import type { RoadConfig } from '@nepocorp/shared';

export default function TripExpenseConfigPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    defaultDriverSalary: '400000',
    twoPointDeliveryBonus: '200000',
    vehicleShiftDefault: '200000',
    tollPerStation: '55000',
    returnCargoBonus: '300000',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<RoadConfig | null>('/road-config').then(rc => {
      if (rc) {
        setForm({
          defaultDriverSalary: rc.defaultDriverSalary ?? '400000',
          twoPointDeliveryBonus: rc.twoPointDeliveryBonus ?? '200000',
          vehicleShiftDefault: rc.vehicleShiftDefault ?? '200000',
          tollPerStation: rc.tollPerStation ?? '55000',
          returnCargoBonus: rc.returnCargoBonus ?? '300000',
        });
      }
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await api.put('/road-config', {
        tollPerStation: Number(form.tollPerStation),
        returnCargoBonus: Number(form.returnCargoBonus),
        defaultDriverSalary: Number(form.defaultDriverSalary),
        twoPointDeliveryBonus: Number(form.twoPointDeliveryBonus),
        vehicleShiftDefault: Number(form.vehicleShiftDefault),
      });
      queryClient.invalidateQueries({ queryKey: ['road-config'] });
      navigate('/config');
    } catch (e: any) { setError(e?.message || 'Lỗi lưu'); } finally { setSaving(false); }
  };

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }));

  const fmt = (v: string) => {
    const n = Number(v);
    return isNaN(n) ? '' : n.toLocaleString('vi-VN');
  };

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <PageHeader title="Cấu hình chi phí chuyến đi" onBack={() => navigate('/config')} />
      <Panel>
        <div style={{ padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: 'var(--fg-1)' }}>
            Mặc định toàn công ty
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div className="field">
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--fg-2)', marginBottom: 6 }}>
                Tiền kết hợp mặc định (đ)
              </label>
              <input className="input mono" type="text" value={form.defaultDriverSalary} onChange={set('defaultDriverSalary')} placeholder="400.000" />
              <div style={{ fontSize: 11, color: 'var(--fg-3)', marginTop: 4 }}>
                Áp dụng khi tuyến chưa set lương riêng. Hiện tại: {fmt(form.defaultDriverSalary)} đ
              </div>
            </div>
            <div className="field">
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--fg-2)', marginBottom: 6 }}>
                Trả hàng 2 điểm mặc định (đ)
              </label>
              <input className="input mono" type="text" value={form.twoPointDeliveryBonus} onChange={set('twoPointDeliveryBonus')} placeholder="200.000" />
              <div style={{ fontSize: 11, color: 'var(--fg-3)', marginTop: 4 }}>
                Gợi ý khi nhập trả hàng 2 điểm trên form chuyến. Hiện tại: {fmt(form.twoPointDeliveryBonus)} đ
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div className="field">
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--fg-2)', marginBottom: 6 }}>
                Lưu ca xe mặc định (đ)
              </label>
              <input className="input mono" type="text" value={form.vehicleShiftDefault} onChange={set('vehicleShiftDefault')} placeholder="200.000" />
              <div style={{ fontSize: 11, color: 'var(--fg-3)', marginTop: 4 }}>
                Gợi ý khi nhập lưu ca xe. Thường 200k-400k/ngày. Hiện tại: {fmt(form.vehicleShiftDefault)} đ
              </div>
            </div>
            <div className="field">
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--fg-2)', marginBottom: 6 }}>
                Tiền trạm thu phí (đ/trạm)
              </label>
              <input className="input mono" type="text" value={form.tollPerStation} onChange={set('tollPerStation')} placeholder="55.000" />
              <div style={{ fontSize: 11, color: 'var(--fg-3)', marginTop: 4 }}>
                Trừ mỗi trạm BOT đi qua. Hiện tại: {fmt(form.tollPerStation)} đ
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <div className="field">
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--fg-2)', marginBottom: 6 }}>
                Thưởng chuyến về có hàng (đ)
              </label>
              <input className="input mono" type="text" value={form.returnCargoBonus} onChange={set('returnCargoBonus')} placeholder="300.000" />
              <div style={{ fontSize: 11, color: 'var(--fg-3)', marginTop: 4 }}>
                Cộng khi tick "chuyến về có hàng". Hiện tại: {fmt(form.returnCargoBonus)} đ
              </div>
            </div>
          </div>

          {error && <div style={{ color: 'var(--error)', fontSize: 13, marginBottom: 12 }}>{error}</div>}
          <button onClick={handleSave} disabled={saving} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Lưu cấu hình
          </button>
        </div>
      </Panel>
    </div>
  );
}
