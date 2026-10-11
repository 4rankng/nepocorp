import { Plus, Pencil, Loader2, Download, Users, UserCog, KeyRound, Lock } from 'lucide-react';
import { Role, ROLE_LABELS } from '../utils';
import type { FilterKey, UserRow } from '../utils';
import { StatusSwatch } from '../../../components/shared/StatusStrip';
import { PageHeader } from '../../../components/UI';
import { ListFilterBar } from '../../../components/shared/ListFilterBar';
import { AssetIcon } from '../../../components/AssetIcon';
import { DesktopTable, MobileCardList } from './UserTableViews';

interface UserTableProps {
  /** Current server page rows. */
  paginated: UserRow[];
  /** Server count of rows matching the active tab + search (drives the footer). */
  filteredTotal: number;
  /** KPI counts over the unfiltered visibility set. */
  total: number;
  staffCount: number;
  driverCount: number;
  inactiveCount: number;
  filter: FilterKey;
  search: string;
  canManage: boolean;
  canDelete?: boolean;
  /** Only an ADMIN may delete an ADMIN account; see deleteUser() on the server. */
  isAdminViewer?: boolean;
  /** Accountant scope: may open the edit Drawer for DRIVER rows only. */
  canEditDriversOnly?: boolean;
  /** truckId → licensePlate, for the "Xe" column on driver rows. */
  truckMap?: Map<number, string>;
  deleting: number | null;
  currentUserId?: number;
  onFilterChange: (f: FilterKey) => void;
  onSearchChange: (s: string) => void;
  onEdit: (u: UserRow) => void;
  onDelete: (id: number) => void;
  onAdd: () => void;
  onExport: () => void;
  exporting: boolean;
  // Sort props
  sortBy: 'name' | 'role' | 'status' | 'date' | null;
  sortOrder: 'asc' | 'desc';
  onSort: (field: 'name' | 'role' | 'status' | 'date') => void;
  // Pagination props
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export function UserTable({
  paginated, filteredTotal, total, staffCount, driverCount, inactiveCount,
  filter, search, canManage, canDelete = canManage, isAdminViewer = false, canEditDriversOnly = false,
  truckMap, deleting, currentUserId,
  onFilterChange, onSearchChange, onEdit, onDelete, onAdd,
  onExport, exporting,
  sortBy, sortOrder, onSort,
  currentPage, pageSize, onPageChange,
}: UserTableProps) {
  return (
    <>
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <PageHeader
        title={<>Quản lý <em>người dùng</em></>}
        iconName="users-hr"
        description={`${total} tài khoản · ${staffCount} nhân sự · ${driverCount} lái xe`}
        action={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              className="btn btn--secondary"
              onClick={onExport}
              disabled={exporting || filteredTotal === 0}
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            >
              {exporting ? <Loader2 size={14} className="spin" /> : <Download size={14} />}
              {exporting ? 'Đang chuẩn bị…' : 'Xuất Excel'}
            </button>
            {canManage && (
              <button
                className="btn btn--primary"
                onClick={onAdd}
                style={{ display: 'flex', alignItems: 'center', gap: 8 }}
              >
                <Plus size={14} /> Thêm tài khoản
              </button>
            )}
          </div>
        }
      />

      {/* ── KPI grid ────────────────────────────────────────────────────── */}
      <div className="kpi-grid users-kpi-grid">
        <div className="kpi">
          <div className="kpi__top">
            <span className="kpi__label">Tổng tài khoản</span>
          </div>
          <div className="kpi__value">{total}</div>
          <div className="kpi__meta">
            <span className="kpi__meta-pill kpi__meta--up">
              +0 mới
            </span>
            <span className="kpi__meta-note">Đang hoạt động tốt</span>
          </div>
          <div className="kpi__watermark" aria-hidden="true"><Users size={72} /></div>
        </div>
        <div className="kpi kpi--warn">
          <div className="kpi__top">
            <span className="kpi__label">Nhân sự văn phòng</span>
          </div>
          <div className="kpi__value">{staffCount}</div>
          <div className="kpi__meta">
            <span className="kpi__meta-pill kpi__meta-pill--warn">
              Văn phòng
            </span>
            <span className="kpi__meta-note">Admin · Quản lý · Kế toán</span>
          </div>
          <div className="kpi__watermark" aria-hidden="true"><UserCog size={72} /></div>
        </div>
        <div className="kpi kpi--success">
          <div className="kpi__top">
            <span className="kpi__label">Lái xe</span>
          </div>
          <div className="kpi__value">{driverCount}</div>
          <div className="kpi__meta">
            <span className="kpi__meta-pill kpi__meta-pill--success">
              Hiện trường
            </span>
            <span className="kpi__meta-note">Có quyền app lái xe</span>
          </div>
          <div className="kpi__watermark" aria-hidden="true"><AssetIcon name="driver" size={72} /></div>
        </div>
        <div className="kpi kpi--danger">
          <div className="kpi__top">
            <span className="kpi__label">Bị khoá / Ngưng</span>
          </div>
          <div className="kpi__value">{inactiveCount}</div>
          <div className="kpi__meta">
            {inactiveCount > 0 ? (
              <span className="kpi__meta-pill kpi__meta-pill--danger">
                Cần kiểm tra
              </span>
            ) : (
              <span className="kpi__meta-pill kpi__meta-pill--neutral">
                An toàn
              </span>
            )}
            <span className="kpi__meta-note">Không thể truy cập</span>
          </div>
          <div className="kpi__watermark" aria-hidden="true"><Lock size={72} /></div>
        </div>
      </div>

      <div data-tour-id="users-role-filters">
        <ListFilterBar<FilterKey>
          label="Lọc tài khoản theo vai trò"
          options={(['all', ...Object.values(Role)] as FilterKey[]).map(f => ({
            value: f,
            label: f === 'all' ? 'Tất cả' : ROLE_LABELS[f as Role],
            // The API supplies a filtered total only for the selected role.
            count: filter === f ? (f === 'all' ? total : f === Role.DRIVER ? driverCount : filteredTotal) : undefined,
          }))}
          value={filter}
          onChange={onFilterChange}
          search={{ value: search, onChange: onSearchChange, label: 'Tìm tài khoản', placeholder: 'Tìm theo username, email, SĐT…' }}
        />
      </div>
      <div className="users-table-panel" data-tour-id="users-table">
        {/* Legend */}
        {(canManage || canEditDriversOnly) && (
          <div className="users-list-legend">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Pencil size={12} style={{ opacity: 0.5 }} />
              Nhấp vào hàng để chỉnh sửa
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <StatusSwatch status="ACTIVE" />
              Hoạt động
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <StatusSwatch status="LOCKED" />
              Bị khoá
            </span>
          </div>
        )}

        {/* Desktop table */}
        <DesktopTable
          filtered={paginated}
          canManage={canManage}
          canDelete={canDelete}
          isAdminViewer={isAdminViewer}
          canEditDriversOnly={canEditDriversOnly}
          truckMap={truckMap}
          deleting={deleting}
          currentUserId={currentUserId}
          onEdit={onEdit}
          onDelete={onDelete}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={onSort}
        />

        {/* Mobile cards */}
        <MobileCardList
          filtered={paginated}
          canManage={canManage}
          canDelete={canDelete}
          isAdminViewer={isAdminViewer}
          canEditDriversOnly={canEditDriversOnly}
          truckMap={truckMap}
          deleting={deleting}
          currentUserId={currentUserId}
          onEdit={onEdit}
          onDelete={onDelete}
        />

        {/* Footer */}
        {(() => {
          const totalPages = Math.max(1, Math.ceil(filteredTotal / pageSize));
          const startIdx = filteredTotal === 0 ? 0 : (currentPage - 1) * pageSize + 1;
          const endIdx = Math.min(filteredTotal, currentPage * pageSize);
          return (
            <div className="table-foot users-table-foot">
              <span className="users-table-foot__summary">
                Hiển thị <strong style={{ fontFamily: 'var(--font-mono)' }}>{startIdx}-{endIdx}</strong> trong số <strong style={{ fontFamily: 'var(--font-mono)' }}>{filteredTotal}</strong> tài khoản
              </span>
              {totalPages > 1 && (
                <div className="users-pagination" aria-label="Phân trang tài khoản">
                  <button
                    className="btn-page users-pagination__nav"
                    disabled={currentPage === 1}
                    onClick={() => onPageChange(currentPage - 1)}
                    style={{
                      minHeight: 'var(--control-h)', padding: '0 12px', border: '1px solid var(--line-2)', borderRadius: 9,
                      background: currentPage === 1 ? 'var(--surface-2)' : '#fff',
                      cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontSize: 'var(--fs-body)',
                      color: currentPage === 1 ? 'var(--ink-4)' : 'var(--ink-2)'
                    }}
                  >
                    Trước
                  </button>
                  {Array.from({ length: totalPages }).map((_, idx) => {
                    const page = idx + 1;
                    return (
                      <button
                        key={page}
                        className={`btn-page users-pagination__page${currentPage === page ? ' is-active' : ''}`}
                        onClick={() => onPageChange(page)}
                        style={{
                          minWidth: 'var(--control-h)', minHeight: 'var(--control-h)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          borderRadius: 9, border: currentPage === page ? '1px solid var(--brand)' : '1px solid var(--line-2)',
                          background: currentPage === page ? 'var(--brand)' : '#fff',
                          color: currentPage === page ? '#fff' : 'var(--ink)',
                          fontWeight: currentPage === page ? '600' : 'normal',
                          cursor: 'pointer', fontSize: 'var(--fs-body)'
                        }}
                      >
                        {page}
                      </button>
                    );
                  })}
                  <button
                    className="btn-page users-pagination__nav"
                    disabled={currentPage === totalPages}
                    onClick={() => onPageChange(currentPage + 1)}
                    style={{
                      minHeight: 'var(--control-h)', padding: '0 12px', border: '1px solid var(--line-2)', borderRadius: 9,
                      background: currentPage === totalPages ? 'var(--surface-2)' : '#fff',
                      cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', fontSize: 'var(--fs-body)',
                      color: currentPage === totalPages ? 'var(--ink-4)' : 'var(--ink-2)'
                    }}
                  >
                    Sau
                  </button>
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* Permission notice */}
      {!canManage && (
        <div style={{
          marginTop: 20, padding: '12px 16px',
          background: 'var(--surface-2)', borderRadius: 8,
          display: 'flex', alignItems: 'center', gap: 10,
          color: 'var(--ink-3)', fontSize: 'var(--fs-body)',
        }}>
          <KeyRound size={14} />
          {canEditDriversOnly
            ? 'Bạn chỉ có thể chỉnh sửa thông tin lái xe (lương, xe phân công, liên hệ).'
            : 'Chỉ quản trị viên hoặc giám đốc mới có thể tạo, sửa hoặc xóa tài khoản.'}
        </div>
      )}
    </>
  );
}

/* ── Desktop table (inside panel) ─────────────────────────────────────────── */
