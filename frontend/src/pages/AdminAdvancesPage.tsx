import { useState } from 'react';
import { Wallet, Loader2, Check, X as XIcon } from 'lucide-react';
import { formatCurrency, formatDate } from '../lib/format';
import { ADVANCE_REQUEST_STATUS_LABELS, type AdvanceRequestStatus } from '@nepocorp/shared';
import { PageHeader, Panel, StatusPill } from '../components/UI';
import {
  useAdminAdvanceRequests,
  useApproveAdvanceRequest,
  useRejectAdvanceRequest,
} from '../hooks/useQueries';
import { advanceRequestStatusVariant } from '../lib/status-variants';

const tabs = [
  { key: '', label: 'Tất cả' },
  { key: 'PENDING', label: 'Chờ duyệt' },
  { key: 'APPROVED', label: 'Đã duyệt' },
  { key: 'REJECTED', label: 'Từ chối' },
];

export default function AdminAdvancesPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const { data, isLoading } = useAdminAdvanceRequests(
    statusFilter ? { status: statusFilter } : undefined,
  );
  const approveMutation = useApproveAdvanceRequest();
  const rejectMutation = useRejectAdvanceRequest();

  const requests = data?.items ?? [];

  return (
    <div>
      <PageHeader
        title="Quản lý tạm ứng"
        description="Duyệt hoặc từ chối yêu cầu tạm ứng"
      />

      <Panel>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              style={{
                padding: '6px 14px',
                borderRadius: 999,
                border: '1px solid var(--border)',
                background: statusFilter === tab.key ? 'var(--accent)' : 'transparent',
                color: statusFilter === tab.key ? '#fff' : 'var(--fg-2)',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 32 }}>
            <Loader2 style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : requests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 32, color: 'var(--fg-3)' }}>
            Không có yêu cầu tạm ứng nào
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {requests.map((req: any) => (
              <div
                key={req.id}
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  padding: 16,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Wallet size={16} style={{ color: 'var(--fg-3)' }} />
                    <strong>{req.requesterName || `Đối tác ${req.requesterId}`}</strong>
                    <StatusPill variant={advanceRequestStatusVariant(req.status)}>
                      {ADVANCE_REQUEST_STATUS_LABELS[req.status as AdvanceRequestStatus]}
                    </StatusPill>
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>
                    {formatDate(req.createdAt)}
                  </span>
                </div>

                <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>
                  {formatCurrency(Number(req.amount))}
                </div>

                <div style={{ fontSize: 14, color: 'var(--fg-2)', marginBottom: 4 }}>
                  {req.reason}
                </div>

                {req.approverName && req.approvedAt && (
                  <div style={{ fontSize: 12, color: 'var(--fg-3)', marginTop: 4 }}>
                    {req.status === 'APPROVED' ? 'Duyệt' : 'Từ chối'} bởi: {req.approverName} — {formatDate(req.approvedAt)}
                  </div>
                )}

                {req.status === 'PENDING' && (
                  <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => approveMutation.mutate(req.id)}
                      disabled={approveMutation.isPending}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '6px 14px', borderRadius: 6, border: 'none',
                        background: 'var(--success, #22c55e)', color: '#fff',
                        cursor: 'pointer', fontSize: 13, fontWeight: 500,
                      }}
                    >
                      {approveMutation.isPending ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={14} />}
                      Duyệt
                    </button>
                    <button
                      onClick={() => rejectMutation.mutate(req.id)}
                      disabled={rejectMutation.isPending}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '6px 14px', borderRadius: 6, border: 'none',
                        background: 'var(--danger, #ef4444)', color: '#fff',
                        cursor: 'pointer', fontSize: 13, fontWeight: 500,
                      }}
                    >
                      {rejectMutation.isPending ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <XIcon size={14} />}
                      Từ chối
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
