import {
  Users, ShieldCheck, UserCog, Lock, Plus, Pencil, Trash2,
  Loader2, KeyRound,
} from 'lucide-react';
import { formatDate } from '../../../lib/format';
import { Role, ROLE_LABELS } from '../utils';
import { ROLE_PILL, AVATAR_COLORS, FilterKey } from '../utils';
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

export function UserTable({
  users, filtered, total, staffCount, driverCount, inactiveCount,
  filter, search, canManage, deleting, currentUserId,
  onFilterChange, onSearchChange, onEdit, onDelete, onAdd,
}: UserTableProps) {
  return (
    <>
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
              onClick={onAdd}
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <Plus size={14} /> Thêm tài khoản
            </button>
          </div>
        )}
      </div>

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

      <div className="toolbar">
        {(['all', ...Object.values(Role)] as FilterKey[]).map(f => {
          const label = f === 'all'
            ? `Tất cả · ${total}`
            : `${ROLE_LABELS[f as Role]} · ${users.filter(u => u.role === f).length}`;
          return (
            <button
              key={f}
              className={`filter-pill${filter === f ? ' is-active' : ''}`}
              onClick={() => onFilterChange(f)}
            >
              {label}
            </button>
          );
        })}
        <div className="toolbar__spacer" />
        <div className="toolbar__search">
          <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
          <input
            type="text"
            placeholder="Tìm theo username, email, SĐT..."
            value={search}
            onChange={e => onSearchChange(e.target.value)}
          />
        </div>
      </div>

      <MobileCardList
        filtered={filtered}
        canManage={canManage}
        deleting={deleting}
        currentUserId={currentUserId}
        total={total}
        onEdit={onEdit}
        onDelete={onDelete}
      />

      <DesktopTable
        filtered={filtered}
        canManage={canManage}
        deleting={deleting}
        currentUserId={currentUserId}
        total={total}
        onEdit={onEdit}
        onDelete={onDelete}
      />

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

// ── Mobile Card List ──────────────────────────────────────────────────────

function MobileCardList({ filtered, canManage, deleting, currentUserId, total, onEdit, onDelete }: {
  filtered: UserRow[];
  canManage: boolean;
  deleting: number | null;
  currentUserId?: number;
  total: number;
  onEdit: (u: UserRow) => void;
  onDelete: (id: number) => void;
}) {
  return (
    <div className="mobile-only mobile-table-wrap">
      <div className="m-card-list">
        {filtered.length === 0 ? (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--ink-3)' }}>Không tìm thấy tài khoản nào</div>
        ) : (
          filtered.map(u => {
            const pill = ROLE_PILL[u.role] || { cls: 'pill pill--neutral', label: u.role };
            const avatarCol = AVATAR_COLORS[u.role] ?? AVATAR_COLORS[Role.DRIVER];
            const isMe = u.id === currentUserId;
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
                  <UserStatusBadge status={u.status} />
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
                      onClick={() => onEdit(u)}
                    >
                      <Pencil size={12} /> Sửa
                    </button>
                    <button
                      className="btn btn--ghost btn--sm"
                      style={{ display: 'flex', alignItems: 'center', gap: 4, color: isMe ? 'var(--ink-3)' : 'var(--danger)' }}
                      disabled={!!deleting || isMe}
                      onClick={() => !isMe && onDelete(u.id)}
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
  );
}

// ── Desktop Table ─────────────────────────────────────────────────────────

function DesktopTable({ filtered, canManage, deleting, currentUserId, total, onEdit, onDelete }: {
  filtered: UserRow[];
  canManage: boolean;
  deleting: number | null;
  currentUserId?: number;
  total: number;
  onEdit: (u: UserRow) => void;
  onDelete: (id: number) => void;
}) {
  return (
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
              const pill = ROLE_PILL[u.role] || { cls: 'pill pill--neutral', label: u.role };
              const avatarCol = AVATAR_COLORS[u.role] ?? AVATAR_COLORS[Role.DRIVER];
              const isMe = u.id === currentUserId;
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
      <div className="table-foot">
        <span>
          Đang hiển thị <strong style={{ fontFamily: 'var(--font-mono)' }}>{filtered.length}</strong> trên <strong style={{ fontFamily: 'var(--font-mono)' }}>{total}</strong> tài khoản
        </span>
      </div>
    </div>
  );
}
