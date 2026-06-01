import { useState } from 'react';
import { Wallet, Loader2, Plus, X } from 'lucide-react';
import { formatCurrency, formatDate } from '../lib/format';
import { ADVANCE_REQUEST_STATUS_LABELS } from '@nepocorp/shared';
import type { AdvanceRequestWithRefs } from '@nepocorp/shared';
import { PageHeader, Panel, StatusPill, FormGroup } from '../components/UI';
import { useForwarderAdvanceRequests, useCreateAdvanceRequest } from '../hooks/useQueries';
import { advanceRequestStatusVariant } from '../lib/status-variants';

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
    <Panel>
      <div style={{ padding: 32, textAlign: 'center', color: 'var(--fg-3)' }}>
        <Loader2 size={20} className="spin" style={{ display: 'inline-block' }} />
        <p style={{ marginTop: 8 }}>Đang tải danh sách tạm ứng…</p>
      </div>
    </Panel>
  );

  if (error) return (
    <Panel><div style={{ padding: 20, textAlign: 'center', color: 'var(--danger)' }}>{error}</div></Panel>
  );

  return (
    <div>
      <PageHeader
        title="Tạm ứng"
        description="Yêu cầu tạm ứng và theo dõi trạng thái"
      />

      <div style={{ marginBottom: 16 }}>
        {!showForm ? (
          <button className="btn btn--primary" onClick={() => setShowForm(true)}>
            <Plus size={16} /> Tạo yêu cầu
          </button>
        ) : (
          <Panel>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <strong>Tạo yêu cầu tạm ứng</strong>
              <button className="btn btn--ghost" onClick={() => { setShowForm(false); setForm({ amount: '', reason: '' }); }}>
                <X size={16} />
              </button>
            </div>

            {mutationError && (
              <div style={{ padding: 8, marginBottom: 12, borderRadius: 6, background: '#FEE2E2', color: 'var(--danger)', fontSize: 14 }}>
                {mutationError}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <FormGroup label="Số tiền (đ)">
                <input
                  type="number"
                  min={1}
                  value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder="VD: 2000000"
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
              <button className="btn btn--primary" type="submit" disabled={createAdvanceRequest.isPending}>
                {createAdvanceRequest.isPending ? <Loader2 size={16} className="spin" /> : <Wallet size={16} />}
                Gửi yêu cầu
              </button>
            </form>
          </Panel>
        )}
      </div>

      {requests.length === 0 && !showForm ? (
        <div className="empty-state">
          <Wallet size={48} style={{ color: 'var(--fg-3)' }} />
          <h3 className="empty-state-title">Chưa có yêu cầu tạm ứng nào</h3>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {requests.map((req, idx) => (
            <div
              key={req.id}
              className="panel fade-up"
              style={{ animationDelay: `${idx * 40}ms` }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 600 }}>{formatCurrency(Number(req.amount))}</div>
                  <div style={{ marginTop: 4, color: 'var(--fg-2)' }}>{req.reason}</div>
                </div>
                <StatusPill variant={advanceRequestStatusVariant(req.status)}>
                  {ADVANCE_REQUEST_STATUS_LABELS[req.status] || req.status}
                </StatusPill>
              </div>
              <div style={{ marginTop: 8, fontSize: 13, color: 'var(--fg-3)', display: 'flex', gap: 16 }}>
                <span>Ngày tạo: {formatDate(req.createdAt)}</span>
                {req.approverName && req.approvedAt && (
                  <span>{req.status === 'APPROVED' ? 'Duyệt bởi' : 'Từ chối bởi'}: {req.approverName} — {formatDate(req.approvedAt)}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
