import { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck, Plus, KeyRound, Loader2, Save, User, Eye, EyeOff,
  Mail, Phone, Check, AtSign, Lock, Truck as TruckIcon,
} from 'lucide-react';
import { Drawer, Btn, FormGroup } from '../../../components/UI';
import { ROLE_LABELS, assignableRoles } from '../utils';
import { Role } from '@tingting/shared';
import type { Truck } from '@tingting/shared';
import type { UserRow, CreateData, EditData } from '../utils';
import { useAuth } from '../../../hooks/useAuth';

// ── Icon Input ─────────────────────────────────────────────────────────────

function IconInput({ id, name, icon, value, onChange, placeholder, type = 'text', autoComplete, valid, error, rightElement, disabled, inputRef }: {
  id?: string;
  name?: string;
  icon: React.ReactNode;
  /** Controlled value. Omit to leave the field uncontrolled: the DOM owns the text. */
  value?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: string;
  autoComplete?: string;
  valid?: boolean;
  error?: boolean;
  rightElement?: React.ReactNode;
  disabled?: boolean;
  inputRef?: React.Ref<HTMLInputElement>;
}) {
  return (
    <div className={`icon-input${valid ? ' icon-input--valid' : ''}${error ? ' icon-input--error' : ''}`}>
      <span className="icon-input__icon">{icon}</span>
      <input
        ref={inputRef}
        id={id}
        name={name}
        className="icon-input__field"
        type={type}
        {...(value === undefined ? {} : { value })}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        disabled={disabled}
        aria-invalid={error || undefined}
      />
      {valid && !rightElement && (
        <span className="icon-input__check"><Check size={14} /></span>
      )}
      {rightElement}
    </div>
  );
}

// ── Driver Fields (shared by Add/Edit panels, shown when role === DRIVER) ───

function DriverFields({ baseSalary, setBaseSalary, socialInsurance, setSocialInsurance, assignedTruckId, setAssignedTruckId, truckList }: {
  baseSalary: string;
  setBaseSalary: (v: string) => void;
  socialInsurance: string;
  setSocialInsurance: (v: string) => void;
  assignedTruckId: number | null;
  setAssignedTruckId: (v: number | null) => void;
  truckList: Truck[];
}) {
  return (
    <>
      <div className="users-form-divider" />
      <div className="users-form-section__title"><TruckIcon size={12} /> Thông tin lái xe</div>
      <div className="users-form-cards users-form-cards--driver">
        <div className="users-form-card">
          <FormGroup label="Lương cơ bản (₫)">
            <input
              className="input"
              type="number"
              min={0}
              value={baseSalary}
              onChange={e => setBaseSalary(e.target.value)}
              placeholder="0"
            />
          </FormGroup>
          <FormGroup label="BHXH / BHYT (₫)">
            <input
              className="input"
              type="number"
              min={0}
              value={socialInsurance}
              onChange={e => setSocialInsurance(e.target.value)}
              placeholder="0"
            />
          </FormGroup>
        </div>
        <div className="users-form-card">
          <FormGroup label="Xe phân công">
            <select
              className="input"
              value={assignedTruckId ?? 0}
              onChange={e => setAssignedTruckId(Number(e.target.value) || null)}
            >
              <option value={0}>Chưa phân công</option>
              {truckList.filter(t => t.status === 'ACTIVE').map(t => (
                <option key={t.id} value={t.id}>{t.licensePlate}</option>
              ))}
            </select>
          </FormGroup>
        </div>
      </div>
    </>
  );
}

// ── Edit Panel ──────────────────────────────────────────────────────────────

interface EditPanelProps {
  isOpen: boolean;
  user: UserRow;
  isMe: boolean;
  saving: boolean;
  error: string | null;
  truckList: Truck[];
  /** Accountant scope: lock role/credentials, only driver + contact fields editable. */
  canEditDriversOnly?: boolean;
  onClose: () => void;
  onSave: (id: number, data: EditData) => Promise<boolean | void>;
}

export function EditPanel({ isOpen, user, isMe, saving, error, truckList, canEditDriversOnly, onClose, onSave }: EditPanelProps) {
  const { user: viewer } = useAuth();
  const viewerRole = viewer?.role;
  const [fullName, setFullName] = useState(user.fullName ?? '');
  const [username, setUsername] = useState(user.username ?? '');
  const [email, setEmail]       = useState(user.email ?? '');
  const [phone, setPhone]       = useState(user.phone ?? '');
  const [role, setRole]         = useState<Role>(user.role);
  const [status, setStatus]     = useState(user.status);
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [baseSalary, setBaseSalary]           = useState(user.baseSalary ?? '');
  const [socialInsurance, setSocialInsurance] = useState(user.socialInsurance ?? '');
  const [assignedTruckId, setAssignedTruckId] = useState<number | null>(user.assignedTruckId ?? null);

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
      setBaseSalary(user.baseSalary ?? '');
      setSocialInsurance(user.socialInsurance ?? '');
      setAssignedTruckId(user.assignedTruckId ?? null);
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
    const payload: EditData = { fullName, username, email, phone, role, status, password };
    if (role === Role.DRIVER) {
      payload.baseSalary = baseSalary;
      payload.socialInsurance = socialInsurance;
      payload.assignedTruckId = assignedTruckId;
    }
    const ok = await onSave(user.id, payload);
    if (ok) onClose();
  };

  const displayName = user.fullName || user.username || user.email || 'Tài khoản';
  const subtitle = isMe ? `${displayName} (bạn)` : displayName;
  const title = role === Role.DRIVER ? `Chỉnh sửa lái xe ${displayName}` : 'Chỉnh sửa tài khoản';

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={title}
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
              disabled={canEditDriversOnly}
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
              disabled={canEditDriversOnly}
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
          <select className="input" value={role} disabled={canEditDriversOnly} onChange={e => setRole(e.target.value as Role)}>
            {assignableRoles(viewerRole).map(r => (
              <option key={r} value={r}>{ROLE_LABELS[r]}</option>
            ))}
          </select>
        </FormGroup>
        <FormGroup label="Trạng thái">
          <select className="input" value={status} disabled={canEditDriversOnly} onChange={e => setStatus(e.target.value)}>
            <option value="ACTIVE">Hoạt động</option>
            <option value="INACTIVE">Bị khoá</option>
          </select>
        </FormGroup>
      </div>

      {/* Driver profile fields (only for DRIVER role) */}
      {role === Role.DRIVER && (
        <DriverFields
          baseSalary={baseSalary} setBaseSalary={setBaseSalary}
          socialInsurance={socialInsurance} setSocialInsurance={setSocialInsurance}
          assignedTruckId={assignedTruckId} setAssignedTruckId={setAssignedTruckId}
          truckList={truckList}
        />
      )}

      {/* Password — hidden for accountants (they cannot reset credentials) */}
      {!canEditDriversOnly && (
        <>
          <div className="users-form-divider" />
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
                <button
                  type="button"
                  aria-label={showPw ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  onClick={() => setShowPw(v => !v)}
                  className="pw-toggle"
                >
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              }
            />
          </FormGroup>
        </>
      )}
    </Drawer>
  );
}

// ── Add Panel ──────────────────────────────────────────────────────────────

interface AddPanelProps {
  isOpen: boolean;
  saving: boolean;
  error: string | null;
  truckList: Truck[];
  onClose: () => void;
  onSave: (data: CreateData) => Promise<boolean | void>;
}

export function AddPanel({ isOpen, saving, error, truckList, onClose, onSave }: AddPanelProps) {
  const { user: viewer } = useAuth();
  const viewerRole = viewer?.role;
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail]       = useState('');
  const [phone, setPhone]       = useState('');
  // No preselect: the generic "Thêm tài khoản" entry point must not open as a
  // driver form. The role is chosen first, and the driver-only fields appear
  // only once DRIVER is picked (kanban 091026134710).
  const [role, setRole]         = useState<Role | ''>('');
  const [roleTouched, setRoleTouched] = useState(false);
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [baseSalary, setBaseSalary]           = useState('');
  const [socialInsurance, setSocialInsurance] = useState('');
  const [assignedTruckId, setAssignedTruckId] = useState<number | null>(null);

  // The browser can put a suggested password in the box WITHOUT firing React's
  // onChange, so the text is on screen but the form state is still empty — the
  // operator submits and is told to fill in a password they can see is filled
  // (kanban 101026095000). This field is therefore uncontrolled and read from
  // the DOM at submit.
  //
  // The identifier boxes below are controlled (typing must re-render validation),
  // but they are read from the DOM at submit for the same reason: Chrome's
  // autofill fills the username box the same silent way, and the gate then
  // reported "cần ít nhất username, email hoặc SĐT" for a box the operator could
  // see was full. A value the operator can see is a value they meant to submit.
  const nameRef = useRef<HTMLInputElement>(null);
  const usernameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const pwRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setFullName(''); setUsername(''); setEmail('');
      setPhone(''); setRole(''); setRoleTouched(false);
      setPassword(''); setShowPw(false);
      setBaseSalary(''); setSocialInsurance(''); setAssignedTruckId(null);
      // Uncontrolled field: clear the box itself, state alone would leave the
      // previous attempt's value on screen.
      if (pwRef.current) pwRef.current.value = '';
    }
  }, [isOpen]);

  // Validation
  const nameValid = fullName.trim().length > 0;
  const usernameValid = username.trim().length > 0;
  const emailError = email.trim().length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const phoneError = phone.trim().length > 0 && !/^[\d\s+()-]{8,}$/.test(phone);
  // Display validation is driven by the mirrored state; the submit path re-reads
  // the DOM so both agree on the value actually sent.
  const pwValid = password.length >= 6;
  const pwError = password.length > 0 && !pwValid;

  const toggleShowPw = () => {
    // The box owns the text (uncontrolled); mirror it into state when toggling so
    // validation stays in step, then flip the input type. Never writes state back
    // into the box, so a visible value can never be lost or replaced by a stale one.
    const current = pwRef.current?.value;
    if (current !== undefined && current !== password) setPassword(current);
    setShowPw(v => !v);
  };

  const handleGeneratePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$';
    let gen = '';
    for (let i = 0; i < 10; i++) {
      gen += chars[Math.floor(Math.random() * chars.length)];
    }
    // Write the box first, then the mirror: the exact visible value is submitted.
    if (pwRef.current) pwRef.current.value = gen;
    setPassword(gen);
    setShowPw(true);
  };

  const handleSubmit = async () => {
    if (!role) { setRoleTouched(true); return; }
    // The boxes are the source of truth: a browser/password-manager autofill can
    // put a value in the DOM without firing a React change event, so state may be
    // empty while the operator sees a filled field — and the gate then names a
    // field that looks filled ("Chưa nhập mật khẩu" for a password on screen).
    // Read every box, mirror it back into state, and no trim: the value the
    // operator sees is the value validated and sent.
    const boxValue = (ref: React.RefObject<HTMLInputElement | null>, stateValue: string) =>
      ref.current?.value ?? stateValue;
    const typedFullName = boxValue(nameRef, fullName);
    const typedUsername = boxValue(usernameRef, username);
    const typedEmail = boxValue(emailRef, email);
    const typedPhone = boxValue(phoneRef, phone);
    const typedPassword = boxValue(pwRef, password);
    if (typedFullName !== fullName) setFullName(typedFullName);
    if (typedUsername !== username) setUsername(typedUsername);
    if (typedEmail !== email) setEmail(typedEmail);
    if (typedPhone !== phone) setPhone(typedPhone);
    if (typedPassword !== password) setPassword(typedPassword);
    // A non-empty password under the minimum never leaves the form; the field
    // already shows "Mật khẩu phải có tối thiểu 6 ký tự". An empty one is
    // forwarded so the create gate names it ("Chưa nhập mật khẩu").
    if (typedPassword.length > 0 && typedPassword.length < 6) return;
    const payload: CreateData = {
      fullName: typedFullName,
      username: typedUsername,
      email: typedEmail,
      phone: typedPhone,
      role,
      password: typedPassword,
    };
    if (role === Role.DRIVER) {
      payload.baseSalary = baseSalary;
      payload.socialInsurance = socialInsurance;
      payload.assignedTruckId = assignedTruckId;
    }
    const ok = await onSave(payload);
    if (ok) onClose();
  };

  const title = role === Role.DRIVER ? 'Thêm lái xe' : 'Thêm tài khoản';

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      subtitle={role === '' ? 'Chọn vai trò và điền thông tin' : role === Role.DRIVER ? 'Tài khoản đăng nhập + hồ sơ lái xe' : 'Điền thông tin bên dưới'}
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
            {role === Role.DRIVER ? 'Thêm lái xe' : 'Tạo tài khoản'}
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
              inputRef={nameRef}
              icon={<User size={14} />}
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Nguyễn Văn A"
              valid={nameValid}
            />
          </FormGroup>
          <FormGroup label="Username">
            <IconInput
              inputRef={usernameRef}
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
              inputRef={emailRef}
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
              inputRef={phoneRef}
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
        <FormGroup label="Vai trò *" error={roleTouched && !role ? 'Vui lòng chọn vai trò' : undefined}>
          <select
            className="input"
            value={role}
            onChange={e => { setRole(e.target.value as Role | ''); setRoleTouched(true); }}
          >
            <option value="">— Chọn vai trò —</option>
            {assignableRoles(viewerRole).map(r => (
              <option key={r} value={r}>{ROLE_LABELS[r]}</option>
            ))}
          </select>
        </FormGroup>
        <FormGroup
          label="Mật khẩu *"
          error={pwError ? 'Mật khẩu phải có tối thiểu 6 ký tự' : undefined}
        >
          <IconInput
            inputRef={pwRef}
            name="password"
            icon={<Lock size={14} />}
            type={showPw ? 'text' : 'password'}
            onChange={e => setPassword(e.target.value)}
            placeholder="Tối thiểu 6 ký tự"
            autoComplete="new-password"
            valid={pwValid}
            error={pwError}
            rightElement={
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <button
                  type="button"
                  title="Tạo mật khẩu ngẫu nhiên"
                  aria-label="Tạo mật khẩu ngẫu nhiên"
                  onClick={handleGeneratePassword}
                  className="pw-toggle"
                  style={{ color: 'var(--brand, #005A2D)' }}
                >
                  <KeyRound size={13} />
                </button>
                <button
                  type="button"
                  aria-label={showPw ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  onClick={toggleShowPw}
                  className="pw-toggle"
                >
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            }
          />
        </FormGroup>
      </div>

      {/* Driver profile fields (only for DRIVER role) */}
      {role === Role.DRIVER && (
        <DriverFields
          baseSalary={baseSalary} setBaseSalary={setBaseSalary}
          socialInsurance={socialInsurance} setSocialInsurance={setSocialInsurance}
          assignedTruckId={assignedTruckId} setAssignedTruckId={setAssignedTruckId}
          truckList={truckList}
        />
      )}
    </Drawer>
  );
}
