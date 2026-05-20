import { useState, useEffect, useCallback } from 'react';
import {
  Users, ShieldCheck, UserCog, Lock, Plus, Pencil, Trash2,
  Loader2, Save, X, KeyRound, Eye, EyeOff,
} from 'lucide-react';
import { api } from '../lib/api';
import { formatDate } from '../lib/format';
import { Role, ROLE_LABELS } from '@nepocorp/shared';
import { useAuth } from '../hooks/useAuth';

interface UserRow {
  id: number;
  username: string | null;
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

type FilterKey = 'all' | Role;

export default function UsersPage() {
  const { user: me } = useAuth();
  const isAdmin = me?.role === Role.ADMIN;

  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filter, setFilter] = useState<FilterKey>('all');
  const [search, setSearch] = useState('');

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);

  // Add form state
  const [addUsername, setAddUsername] = useState('');
  const [addEmail, setAddEmail]     = useState('');
  const [addPhone, setAddPhone]     = useState('');
  const [addRole, setAddRole]       = useState<Role>(Role.DRIVER);
  const [addPassword, setAddPassword] = useState('');
  const [showAddPw, setShowAddPw]   = useState(false);
  const [addError, setAddError]     = useState<string | null>(null);

  // Edit form state
  const [editRole, setEditRole]     = useState<Role>(Role.DRIVER);
  const [editStatus, setEditStatus] = useState('ACTIVE');
  const [editPassword, setEditPassword] = useState('');
  const [showEditPw, setShowEditPw] = useState(false);
  const [editError, setEditError]   = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<{ items: UserRow[] }>('/auth/users');
      setUsers(data.items || []);
    } catch (e: any) {
      setError(e.message || 'Không thể tải danh sách tài khoản');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Derived stats ──────────────────────────────────────────────────────────
  const total = users.length;
  const staffCount = users.filter(u => u.role !== Role.DRIVER).length;
  const driverCount = users.filter(u => u.role === Role.DRIVER).length;
  const inactiveCount = users.filter(u => u.status !== 'ACTIVE').length;

  const filtered = users
    .filter(u => filter === 'all' || u.role === filter)
    .filter(u => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (u.username || '').toLowerCase().includes(q)
        || (u.email || '').toLowerCase().includes(q)
        || (u.phone || '').includes(q);
    });

  // ── CRUD ───────────────────────────────────────────────────────────────────

  const doCreate = async () => {
    if (!addPassword || (!addUsername && !addEmail && !addPhone)) {
      setAddError('Cần ít nhất username/email/SĐT và mật khẩu');
      return;
    }
    setSaving(true);
    setAddError(null);
    try {
      await api.post('/auth/users', {
        username: addUsername || undefined,
        email: addEmail || undefined,
        phone: addPhone || undefined,
        password: addPassword,
        role: addRole,
      });
      setShowAddForm(false);
      setAddUsername(''); setAddEmail(''); setAddPhone('');
      setAddPassword(''); setAddRole(Role.DRIVER);
      load();
    } catch (e: any) {
      setAddError(e.message || 'Lỗi khi tạo tài khoản');
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (u: UserRow) => {
    setEditingId(u.id);
    setEditRole(u.role);
    setEditStatus(u.status);
    setEditPassword('');
    setEditError(null);
    setShowEditPw(false);
  };

  const doUpdate = async (id: number) => {
    setSaving(true);
    setEditError(null);
    try {
      const body: Record<string, unknown> = { role: editRole, status: editStatus };
      if (editPassword) body.password = editPassword;
      await api.patch(`/auth/users/${id}`, body);
      setEditingId(null);
      load();
    } catch (e: any) {
      setEditError(e.message || 'Lỗi khi cập nhật');
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async (id: number) => {
    if (!window.confirm('Xóa tài khoản này? Thao tác không thể hoàn tác.')) return;
    setDeleting(id);
    try {
      await api.delete(`/auth/users/${id}`);
      load();
    } catch (e: any) {
      alert(e.message || 'Lỗi khi xóa');
    } finally {
      setDeleting(null);
    }
  };

  const cancelAdd = () => {
    setShowAddForm(false);
    setAddUsername(''); setAddEmail(''); setAddPhone('');
    setAddPassword(''); setAddRole(Role.DRIVER); setAddError(null);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

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
        {isAdmin && (
          <div className="page-actions">
            <button className="btn btn--primary" onClick={() => setShowAddForm(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Plus size={14} /> Thêm tài khoản
            </button>
          </div>
        )}
      </div>

      {/* KPI grid */}
      <div className="kpi-grid" style={{ marginBottom: 24 }}>
        <div className="kpi">
          <div className="kpi__top">
            <span className="kpi__label">Tổng tài khoản</span>
            <div className="kpi__icon"><Users size={18} /></div>
          </div>
          <div className="kpi__value">{total}</div>
          <div className="kpi__meta kpi__meta--up">Đang hoạt động trong hệ thống</div>
        </div>
        <div className="kpi kpi--warn">
          <div className="kpi__top">
            <span className="kpi__label">Nhân sự văn phòng</span>
            <div className="kpi__icon"><UserCog size={18} /></div>
          </div>
          <div className="kpi__value">{staffCount}</div>
          <div className="kpi__meta">Admin · Quản lý · Kế toán</div>
        </div>
        <div className="kpi kpi--success">
          <div className="kpi__top">
            <span className="kpi__label">Tài xế</span>
            <div className="kpi__icon"><ShieldCheck size={18} /></div>
          </div>
          <div className="kpi__value">{driverCount}</div>
          <div className="kpi__meta">Có quyền xem lệnh chạy xe</div>
        </div>
        <div className="kpi kpi--danger">
          <div className="kpi__top">
            <span className="kpi__label">Bị khoá / Ngưng</span>
            <div className="kpi__icon"><Lock size={18} /></div>
          </div>
          <div className="kpi__value">{inactiveCount}</div>
          <div className="kpi__meta">Không thể đăng nhập</div>
        </div>
      </div>

      {/* Add form */}
      {showAddForm && isAdmin && (
        <div style={{ background: 'var(--brand-soft)', border: '1px solid var(--line-2)', borderRadius: 12, padding: '20px 24px', marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Tạo tài khoản mới</h3>
            <button className="btn btn--ghost btn--sm btn--icon" onClick={cancelAdd}><X size={14} /></button>
          </div>
          {addError && (
            <div style={{ padding: '10px 14px', marginBottom: 14, background: 'var(--danger-soft)', color: 'var(--danger)', borderRadius: 8, fontSize: 12.5 }}>
              {addError}
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 12, alignItems: 'end' }}>
            <div className="field">
              <label>Username</label>
              <input className="input" value={addUsername} onChange={e => setAddUsername(e.target.value)} placeholder="vd: nguyen.van.a" />
            </div>
            <div className="field">
              <label>Email</label>
              <input className="input" type="email" value={addEmail} onChange={e => setAddEmail(e.target.value)} placeholder="vd: nva@cty.vn" />
            </div>
            <div className="field">
              <label>Số điện thoại</label>
              <input className="input" value={addPhone} onChange={e => setAddPhone(e.target.value)} placeholder="0912..." />
            </div>
            <div className="field">
              <label>Vai trò</label>
              <select className="input" value={addRole} onChange={e => setAddRole(e.target.value as Role)}>
                {Object.values(Role).map(r => (
                  <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Mật khẩu *</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="input"
                  type={showAddPw ? 'text' : 'password'}
                  value={addPassword}
                  onChange={e => setAddPassword(e.target.value)}
                  placeholder="Tối thiểu 6 ký tự"
                  style={{ paddingRight: 36 }}
                />
                <button
                  type="button"
                  onClick={() => setShowAddPw(v => !v)}
                  style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', padding: 2 }}
                >
                  {showAddPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', paddingBottom: 1 }}>
              <button
                className="btn btn--primary"
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                disabled={saving}
                onClick={doCreate}
              >
                {saving ? <Loader2 size={13} className="spin" /> : <Save size={13} />}
                Tạo tài khoản
              </button>
              <button className="btn btn--ghost" onClick={cancelAdd}>Hủy</button>
            </div>
          </div>
        </div>
      )}

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

      {/* Error / Loading */}
      {error && (
        <div style={{ padding: 16, background: 'var(--danger-soft)', color: 'var(--danger)', borderRadius: 8, marginBottom: 20 }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <div className="spin" style={{ width: 28, height: 28, border: '3px solid var(--line-2)', borderTopColor: 'var(--brand)', borderRadius: '50%' }} />
        </div>
      ) : (
        <div className="table-wrap">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Tài khoản</th>
                  <th>Liên hệ</th>
                  <th>Vai trò</th>
                  <th>Trạng thái</th>
                  <th>Ngày tạo</th>
                  {isAdmin && <th style={{ width: 80 }}></th>}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={isAdmin ? 6 : 5} style={{ textAlign: 'center', padding: '48px 12px', color: 'var(--ink-3)' }}>
                      Không tìm thấy tài khoản nào
                    </td>
                  </tr>
                )}
                {filtered.map(u => {
                  const pill = ROLE_PILL[u.role] || { cls: 'pill pill--neutral', label: u.role };
                  const isMe = u.id === me?.userId;

                  if (editingId === u.id) {
                    return (
                      <tr key={`edit-${u.id}`} style={{ background: 'var(--brand-soft)' }}>
                        <td colSpan={isAdmin ? 6 : 5} style={{ padding: '12px 16px' }}>
                          {editError && (
                            <div style={{ marginBottom: 10, color: 'var(--danger)', fontSize: 12.5 }}>{editError}</div>
                          )}
                          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                            <div style={{ color: 'var(--ink)', fontWeight: 600, fontSize: 13, minWidth: 140 }}>
                              {u.username || u.email || u.phone}
                              {isMe && <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--accent)', fontWeight: 500 }}>(bạn)</span>}
                            </div>
                            <div className="field" style={{ minWidth: 140 }}>
                              <label>Vai trò</label>
                              <select className="input" value={editRole} onChange={e => setEditRole(e.target.value as Role)}>
                                {Object.values(Role).map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                              </select>
                            </div>
                            <div className="field" style={{ minWidth: 130 }}>
                              <label>Trạng thái</label>
                              <select className="input" value={editStatus} onChange={e => setEditStatus(e.target.value)}>
                                <option value="ACTIVE">Hoạt động</option>
                                <option value="INACTIVE">Bị khoá</option>
                              </select>
                            </div>
                            <div className="field" style={{ minWidth: 180 }}>
                              <label>Đặt lại mật khẩu (tùy chọn)</label>
                              <div style={{ position: 'relative' }}>
                                <input
                                  className="input"
                                  type={showEditPw ? 'text' : 'password'}
                                  value={editPassword}
                                  onChange={e => setEditPassword(e.target.value)}
                                  placeholder="Để trống = không đổi"
                                  style={{ paddingRight: 36 }}
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowEditPw(v => !v)}
                                  style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', padding: 2 }}
                                >
                                  {showEditPw ? <EyeOff size={14} /> : <Eye size={14} />}
                                </button>
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button
                                className="btn btn--primary btn--sm"
                                disabled={saving}
                                onClick={() => doUpdate(u.id)}
                                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                              >
                                {saving ? <Loader2 size={12} className="spin" /> : <Save size={12} />}
                                Lưu
                              </button>
                              <button className="btn btn--ghost btn--sm" onClick={() => setEditingId(null)}>
                                <X size={12} /> Hủy
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={u.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                            background: u.role === Role.ADMIN ? 'var(--danger-soft)' : u.role === Role.DRIVER ? 'var(--success-soft)' : 'var(--warning-soft)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 13, fontWeight: 700, color: u.role === Role.ADMIN ? 'var(--danger)' : u.role === Role.DRIVER ? 'var(--success)' : 'var(--warning)',
                          }}>
                            {(u.username || u.email || '?').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="row-strong">
                              {u.username || <span style={{ color: 'var(--ink-3)', fontStyle: 'italic' }}>—</span>}
                              {isMe && <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--accent)', fontWeight: 500 }}>(bạn)</span>}
                            </div>
                            <div className="row-meta">ID #{u.id}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        {u.email && <div style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>{u.email}</div>}
                        {u.phone && <div className="row-meta">{u.phone}</div>}
                        {!u.email && !u.phone && <span style={{ color: 'var(--ink-3)' }}>—</span>}
                      </td>
                      <td>
                        <span className={pill.cls}><span className="dot" />{pill.label}</span>
                      </td>
                      <td>
                        {u.status === 'ACTIVE'
                          ? <span className="pill pill--success"><span className="dot" />Hoạt động</span>
                          : <span className="pill pill--danger"><span className="dot" />Bị khoá</span>}
                      </td>
                      <td style={{ color: 'var(--ink-3)', fontSize: 12.5, whiteSpace: 'nowrap' }}>{formatDate(u.createdAt)}</td>
                      {isAdmin && (
                        <td>
                          <div className="row-actions">
                            <button className="row-action" title="Sửa vai trò / trạng thái" onClick={() => openEdit(u)}>
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
      )}

      {/* Reset-password hint for non-admin viewers */}
      {!isAdmin && (
        <div style={{ marginTop: 20, padding: '12px 16px', background: 'var(--surface-2)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10, color: 'var(--ink-3)', fontSize: 12.5 }}>
          <KeyRound size={14} />
          Chỉ quản trị viên mới có thể tạo, sửa hoặc xóa tài khoản.
        </div>
      )}
    </div>
  );
}
