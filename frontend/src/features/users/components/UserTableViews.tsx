import { Users, ShieldCheck, UserCog, KeyRound, Trash2, Loader2, Mail, Phone, UserX, MoreVertical, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { formatDate } from '../../../lib/format';
import { Role, ROLE_PILL } from '../utils';
import type { UserRow } from '../utils';
import { StatusStrip } from '../../../components/shared/StatusStrip';
import { resolveEmptyIllustration } from '../../../lib/emptyIllustrations';

/**
 * The two row views of the users table (desktop grid + mobile card list) plus
 * their avatar/row helpers, lifted out of UserTable.tsx to keep both files under
 * the size budget. Presentation only — every action arrives as a callback.
 */

const AVATAR_CLS: Record<Role, string> = {
  [Role.ADMIN]: 'user-avatar--admin',
  [Role.MANAGER]: 'user-avatar--manager',
  [Role.ACCOUNTANT]: 'user-avatar--accountant',
  [Role.DRIVER]: 'user-avatar--driver',
  [Role.FORWARDER]: 'user-avatar--forwarder',
};

const AVATAR_ICON: Record<Role, typeof Users> = {
  [Role.ADMIN]: ShieldCheck,
  [Role.MANAGER]: UserCog,
  [Role.ACCOUNTANT]: KeyRound,
  [Role.DRIVER]: Users,
  [Role.FORWARDER]: UserCog,
};
function RoleAvatar({ role }: { role: Role }) {
  const Icon = AVATAR_ICON[role] || Users;
  return (
    <div className={`user-avatar ${AVATAR_CLS[role]}`}>
      <Icon size={18} aria-hidden="true" />
    </div>
  );
}

/** Can the current user edit this row? Full managers can; scoped accountants can only edit drivers. */
function canEditRow(u: UserRow, canManage: boolean, canEditDriversOnly: boolean) {
  return canManage || (canEditDriversOnly && u.role === Role.DRIVER);
}

/** Resolve the assigned truck's license plate for a driver row, if any. */
function getPlate(u: UserRow, truckMap?: Map<number, string>) {
  return u.role === Role.DRIVER && u.assignedTruckId != null ? truckMap?.get(u.assignedTruckId) : undefined;
}
export function DesktopTable({
  filtered, canManage, canDelete, isAdminViewer = false, canEditDriversOnly, truckMap, deleting, currentUserId,
  onEdit, onDelete,
  sortBy, sortOrder, onSort,
}: {
  filtered: UserRow[];
  canManage: boolean;
  canDelete: boolean;
  isAdminViewer?: boolean;
  canEditDriversOnly: boolean;
  truckMap?: Map<number, string>;
  deleting: number | null;
  currentUserId?: number;
  onEdit: (u: UserRow) => void;
  onDelete: (id: number) => void;
  sortBy: 'name' | 'role' | 'status' | 'date' | null;
  sortOrder: 'asc' | 'desc';
  onSort: (field: 'name' | 'role' | 'status' | 'date') => void;
}) {
  // Base columns: Tài khoản, Liên hệ, Vai trò, Xe, Ngày tạo (status via
  // left-edge strip). The actions column is all-or-nothing: a role that cannot
  // delete must not see a "Thao tác" header sitting over permanently empty
  // cells — that read as "the feature is missing/broken" rather than
  // "you are not allowed" (kanban 091026213000).
  // A MANAGER may delete accounts, but never an ADMIN's. The server enforces the
  // same rule (deleteUser refuses a non-ADMIN actor on an ADMIN target); hiding
  // the control here just keeps the screen from offering an action that will be
  // rejected (kanban 101026003000).
  const canDeleteRow = (u: UserRow) => canDelete && (isAdminViewer || u.role !== Role.ADMIN);
  const showActions = canManage && canDelete;

  return (
    <div className="desktop-only">
      <div className="table-scroll">
        <table className="tt-table" style={{ minWidth: 880 }}>
          <thead>
            <tr>
              <th aria-sort={sortBy === 'name' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}>
                <button type="button" className="users-sort-button" onClick={() => onSort('name')}>
                  Tài khoản
                  {sortBy === 'name' ? (sortOrder === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />) : <ArrowUpDown size={13} style={{ opacity: 0.4 }} />}
                </button>
              </th>
              <th>Liên hệ</th>
              <th aria-sort={sortBy === 'role' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}>
                <button type="button" className="users-sort-button" onClick={() => onSort('role')}>
                  Vai trò
                  {sortBy === 'role' ? (sortOrder === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />) : <ArrowUpDown size={13} style={{ opacity: 0.4 }} />}
                </button>
              </th>
              <th>Xe</th>
              <th aria-sort={sortBy === 'date' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}>
                <button type="button" className="users-sort-button" onClick={() => onSort('date')}>
                  Ngày tạo
                  {sortBy === 'date' ? (sortOrder === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />) : <ArrowUpDown size={13} style={{ opacity: 0.4 }} />}
                </button>
              </th>
              {showActions && <th style={{ width: 84, textAlign: 'right' }}>Thao tác</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={showActions ? 6 : 5}>
                  <div className="users-empty">
                    <img src={resolveEmptyIllustration('empty-users')} alt="" aria-hidden="true" className="users-empty__illustration" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    <p className="users-empty__title">Không tìm thấy tài khoản</p>
                    <p className="users-empty__desc">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
                  </div>
                </td>
              </tr>
            )}
            {filtered.map(u => {
              const pill = ROLE_PILL[u.role] || { cls: 'pill pill--neutral', label: u.role };
              const isMe = u.id === currentUserId;
              const editable = canEditRow(u, canManage, canEditDriversOnly);
              const plate = getPlate(u, truckMap);
              return (
                <tr
                  key={u.id}
                  className={editable ? 'is-clickable' : undefined}
                  onClick={editable ? () => onEdit(u) : undefined}
                  onKeyDown={editable ? (event) => {
                    if (event.target !== event.currentTarget) return;
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onEdit(u);
                    }
                  } : undefined}
                  tabIndex={editable ? 0 : undefined}
                  style={{ cursor: editable ? 'pointer' : 'default' }}
                >
                  <td style={{ position: 'relative' }}>
                    <StatusStrip status={u.status} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <RoleAvatar role={u.role} />
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
                  <td>
                    {plate
                      ? <span className="user-truck-plate">{plate}</span>
                      : <span style={{ color: 'var(--ink-4)' }}>—</span>}
                  </td>
                  <td style={{ color: 'var(--ink-3)', fontSize: 'var(--fs-body)', whiteSpace: 'nowrap' }}>
                    {formatDate(u.createdAt)}
                  </td>
                  {showActions && canDeleteRow(u) && (
                  <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className="users-row-action users-row-action--danger"
                      aria-label={`Xoá tài khoản ${u.fullName || u.username || `#${u.id}`}`}
                      disabled={!!deleting || isMe}
                      title={isMe ? 'Không thể xoá tài khoản đang đăng nhập' : 'Xoá tài khoản'}
                      onClick={() => { if (!isMe) onDelete(u.id); }}
                      style={{ opacity: isMe ? 0.4 : 1 }}
                    >
                      {deleting === u.id ? <Loader2 size={14} className="spin" /> : <Trash2 size={14} />}
                      <span>Xoá</span>
                    </button>
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

export function MobileCardList({ filtered, canManage, canDelete, isAdminViewer = false, canEditDriversOnly, truckMap, deleting, currentUserId, onEdit, onDelete }: {
  filtered: UserRow[];
  canManage: boolean;
  canDelete: boolean;
  isAdminViewer?: boolean;
  canEditDriversOnly: boolean;
  truckMap?: Map<number, string>;
  deleting: number | null;
  currentUserId?: number;
  onEdit: (u: UserRow) => void;
  onDelete: (id: number) => void;
}) {
  const [activeMenuId, setActiveMenuId] = useState<number | null>(null);
  const menuTriggerRef = useRef<HTMLButtonElement | null>(null);

  // Escape closes the menu without opening the editor or leaving the page.
  useEffect(() => {
    if (activeMenuId === null) return;
    const handleClose = () => setActiveMenuId(null);
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      setActiveMenuId(null);
      menuTriggerRef.current?.focus();
    };
    document.addEventListener('click', handleClose);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('click', handleClose);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [activeMenuId]);

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
          const editable = canEditRow(u, canManage, canEditDriversOnly);
          const plate = getPlate(u, truckMap);
          return (
            <div
                  key={u.id}
                  className={`m-card users-mobile-card${editable ? ' is-clickable' : ''}`}
                  style={{ cursor: editable ? 'pointer' : 'default', position: 'relative' }}
                  onClick={editable ? () => onEdit(u) : undefined}
                  onKeyDown={editable ? (event) => {
                    if (event.target !== event.currentTarget) return;
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onEdit(u);
                    }
                  } : undefined}
                  role={editable ? 'button' : undefined}
                  tabIndex={editable ? 0 : undefined}
                >
              <StatusStrip status={u.status} />
              <div className="users-mobile-card__header">
                <RoleAvatar role={u.role} />
                <div className="users-mobile-card__info">
                  <div className="users-mobile-card__name">
                    {u.fullName || u.username || <span style={{ color: 'var(--ink-3)', fontStyle: 'italic' }}>—</span>}
                    {isMe && <span className="user-name__you">(bạn)</span>}
                  </div>
                  <div className="users-mobile-card__identity-meta">
                    {u.username && <span className="users-mobile-card__handle">@{u.username}</span>}
                    <span className={`users-mobile-card__role ${pill.cls}`}><span className="dot" />{pill.label}</span>
                  </div>
                </div>

                {editable && canManage && canDelete && (isAdminViewer || u.role !== Role.ADMIN) && (
                  <div className="users-mobile-card__menu">
                    <button
                      className="kebab-btn"
                      aria-label={`Mở thao tác cho ${u.fullName || u.username || 'tài khoản'}`}
                      aria-haspopup="menu"
                      aria-expanded={activeMenuId === u.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        menuTriggerRef.current = e.currentTarget;
                        setActiveMenuId(activeMenuId === u.id ? null : u.id);
                      }}
                      style={{ padding: 0 }}
                    >
                      <MoreVertical size={16} />
                    </button>
                    {activeMenuId === u.id && (
                      <div className="users-mobile-card__dropdown" role="menu" style={{
                        position: 'absolute', right: 0, top: '100%', zIndex: 100,
                        background: '#fff', border: '1px solid var(--line)', borderRadius: 8,
                        overflow: 'hidden', minWidth: 120,
                      }} onClick={(e) => e.stopPropagation()}>
                        {canManage && canDelete && (isAdminViewer || u.role !== Role.ADMIN) && (
                          <button role="menuitem" style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 12px', fontSize: 'var(--fs-control)', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', color: 'var(--danger)', opacity: isMe ? 0.4 : 1 }}
                            disabled={!!deleting || isMe}
                            onClick={() => { setActiveMenuId(null); if (!isMe) onDelete(u.id); }}>
                            {deleting === u.id ? <Loader2 size={13} className="spin" /> : <Trash2 size={13} />} Xoá
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="users-mobile-card__details">
                <div className="users-mobile-card__detail-list">
                  {plate && (
                    <span className="user-truck-plate">{plate}</span>
                  )}
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
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
