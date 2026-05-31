import { useState, useMemo, useEffect, useRef } from 'react';
import {
  Users, ShieldCheck, UserCog, Lock, Plus, Pencil, Trash2,
  Loader2, Save, X, KeyRound, Eye, EyeOff, User,
} from 'lucide-react';
import { api } from '../lib/api';
import { formatDate } from '../lib/format';
import { Role, ROLE_LABELS } from '@nepocorp/shared';
import { useAuth } from '../hooks/useAuth';
import { useConfirm } from '../components/UI';
import { useUsers } from '../hooks/useQueries';
import { useToast } from '../components/shared/Toast';

interface UserRow {
  id: number;
  username: string | null;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  role: Role;
  status: string;
  createdAt: string;
}

const ROLE_PILL: Record<Role, { cls: string; label: string }> = {
  [Role.ADMIN]:      { cls: 'pill pill--danger',  label: 'Quản trị' },
  [Role.MANAGER]:    { cls: 'pill pill--warn',    label: 'Quản lý' },
  [Role.ACCOUNTANT]: { cls: 'pill pill--neutral', label: 'Kế toán' },
  [Role.DRIVER]:     { cls: 'pill pill--success', label: 'Tài xế' },
};

const AVATAR_COLORS: Record<Role, { bg: string; color: string }> = {
  [Role.ADMIN]:      { bg: 'var(--danger-soft)',  color: 'var(--danger)' },
  [Role.MANAGER]:    { bg: 'var(--warning-soft)', color: 'var(--warning)' },
  [Role.ACCOUNTANT]: { bg: 'var(--warning-soft)', color: 'var(--warning)' },
  [Role.DRIVER]:     { bg: 'var(--success-soft)', color: 'var(--success)' },
};

type FilterKey = 'all' | Role;

// ── Edit Panel ──────────────────────────────────────────────────────────────

interface EditPanelProps {
  user: UserRow;
  isMe: boolean;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (id: number, data: EditData) => void;
}

interface EditData {
  fullName: string;
  username: string;
  email: string;
  phone: string;
  role: Role;
  status: string;
  password: string;
}

function EditPanel({ user, isMe, saving, error, onClose, onSave }: EditPanelProps) {
  const [fullName, setFullName] = useState(user.fullName ?? '');
  const [username, setUsername] = useState(user.username ?? '');
  const [email, setEmail]       = useState(user.email ?? '');
  const [phone, setPhone]       = useState(user.phone ?? '');
  const [role, setRole]         = useState<Role>(user.role);
  const [status, setStatus]     = useState(user.status);
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Focus trap — focus first input on open
  useEffect(() => {
    const first = panelRef.current?.querySelector<HTMLInputElement>('input, select');
    first?.focus();
  }, []);

  const avatarCol = AVATAR_COLORS[user.role] ?? AVATAR_COLORS[Role.DRIVER];
  const initials = (user.fullName || user.username || '?').charAt(0).toUpperCase();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(user.id, { fullName, username, email, phone, role, status, password });
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)',
          zIndex: 200, backdropFilter: 'blur(2px)',
        }}
      />

      {/* Panel */}
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
        {/* Panel header */}
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

        {/* Scrollable form body */}
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

          {/* Section: Profile */}
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

          {/* Divider */}
          <div style={{ height: 1, background: 'var(--line-2)', marginBottom: 24 }} />

          {/* Section: Account */}
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

          {/* Divider */}
          <div style={{ height: 1, background: 'var(--line-2)', marginBottom: 24 }} />

          {/* Section: Password */}
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

        {/* Panel footer — sticky action bar */}
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

// ── Add User Panel ──────────────────────────────────────────────────────────

interface AddPanelProps {
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (data: {
    username: string; email: string; phone: string;
    fullName: string; role: Role; password: string;
  }) => void;
}

function AddPanel({ saving, error, onClose, onSave }: AddPanelProps) {
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ fullName, username, email, phone, role, password });
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
        {/* Header */}
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

        {/* Body */}
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

        {/* Footer */}
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

// ── Main Page ───────────────────────────────────────────────────────────────

export default function UsersPage() {
  const { user: me } = useAuth();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const canManage = me?.capabilities
    ? me.capabilities.includes('manage_users')
    : me?.role === Role.ADMIN || me?.role === Role.MANAGER;

  const { data: usersData, isLoading: loading, refetch: refetchUsers } = useUsers();
  const users = (usersData?.items ?? []) as UserRow[];

  const [filter, setFilter] = useState<FilterKey>('all');
  const [search, setSearch] = useState('');

  const [showAdd, setShowAdd]         = useState(false);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [saving, setSaving]           = useState(false);
  const [panelError, setPanelError]   = useState<string | null>(null);
  const [deleting, setDeleting]       = useState<number | null>(null);

  const { toast: showToast } = useToast();

  const { total, staffCount, driverCount, inactiveCount, filtered } = useMemo(() => {
    const total        = users.length;
    const staffCount   = users.filter(u => u.role !== Role.DRIVER).length;
    const driverCount  = users.filter(u => u.role === Role.DRIVER).length;
    const inactiveCount = users.filter(u => u.status !== 'ACTIVE').length;
    const filtered = users
      .filter(u => filter === 'all' || u.role === filter)
      .filter(u => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (u.username || '').toLowerCase().includes(q)
          || (u.fullName || '').toLowerCase().includes(q)
          || (u.email || '').toLowerCase().includes(q)
          || (u.phone || '').includes(q);
      });
    return { total, staffCount, driverCount, inactiveCount, filtered };
  }, [users, filter, search]);

  // ── CRUD ────────────────────────────────────────────────────────────────

  const doCreate = async (data: {
    username: string; email: string; phone: string;
    fullName: string; role: Role; password: string;
  }) => {
    if (!data.password || (!data.username && !data.email && !data.phone)) {
      setPanelError('Cần ít nhất username/email/SĐT và mật khẩu');
      return;
    }
    setSaving(true);
    setPanelError(null);
    try {
      await api.post('/auth/users', {
        username: data.username || undefined,
        email:    data.email    || undefined,
        phone:    data.phone    || undefined,
        fullName: data.fullName || undefined,
        password: data.password,
        role:     data.role,
      });
      setShowAdd(false);
      refetchUsers();
      showToast({ kind: 'success', message: 'Tạo tài khoản thành công' });
    } catch (e: any) {
      setPanelError(e.message || 'Lỗi khi tạo tài khoản');
    } finally {
      setSaving(false);
    }
  };

  const doUpdate = async (id: number, data: EditData) => {
    setSaving(true);
    setPanelError(null);
    try {
      const body: Record<string, unknown> = {
        role:     data.role,
        status:   data.status,
        username: data.username || undefined,
        fullName: data.fullName,
        email:    data.email,
        phone:    data.phone,
      };
      if (data.password) body.password = data.password;
      await api.patch(`/auth/users/${id}`, body);
      setEditingUser(null);
      refetchUsers();
      showToast({ kind: 'success', message: 'Cập nhật tài khoản thành công' });
    } catch (e: any) {
      setPanelError(e.message || 'Lỗi khi cập nhật');
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async (id: number) => {
    if (!await confirm('Xóa tài khoản này? Thao tác không thể hoàn tác.', { variant: 'danger', confirmLabel: 'Xóa' })) return;
    setDeleting(id);
    try {
      await api.delete(`/auth/users/${id}`);
      refetchUsers();
    } catch (e: any) {
      showToast({ kind: 'error', message: e.message || 'Lỗi khi xóa' });
    } finally {
      setDeleting(null);
    }
  };

  const openEdit = (u: UserRow) => {
    setPanelError(null);
    setEditingUser(u);
    setShowAdd(false);
  };

  const openAdd = () => {
    setPanelError(null);
    setShowAdd(true);
    setEditingUser(null);
  };

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="fade-up" style={{ paddingBottom: 40 }}>
      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Tài khoản người dùng</h1>
          <p className="page-subtitle">
            {total} tài khoản · {staffCount} nhân sự văn phòng · {driverCount} tài xế
          </p>
        </div>
        {canManage && (
          <div className="page-actions">
            <button
              className="btn btn--primary"
              onClick={openAdd}
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <Plus size={14} /> Thêm tài khoản
            </button>
          </div>
        )}
      </div>

      {/* KPI grid */}
      <div className="kpi-grid" style={{ marginBottom: 24 }}>
        <div className="kpi">
          <div className="kpi__top"><span className="kpi__label">Tổng tài khoản</span></div>
          <div className="kpi__value">{total}</div>
          <div className="kpi__meta kpi__meta--up">Đang hoạt động trong hệ thống</div>
          <div className="kpi__watermark" aria-hidden="true"><Users size={72} /></div>
        </div>
        <div className="kpi kpi--warn">
          <div className="kpi__top"><span className="kpi__label">Nhân sự văn phòng</span></div>
          <div className="kpi__value">{staffCount}</div>
          <div className="kpi__meta">Admin · Quản lý · Kế toán</div>
          <div className="kpi__watermark" aria-hidden="true"><UserCog size={72} /></div>
        </div>
        <div className="kpi kpi--success">
          <div className="kpi__top"><span className="kpi__label">Tài xế</span></div>
          <div className="kpi__value">{driverCount}</div>
          <div className="kpi__meta">Có quyền xem lệnh chạy xe</div>
          <div className="kpi__watermark" aria-hidden="true"><ShieldCheck size={72} /></div>
        </div>
        <div className="kpi kpi--danger">
          <div className="kpi__top"><span className="kpi__label">Bị khoá / Ngưng</span></div>
          <div className="kpi__value">{inactiveCount}</div>
          <div className="kpi__meta">Không thể đăng nhập</div>
          <div className="kpi__watermark" aria-hidden="true"><Lock size={72} /></div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        {(['all', ...Object.values(Role)] as FilterKey[]).map(f => {
          const label = f === 'all'
            ? `Tất cả · ${total}`
            : `${ROLE_LABELS[f as Role]} · ${users.filter(u => u.role === f).length}`;
          return (
            <button
              key={f}
              className={`filter-pill${filter === f ? ' is-active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {label}
            </button>
          );
        })}
        <div className="toolbar__spacer" />
        <div className="toolbar__search">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
          <input
            type="text"
            placeholder="Tìm theo username, email, SĐT..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Loading */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <div className="spin" style={{ width: 28, height: 28, border: '3px solid var(--line-2)', borderTopColor: 'var(--brand)', borderRadius: '50%' }} />
        </div>
      ) : (
        <>
          {/* ── Mobile card list (≤640px) ─────────────────────────────────── */}
          <div className="mobile-only mobile-table-wrap">
            <div className="m-card-list">
              {filtered.length === 0 ? (
                <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--ink-3)' }}>Không tìm thấy tài khoản nào</div>
              ) : (
                filtered.map(u => {
                  const pill     = ROLE_PILL[u.role] || { cls: 'pill pill--neutral', label: u.role };
                  const avatarCol = AVATAR_COLORS[u.role] ?? AVATAR_COLORS[Role.DRIVER];
                  const isMe     = u.id === me?.userId;
                  return (
                    <div key={u.id} className="m-card" style={{ cursor: 'default' }}>
                      <div className="m-card__top">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                            background: avatarCol.bg, color: avatarCol.color,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 13, fontWeight: 700,
                          }}>
                            {(u.fullName || u.username || u.email || '?').charAt(0).toUpperCase()}
                          </div>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {u.fullName || u.username || <span style={{ color: 'var(--ink-3)', fontStyle: 'italic' }}>—</span>}
                              {isMe && <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--brand)', fontWeight: 500 }}>(bạn)</span>}
                            </div>
                            {u.username && <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>@{u.username}</div>}
                            {u.email && <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{u.email}</div>}
                          </div>
                        </div>
                        <span className={pill.cls} style={{ flexShrink: 0 }}><span className="dot" />{pill.label}</span>
                      </div>
                      <div className="m-card__row" style={{ marginTop: 6 }}>
                        <span className="m-card__row-label">Trạng thái</span>
                        {u.status === 'ACTIVE'
                          ? <span className="pill pill--success" style={{ fontSize: 11 }}><span className="dot" />Hoạt động</span>
                          : <span className="pill pill--danger" style={{ fontSize: 11 }}><span className="dot" />Bị khoá</span>}
                      </div>
                      {u.phone && (
                        <div className="m-card__row">
                          <span className="m-card__row-label">SĐT</span>
                          <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>{u.phone}</span>
                        </div>
                      )}
                      <div className="m-card__row">
                        <span className="m-card__row-label">Ngày tạo</span>
                        <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{formatDate(u.createdAt)}</span>
                      </div>
                      {canManage && (
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', marginTop: 8 }}>
                          <button
                            className="btn btn--ghost btn--sm"
                            style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                            onClick={() => openEdit(u)}
                          >
                            <Pencil size={12} /> Sửa
                          </button>
                          <button
                            className="btn btn--ghost btn--sm"
                            style={{ display: 'flex', alignItems: 'center', gap: 4, color: isMe ? 'var(--ink-3)' : 'var(--danger)' }}
                            disabled={!!deleting || isMe}
                            onClick={() => !isMe && doDelete(u.id)}
                          >
                            {deleting === u.id ? <Loader2 size={12} className="spin" /> : <Trash2 size={12} />} Xoá
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
            <div className="table-foot">
              <span>Hiển thị <strong style={{ fontFamily: 'var(--font-mono)' }}>{filtered.length}</strong> / <strong style={{ fontFamily: 'var(--font-mono)' }}>{total}</strong> tài khoản</span>
            </div>
          </div>

          {/* ── Desktop table (>640px) ──────────────────────────────────── */}
          <div className="desktop-only table-wrap">
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Tài khoản</th>
                    <th>Liên hệ</th>
                    <th>Vai trò</th>
                    <th>Trạng thái</th>
                    <th>Ngày tạo</th>
                    {canManage && <th style={{ width: 80 }}></th>}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={canManage ? 6 : 5} style={{ textAlign: 'center', padding: '48px 12px', color: 'var(--ink-3)' }}>
                        Không tìm thấy tài khoản nào
                      </td>
                    </tr>
                  )}
                  {filtered.map(u => {
                    const pill      = ROLE_PILL[u.role] || { cls: 'pill pill--neutral', label: u.role };
                    const avatarCol = AVATAR_COLORS[u.role] ?? AVATAR_COLORS[Role.DRIVER];
                    const isMe      = u.id === me?.userId;
                    return (
                      <tr key={u.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                              width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                              background: avatarCol.bg, color: avatarCol.color,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 13, fontWeight: 700,
                            }}>
                              {(u.fullName || u.username || u.email || '?').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="row-strong">
                                {u.fullName || u.username || <span style={{ color: 'var(--ink-3)', fontStyle: 'italic' }}>—</span>}
                                {isMe && <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--accent)', fontWeight: 500 }}>(bạn)</span>}
                              </div>
                              {u.username && <div className="row-meta">@{u.username}</div>}
                            </div>
                          </div>
                        </td>
                        <td>
                          {u.email && <div style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>{u.email}</div>}
                          {u.phone && <div className="row-meta">{u.phone}</div>}
                          {!u.email && !u.phone && <span style={{ color: 'var(--ink-3)' }}>—</span>}
                        </td>
                        <td><span className={pill.cls}><span className="dot" />{pill.label}</span></td>
                        <td>
                          {u.status === 'ACTIVE'
                            ? <span className="pill pill--success"><span className="dot" />Hoạt động</span>
                            : <span className="pill pill--danger"><span className="dot" />Bị khoá</span>}
                        </td>
                        <td style={{ color: 'var(--ink-3)', fontSize: 12.5, whiteSpace: 'nowrap' }}>
                          {formatDate(u.createdAt)}
                        </td>
                        {canManage && (
                          <td>
                            <div className="row-actions">
                              <button
                                className="row-action"
                                title="Chỉnh sửa tài khoản"
                                onClick={() => openEdit(u)}
                              >
                                <Pencil size={13} />
                              </button>
                              <button
                                className="row-action"
                                title={isMe ? 'Không thể tự xóa' : 'Xóa tài khoản'}
                                disabled={!!deleting || isMe}
                                onClick={() => !isMe && doDelete(u.id)}
                                style={{ opacity: isMe ? 0.3 : 1 }}
                              >
                                {deleting === u.id
                                  ? <Loader2 size={13} className="spin" />
                                  : <Trash2 size={13} style={{ color: isMe ? undefined : 'var(--danger)' }} />}
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="table-foot">
              <span>
                Đang hiển thị <strong style={{ fontFamily: 'var(--font-mono)' }}>{filtered.length}</strong> trên <strong style={{ fontFamily: 'var(--font-mono)' }}>{total}</strong> tài khoản
              </span>
            </div>
          </div>
        </>
      )}

      {/* Hint for non-managers */}
      {!canManage && (
        <div style={{
          marginTop: 20, padding: '12px 16px',
          background: 'var(--surface-2)', borderRadius: 8,
          display: 'flex', alignItems: 'center', gap: 10,
          color: 'var(--ink-3)', fontSize: 12.5,
        }}>
          <KeyRound size={14} />
          Chỉ quản trị viên hoặc giám đốc mới có thể tạo, sửa hoặc xóa tài khoản.
        </div>
      )}

      {/* Panels */}
      {showAdd && (
        <AddPanel
          saving={saving}
          error={panelError}
          onClose={() => { setShowAdd(false); setPanelError(null); }}
          onSave={doCreate}
        />
      )}
      {editingUser && (
        <EditPanel
          user={editingUser}
          isMe={editingUser.id === me?.userId}
          saving={saving}
          error={panelError}
          onClose={() => { setEditingUser(null); setPanelError(null); }}
          onSave={doUpdate}
        />
      )}

      {confirmDialog}
    </div>
  );
}
