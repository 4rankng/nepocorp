import { useState, useEffect } from 'react';
import {
  ShieldCheck, Plus, KeyRound, Loader2, Save, User, Eye, EyeOff,
  Mail, Phone, Check, AtSign, Lock,
} from 'lucide-react';
import { Drawer, Btn, FormGroup } from '../../../components/UI';
import { ROLE_LABELS } from '../utils';
import { Role } from '@tingting/shared';
import type { UserRow, CreateData, EditData } from '../utils';

// ── Icon Input ─────────────────────────────────────────────────────────────

function IconInput({ icon, value, onChange, placeholder, type = 'text', autoComplete, valid, error, rightElement }: {
  icon: React.ReactNode;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: string;
  autoComplete?: string;
  valid?: boolean;
  error?: boolean;
  rightElement?: React.ReactNode;
}) {
  return (
    <div className={`icon-input${valid ? ' icon-input--valid' : ''}${error ? ' icon-input--error' : ''}`}>
      <span className="icon-input__icon">{icon}</span>
      <input
        className="icon-input__field"
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
      />
      {valid && !rightElement && (
        <span className="icon-input__check"><Check size={14} /></span>
      )}
      {rightElement}
    </div>
  );
}

// ── Edit Panel ──────────────────────────────────────────────────────────────

interface EditPanelProps {
  isOpen: boolean;
  user: UserRow;
  isMe: boolean;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (id: number, data: EditData) => Promise<boolean | void>;
}

export function EditPanel({ isOpen, user, isMe, saving, error, onClose, onSave }: EditPanelProps) {
  const [fullName, setFullName] = useState(user.fullName ?? '');
  const [username, setUsername] = useState(user.username ?? '');
  const [email, setEmail]       = useState(user.email ?? '');
  const [phone, setPhone]       = useState(user.phone ?? '');
  const [role, setRole]         = useState<Role>(user.role);
  const [status, setStatus]     = useState(user.status);
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFullName(user.fullName ?? '');
      setUsername(user.username ?? '');
      setEmail(user.email ?? '');
      setPhone(user.phone ?? '');
      setRole(user.role);
      setStatus(user.status);
      setPassword('');
      setShowPw(false);
    }
  }, [isOpen, user]);

  // Validation
  const nameValid = fullName.trim().length > 0;
  const usernameValid = username.trim().length > 0;
  const emailError = email.trim().length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const phoneError = phone.trim().length > 0 && !/^[\d\s+()-]{8,}$/.test(phone);
  const pwValid = password.length >= 6;
  const pwError = password.length > 0 && !pwValid;

  const handleSubmit = async () => {
    const ok = await onSave(user.id, { fullName, username, email, phone, role, status, password });
    if (ok) onClose();
  };

  const displayName = user.fullName || user.username || user.email || 'Tài khoản';
  const subtitle = isMe ? `${displayName} (bạn)` : displayName;

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Chỉnh sửa tài khoản"
      subtitle={subtitle}
      onConfirm={handleSubmit}
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Hủy</Btn>
          <Btn
            variant="primary"
            icon={saving ? <Loader2 size={13} className="spin" /> : <Save size={13} />}
            disabled={saving}
            onClick={handleSubmit}
          >
            Lưu thay đổi
          </Btn>
        </>
      }
    >
      {error && (
        <div className="users-error-banner">{error}</div>
      )}

      {/* Personal info */}
      <div className="users-form-section__title"><User size={12} /> Thông tin cá nhân</div>
      <div className="users-form-cards">
        <div className="users-form-card">
          <FormGroup label="Họ và tên">
            <IconInput
              icon={<User size={14} />}
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Nguyễn Văn A"
              valid={nameValid}
            />
          </FormGroup>
          <FormGroup label="Username">
            <IconInput
              icon={<AtSign size={14} />}
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="nguyen.van.a"
              autoComplete="off"
              valid={usernameValid}
            />
          </FormGroup>
        </div>
        <div className="users-form-card">
          <FormGroup label="Email">
            <IconInput
              icon={<Mail size={14} />}
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="nva@cty.vn"
              error={emailError}
            />
          </FormGroup>
          <FormGroup label="Số điện thoại">
            <IconInput
              icon={<Phone size={14} />}
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="0912 345 678"
              error={phoneError}
            />
          </FormGroup>
        </div>
      </div>

      <div className="users-form-divider" />

      {/* Role & status */}
      <div className="users-form-section__title"><ShieldCheck size={12} /> Quyền & trạng thái</div>
      <div className="row-2">
        <FormGroup label="Vai trò">
          <select className="input" value={role} onChange={e => setRole(e.target.value as Role)}>
            {Object.values(Role).map(r => (
              <option key={r} value={r}>{ROLE_LABELS[r]}</option>
            ))}
          </select>
        </FormGroup>
        <FormGroup label="Trạng thái">
          <select className="input" value={status} onChange={e => setStatus(e.target.value)}>
            <option value="ACTIVE">Hoạt động</option>
            <option value="INACTIVE">Bị khoá</option>
          </select>
        </FormGroup>
      </div>

      <div className="users-form-divider" />

      {/* Password */}
      <div className="users-form-section__title"><KeyRound size={12} /> Đặt lại mật khẩu</div>
      <FormGroup
        label="Mật khẩu mới (để trống = không thay đổi)"
        error={pwError ? 'Mật khẩu phải có tối thiểu 6 ký tự' : undefined}
      >
        <IconInput
          icon={<Lock size={14} />}
          type={showPw ? 'text' : 'password'}
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Tối thiểu 6 ký tự"
          autoComplete="new-password"
          valid={pwValid}
          error={pwError}
          rightElement={
            <button type="button" onClick={() => setShowPw(v => !v)} className="pw-toggle">
              {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          }
        />
      </FormGroup>
    </Drawer>
  );
}

// ── Add Panel ──────────────────────────────────────────────────────────────

interface AddPanelProps {
  isOpen: boolean;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (data: CreateData) => Promise<boolean | void>;
}

export function AddPanel({ isOpen, saving, error, onClose, onSave }: AddPanelProps) {
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail]       = useState('');
  const [phone, setPhone]       = useState('');
  const [role, setRole]         = useState<Role>(Role.DRIVER);
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFullName(''); setUsername(''); setEmail('');
      setPhone(''); setRole(Role.DRIVER);
      setPassword(''); setShowPw(false);
    }
  }, [isOpen]);

  // Validation
  const nameValid = fullName.trim().length > 0;
  const usernameValid = username.trim().length > 0;
  const emailError = email.trim().length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const phoneError = phone.trim().length > 0 && !/^[\d\s+()-]{8,}$/.test(phone);
  const pwValid = password.length >= 6;
  const pwError = password.length > 0 && !pwValid;

  const handleSubmit = async () => {
    const ok = await onSave({ fullName, username, email, phone, role, password });
    if (ok) onClose();
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Tạo tài khoản mới"
      subtitle="Điền thông tin bên dưới"
      onConfirm={handleSubmit}
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Hủy</Btn>
          <Btn
            variant="primary"
            icon={saving ? <Loader2 size={13} className="spin" /> : <Plus size={13} />}
            disabled={saving}
            onClick={handleSubmit}
          >
            Tạo tài khoản
          </Btn>
        </>
      }
    >
      {error && (
        <div className="users-error-banner">{error}</div>
      )}

      {/* Personal info */}
      <div className="users-form-section__title"><User size={12} /> Thông tin cá nhân</div>
      <div className="users-form-cards">
        <div className="users-form-card">
          <FormGroup label="Họ và tên">
            <IconInput
              icon={<User size={14} />}
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Nguyễn Văn A"
              valid={nameValid}
            />
          </FormGroup>
          <FormGroup label="Username">
            <IconInput
              icon={<AtSign size={14} />}
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="nguyen.van.a"
              autoComplete="off"
              valid={usernameValid}
            />
          </FormGroup>
        </div>
        <div className="users-form-card">
          <FormGroup label="Email">
            <IconInput
              icon={<Mail size={14} />}
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="nva@cty.vn"
              error={emailError}
            />
          </FormGroup>
          <FormGroup label="Số điện thoại">
            <IconInput
              icon={<Phone size={14} />}
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="0912 345 678"
              error={phoneError}
            />
          </FormGroup>
        </div>
      </div>

      <div className="users-form-divider" />

      {/* Role & Password */}
      <div className="users-form-section__title"><ShieldCheck size={12} /> Quyền & Mật khẩu</div>
      <div className="row-2">
        <FormGroup label="Vai trò">
          <select className="input" value={role} onChange={e => setRole(e.target.value as Role)}>
            {Object.values(Role).map(r => (
              <option key={r} value={r}>{ROLE_LABELS[r]}</option>
            ))}
          </select>
        </FormGroup>
        <FormGroup
          label="Mật khẩu *"
          error={pwError ? 'Mật khẩu phải có tối thiểu 6 ký tự' : undefined}
        >
          <IconInput
            icon={<Lock size={14} />}
            type={showPw ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Tối thiểu 6 ký tự"
            autoComplete="new-password"
            valid={pwValid}
            error={pwError}
            rightElement={
              <button type="button" onClick={() => setShowPw(v => !v)} className="pw-toggle">
                {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            }
          />
        </FormGroup>
      </div>
    </Drawer>
  );
}
