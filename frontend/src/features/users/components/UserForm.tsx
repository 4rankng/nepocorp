import { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck, Plus, X, KeyRound, Loader2, Save, User, Eye, EyeOff,
} from 'lucide-react';
import { ROLE_LABELS } from '../utils';
import { Role } from '@nepocorp/shared';
import { AVATAR_COLORS } from '../utils';
import type { UserRow, CreateData, EditData } from '../utils';

// ── Edit Panel ──────────────────────────────────────────────────────────────

interface EditPanelProps {
  user: UserRow;
  isMe: boolean;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (id: number, data: EditData) => Promise<boolean | void>;
}

export function EditPanel({ user, isMe, saving, error, onClose, onSave }: EditPanelProps) {
  const [fullName, setFullName] = useState(user.fullName ?? '');
  const [username, setUsername] = useState(user.username ?? '');
  const [email, setEmail]       = useState(user.email ?? '');
  const [phone, setPhone]       = useState(user.phone ?? '');
  const [role, setRole]         = useState<Role>(user.role);
  const [status, setStatus]     = useState(user.status);
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  useEffect(() => {
    const first = panelRef.current?.querySelector<HTMLInputElement>('input, select');
    first?.focus();
  }, []);

  const avatarCol = AVATAR_COLORS[user.role] ?? AVATAR_COLORS[Role.DRIVER];
  const initials = (user.fullName || user.username || '?').charAt(0).toUpperCase();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await onSave(user.id, { fullName, username, email, phone, role, status, password });
    if (ok) onClose();
  };

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)',
          zIndex: 200, backdropFilter: 'blur(2px)',
        }}
      />
      <div
        ref={panelRef}
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0,
          width: 'min(480px, 100vw)',
          background: 'var(--surface)',
          borderLeft: '1px solid var(--line-2)',
          zIndex: 201,
          display: 'flex', flexDirection: 'column',
          boxShadow: '-8px 0 32px rgba(0,0,0,0.12)',
        }}
      >
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--line-2)',
          display: 'flex', alignItems: 'center', gap: 14,
          flexShrink: 0,
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
            background: avatarCol.bg, color: avatarCol.color,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, fontWeight: 700,
          }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.fullName || user.username || user.email || 'Tài khoản'}
              {isMe && <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--brand)', fontWeight: 500 }}>(bạn)</span>}
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 1 }}>
              Chỉnh sửa thông tin tài khoản
            </div>
          </div>
          <button
            className="btn btn--ghost btn--sm btn--icon"
            onClick={onClose}
            style={{ flexShrink: 0 }}
          >
            <X size={15} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{ flex: 1, overflowY: 'auto', padding: '24px 24px 0' }}
        >
          {error && (
            <div style={{
              padding: '10px 14px', marginBottom: 20,
              background: 'var(--danger-soft)', color: 'var(--danger)',
              borderRadius: 8, fontSize: 12.5,
            }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom: 24 }}>
            <div style={{
              fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
              textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 14,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <User size={12} /> Thông tin cá nhân
            </div>
            <div style={{ display: 'grid', gap: 14 }}>
              <div className="field">
                <label>Họ và tên</label>
                <input
                  className="input"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="Nguyễn Văn A"
                />
              </div>
              <div className="field">
                <label>Username</label>
                <input
                  className="input"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="nguyen.van.a"
                  autoComplete="off"
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="field">
                  <label>Email</label>
                  <input
                    className="input"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="nva@cty.vn"
                  />
                </div>
                <div className="field">
                  <label>Số điện thoại</label>
                  <input
                    className="input"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="0912 345 678"
                  />
                </div>
              </div>
            </div>
          </div>

          <div style={{ height: 1, background: 'var(--line-2)', marginBottom: 24 }} />

          <div style={{ marginBottom: 24 }}>
            <div style={{
              fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
              textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 14,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <ShieldCheck size={12} /> Quyền & trạng thái
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="field">
                <label>Vai trò</label>
                <select className="input" value={role} onChange={e => setRole(e.target.value as Role)}>
                  {Object.values(Role).map(r => (
                    <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Trạng thái</label>
                <select className="input" value={status} onChange={e => setStatus(e.target.value)}>
                  <option value="ACTIVE">Hoạt động</option>
                  <option value="INACTIVE">Bị khoá</option>
                </select>
              </div>
            </div>
          </div>

          <div style={{ height: 1, background: 'var(--line-2)', marginBottom: 24 }} />

          <div style={{ marginBottom: 32 }}>
            <div style={{
              fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
              textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 14,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <KeyRound size={12} /> Đặt lại mật khẩu
            </div>
            <div className="field">
              <label>Mật khẩu mới <span style={{ color: 'var(--ink-3)', fontWeight: 400 }}>(để trống = không thay đổi)</span></label>
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
            </div>
          </div>
        </form>

        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid var(--line-2)',
          display: 'flex', gap: 10,
          flexShrink: 0,
          background: 'var(--surface)',
        }}>
          <button
            className="btn btn--primary"
            disabled={saving}
            onClick={handleSubmit as any}
            style={{ display: 'flex', alignItems: 'center', gap: 7, flex: 1, justifyContent: 'center' }}
          >
            {saving ? <Loader2 size={14} className="spin" /> : <Save size={14} />}
            Lưu thay đổi
          </button>
          <button
            className="btn btn--ghost"
            onClick={onClose}
            style={{ minWidth: 80 }}
          >
            Hủy
          </button>
        </div>
      </div>
    </>
  );
}

// ── Add Panel ──────────────────────────────────────────────────────────────

interface AddPanelProps {
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (data: CreateData) => Promise<boolean | void>;
}

export function AddPanel({ saving, error, onClose, onSave }: AddPanelProps) {
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail]       = useState('');
  const [phone, setPhone]       = useState('');
  const [role, setRole]         = useState<Role>(Role.DRIVER);
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  useEffect(() => {
    panelRef.current?.querySelector<HTMLInputElement>('input')?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await onSave({ fullName, username, email, phone, role, password });
    if (ok) onClose();
  };

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)',
          zIndex: 200, backdropFilter: 'blur(2px)',
        }}
      />
      <div
        ref={panelRef}
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0,
          width: 'min(480px, 100vw)',
          background: 'var(--surface)',
          borderLeft: '1px solid var(--line-2)',
          zIndex: 201,
          display: 'flex', flexDirection: 'column',
          boxShadow: '-8px 0 32px rgba(0,0,0,0.12)',
        }}
      >
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--line-2)',
          display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0,
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            background: 'var(--brand-soft)', color: 'var(--brand)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Plus size={18} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Tạo tài khoản mới</div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 1 }}>Điền thông tin bên dưới</div>
          </div>
          <button className="btn btn--ghost btn--sm btn--icon" onClick={onClose}><X size={15} /></button>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{ flex: 1, overflowY: 'auto', padding: '24px 24px 0' }}
        >
          {error && (
            <div style={{
              padding: '10px 14px', marginBottom: 20,
              background: 'var(--danger-soft)', color: 'var(--danger)',
              borderRadius: 8, fontSize: 12.5,
            }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom: 24 }}>
            <div style={{
              fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
              textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 14,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <User size={12} /> Thông tin cá nhân
            </div>
            <div style={{ display: 'grid', gap: 14 }}>
              <div className="field">
                <label>Họ và tên</label>
                <input className="input" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Nguyễn Văn A" />
              </div>
              <div className="field">
                <label>Username</label>
                <input className="input" value={username} onChange={e => setUsername(e.target.value)} placeholder="nguyen.van.a" autoComplete="off" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="field">
                  <label>Email</label>
                  <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="nva@cty.vn" />
                </div>
                <div className="field">
                  <label>Số điện thoại</label>
                  <input className="input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="0912 345 678" />
                </div>
              </div>
            </div>
          </div>

          <div style={{ height: 1, background: 'var(--line-2)', marginBottom: 24 }} />

          <div style={{ marginBottom: 24 }}>
            <div style={{
              fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
              textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 14,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <ShieldCheck size={12} /> Quyền truy cập
            </div>
            <div className="field">
              <label>Vai trò</label>
              <select className="input" value={role} onChange={e => setRole(e.target.value as Role)}>
                {Object.values(Role).map(r => (
                  <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ height: 1, background: 'var(--line-2)', marginBottom: 24 }} />

          <div style={{ marginBottom: 32 }}>
            <div style={{
              fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
              textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 14,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <KeyRound size={12} /> Mật khẩu
            </div>
            <div className="field">
              <label>Mật khẩu <span style={{ color: 'var(--danger)', fontSize: 11 }}>*</span></label>
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
            </div>
          </div>
        </form>

        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid var(--line-2)',
          display: 'flex', gap: 10, flexShrink: 0,
          background: 'var(--surface)',
        }}>
          <button
            className="btn btn--primary"
            disabled={saving}
            onClick={handleSubmit as any}
            style={{ display: 'flex', alignItems: 'center', gap: 7, flex: 1, justifyContent: 'center' }}
          >
            {saving ? <Loader2 size={14} className="spin" /> : <Plus size={14} />}
            Tạo tài khoản
          </button>
          <button className="btn btn--ghost" onClick={onClose} style={{ minWidth: 80 }}>Hủy</button>
        </div>
      </div>
    </>
  );
}
