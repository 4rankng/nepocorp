import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, Loader2, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { usePageAnimations } from '../../hooks/animations';
import { PageHeader, Panel } from '../../components/UI';
import { useLlmSettings, useSaveLlmSettings } from '../../hooks/useLlmSettings';
import {
  LLM_PROVIDERS,
  LLM_PROVIDER_LABELS,
  type LlmProvider,
  type LlmSettingsUpdate,
} from '@tingting/shared';
import './config-page.css';

// Empty-string sentinel = "no new value entered; keep the stored key". The
// backend treats an empty/absent key field as "leave untouched", so an admin
// can switch provider or re-save without re-entering the key.
const KEEP_EXISTING = '';

export default function LlmSettingsConfigPage() {
  const { rootRef: pageRef } = usePageAnimations({ ready: true, selectors: ['.cfg-row'] });
  const navigate = useNavigate();
  const { data } = useLlmSettings();
  const save = useSaveLlmSettings();

  const [provider, setProvider] = useState<LlmProvider>('minimax');
  // Key inputs are deliberately empty on load — the stored key is never sent to
  // the browser. The masked preview + "Đã lưu" badge signal an existing key.
  const [minimaxKey, setMinimaxKey] = useState('');
  const [openrouterKey, setOpenrouterKey] = useState('');
  const [showMinimax, setShowMinimax] = useState(false);
  const [showOpenrouter, setShowOpenrouter] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hydrate provider + masked-state once settings arrive. Key inputs stay empty
  // unless the admin types a new value.
  useEffect(() => {
    if (data) setProvider(data.provider);
  }, [data]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload: LlmSettingsUpdate = { provider };
      if (minimaxKey.trim()) payload.minimaxApiKey = minimaxKey.trim();
      if (openrouterKey.trim()) payload.openrouterApiKey = openrouterKey.trim();
      await save.mutateAsync(payload);
      navigate('/config');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lỗi lưu');
    } finally {
      setSaving(false);
    }
  };

  const models = data?.models ?? { minimax: 'MiniMax', openrouter: 'OpenRouter' };
  const minimaxKeySet = !!data?.minimaxKeySet;
  const openrouterKeySet = !!data?.openrouterKeySet;

  // Save is enabled when a provider is picked and that provider has a key
  // (either already stored, or just typed in this session).
  const chosenKeyReady =
    provider === 'openrouter'
      ? openrouterKeySet || openrouterKey.trim() !== ''
      : minimaxKeySet || minimaxKey.trim() !== '';
  const canSave = chosenKeyReady && !saving;

  return (
    <div ref={pageRef} className="cfg-page cfg-page--llm-settings">
      <PageHeader
        title="Nhà cung cấp AI"
        description="Chọn nhà cung cấp LLM cho trợ lý ảo và cấu hình API key · chỉ Quản trị viên"
        onBack={() => navigate('/config')}
        iconName="settings"
      />
      <Panel
        title="Cấu hình nhà cung cấp LLM"
        subtitle="Trợ lý ảo sẽ dùng nhà cung cấp được chọn cho mọi cuộc hội thoại"
      >
        {/* Security note */}
        <div className="cfg-field-hint" style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 16 }}>
          <ShieldCheck size={15} style={{ flexShrink: 0, marginTop: 2, color: 'var(--success, #16a34a)' }} />
          <span>
            API key được mã hóa AES-256-GCM khi lưu trong cơ sở dữ liệu. Chỉ 4 ký tự cuối được hiển thị lại;
            key đầy đủ không bao giờ gửi về trình duyệt. Thay đổi có hiệu lực ngay cho tin nhắn tiếp theo.
          </span>
        </div>

        {/* Provider selector */}
        <div className="cfg-section">
          <h4 className="cfg-section__heading">Nhà cung cấp</h4>
          <div className="cfg-form-grid">
            {LLM_PROVIDERS.map((p) => (
              <label
                key={p}
                className="field"
                style={{
                  cursor: 'pointer',
                  border: `2px solid ${provider === p ? 'var(--primary, #2563eb)' : 'var(--border, #e5e7eb)'}`,
                  borderRadius: 10,
                  padding: '14px 16px',
                  background: provider === p ? 'var(--primary-bg, rgba(37,99,235,0.06))' : 'transparent',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input
                    type="radio"
                    name="llm-provider"
                    checked={provider === p}
                    onChange={() => setProvider(p)}
                    style={{ width: 16, height: 16 }}
                  />
                  <strong style={{ fontSize: 15 }}>{LLM_PROVIDER_LABELS[p]}</strong>
                </div>
                <p className="cfg-field-hint" style={{ margin: '6px 0 0 26px' }}>
                  Model: <code>{models[p]}</code>
                </p>
              </label>
            ))}
          </div>
        </div>

        {/* MiniMax key */}
        <KeyField
          id="llm-minimax-key-field"
          label="MiniMax API key"
          value={minimaxKey}
          onChange={setMinimaxKey}
          show={showMinimax}
          onToggleShow={() => setShowMinimax((s) => !s)}
          keySet={minimaxKeySet}
          maskedPreview={data?.minimaxKeyMasked ?? ''}
          placeholder="Nhập MiniMax API key"
        />

        {/* OpenRouter key */}
        <KeyField
          id="llm-openrouter-key-field"
          label="OpenRouter API key"
          value={openrouterKey}
          onChange={setOpenrouterKey}
          show={showOpenrouter}
          onToggleShow={() => setShowOpenrouter((s) => !s)}
          keySet={openrouterKeySet}
          maskedPreview={data?.openrouterKeyMasked ?? ''}
          placeholder="Nhập OpenRouter API key"
        />

        <div className="cfg-form-actions">
          <button
            id="llm-settings-save-button"
            className="btn btn--primary"
            disabled={!canSave}
            onClick={handleSave}
          >
            {saving ? <Loader2 size={14} className="spin" /> : <Save size={14} />}
            Lưu cấu hình
          </button>
          {error && <span style={{ color: 'var(--danger)', fontSize: 13 }}>{error}</span>}
        </div>
      </Panel>
    </div>
  );
}

/** Reusable masked key input. Shows a "Đã lưu" badge + masked preview when a
 *  key is already stored, and a password input (with show/hide) for entering a
 *  new value. Leaving the field empty preserves the stored key on save. */
function KeyField({
  id,
  label,
  value,
  onChange,
  show,
  onToggleShow,
  keySet,
  maskedPreview,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggleShow: () => void;
  keySet: boolean;
  maskedPreview: string;
  placeholder: string;
}) {
  return (
    <div className="cfg-section">
      <h4 className="cfg-section__heading">
        {label}
        {keySet && (
          <span className="cfg-section__heading-pill" style={{ background: 'var(--success-bg, #dcfce7)', color: 'var(--success, #16a34a)' }}>
            Đã lưu
          </span>
        )}
      </h4>
      <div className="field" id={id}>
        <label>{label}</label>
        <div style={{ position: 'relative' }}>
          <input
            className="input"
            type={show ? 'text' : 'password'}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={keySet ? `Đã lưu (${maskedPreview}) — nhập để thay đổi` : placeholder}
            autoComplete="off"
            spellCheck={false}
            style={{ paddingRight: 40 }}
          />
          <button
            type="button"
            onClick={onToggleShow}
            aria-label={show ? 'Ẩn key' : 'Hiện key'}
            style={{
              position: 'absolute',
              right: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--ink-3)',
              padding: 4,
              display: 'flex',
            }}
          >
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        <p className="cfg-field-hint">
          {keySet
            ? 'Để trống để giữ key hiện tại. Nhập giá trị mới để thay thế.'
            : 'Chưa có key. Nhập key để bật nhà cung cấp này.'}
        </p>
      </div>
    </div>
  );
}
