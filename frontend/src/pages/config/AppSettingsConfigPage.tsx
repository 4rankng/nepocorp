import { useEffect, useId, useState, type ReactNode } from 'react';
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
  const descriptionId = useId();

  return (
    <div className="cfg-section cfg-feature">
      <button
        type="button"
        className="cfg-feature__button"
        role="switch"
        aria-checked={enabled}
        aria-describedby={descriptionId}
        disabled={disabled}
        onClick={onChange}
      >
        <span className="cfg-feature__icon" aria-hidden="true">
          {icon}
        </span>
        <span className="cfg-feature__copy">
          <span className="cfg-feature__label">{label}</span>
          <span id={descriptionId} className="cfg-feature__description">{description}</span>
          <span className="cfg-feature__state">{enabled ? 'Đang bật' : 'Đang tắt'}</span>
        </span>
        <span className={`cfg-toggle ${enabled ? 'is-on' : ''}`} aria-hidden="true">
          <span className="cfg-toggle-knob" />
        </span>
      </button>
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
        iconName="app-settings"
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
