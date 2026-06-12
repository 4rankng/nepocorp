import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Loader2, Plus, ArrowRight } from 'lucide-react';
import { formatCurrency, formatDate } from '../lib/format';
import { groupExpensesByType } from '../lib/expense-breakdown';
import { ADVANCE_SETTLEMENT_STATUS_LABELS, type AdvanceSettlementStatus } from '@tingting/shared';
import { PageHeader, KPI } from '../components/UI';
import { ClickableCard } from '../components/shared/ClickableCard';
import { StatusStrip } from '../components/shared/StatusStrip';
import { useForwarderSettlements } from '../hooks/useForwarderQueries';
import { useCatalogs } from '../hooks/useCatalogs';
import './ForwarderSettlementsPage.css';

/** Vietnamese fallback labels for expense type codes */
const EXPENSE_TYPE_VI: Record<string, string> = {
  LIFTING: 'Nâng container',
  LOWERING: 'Hạ container',
  CUSTOMS: 'Hải quan',
  WEIGHING: 'Cân hàng',
  INFRASTRUCTURE: 'Hạ tầng',
  INSPECTION: 'Kiểm tra',
  INSPECTION_SVC: 'Dịch vụ kiểm tra',
  PORT_STORAGE: 'Lưu bãi',
  CLEANING: 'Vệ sinh container',
  OTHER: 'Khác',
};

function expenseLabel(code: string, options: Array<{ code: string; name: string }>): string {
  return options.find(t => t.code === code)?.name || EXPENSE_TYPE_VI[code] || code;
}

/** Generate business codes — NEVER show raw IDs */
function advanceRequestCode(id: number): string {
  return `TU-${String(id).padStart(4, '0')}`;
}

/** Status strip colors matching ForwarderTripsPage pattern */
const STATUS_STRIP: Record<AdvanceSettlementStatus, string> = {
  PENDING: '#D97706',
  CHECKED_BY_ACCOUNTANT: '#2563EB',
  APPROVED: '#059669',
  REJECTED: '#DC2626',
};

interface LinkedRequest {
  id: number;
  amount: string;
  reason: string;
  status: string;
  createdAt: string;
}

interface LinkedExpense {
  id: number;
  tripId: number;
  expenseType: string;
  buyAmount: string;
  note: string | null;
  createdAt: string;
  tripCode: string | null;
  departureDate: string | null;
  truckPlate: string | null;
}

interface Settlement {
  id: number;
  code: string;
  forwarderId: number;
  totalExpenseAmount: string;
  refundAmount: string;
  status: AdvanceSettlementStatus;
  checkedBy: number | null;
  checkedAt: string | null;
  approvedBy: number | null;
  approvedAt: string | null;
  note: string | null;
  createdAt: string;
  forwarderName?: string;
  checkerName?: string;
  approverName?: string;
  linkedRequests?: LinkedRequest[];
  linkedExpenses?: LinkedExpense[];
}

export default function ForwarderSettlementsPage() {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<AdvanceSettlementStatus | ''>('');

  const { data: settlementsData, isLoading: loadingSettlements, error: settlementsError } = useForwarderSettlements();
  const { data: catalogs } = useCatalogs();

  const settlements = (settlementsData?.items ?? settlementsData ?? []) as Settlement[];
  const expenseTypeOptions = catalogs?.forwarderExpenseTypes ?? [];

  const error = settlementsError ? 'Không thể tải danh sách phiếu thanh toán' : null;

  // Derived stats
  const pending = settlements.filter(s => s.status === 'PENDING').length;
  const totalExpenseAll = settlements.reduce((sum, s) => sum + Number(s.totalExpenseAmount), 0);

  // Status counts & filtered list
  const statusCounts = useMemo(() => {
    const counts: Partial<Record<AdvanceSettlementStatus, number>> = {};
    for (const s of settlements) {
      counts[s.status] = (counts[s.status] ?? 0) + 1;
    }
    return counts;
  }, [settlements]);
  const filteredSettlements = activeFilter
    ? settlements.filter(s => s.status === activeFilter)
    : settlements;

  if (loadingSettlements) return (
    <div className="fset-page">
      <PageHeader title="Phiếu thanh toán" description="Thanh toán tạm ứng" />
      <div className="fset-loading">
        <Loader2 size={20} className="spin" style={{ display: 'inline-block' }} />
        <p style={{ marginTop: 8 }}>Đang tải danh sách phiếu thanh toán…</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="fset-page">
      <PageHeader title="Phiếu thanh toán" description="Thanh toán tạm ứng" />
      <div className="empty-state">
        <p style={{ color: 'var(--danger)' }}>{error}</p>
      </div>
    </div>
  );

  return (
    <div className="fset-page">
      <PageHeader
        title="Phiếu thanh toán"
        description="Thanh toán tạm ứng"
        action={
          <button className="btn btn--primary" onClick={() => navigate('/my-settlements/new')}>
            <Plus size={16} /> Thêm phiếu
          </button>
        }
      />

      {/* KPI row */}
      {settlements.length > 0 && (
        <div className="fset-kpi-row">
          <KPI label="Tổng phiếu" value={settlements.length} icon={FileText} />
          <KPI label="Chờ xử lý" value={pending} variant={pending > 0 ? 'warn' : 'default'} />
          <KPI label="Tổng chi phí" value={formatCurrency(totalExpenseAll)} variant={totalExpenseAll > 0 ? 'success' : 'default'} />
        </div>
      )}

      {/* Status filter pills — matching ForwarderTripsPage design */}
      {settlements.length > 0 && (
        <div className="fwd-filter-pills">
          <button
            className={`fwd-filter-pill ${activeFilter === '' ? 'fwd-filter-pill--active' : ''}`}
            onClick={() => setActiveFilter('')}
          >
            Tất cả
            <span className="fwd-filter-pill__count">{settlements.length}</span>
          </button>
          {(Object.entries(ADVANCE_SETTLEMENT_STATUS_LABELS) as [AdvanceSettlementStatus, string][]).map(([status, label]) => {
            const count = statusCounts[status] ?? 0;
            if (count === 0) return null;
            return (
              <button
                key={status}
                className={`fwd-filter-pill ${activeFilter === status ? 'fwd-filter-pill--active' : ''}`}
                data-status={status}
                onClick={() => setActiveFilter(prev => prev === status ? '' : status)}
              >
                <span className="fwd-filter-pill__dot" style={{ background: STATUS_STRIP[status] }} />
                {label}
                <span className="fwd-filter-pill__count">{count}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {settlements.length === 0 ? (
        <div className="fset-empty fade-up">
          <div className="fset-empty__icon"><FileText size={48} /></div>
          <h3 className="fset-empty__title">Chưa có phiếu thanh toán</h3>
          <p className="fset-empty__desc">Nhấn "Thêm phiếu" để lập phiếu mới.</p>
        </div>
      ) : (
        <div className="fset-list">
          {filteredSettlements.map((s, idx) => {
            const hasBreakdown = s.linkedExpenses && s.linkedExpenses.length > 0;
            const groups = hasBreakdown ? groupExpensesByType(s.linkedExpenses!, expenseTypeOptions) : null;

            return (
              <ClickableCard
                key={s.id}
                to={`/my-settlements/${s.id}`}
                className="fset-card fade-up"
                style={{
                  animationDelay: `${idx * 40}ms`,
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Status strip — color tells status, no text needed */}
                <StatusStrip color={STATUS_STRIP[s.status] || '#999'} />

                <div className="fset-card__body">
                  {/* Icon tile */}
                  <div className="fset-card__icon">
                    <FileText size={16} />
                  </div>

                  {/* Main content */}
                  <div className="fset-card__main">
                    <div className="fset-card__head">
                      <span className="fset-card__code-text">{s.code}</span>
                    </div>

                    <div className="fset-card__meta">
                      <span className="fset-card__meta-item">{formatDate(s.createdAt)}</span>
                      <span className="fset-card__meta-item">
                        Chi phí: <strong>{formatCurrency(Number(s.totalExpenseAmount))}</strong>
                      </span>
                      {Number(s.refundAmount) > 0 && (
                        <span className="fset-card__meta-item">
                          Hoàn lại: <strong>{formatCurrency(Number(s.refundAmount))}</strong>
                        </span>
                      )}
                    </div>

                    {/* Breakdown chips — compact inline */}
                    {groups && groups.size > 0 && (
                      <div className="fset-card__chips">
                        {[...groups.entries()].map(([label, amount]) => (
                          <span key={label} className="fset-chip">{label}: {formatCurrency(amount)}</span>
                        ))}
                      </div>
                    )}

                    {/* Linked advances */}
                    {s.linkedRequests && s.linkedRequests.length > 0 && (
                      <div className="fset-card__chips">
                        {s.linkedRequests.map(r => (
                          <span key={r.id} className="fset-chip fset-chip--linked">
                            {advanceRequestCode(r.id)} — {formatCurrency(Number(r.amount))}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Note */}
                    {s.note && (
                      <div className="fset-card__note">{s.note}</div>
                    )}

                    {/* Checker/approver */}
                    {(s.checkerName || s.approverName) && (
                      <div className="fset-card__footer">
                        {s.checkerName && <span>Kiểm tra: {s.checkerName}</span>}
                        {s.approverName && <span>Duyệt: {s.approverName}</span>}
                      </div>
                    )}
                  </div>

                  {/* Arrow */}
                  <ArrowRight size={16} className="fset-card__arrow" />
                </div>
              </ClickableCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
