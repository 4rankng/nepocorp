// OnboardingSettingsConfigPage — the admin master switch for the onboarding
// tutorial (checklist panel + tours). When off, no onboarding UI appears
// anywhere; when on, normal behavior.
//
// ADMIN-only (strictAdminOnly gate at the route). Mirrors the LlmSettingsConfigPage
// shape: a single Panel with a toggle + Save. On save, the hook invalidates
// /auth/me so the app-wide `onboardingEnabled` flag refreshes immediately.
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, Loader2, ShieldCheck } from 'lucide-react';
import { usePageAnimations } from '../../hooks/animations';
import { PageHeader, Panel } from '../../components/UI';
import { useOnboardingSettings, useSaveOnboardingSettings } from '../../hooks/useOnboardingSettings';
import './config-page.css';

export default function OnboardingSettingsConfigPage() {
  const { rootRef: pageRef } = usePageAnimations({ ready: true, selectors: ['.cfg-row'] });
  const navigate = useNavigate();
  const { data } = useOnboardingSettings();
  const save = useSaveOnboardingSettings();

  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hydrate once settings arrive. Default to enabled (matches the backend's
  // "absent row = enabled" semantics).
  useEffect(() => {
    if (data) setEnabled(data.tutorialEnabled);
  }, [data]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await save.mutateAsync(enabled);
      navigate('/config');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lỗi lưu');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div ref={pageRef} className="cfg-page">
      <PageHeader
        title="Hướng dẫn & Onboarding"
        description="Bật/tắt hệ thống hướng dẫn (bảng checklist + các tour hướng dẫn) cho toàn bộ người dùng"
        onBack={() => navigate('/config')}
        iconName="overview"
      />
      <Panel
        title="Hướng dẫn người dùng mới"
        subtitle="Khi tắt, bảng checklist và các tour hướng dẫn sẽ ẩn trên toàn hệ thống"
        action={<ShieldCheck size={18} className="cfg-panel-action-icon" />}
      >
        <div className="cfg-form-grid">
          <div className="field">
            <label>Bật hướng dẫn (Onboarding)</label>
            <div className="cfg-toggle-row">
              <button
                type="button"
                className={`cfg-toggle ${enabled ? 'is-on' : ''}`}
                role="switch"
                aria-checked={enabled}
                aria-label="Bật hướng dẫn onboarding"
                onClick={() => setEnabled((v) => !v)}
              >
                <span className="cfg-toggle-knob" />
              </button>
              <span className="cfg-toggle-label">
                {enabled ? 'Đang bật — checklist & tour hướng dẫn hiển thị' : 'Đang tắt — ẩn toàn bộ hướng dẫn'}
              </span>
            </div>
          </div>
        </div>

        {error && <div className="cfg-error">{error}</div>}

        <div className="cfg-actions">
          <button className="btn btn--primary" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 size={15} className="spin" /> : <Save size={15} />}
            {saving ? 'Đang lưu…' : 'Lưu'}
          </button>
        </div>
      </Panel>
    </div>
  );
}
