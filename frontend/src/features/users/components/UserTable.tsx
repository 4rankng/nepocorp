import {
  Users, ShieldCheck, UserCog, Lock, Plus, Pencil, Trash2,
  Loader2, KeyRound, Mail, Phone, Search, UserX,
} from 'lucide-react';
import { formatDate } from '../../../lib/format';
import { Role, ROLE_LABELS, ROLE_PILL, FilterKey } from '../utils';
import type { UserRow } from '../utils';
import { UserStatusBadge } from './UserStatusBadge';

interface UserTableProps {
  users: UserRow[];
  filtered: UserRow[];
  total: number;
  staffCount: number;
  driverCount: number;
  inactiveCount: number;
  filter: FilterKey;
  search: string;
  canManage: boolean;
  deleting: number | null;
  currentUserId?: number;
  onFilterChange: (f: FilterKey) => void;
  onSearchChange: (s: string) => void;
  onEdit: (u: UserRow) => void;
  onDelete: (id: number) => void;
  onAdd: () => void;
}

const AVATAR_CLS: Record<Role, string> = {
  [Role.ADMIN]: 'user-avatar--admin',
  [Role.MANAGER]: 'user-avatar--manager',
  [Role.ACCOUNTANT]: 'user-avatar--accountant',
  [Role.DRIVER]: 'user-avatar--driver',
  [Role.FORWARDER]: 'user-avatar--forwarder',
};

const ROLE_FILTER_CLS: Record<string, string> = {
  [Role.ADMIN]: 'filter-pill--admin',
  [Role.MANAGER]: 'filter-pill--manager',
  [Role.ACCOUNTANT]: 'filter-pill--accountant',
  [Role.DRIVER]: 'filter-pill--driver',
  [Role.FORWARDER]: 'filter-pill--forwarder',
};

export function UserTable({
  users, filtered, total, staffCount, driverCount, inactiveCount,
  filter, search, canManage, deleting, currentUserId,
  onFilterChange, onSearchChange, onEdit, onDelete, onAdd,
}: UserTableProps) {
  return (
    <>
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Quản lý <em>người dùng</em></h1>
          <p className="page-subtitle">
            {total} tài khoản · {staffCount} nhân sự · {driverCount} tài xế
          </p>
        </div>
        {canManage && (
          <div className="page-actions">
            <button
              className="btn btn--primary"
              onClick={onAdd}
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <Plus size={14} /> Thêm tài khoản
            </button>
          </div>
        )}
      </div>

      {/* ── KPI grid ────────────────────────────────────────────────────── */}
      <div className="kpi-grid" style={{ marginBottom: 24 }}>
        <div className="kpi">
          <div className="kpi__top">
            <span className="kpi__label">Tổng tài khoản</span>
            <div className="kpi__icon"><Users size={18} /></div>
          </div>
          <div className="kpi__value">{total}</div>
          <div className="kpi__meta kpi__meta--up">Đang hoạt động</div>
          <div className="kpi__watermark" aria-hidden="true"><Users size={72} /></div>
        </div>
        <div className="kpi kpi--warn">
          <div className="kpi__top">
            <span className="kpi__label">Nhân sự văn phòng</span>
            <div className="kpi__icon"><UserCog size={18} /></div>
          </div>
          <div className="kpi__value">{staffCount}</div>
          <div className="kpi__meta">Admin · Quản lý · Kế toán</div>
          <div className="kpi__watermark" aria-hidden="true"><UserCog size={72} /></div>
        </div>
        <div className="kpi kpi--success">
          <div className="kpi__top">
            <span className="kpi__label">Tài xế</span>
            <div className="kpi__icon"><ShieldCheck size={18} /></div>
          </div>
          <div className="kpi__value">{driverCount}</div>
          <div className="kpi__meta">Có quyền xem lệnh chạy xe</div>
          <div className="kpi__watermark" aria-hidden="true"><ShieldCheck size={72} /></div>
        </div>
        <div className="kpi kpi--danger">
          <div className="kpi__top">
            <span className="kpi__label">Bị khoá / Ngưng</span>
            <div className="kpi__icon"><Lock size={18} /></div>
          </div>
          <div className="kpi__value">{inactiveCount}</div>
          <div className="kpi__meta">Không thể đăng nhập</div>
          <div className="kpi__watermark" aria-hidden="true"><Lock size={72} /></div>
        </div>
      </div>

      {/* ── Unified panel: toolbar + table + footer ─────────────────────── */}
      <div className="users-table-panel">
        {/* Filter toolbar */}
        <div className="toolbar">
          {(['all', ...Object.values(Role)] as FilterKey[]).map(f => {
            const count = f === 'all' ? total : users.filter(u => u.role === f).length;
            const label = f === 'all' ? 'Tất cả' : ROLE_LABELS[f as Role];
            return (
              <button
                key={f}
                className={`filter-pill${filter === f ? ' is-active' : ''} ${ROLE_FILTER_CLS[f] || ''}`}
                onClick={() => onFilterChange(f)}
              >
                <span>{label}</span>
                <span className="filter-pill__count">{count}</span>
              </button>
            );
          })}
          <div className="toolbar__spacer" />
          <div className="toolbar__search">
            <Search size={14} />
            <input
              type="text"
              placeholder="Tìm theo username, email, SĐT..."
              value={search}
              onChange={e => onSearchChange(e.target.value)}
            />
          </div>
        </div>

        {/* Desktop table */}
        <DesktopTable
          filtered={filtered}
          canManage={canManage}
          deleting={deleting}
          currentUserId={currentUserId}
          onEdit={onEdit}
          onDelete={onDelete}
        />

        {/* Mobile cards */}
        <MobileCardList
          filtered={filtered}
          canManage={canManage}
          deleting={deleting}
          currentUserId={currentUserId}
          onEdit={onEdit}
          onDelete={onDelete}
        />

        {/* Footer */}
        <div className="table-foot">
          <span>
            Hiển thị <strong style={{ fontFamily: 'var(--font-mono)' }}>{filtered.length}</strong> / <strong style={{ fontFamily: 'var(--font-mono)' }}>{total}</strong> tài khoản
          </span>
        </div>
      </div>

      {/* Permission notice */}
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
    </>
  );
}

/* ── Desktop table (inside panel) ─────────────────────────────────────────── */

function DesktopTable({ filtered, canManage, deleting, currentUserId, onEdit, onDelete }: {
  filtered: UserRow[];
  canManage: boolean;
  deleting: number | null;
  currentUserId?: number;
  onEdit: (u: UserRow) => void;
  onDelete: (id: number) => void;
}) {
  return (
    <div className="desktop-only">
      <div className="table-scroll">
        <table className="tt-table" style={{ minWidth: 900 }}>
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
                <td colSpan={canManage ? 6 : 5}>
                  <div className="users-empty">
                    <div className="users-empty__icon"><UserX size={24} /></div>
                    <p className="users-empty__title">Không tìm thấy tài khoản</p>
                    <p className="users-empty__desc">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
                  </div>
                </td>
              </tr>
            )}
            {filtered.map(u => {
              const pill = ROLE_PILL[u.role] || { cls: 'pill pill--neutral', label: u.role };
              const isMe = u.id === currentUserId;
              return (
                <tr key={u.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div className={`user-avatar ${AVATAR_CLS[u.role]}`}>
                        {(u.fullName || u.username || u.email || '?').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="user-name">
                          {u.fullName || u.username || <span style={{ color: 'var(--ink-3)', fontStyle: 'italic' }}>—</span>}
                          {isMe && <span className="user-name__you">(bạn)</span>}
                        </div>
                        {u.username && <div className="user-handle">@{u.username}</div>}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="user-contact">
                      {u.email && (
                        <div className="user-contact__row">
                          <Mail size={13} />
                          <span>{u.email}</span>
                        </div>
                      )}
                      {u.phone && (
                        <div className="user-contact__row">
                          <Phone size={13} />
                          <span>{u.phone}</span>
                        </div>
                      )}
                      {!u.email && !u.phone && <span style={{ color: 'var(--ink-3)' }}>—</span>}
                    </div>
                  </td>
                  <td><span className={pill.cls}><span className="dot" />{pill.label}</span></td>
                  <td><UserStatusBadge status={u.status} /></td>
                  <td style={{ color: 'var(--ink-3)', fontSize: 12.5, whiteSpace: 'nowrap' }}>
                    {formatDate(u.createdAt)}
                  </td>
                  {canManage && (
                    <td>
                      <div className="row-actions">
                        <button
                          className="row-action"
                          title="Chỉnh sửa tài khoản"
                          onClick={() => onEdit(u)}
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          className="row-action"
                          title={isMe ? 'Không thể tự xóa' : 'Xóa tài khoản'}
                          disabled={!!deleting || isMe}
                          onClick={() => !isMe && onDelete(u.id)}
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
    </div>
  );
}

/* ── Mobile card list (inside panel) ──────────────────────────────────────── */

function MobileCardList({ filtered, canManage, deleting, currentUserId, onEdit, onDelete }: {
  filtered: UserRow[];
  canManage: boolean;
  deleting: number | null;
  currentUserId?: number;
  onEdit: (u: UserRow) => void;
  onDelete: (id: number) => void;
}) {
  return (
    <div className="mobile-only">
      {filtered.length === 0 ? (
        <div className="users-empty">
          <div className="users-empty__icon"><UserX size={24} /></div>
          <p className="users-empty__title">Không tìm thấy tài khoản</p>
          <p className="users-empty__desc">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
        </div>
      ) : (
        filtered.map(u => {
          const pill = ROLE_PILL[u.role] || { cls: 'pill pill--neutral', label: u.role };
          const isMe = u.id === currentUserId;
          return (
            <div key={u.id} className="m-card users-mobile-card" style={{ cursor: 'default' }}>
              <div className="users-mobile-card__header">
                <div className={`user-avatar ${AVATAR_CLS[u.role]}`}>
                  {(u.fullName || u.username || u.email || '?').charAt(0).toUpperCase()}
                </div>
                <div className="users-mobile-card__info">
                  <div className="users-mobile-card__name">
                    {u.fullName || u.username || <span style={{ color: 'var(--ink-3)', fontStyle: 'italic' }}>—</span>}
                    {isMe && <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--accent)', fontWeight: 500 }}>(bạn)</span>}
                  </div>
                  {u.username && <div className="users-mobile-card__handle">@{u.username}</div>}
                </div>
                <span className={`users-mobile-card__role ${pill.cls}`}><span className="dot" />{pill.label}</span>
              </div>
              <div className="users-mobile-card__details">
                <UserStatusBadge status={u.status} />
                {u.email && (
                  <span className="users-mobile-card__detail">
                    <Mail size={12} /> {u.email}
                  </span>
                )}
                {u.phone && (
                  <span className="users-mobile-card__detail">
                    <Phone size={12} /> {u.phone}
                  </span>
                )}
                <span className="users-mobile-card__detail" style={{ color: 'var(--ink-4)' }}>
                  {formatDate(u.createdAt)}
                </span>
              </div>
              {canManage && (
                <div className="users-mobile-card__actions">
                  <button className="users-mobile-card__action-btn" onClick={() => onEdit(u)}>
                    <Pencil size={12} /> Sửa
                  </button>
                  <button
                    className="users-mobile-card__action-btn users-mobile-card__action-btn--danger"
                    disabled={!!deleting || isMe}
                    onClick={() => !isMe && onDelete(u.id)}
                    style={{ opacity: isMe ? 0.4 : 1 }}
                  >
                    {deleting === u.id ? <Loader2 size={12} className="spin" /> : <Trash2 size={12} />}
                    Xoá
                  </button>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
