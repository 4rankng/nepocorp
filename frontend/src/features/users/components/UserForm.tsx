import { useState, useEffect } from 'react';
import {
  ShieldCheck, Plus, KeyRound, Loader2, Save, User, Eye, EyeOff,
} from 'lucide-react';
import { Drawer, Btn, FormGroup } from '../../../components/UI';
import { ROLE_LABELS } from '../utils';
import { Role } from '@nepocorp/shared';
import { AVATAR_COLORS } from '../utils';
import type { UserRow, CreateData, EditData } from '../utils';

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

  // Reset form when switching users
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
        <div style={{
          padding: '10px 14px', marginBottom: 16,
          background: 'var(--danger-soft)', color: 'var(--danger)',
          borderRadius: 8, fontSize: 12.5,
        }}>
          {error}
        </div>
      )}

      {/* Personal info */}
      <div className="users-form-section__title"><User size={12} /> Thông tin cá nhân</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <FormGroup label="Họ và tên">
          <input className="input" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Nguyễn Văn A" />
        </FormGroup>
        <FormGroup label="Username">
          <input className="input" value={username} onChange={e => setUsername(e.target.value)} placeholder="nguyen.van.a" autoComplete="off" />
        </FormGroup>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FormGroup label="Email">
            <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="nva@cty.vn" />
          </FormGroup>
          <FormGroup label="Số điện thoại">
            <input className="input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="0912 345 678" />
          </FormGroup>
        </div>
      </div>

      <div className="users-form-divider" />

      {/* Role & status */}
      <div className="users-form-section__title"><ShieldCheck size={12} /> Quyền & trạng thái</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
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
      <FormGroup label="Mật khẩu mới (để trống = không thay đổi)">
        <div style={{ position: 'relative' }}>
          <input
            className="input"
            type={showPw ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Tối thiểu 6 ký tự"
            autoComplete="new-password"
            style={{ paddingRight: 40 }}
          />
          <button
            type="button"
            onClick={() => setShowPw(v => !v)}
            style={{
              position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--ink-3)', padding: 2,
            }}
          >
            {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
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

  // Reset form when opening
  useEffect(() => {
    if (isOpen) {
      setFullName('');
      setUsername('');
      setEmail('');
      setPhone('');
      setRole(Role.DRIVER);
      setPassword('');
      setShowPw(false);
    }
  }, [isOpen]);

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
        <div style={{
          padding: '10px 14px', marginBottom: 16,
          background: 'var(--danger-soft)', color: 'var(--danger)',
          borderRadius: 8, fontSize: 12.5,
        }}>
          {error}
        </div>
      )}

      {/* Personal info */}
      <div className="users-form-section__title"><User size={12} /> Thông tin cá nhân</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <FormGroup label="Họ và tên">
          <input className="input" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Nguyễn Văn A" />
        </FormGroup>
        <FormGroup label="Username">
          <input className="input" value={username} onChange={e => setUsername(e.target.value)} placeholder="nguyen.van.a" autoComplete="off" />
        </FormGroup>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FormGroup label="Email">
            <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="nva@cty.vn" />
          </FormGroup>
          <FormGroup label="Số điện thoại">
            <input className="input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="0912 345 678" />
          </FormGroup>
        </div>
      </div>

      <div className="users-form-divider" />

      {/* Role */}
      <div className="users-form-section__title"><ShieldCheck size={12} /> Quyền truy cập</div>
      <FormGroup label="Vai trò">
        <select className="input" value={role} onChange={e => setRole(e.target.value as Role)}>
          {Object.values(Role).map(r => (
            <option key={r} value={r}>{ROLE_LABELS[r]}</option>
          ))}
        </select>
      </FormGroup>

      <div className="users-form-divider" />

      {/* Password */}
      <div className="users-form-section__title"><KeyRound size={12} /> Mật khẩu</div>
      <FormGroup label="Mật khẩu *">
        <div style={{ position: 'relative' }}>
          <input
            className="input"
            type={showPw ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Tối thiểu 6 ký tự"
            autoComplete="new-password"
            style={{ paddingRight: 40 }}
          />
          <button
            type="button"
            onClick={() => setShowPw(v => !v)}
            style={{
              position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--ink-3)', padding: 2,
            }}
          >
            {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
      </FormGroup>
    </Drawer>
  );
}
