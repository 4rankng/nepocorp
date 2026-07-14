import { useEffect, useState, type ReactNode } from 'react';
import { Bot, GraduationCap, Loader2, Save, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageHeader, Panel } from '../../components/UI';
import { useAppSettings, useSaveAppSettings } from '../../hooks/useAppSettings';
import { usePageAnimations } from '../../hooks/animations';
import type { AppSettings } from '@tingting/shared';
import './config-page.css';

type FeatureSwitchProps = {
  icon: ReactNode;
  label: string;
  description: string;
  enabled: boolean;
  onChange: () => void;
  disabled: boolean;
};

function FeatureSwitch({ icon, label, description, enabled, onChange, disabled }: FeatureSwitchProps) {
  return (
    <div className="cfg-section">
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div
          aria-hidden="true"
          style={{
            display: 'grid',
            placeItems: 'center',
            width: 36,
            height: 36,
            flex: '0 0 auto',
            borderRadius: 9,
            background: 'var(--accent-soft, rgba(0, 177, 79, 0.1))',
            color: 'var(--accent, #008a3d)',
          }}
        >
          {icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h4 className="cfg-section__heading" style={{ marginBottom: 4 }}>{label}</h4>
          <p className="cfg-field-hint" style={{ margin: 0 }}>{description}</p>
        </div>
        <button
          type="button"
          className={`cfg-toggle ${enabled ? 'is-on' : ''}`}
          role="switch"
          aria-checked={enabled}
          aria-label={`${enabled ? 'Tắt' : 'Bật'} ${label}`}
          disabled={disabled}
          onClick={onChange}
        >
          <span className="cfg-toggle-knob" />
        </button>
      </div>
      <p className="cfg-field-hint" style={{ margin: '10px 0 0 48px' }}>
        {enabled ? 'Đang bật' : 'Đang tắt'}
      </p>
    </div>
  );
}

/** The single home for runtime feature switches; add future toggles here. */
export default function AppSettingsConfigPage() {
  const { rootRef: pageRef } = usePageAnimations({ ready: true, selectors: ['.cfg-section'] });
  const navigate = useNavigate();
  const { data, isLoading } = useAppSettings();
  const save = useSaveAppSettings();
  const [settings, setSettings] = useState<AppSettings>({ botEnabled: false, tutorialEnabled: true });
  useEffect(() => {
    if (data) setSettings(data);
  }, [data]);

  const update = (key: keyof AppSettings) => {
    setSettings((current) => ({ ...current, [key]: !current[key] }));
  };

  const isSaving = save.isPending;

  return (
    <div ref={pageRef} className="cfg-page cfg-page--app-settings">
      <PageHeader
        title="Cài đặt ứng dụng"
        description="Quản lý các tính năng dùng chung trên toàn hệ thống · chỉ Quản trị viên"
        onBack={() => navigate('/config')}
        iconName="settings"
      />
      <Panel
        title="Tính năng ứng dụng"
        subtitle="Các thay đổi có hiệu lực cho toàn bộ người dùng sau khi lưu"
        action={<ShieldCheck size={18} className="cfg-panel-action-icon" />}
      >
        <FeatureSwitch
          icon={<Bot size={19} />}
          label="Trợ lý ảo"
          description="Cho phép người dùng văn phòng mở và sử dụng trợ lý ảo trong ứng dụng."
          enabled={settings.botEnabled}
          onChange={() => update('botEnabled')}
          disabled={isLoading || isSaving}
        />
        <FeatureSwitch
          icon={<GraduationCap size={19} />}
          label="Hướng dẫn sử dụng"
          description="Hiển thị bảng checklist và các tour hướng dẫn cho người dùng mới."
          enabled={settings.tutorialEnabled}
          onChange={() => update('tutorialEnabled')}
          disabled={isLoading || isSaving}
        />
        <div className="cfg-form-actions">
          <button
            className="btn btn--primary"
            disabled={isLoading || isSaving}
            onClick={() => save.mutate(settings)}
          >
            {isSaving ? <Loader2 size={15} className="spin" /> : <Save size={15} />}
            {isSaving ? 'Đang lưu…' : 'Lưu cài đặt'}
          </button>
          {save.error && (
            <span role="alert" style={{ color: 'var(--danger)', fontSize: 13 }}>
              {save.error instanceof Error ? save.error.message : 'Không thể lưu cài đặt.'}
            </span>
          )}
        </div>
      </Panel>
    </div>
  );
}
