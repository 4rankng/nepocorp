import { useState } from 'react';
import { Loader2, Check, X as XIcon, Wallet } from 'lucide-react';
import { formatCurrency, formatDate } from '../lib/format';
import { ADVANCE_REQUEST_STATUS_LABELS, type AdvanceRequestStatus } from '@nepocorp/shared';
import { PageHeader, Panel, StatusPill, Btn, FilterPill } from '../components/UI';
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

      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {tabs.map((tab) => (
          <FilterPill
            key={tab.key}
            active={statusFilter === tab.key}
            onClick={() => setStatusFilter(tab.key)}
          >
            {tab.label}
          </FilterPill>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
          {requests.map((req: any, index: number) => (
            <div
              key={req.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderTop: index > 0 ? '1px solid var(--border)' : 'none',
                background: 'var(--surface)',
                gap: 16,
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: '1 1 250px' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Wallet size={20} style={{ color: 'var(--fg-3)' }} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: 'var(--fg-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {req.requesterName || `Đối tác ${req.requesterId}`}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--fg-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {req.reason}
                  </div>
                </div>
              </div>

              <div style={{ flex: '1 1 120px', display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontWeight: 600, color: 'var(--fg-1)' }}>
                  {formatCurrency(Number(req.amount))}
                </span>
                <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>
                  {formatDate(req.createdAt)}
                </span>
              </div>
              
              <div style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <StatusPill variant={advanceRequestStatusVariant(req.status)}>
                  {ADVANCE_REQUEST_STATUS_LABELS[req.status as AdvanceRequestStatus]}
                </StatusPill>
                {req.approverName && req.approvedAt && (
                   <div style={{ fontSize: 11, color: 'var(--fg-3)', marginTop: 4 }}>
                     bởi {req.approverName}
                   </div>
                )}
              </div>

              <div style={{ flex: '0 0 auto', display: 'flex', gap: 6, width: 180, justifyContent: 'flex-end' }}>
                {req.status === 'PENDING' && (
                  <>
                    <Btn
                      size="sm"
                      variant="secondary"
                      onClick={() => approveMutation.mutate(req.id)}
                      disabled={approveMutation.isPending}
                      style={{ color: 'var(--success)', flex: 1, padding: '0 8px' }}
                      icon={approveMutation.isPending ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={14} />}
                    >
                      Duyệt
                    </Btn>
                    <Btn
                      size="sm"
                      variant="secondary"
                      onClick={() => rejectMutation.mutate(req.id)}
                      disabled={rejectMutation.isPending}
                      style={{ color: 'var(--danger)', flex: 1, padding: '0 8px' }}
                      icon={rejectMutation.isPending ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <XIcon size={14} />}
                    >
                      Từ chối
                    </Btn>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
