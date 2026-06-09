import { useState } from 'react';
import { Wallet, Loader2, Plus, X, Clock, User } from 'lucide-react';
import { formatCurrency, formatDate } from '../lib/format';
import { ADVANCE_REQUEST_STATUS_LABELS } from '@tingting/shared';
import type { AdvanceRequestWithRefs } from '@tingting/shared';
import { PageHeader, StatusPill, FormGroup, KPI } from '../components/UI';
import { useForwarderAdvanceRequests, useCreateAdvanceRequest } from '../hooks/useQueries';
import { advanceRequestStatusVariant } from '../lib/status-variants';
import './ForwarderAdvancesPage.css';

export default function ForwarderAdvancesPage() {
  const { data, isLoading: loading, error: queryError } = useForwarderAdvanceRequests();
  const createAdvanceRequest = useCreateAdvanceRequest();
  const requests = (data?.items ?? data ?? []) as AdvanceRequestWithRefs[];

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ amount: '', reason: '' });
  const mutationError = createAdvanceRequest.error
    ? (createAdvanceRequest.error instanceof Error ? createAdvanceRequest.error.message : 'Lỗi tạo yêu cầu')
    : null;

  const error = queryError ? 'Không thể tải danh sách yêu cầu tạm ứng' : null;

  // Derived stats
  const pending = requests.filter(r => r.status === 'PENDING').length;
  const approved = requests.filter(r => r.status === 'APPROVED');
  const totalApproved = approved.reduce((sum, r) => sum + Number(r.amount), 0);

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
      <div className="empty-state">
        <p style={{ color: 'var(--danger)' }}>{error}</p>
      </div>
    </div>
  );

  return (
    <div className="fadv-page">
      <PageHeader
        title="Tạm ứng"
        description="Yêu cầu tạm ứng và theo dõi trạng thái"
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
            <span className="fadv-form-panel__title">Tạo yêu cầu tạm ứng</span>
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

      {/* KPI row */}
      {requests.length > 0 && (
        <div className="fadv-kpi-row">
          <KPI
            label="Tổng yêu cầu"
            value={requests.length}
            icon={Wallet}
          />
          <KPI
            label="Chờ duyệt"
            value={pending}
            variant={pending > 0 ? 'warn' : 'default'}
            icon={Clock}
          />
          <KPI
            label="Đã duyệt"
            value={formatCurrency(totalApproved)}
            variant={totalApproved > 0 ? 'success' : 'default'}
          />
        </div>
      )}

      {/* Empty state */}
      {requests.length === 0 && !showForm ? (
        <div className="fadv-empty fade-up">
          <div className="fadv-empty__icon">
            <Wallet size={48} />
          </div>
          <h3 className="fadv-empty__title">Chưa có yêu cầu tạm ứng</h3>
          <p className="fadv-empty__desc">
            Nhấn "Tạo yêu cầu" để gửi yêu cầu tạm ứng mới.
          </p>
        </div>
      ) : (
        <div className="fadv-list">
          {requests.map((req, idx) => (
            <div
              key={req.id}
              className="fadv-card fade-up"
              style={{ animationDelay: `${idx * 40}ms` }}
            >
              <div className="fadv-card__icon">
                <Wallet size={16} />
              </div>

              <div className="fadv-card__body">
                <div className="fadv-card__amount">
                  {formatCurrency(Number(req.amount))}
                </div>
                <div className="fadv-card__reason">{req.reason}</div>
                <div className="fadv-card__meta">
                  <span>
                    <Clock size={11} style={{ verticalAlign: -1, marginRight: 3, opacity: 0.7 }} />
                    {formatDate(req.createdAt)}
                  </span>
                  {req.approverName && req.approvedAt && (
                    <>
                      <span className="fadv-card__meta-sep">·</span>
                      <span>
                        <User size={11} style={{ verticalAlign: -1, marginRight: 3, opacity: 0.7 }} />
                        {req.status === 'APPROVED' ? 'Duyệt' : 'Từ chối'} bởi {req.approverName}
                        {' — '}
                        {formatDate(req.approvedAt)}
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div className="fadv-card__status">
                <StatusPill variant={advanceRequestStatusVariant(req.status)}>
                  {ADVANCE_REQUEST_STATUS_LABELS[req.status] || req.status}
                </StatusPill>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
