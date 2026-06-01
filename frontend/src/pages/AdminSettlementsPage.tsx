import { useState } from 'react';
import { FileText, Loader2, Check, X as XIcon, ClipboardCheck } from 'lucide-react';
import { formatCurrency, formatDate } from '../lib/format';
import { ADVANCE_SETTLEMENT_STATUS_LABELS, type AdvanceSettlementStatus } from '@nepocorp/shared';
import { PageHeader, Panel, StatusPill } from '../components/UI';
import {
  useAdminSettlements,
  useCheckSettlement,
  useApproveSettlement,
  useRejectSettlement,
} from '../hooks/useQueries';

const tabs = [
  { key: '', label: 'Tất cả' },
  { key: 'PENDING', label: 'Chờ xử lý' },
  { key: 'CHECKED_BY_ACCOUNTANT', label: 'KT đã kiểm tra' },
  { key: 'APPROVED', label: 'Đã duyệt' },
  { key: 'REJECTED', label: 'Từ chối' },
];

function settlementStatusVariant(status: AdvanceSettlementStatus): 'neutral' | 'info' | 'warn' | 'success' | 'danger' {
  switch (status) {
    case 'PENDING': return 'warn';
    case 'CHECKED_BY_ACCOUNTANT': return 'info';
    case 'APPROVED': return 'success';
    case 'REJECTED': return 'danger';
    default: return 'neutral';
  }
}

export default function AdminSettlementsPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const { data: settlements, isLoading } = useAdminSettlements(
    statusFilter ? { status: statusFilter } : undefined,
  );
  const checkMutation = useCheckSettlement();
  const approveMutation = useApproveSettlement();
  const rejectMutation = useRejectSettlement();

  return (
    <div>
      <PageHeader
        title="Thanh toán tạm ứng"
        description="Quản lý phiếu thanh toán tạm ứng"
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
        ) : !settlements || settlements.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 32, color: 'var(--fg-3)' }}>
            Chưa có phiếu thanh toán nào
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {settlements.map((s: any) => (
              <div
                key={s.id}
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  padding: 16,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FileText size={16} style={{ color: 'var(--fg-3)' }} />
                    <strong>{s.forwarderName || `Đối tác #${s.forwarderId}`}</strong>
                    <StatusPill variant={settlementStatusVariant(s.status)}>
                      {ADVANCE_SETTLEMENT_STATUS_LABELS[s.status]}
                    </StatusPill>
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>
                    {formatDate(s.createdAt)}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: 24, fontSize: 14, marginBottom: 4 }}>
                  <span>Tổng chi phí: <strong>{formatCurrency(s.totalExpenseAmount)}</strong></span>
                  <span>Hoàn trả: <strong>{formatCurrency(s.refundAmount)}</strong></span>
                </div>

                {s.note && (
                  <div style={{ fontSize: 13, color: 'var(--fg-3)', marginBottom: 4 }}>
                    Ghi chú: {s.note}
                  </div>
                )}

                {s.linkedRequests && s.linkedRequests.length > 0 && (
                  <div style={{ marginTop: 6 }}>
                    <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>Yêu cầu tạm ứng: </span>
                    {s.linkedRequests.map((req: any, i: number) => (
                      <span key={req.id} style={{ fontSize: 12, marginRight: 8 }}>
                        #{req.id} ({formatCurrency(req.amount)})
                        {i < s.linkedRequests.length - 1 && ','}
                      </span>
                    ))}
                  </div>
                )}

                {s.checkedBy && (
                  <div style={{ fontSize: 12, color: 'var(--fg-3)', marginTop: 4 }}>
                    Kiểm tra bởi: {s.checkerName || `#${s.checkedBy}`} — {s.checkedAt && formatDate(s.checkedAt)}
                  </div>
                )}
                {s.approvedBy && (
                  <div style={{ fontSize: 12, color: 'var(--fg-3)', marginTop: 2 }}>
                    Duyệt bởi: {s.approverName || `#${s.approvedBy}`} — {s.approvedAt && formatDate(s.approvedAt)}
                  </div>
                )}

                {s.status === 'PENDING' && (
                  <div style={{ marginTop: 10 }}>
                    <button
                      onClick={() => checkMutation.mutate(s.id)}
                      disabled={checkMutation.isPending}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '6px 14px', borderRadius: 6, border: 'none',
                        background: 'var(--info, #3b82f6)', color: '#fff',
                        cursor: 'pointer', fontSize: 13, fontWeight: 500,
                      }}
                    >
                      {checkMutation.isPending ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <ClipboardCheck size={14} />}
                      Kiểm tra
                    </button>
                  </div>
                )}

                {s.status === 'CHECKED_BY_ACCOUNTANT' && (
                  <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => approveMutation.mutate(s.id)}
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
                      onClick={() => rejectMutation.mutate(s.id)}
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
