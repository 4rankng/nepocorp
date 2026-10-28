import { useEffect, useId, useState, type ReactNode } from 'react';
import {
  Bot,
  Cpu,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  MapPin,
  Plug,
  Save,
  ScanLine,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  LLM_PROVIDERS,
  LLM_PROVIDER_LABELS,
  LLM_PROVIDER_MODELS,
  OCR_AI_DEFAULT_MODEL,
  OCR_AI_MODELS,
  OCR_AI_PROVIDER_LABELS,
  type AppSettings,
  type LlmProvider,
  type LlmSettingsUpdate,
  type OcrAiSettingsUpdate,
  type OcrUsageSettingsUpdate,
} from '@tingting/shared';
import { PageHeader, Panel } from '../../components/UI';
import { useAppSettings, useSaveAppSettings } from '../../hooks/useAppSettings';
import { useGpsSettings, useSaveGpsSettings } from '../../hooks/useGpsSettings';
import { useLlmSettings, useSaveLlmSettings } from '../../hooks/useLlmSettings';
import {
  useOcrAiSettings,
  useSaveOcrAiSettings,
  useTestOcrAiConnection,
} from '../../hooks/useOcrAiSettings';
import { useOcrUsageSettings, useSaveOcrUsageSettings } from '../../hooks/useOcrUsage';
import { usePageAnimations } from '../../hooks/animations';
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
        <span className="cfg-feature__icon" aria-hidden="true">{icon}</span>
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

type SecretFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  saved: boolean;
  maskedPreview: string;
  placeholder: string;
  disabled?: boolean;
};

function SecretField({
  id,
  label,
  value,
  onChange,
  saved,
  maskedPreview,
  placeholder,
  disabled = false,
}: SecretFieldProps) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="field cfg-secret-field">
      <label htmlFor={id}>
        {label}
        {saved && <span className="cfg-section__heading-pill">Đã lưu</span>}
      </label>
      <div className="cfg-secret-input">
        <input
          id={id}
          className="input"
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={saved ? `Đã lưu (${maskedPreview}) — nhập để thay đổi` : placeholder}
          autoComplete="new-password"
          spellCheck={false}
          disabled={disabled}
        />
        <button
          type="button"
          className="cfg-secret-input__toggle"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? `Ẩn ${label}` : `Hiện ${label}`}
          disabled={disabled}
        >
          {visible ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>
      <p className="cfg-field-hint">
        {saved
          ? 'Để trống để giữ giá trị hiện tại. Nhập giá trị mới để thay thế.'
          : 'Chưa cấu hình. Vui lòng nhập giá trị để kết nối.'}
      </p>
    </div>
  );
}

/** ADMIN home for global switches and external-service credentials. */
export default function AppSettingsConfigPage() {
  const { rootRef: pageRef } = usePageAnimations({ ready: true, selectors: ['.panel'] });
  const navigate = useNavigate();

  const appSettings = useAppSettings();
  const saveAppSettings = useSaveAppSettings();
  const llmSettings = useLlmSettings();
  const saveLlmSettings = useSaveLlmSettings();
  const gpsSettings = useGpsSettings();
  const saveGpsSettings = useSaveGpsSettings();
  const ocrUsageSettings = useOcrUsageSettings();
  const saveOcrUsageSettings = useSaveOcrUsageSettings();
  const ocrAiSettings = useOcrAiSettings();
  const saveOcrAiSettings = useSaveOcrAiSettings();
  const testOcrAiConnection = useTestOcrAiConnection();

  const [features, setFeatures] = useState<AppSettings>({ botEnabled: false });
  const [provider, setProvider] = useState<LlmProvider>('minimax');
  const [minimaxKey, setMinimaxKey] = useState('');
  const [openrouterKey, setOpenrouterKey] = useState('');
  const [gpsUsername, setGpsUsername] = useState('');
  const [gpsPassword, setGpsPassword] = useState('');
  // NEPO-27: OCR monthly allowance + overage price, kept as raw strings so the
  // admin can clear a field while typing without the input snapping back.
  const [ocrAllowance, setOcrAllowance] = useState('');
  const [ocrPrice, setOcrPrice] = useState('');
  // NEPO-28: OCR AI provider/key/model. `ocrModelChoice` is the dropdown value
  // ('' = "khác", the slug then comes from the free-text field).
  const [ocrAiKey, setOcrAiKey] = useState('');
  const [ocrModelChoice, setOcrModelChoice] = useState('');
  const [ocrModelCustom, setOcrModelCustom] = useState('');
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [gpsMessage, setGpsMessage] = useState<string | null>(null);
  const [ocrMessage, setOcrMessage] = useState<string | null>(null);
  const [ocrAiMessage, setOcrAiMessage] = useState<string | null>(null);
  const [ocrAiTest, setOcrAiTest] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    if (appSettings.data) setFeatures(appSettings.data);
  }, [appSettings.data]);

  useEffect(() => {
    if (llmSettings.data) setProvider(llmSettings.data.provider);
  }, [llmSettings.data]);

  useEffect(() => {
    if (gpsSettings.data) setGpsUsername(gpsSettings.data.username);
  }, [gpsSettings.data]);

  useEffect(() => {
    if (ocrUsageSettings.data) {
      setOcrAllowance(String(ocrUsageSettings.data.monthlyAllowance));
      setOcrPrice(String(ocrUsageSettings.data.overagePricePerCall));
    }
  }, [ocrUsageSettings.data]);

  // NEPO-28: the stored model lands in the dropdown when it is one of the
  // curated ones, otherwise it goes into the free-text field.
  useEffect(() => {
    if (!ocrAiSettings.data) return;
    const model = ocrAiSettings.data.model;
    if (OCR_AI_MODELS.includes(model)) {
      setOcrModelChoice(model);
      setOcrModelCustom('');
    } else {
      setOcrModelChoice('');
      setOcrModelCustom(model);
    }
  }, [ocrAiSettings.data]);

  const updateFeature = (key: keyof AppSettings) => {
    setFeatures((current) => ({ ...current, [key]: !current[key] }));
  };

  const saveAi = async () => {
    setAiMessage(null);
    const payload: LlmSettingsUpdate = { provider };
    if (minimaxKey.trim()) payload.minimaxApiKey = minimaxKey.trim();
    if (openrouterKey.trim()) payload.openrouterApiKey = openrouterKey.trim();
    try {
      await saveLlmSettings.mutateAsync(payload);
      setMinimaxKey('');
      setOpenrouterKey('');
      setAiMessage('Đã lưu cấu hình AI.');
    } catch {
      setAiMessage(null);
    }
  };

  const saveGps = async () => {
    setGpsMessage(null);
    try {
      await saveGpsSettings.mutateAsync({
        username: gpsUsername.trim(),
        ...(gpsPassword.trim() ? { password: gpsPassword } : {}),
      });
      setGpsPassword('');
      setGpsMessage('Đã lưu tài khoản định vị Bách Khoa.');
    } catch {
      setGpsMessage(null);
    }
  };

  /** Whole, non-negative numbers only — the backend Zod schema re-validates. */
  const parseOcrCount = (raw: string): number | null => {
    const trimmed = raw.trim();
    if (!/^\d+$/.test(trimmed)) return null;
    return parseInt(trimmed, 10);
  };

  const ocrAllowanceValue = parseOcrCount(ocrAllowance);
  const ocrPriceValue = parseOcrCount(ocrPrice);
  const ocrInputsValid = ocrAllowanceValue !== null && ocrPriceValue !== null;

  const saveOcrUsage = async () => {
    setOcrMessage(null);
    if (!ocrInputsValid) return;
    try {
      await saveOcrUsageSettings.mutateAsync({
        monthlyAllowance: ocrAllowanceValue,
        overagePricePerCall: ocrPriceValue,
      } satisfies OcrUsageSettingsUpdate);
      setOcrMessage('Đã lưu hạn mức OCR.');
    } catch {
      setOcrMessage(null);
    }
  };

  // ── NEPO-28: AI OCR provider / API key / model ──────────────────────────
  // The effective model is the dropdown choice; picking "khác" moves the slug
  // into the free-text field so a model released after the curated list is
  // still selectable.
  const ocrModel = (ocrModelChoice || ocrModelCustom).trim();
  const ocrAiKeySet = !!ocrAiSettings.data?.apiKeySet;
  const ocrAiKeyReady = ocrAiKeySet || ocrAiKey.trim() !== '';
  const ocrAiReady = ocrModel !== '' && ocrAiKeyReady;
  const ocrAiModelValid = /^[\w.-]+\/[\w.:-]+$/.test(ocrModel);

  const saveOcrAi = async () => {
    setOcrAiMessage(null);
    if (!ocrAiReady || !ocrAiModelValid) return;
    const payload: OcrAiSettingsUpdate = {
      provider: 'openrouter',
      model: ocrModel,
      ...(ocrAiKey.trim() ? { apiKey: ocrAiKey.trim() } : {}),
    };
    try {
      await saveOcrAiSettings.mutateAsync(payload);
      setOcrAiKey('');
      setOcrAiMessage('Đã lưu cấu hình AI OCR.');
    } catch {
      setOcrAiMessage(null);
    }
  };

  /** Probe the model with the values on screen — saved or freshly typed. */
  const testOcrAi = async () => {
    setOcrAiTest(null);
    try {
      const result = await testOcrAiConnection.mutateAsync({
        model: ocrModel,
        ...(ocrAiKey.trim() ? { apiKey: ocrAiKey.trim() } : {}),
      });
      setOcrAiTest({ ok: result.ok, message: result.message });
    } catch (error) {
      setOcrAiTest({
        ok: false,
        message: error instanceof Error ? error.message : 'Không kiểm tra được kết nối.',
      });
    }
  };

  /**
   * Drop the stored key. A mistyped key that is only replaceable would stay
   * broken forever (every OCR call would 401); clearing it falls back to the
   * environment key, if the deployment has one.
   */
  const clearOcrAi = async () => {
    setOcrAiMessage(null);
    setOcrAiTest(null);
    try {
      await saveOcrAiSettings.mutateAsync({
        provider: 'openrouter',
        model: ocrModel || OCR_AI_DEFAULT_MODEL,
        clearApiKey: true,
      });
      setOcrAiKey('');
      setOcrAiMessage('Đã xoá API key OCR.');
    } catch {
      setOcrAiMessage(null);
    }
  };

  const models = llmSettings.data?.models ?? LLM_PROVIDER_MODELS;
  const minimaxKeySet = !!llmSettings.data?.minimaxKeySet;
  const openrouterKeySet = !!llmSettings.data?.openrouterKeySet;
  const chosenKeyReady = provider === 'openrouter'
    ? openrouterKeySet || openrouterKey.trim() !== ''
    : minimaxKeySet || minimaxKey.trim() !== '';
  const gpsReady = gpsUsername.trim() !== ''
    && (gpsSettings.data?.passwordSet || gpsPassword.trim() !== '');

  return (
    <div ref={pageRef} className="cfg-page cfg-page--app-settings">
      <PageHeader
        title="Cài đặt ứng dụng"
        description="Quản lý tính năng và kết nối dùng chung trên toàn hệ thống · chỉ Quản trị viên"
        onBack={() => navigate('/config')}
        iconName="app-settings"
      />

      <div className="cfg-app-settings-stack">
        <Panel
          title="Tính năng ứng dụng"
          subtitle="Các thay đổi có hiệu lực cho toàn bộ người dùng sau khi lưu"
          action={<ShieldCheck size={18} className="cfg-panel-action-icon" />}
        >
          <FeatureSwitch
            icon={<Bot size={19} />}
            label="Trợ lý ảo"
            description="Cho phép người dùng văn phòng mở và sử dụng trợ lý ảo trong ứng dụng."
            enabled={features.botEnabled}
            onChange={() => updateFeature('botEnabled')}
            disabled={appSettings.isLoading || appSettings.isError || saveAppSettings.isPending}
          />
          <div className="cfg-form-actions">
            <button
              className="btn btn--primary"
              disabled={!appSettings.data || appSettings.isError || saveAppSettings.isPending}
              onClick={() => saveAppSettings.mutate(features)}
            >
              {saveAppSettings.isPending ? <Loader2 size={15} className="spin" /> : <Save size={15} />}
              {saveAppSettings.isPending ? 'Đang lưu…' : 'Lưu cài đặt'}
            </button>
            {saveAppSettings.error && (
              <span role="alert" className="cfg-form-error">
                {saveAppSettings.error instanceof Error ? saveAppSettings.error.message : 'Không thể lưu cài đặt.'}
              </span>
            )}
            {appSettings.error && (
              <span role="alert" className="cfg-form-error">
                {appSettings.error instanceof Error ? appSettings.error.message : 'Không thể tải cài đặt.'}
              </span>
            )}
          </div>
        </Panel>

        <Panel
          title="Nhà cung cấp AI"
          subtitle="Chọn mô hình và API key cho mọi cuộc hội thoại với trợ lý ảo"
          action={<Cpu size={18} className="cfg-panel-action-icon" />}
        >
          <div className="cfg-security-note">
            <ShieldCheck size={16} aria-hidden="true" />
            <span>API key được mã hóa khi lưu. Giá trị đầy đủ không bao giờ gửi lại trình duyệt.</span>
          </div>
          <fieldset className="cfg-section cfg-provider-fieldset">
            <legend className="cfg-section__heading">Nhà cung cấp</legend>
            <div className="cfg-provider-grid">
              {LLM_PROVIDERS.map((item) => (
                <label key={item} className={`cfg-provider-option ${provider === item ? 'is-selected' : ''}`}>
                  <input
                    type="radio"
                    name="llm-provider"
                    checked={provider === item}
                    onChange={() => setProvider(item)}
                    disabled={llmSettings.isLoading || llmSettings.isError || saveLlmSettings.isPending}
                  />
                  <span>
                    <strong>{LLM_PROVIDER_LABELS[item]}</strong>
                    <small>Model: <code>{models[item]}</code></small>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="cfg-credentials-grid">
            <SecretField
              id="llm-minimax-key"
              label="MiniMax API key"
              value={minimaxKey}
              onChange={setMinimaxKey}
              saved={minimaxKeySet}
              maskedPreview={llmSettings.data?.minimaxKeyMasked ?? ''}
              placeholder="Nhập MiniMax API key"
              disabled={llmSettings.isLoading || llmSettings.isError || saveLlmSettings.isPending}
            />
            <SecretField
              id="llm-openrouter-key"
              label="OpenRouter API key"
              value={openrouterKey}
              onChange={setOpenrouterKey}
              saved={openrouterKeySet}
              maskedPreview={llmSettings.data?.openrouterKeyMasked ?? ''}
              placeholder="Nhập OpenRouter API key"
              disabled={llmSettings.isLoading || llmSettings.isError || saveLlmSettings.isPending}
            />
          </div>
          <div className="cfg-form-actions">
            <button
              className="btn btn--primary"
              disabled={!llmSettings.data || llmSettings.isError || saveLlmSettings.isPending || !chosenKeyReady}
              onClick={saveAi}
            >
              {saveLlmSettings.isPending ? <Loader2 size={15} className="spin" /> : <Save size={15} />}
              {saveLlmSettings.isPending ? 'Đang lưu…' : 'Lưu cấu hình AI'}
            </button>
            {aiMessage && <span className="cfg-form-success" role="status">{aiMessage}</span>}
            {saveLlmSettings.error && (
              <span className="cfg-form-error" role="alert">
                {saveLlmSettings.error instanceof Error ? saveLlmSettings.error.message : 'Không thể lưu cấu hình AI.'}
              </span>
            )}
            {llmSettings.error && (
              <span className="cfg-form-error" role="alert">
                {llmSettings.error instanceof Error ? llmSettings.error.message : 'Không thể tải cấu hình AI.'}
              </span>
            )}
          </div>
        </Panel>

        <Panel
          title="Định vị Bách Khoa"
          subtitle="Tài khoản dùng để đồng bộ vị trí xe và lộ trình GPS"
          action={<MapPin size={18} className="cfg-panel-action-icon" />}
        >
          <div className="cfg-security-note">
            <ShieldCheck size={16} aria-hidden="true" />
            <span>Tên đăng nhập và mật khẩu được mã hóa khi lưu. Thay đổi có hiệu lực ngay, không cần khởi động lại.</span>
          </div>
          <div className="cfg-credentials-grid">
            <div className="field">
              <label htmlFor="bach-khoa-username">Tên đăng nhập Bách Khoa</label>
              <input
                id="bach-khoa-username"
                className="input"
                value={gpsUsername}
                onChange={(event) => setGpsUsername(event.target.value)}
                placeholder="Nhập tên đăng nhập"
                autoComplete="username"
                spellCheck={false}
                disabled={gpsSettings.isLoading || gpsSettings.isError || saveGpsSettings.isPending}
              />
            </div>
            <SecretField
              id="bach-khoa-password"
              label="Mật khẩu Bách Khoa"
              value={gpsPassword}
              onChange={setGpsPassword}
              saved={!!gpsSettings.data?.passwordSet}
              maskedPreview={gpsSettings.data?.passwordMasked ?? ''}
              placeholder="Nhập mật khẩu"
              disabled={gpsSettings.isLoading || gpsSettings.isError || saveGpsSettings.isPending}
            />
          </div>
          <div className="cfg-form-actions">
            <button
              className="btn btn--primary"
              disabled={!gpsSettings.data || gpsSettings.isError || saveGpsSettings.isPending || !gpsReady}
              onClick={saveGps}
            >
              {saveGpsSettings.isPending ? <Loader2 size={15} className="spin" /> : <Save size={15} />}
              {saveGpsSettings.isPending ? 'Đang lưu…' : 'Lưu định vị'}
            </button>
            {gpsMessage && <span className="cfg-form-success" role="status">{gpsMessage}</span>}
            {saveGpsSettings.error && (
              <span className="cfg-form-error" role="alert">
                {saveGpsSettings.error instanceof Error ? saveGpsSettings.error.message : 'Không thể lưu tài khoản định vị.'}
              </span>
            )}
            {gpsSettings.error && (
              <span className="cfg-form-error" role="alert">
                {gpsSettings.error instanceof Error ? gpsSettings.error.message : 'Không thể tải tài khoản định vị.'}
              </span>
            )}
          </div>
        </Panel>

        <Panel
          title="AI OCR"
          subtitle="Model đọc ảnh cont/seal và API key dùng để gọi nhà cung cấp"
          action={<Plug size={18} className="cfg-panel-action-icon" />}
        >
          <div className="cfg-security-note">
            <ShieldCheck size={16} aria-hidden="true" />
            <span>API key được mã hóa khi lưu. Giá trị đầy đủ không bao giờ gửi lại trình duyệt.</span>
          </div>
          <fieldset className="cfg-section cfg-provider-fieldset">
            <legend className="cfg-section__heading">Nhà cung cấp</legend>
            <div className="cfg-provider-grid">
              <div className="cfg-provider-option is-selected cfg-provider-option--locked">
                <span>
                  <strong>{OCR_AI_PROVIDER_LABELS.openrouter}</strong>
                  <small>Nhận dạng ảnh cont/seal chỉ chạy qua OpenRouter.</small>
                </span>
                <Lock size={14} aria-hidden="true" className="cfg-provider-option__lock" />
              </div>
            </div>
          </fieldset>
          <div className="cfg-credentials-grid">
            <SecretField
              id="ocr-ai-openrouter-key"
              label="OpenRouter API key (OCR)"
              value={ocrAiKey}
              onChange={setOcrAiKey}
              saved={ocrAiKeySet}
              maskedPreview={ocrAiSettings.data?.apiKeyMasked ?? ''}
              placeholder="Nhập OpenRouter API key"
              disabled={ocrAiSettings.isLoading || ocrAiSettings.isError || saveOcrAiSettings.isPending}
            />
            <div className="field">
              <label htmlFor="ocr-ai-model">Model nhận dạng ảnh</label>
              <select
                id="ocr-ai-model"
                className="input"
                value={ocrModelChoice}
                onChange={(event) => {
                  const next = event.target.value;
                  setOcrModelChoice(next);
                  if (next !== '' && ocrModelCustom.trim() !== '' && next !== ocrModelCustom.trim()) {
                    setOcrModelCustom('');
                  }
                }}
                disabled={ocrAiSettings.isLoading || ocrAiSettings.isError || saveOcrAiSettings.isPending}
              >
                <option value="">Khác (nhập tay)…</option>
                {OCR_AI_MODELS.map((model) => (
                  <option key={model} value={model}>{model}</option>
                ))}
              </select>
              <p className="cfg-field-hint">
                Model phải nhận ảnh. Mặc định dùng <code>{OCR_AI_DEFAULT_MODEL}</code>.
              </p>
            </div>
          </div>
          {ocrModelChoice === '' && (
            <div className="field cfg-ocr-ai-custom-model">
              <label htmlFor="ocr-ai-model-custom">Tên model (vendor/model)</label>
              <input
                id="ocr-ai-model-custom"
                className="input"
                value={ocrModelCustom}
                onChange={(event) => setOcrModelCustom(event.target.value)}
                placeholder="anthropic/claude-haiku-5.5"
                autoComplete="off"
                spellCheck={false}
                disabled={ocrAiSettings.isLoading || ocrAiSettings.isError || saveOcrAiSettings.isPending}
              />
              <p className="cfg-field-hint">
                {ocrModel.trim() === ''
                  ? 'Chưa chọn model — nhập tên model để có thể lưu và kiểm tra kết nối.'
                  : `Model sẽ dùng: ${ocrModel}`}
              </p>
            </div>
          )}
          <div className="cfg-form-actions">
            <button
              className="btn btn--primary"
              disabled={
                !ocrAiSettings.data
                || ocrAiSettings.isError
                || saveOcrAiSettings.isPending
                || !ocrAiReady
                || !ocrAiModelValid
              }
              onClick={saveOcrAi}
            >
              {saveOcrAiSettings.isPending ? <Loader2 size={15} className="spin" /> : <Save size={15} />}
              {saveOcrAiSettings.isPending ? 'Đang lưu…' : 'Lưu cấu hình AI OCR'}
            </button>
            <button
              className="btn"
              disabled={testOcrAiConnection.isPending || !ocrModel || !ocrAiModelValid || !ocrAiKeyReady}
              onClick={testOcrAi}
            >
              {testOcrAiConnection.isPending ? <Loader2 size={15} className="spin" /> : <Plug size={15} />}
              {testOcrAiConnection.isPending ? 'Đang kiểm tra…' : 'Kiểm tra kết nối'}
            </button>
            {ocrAiKeySet && (
              <button
                className="btn"
                disabled={saveOcrAiSettings.isPending}
                onClick={clearOcrAi}
              >
                {saveOcrAiSettings.isPending ? <Loader2 size={15} className="spin" /> : <Trash2 size={15} />}
                Xoá khoá
              </button>
            )}
            {ocrAiMessage && <span className="cfg-form-success" role="status">{ocrAiMessage}</span>}
            {ocrAiTest && (
              <span
                role="status"
                className={ocrAiTest.ok ? 'cfg-form-success' : 'cfg-form-error'}
              >
                {ocrAiTest.message}
              </span>
            )}
            {saveOcrAiSettings.error && (
              <span className="cfg-form-error" role="alert">
                {saveOcrAiSettings.error instanceof Error ? saveOcrAiSettings.error.message : 'Không thể lưu cấu hình AI OCR.'}
              </span>
            )}
            {ocrAiSettings.error && (
              <span className="cfg-form-error" role="alert">
                {ocrAiSettings.error instanceof Error ? ocrAiSettings.error.message : 'Không thể tải cấu hình AI OCR.'}
              </span>
            )}
          </div>
        </Panel>

        <Panel
          title="Chụp ảnh cont/seal (OCR)"
          subtitle="Hạn mức request AI mỗi tháng và đơn giá tính trên phần vượt hạn mức"
          action={<ScanLine size={18} className="cfg-panel-action-icon" />}
        >
          <div className="cfg-credentials-grid">
            <div className="field">
              <label htmlFor="ocr-monthly-allowance">Số request OCR mỗi tháng</label>
              <input
                id="ocr-monthly-allowance"
                className="input"
                value={ocrAllowance}
                onChange={(event) => setOcrAllowance(event.target.value)}
                placeholder="Ví dụ: 10000"
                inputMode="numeric"
                autoComplete="off"
                disabled={ocrUsageSettings.isLoading || ocrUsageSettings.isError || saveOcrUsageSettings.isPending}
              />
              <p className="cfg-field-hint">Mỗi lần AI nhận dạng ảnh cont/seal tính 1 request. Bộ đếm tự về 0 vào đầu tháng.</p>
            </div>
            <div className="field">
              <label htmlFor="ocr-overage-price">Đơn giá vượt hạn mức (₫ / request)</label>
              <input
                id="ocr-overage-price"
                className="input"
                value={ocrPrice}
                onChange={(event) => setOcrPrice(event.target.value)}
                placeholder="Ví dụ: 200"
                inputMode="numeric"
                autoComplete="off"
                disabled={ocrUsageSettings.isLoading || ocrUsageSettings.isError || saveOcrUsageSettings.isPending}
              />
              <p className="cfg-field-hint">Áp dụng cho từng request vượt hạn mức tháng.</p>
            </div>
          </div>
          <div className="cfg-form-actions">
            <button
              className="btn btn--primary"
              disabled={
                !ocrUsageSettings.data
                || ocrUsageSettings.isError
                || saveOcrUsageSettings.isPending
                || !ocrInputsValid
              }
              onClick={saveOcrUsage}
            >
              {saveOcrUsageSettings.isPending ? <Loader2 size={15} className="spin" /> : <Save size={15} />}
              {saveOcrUsageSettings.isPending ? 'Đang lưu…' : 'Lưu hạn mức OCR'}
            </button>
            {ocrMessage && <span className="cfg-form-success" role="status">{ocrMessage}</span>}
            {!ocrInputsValid && (ocrAllowance.trim() !== '' || ocrPrice.trim() !== '') && (
              <span className="cfg-form-error" role="alert">
                Vui lòng nhập số nguyên không âm cho cả hai trường.
              </span>
            )}
            {saveOcrUsageSettings.error && (
              <span className="cfg-form-error" role="alert">
                {saveOcrUsageSettings.error instanceof Error ? saveOcrUsageSettings.error.message : 'Không thể lưu hạn mức OCR.'}
              </span>
            )}
            {ocrUsageSettings.error && (
              <span className="cfg-form-error" role="alert">
                {ocrUsageSettings.error instanceof Error ? ocrUsageSettings.error.message : 'Không thể tải hạn mức OCR.'}
              </span>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}
