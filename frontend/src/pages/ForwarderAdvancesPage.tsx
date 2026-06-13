import { useState } from 'react';
import { Wallet, Loader2, Plus, X, User, AlertCircle } from 'lucide-react';
import { formatCurrency, formatDate } from '../lib/format';
import { ADVANCE_REQUEST_STATUS_LABELS, type AdvanceRequestStatus } from '@tingting/shared';
import type { AdvanceRequestWithRefs } from '@tingting/shared';
import { PageHeader, FormGroup } from '../components/UI';
import { StatusStrip } from '../components/shared/StatusStrip';
import { useForwarderAdvanceRequests, useCreateAdvanceRequest } from '../hooks/useQueries';
import { usePageAnimations, useListAnimations } from '../hooks/animations';
import './ForwarderAdvancesPage.css';

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#D97706',
  CHECKED_BY_ACCOUNTANT: '#2563EB',
  APPROVED: '#059669',
  REJECTED: '#DC2626',
};

type StatusFilter = '' | AdvanceRequestStatus;

export default function ForwarderAdvancesPage() {
  const [activeFilter, setActiveFilter] = useState<StatusFilter>('');
  const { data, isLoading: loading, error: queryError } = useForwarderAdvanceRequests(activeFilter || undefined);
  const { rootRef } = usePageAnimations({ ready: !loading });
  const createAdvanceRequest = useCreateAdvanceRequest();
  const requests = (data?.items ?? []) as AdvanceRequestWithRefs[];
  const counts = data?.counts ?? {};
  const { rootRef: listRef } = useListAnimations({ itemSelector: '.fadv-card-trip', mode: 'cards', deps: [requests] });

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ amount: '', reason: '' });
  const mutationError = createAdvanceRequest.error
    ? (createAdvanceRequest.error instanceof Error ? createAdvanceRequest.error.message : 'Lỗi tạo yêu cầu')
    : null;

  const error = queryError ? 'Không thể tải danh sách yêu cầu tạm ứng' : null;
  const totalRequests = Object.values(counts).reduce((sum: number, c) => sum + c, 0);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createAdvanceRequest.mutateAsync(
      { amount: Number(form.amount), reason: form.reason },
      {
        onSuccess: () => {
          setShowForm(false);
          setForm({ amount: '', reason: '' });
        },
      },
    );
  }

  if (loading) return (
    <div className="fadv-page">
      <PageHeader title="Tạm ứng" description="Yêu cầu tạm ứng và theo dõi trạng thái" />
      <div className="fadv-loading">
        <Loader2 size={20} className="spin" style={{ display: 'inline-block' }} />
        <p style={{ marginTop: 8 }}>Đang tải danh sách tạm ứng…</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="fadv-page">
      <PageHeader title="Tạm ứng" description="Yêu cầu tạm ứng và theo dõi trạng thái" />
      <div className="fadv-empty">
        <div className="fadv-empty__icon" style={{ width: 80, height: 80 }}>
          <AlertCircle size={48} />
        </div>
        <h3 className="fadv-empty__title">Không thể tải dữ liệu</h3>
        <p className="fadv-empty__desc">{error}</p>
      </div>
    </div>
  );

  return (
    <div ref={rootRef} className="fadv-page">
      <PageHeader
        title="Tạm ứng"
        description={`${totalRequests} yêu cầu tạm ứng`}
        action={
          !showForm ? (
            <button className="btn btn--primary" onClick={() => setShowForm(true)}>
              <Plus size={16} /> Tạo yêu cầu
            </button>
          ) : undefined
        }
      />

      {/* Create form */}
      {showForm && (
        <div className="fadv-form-panel fade-up">
          <div className="fadv-form-panel__head">
            <span className="fadv-form-panel__title">
              <Wallet size={16} style={{ verticalAlign: -2, marginRight: 6, opacity: 0.7 }} />
              Tạo yêu cầu tạm ứng
            </span>
            <button
              className="btn btn--ghost btn--sm"
              onClick={() => { setShowForm(false); setForm({ amount: '', reason: '' }); }}
            >
              <X size={16} />
            </button>
          </div>

          {mutationError && (
            <div className="fadv-form-panel__error">{mutationError}</div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="fadv-form-panel__fields">
              <FormGroup label="Số tiền (đ)">
                <input
                  type="number"
                  min={1}
                  value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder="VD: 2.000.000"
                  required
                />
              </FormGroup>
              <FormGroup label="Lý do">
                <input
                  type="text"
                  value={form.reason}
                  onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                  placeholder="Nhập lý do tạm ứng"
                  required
                />
              </FormGroup>
            </div>
            <div className="fadv-form-panel__actions">
              <button
                type="button"
                className="btn btn--secondary btn--sm"
                onClick={() => { setShowForm(false); setForm({ amount: '', reason: '' }); }}
              >
                Hủy
              </button>
              <button className="btn btn--primary btn--sm" type="submit" disabled={createAdvanceRequest.isPending}>
                {createAdvanceRequest.isPending ? <Loader2 size={14} className="spin" /> : <Wallet size={14} />}
                Gửi yêu cầu
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter pills + legend */}
      {totalRequests > 0 && (
        <>
          <div className="fwd-filter-pills">
            <button
              className={`fwd-filter-pill ${activeFilter === '' ? 'fwd-filter-pill--active' : ''}`}
              onClick={() => setActiveFilter('')}
            >
              Tất cả
              <span className="fwd-filter-pill__count">{totalRequests}</span>
            </button>
            {(Object.entries(ADVANCE_REQUEST_STATUS_LABELS) as [AdvanceRequestStatus, string][]).map(([status, label]) => {
              const count = counts[status] ?? 0;
              if (count === 0) return null;
              return (
                <button
                  key={status}
                  className={`fwd-filter-pill ${activeFilter === status ? 'fwd-filter-pill--active' : ''}`}
                  onClick={() => setActiveFilter(prev => prev === status ? '' : status)}
                >
                  <span className="fwd-filter-pill__dot" style={{ background: STATUS_COLORS[status] }} />
                  {label}
                  <span className="fwd-filter-pill__count">{count}</span>
                </button>
              );
            })}
          </div>

          {/* Strip color legend */}
          <div className="fadv-legend">
            {(Object.entries(ADVANCE_REQUEST_STATUS_LABELS) as [AdvanceRequestStatus, string][]).map(([status, label]) => {
              const count = counts[status] ?? 0;
              if (count === 0) return null;
              return (
                <span key={status} className="fadv-legend__item">
                  <span className="fadv-legend__dot" style={{ background: STATUS_COLORS[status] }} />
                  {label}
                </span>
              );
            })}
          </div>
        </>
      )}

      {/* Empty state */}
      {totalRequests === 0 && !showForm ? (
        <div className="fadv-empty fade-up">
          <div className="fadv-empty__icon">
            <Wallet size={64} />
          </div>
          <h3 className="fadv-empty__title">Chưa có yêu cầu tạm ứng</h3>
          <p className="fadv-empty__desc">
            Nhấn "Tạo yêu cầu" để gửi yêu cầu tạm ứng mới.
          </p>
        </div>
      ) : (
        <div ref={listRef} className="fadv-list">
          {requests.map((req, idx) => (
            <div
              key={req.id}
              className="fadv-card-trip fade-up"
              data-status={req.status}
              style={{
                position: 'relative',
                overflow: 'hidden',
                animationDelay: `${idx * 50}ms`,
              }}
            >
              {/* Status strip — color indicates status */}
              <StatusStrip color={STATUS_COLORS[req.status] || '#999'} />

              <div className="fadv-card-trip__body">
                <div className="fadv-card-trip__main">
                  <div className="fadv-card-trip__head">
                    <span className="fadv-card-trip__amount">
                      {formatCurrency(Number(req.amount))}
                    </span>
                    <span className="fadv-card-trip__date">{formatDate(req.createdAt)}</span>
                  </div>
                  <div className="fadv-card-trip__reason">{req.reason}</div>
                </div>
                {req.approverName && req.approvedAt && (
                  <div className="fadv-card-trip__approver">
                    <User size={12} />
                    <span>{req.status === 'APPROVED' ? 'Duyệt' : 'Từ chối'} bởi {req.approverName}</span>
                    <span className="fadv-card-trip__meta-sep">·</span>
                    <span>{formatDate(req.approvedAt)}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
