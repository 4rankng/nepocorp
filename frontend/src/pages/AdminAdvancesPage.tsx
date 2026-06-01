import { useState } from 'react';
import { Loader2, Check, X, Wallet, CheckCircle2, XCircle } from 'lucide-react';
import { formatCurrency, formatDate } from '../lib/format';
import { ADVANCE_REQUEST_STATUS_LABELS, type AdvanceRequestStatus } from '@nepocorp/shared';
import { PageHeader, StatusPill, Toolbar, FilterPill } from '../components/UI';
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

function AdvanceRow({ req, approveMutation, rejectMutation }: { req: any; approveMutation: any; rejectMutation: any }) {
  const [hovered, setHovered] = useState(false);
  const isApproving = approveMutation.isPending && approveMutation.variables === req.id;
  const isRejecting = rejectMutation.isPending && rejectMutation.variables === req.id;
  const isPending = req.status === 'PENDING';

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '12px 16px',
        borderBottom: '1px solid var(--line)',
        background: hovered ? 'var(--surface-2)' : 'transparent',
        transition: 'background 0.1s',
      }}
    >
      {/* Icon + Requester */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: 220, flexShrink: 0 }}>
        <div style={{ 
          width: 32, height: 32, borderRadius: 8, 
          background: 'var(--surface-3)', 
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--ink-3)', flexShrink: 0
        }}>
          <Wallet size={16} />
        </div>
        <span style={{
          fontWeight: 600,
          fontSize: 13,
          color: 'var(--ink)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {req.requesterName || `Đối tác ${req.requesterId}`}
        </span>
      </div>

      {/* Amount */}
      <span style={{
        width: 120,
        flexShrink: 0,
        fontWeight: 600,
        fontFamily: 'var(--font-mono)',
        fontSize: 13,
        color: 'var(--ink)',
        textAlign: 'right',
      }}>
        {formatCurrency(Number(req.amount))}
      </span>

      {/* Date */}
      <span style={{
        width: 100,
        flexShrink: 0,
        fontSize: 12,
        color: 'var(--ink-3)',
        textAlign: 'center',
      }}>
        {formatDate(req.createdAt)}
      </span>

      {/* Status */}
      <div style={{ width: 120, flexShrink: 0 }}>
        <StatusPill variant={advanceRequestStatusVariant(req.status)}>
          {ADVANCE_REQUEST_STATUS_LABELS[req.status as AdvanceRequestStatus]}
        </StatusPill>
      </div>

      {/* Reason */}
      <span style={{
        flex: 1,
        fontSize: 13,
        color: 'var(--ink-2)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {req.reason}
      </span>

      {/* Actions / Approver Info */}
      <div style={{ width: 140, flexShrink: 0, display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
        {isPending ? (
          <div style={{
            display: 'flex',
            gap: 4,
          }}>
            <button
              className="btn btn--ghost btn--icon btn--sm"
              onClick={() => approveMutation.mutate(req.id)}
              disabled={isApproving || isRejecting}
              title="Duyệt yêu cầu"
              style={{ color: 'var(--success)' }}
            >
              {isApproving ? <Loader2 size={16} className="spin" /> : <CheckCircle2 size={16} />}
            </button>
            <button
              className="btn btn--ghost btn--icon btn--sm"
              onClick={() => rejectMutation.mutate(req.id)}
              disabled={isApproving || isRejecting}
              title="Từ chối yêu cầu"
              style={{ color: 'var(--ink-3)' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--danger)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--ink-3)')}
            >
              {isRejecting ? <Loader2 size={16} className="spin" /> : <XCircle size={16} />}
            </button>
          </div>
        ) : req.approverName ? (
          <div style={{ fontSize: 11, color: 'var(--ink-3)', textAlign: 'right' }}>
            bởi <strong>{req.approverName}</strong>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function AdminAdvancesPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const { data, isLoading } = useAdminAdvanceRequests(
    statusFilter ? { status: statusFilter } : undefined,
  );
  const approveMutation = useApproveAdvanceRequest();
  const rejectMutation = useRejectAdvanceRequest();

  const requests = data?.items ?? [];

  return (
    <div className="fade-up">
      <PageHeader
        title="Quản lý tạm ứng"
        description="Duyệt hoặc từ chối yêu cầu tạm ứng"
      />

      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        borderRadius: 12,
        overflow: 'hidden',
        boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
      }}>
        {/* Filters Toolbar */}
        <Toolbar>
          {tabs.map((tab) => (
            <FilterPill
              key={tab.key}
              active={statusFilter === tab.key}
              onClick={() => setStatusFilter(tab.key)}
            >
              {tab.label}
            </FilterPill>
          ))}
        </Toolbar>

        {/* Column Headers */}
        {requests.length > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            padding: '10px 16px',
            borderBottom: '1px solid var(--line)',
            background: 'var(--surface-2)',
          }}>
            <span style={{ width: 220, flexShrink: 0, fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Người yêu cầu</span>
            <span style={{ width: 120, flexShrink: 0, fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', letterSpacing: '0.06em', textTransform: 'uppercase', textAlign: 'right' }}>Số tiền</span>
            <span style={{ width: 100, flexShrink: 0, fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', letterSpacing: '0.06em', textTransform: 'uppercase', textAlign: 'center' }}>Ngày tạo</span>
            <span style={{ width: 120, flexShrink: 0, fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Trạng thái</span>
            <span style={{ flex: 1, fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Lý do</span>
            <span style={{ width: 140, flexShrink: 0 }} />
          </div>
        )}

        {/* List Body */}
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: 'var(--ink-3)', margin: '0 auto' }} />
          </div>
        ) : requests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 24px' }}>
            <Wallet size={32} style={{ color: 'var(--ink-4)', margin: '0 auto 12px' }} />
            <div style={{ fontSize: 14, color: 'var(--ink-2)', fontWeight: 500 }}>Không có yêu cầu tạm ứng nào</div>
          </div>
        ) : (
          <div>
            {requests.map((req: any) => (
              <AdvanceRow
                key={req.id}
                req={req}
                approveMutation={approveMutation}
                rejectMutation={rejectMutation}
              />
            ))}
          </div>
        )}
      </div>

      {requests.length > 0 && (
        <div style={{ marginTop: 8, fontSize: 12, color: 'var(--ink-4)', paddingLeft: 4 }}>
          {requests.length} yêu cầu tạm ứng
        </div>
      )}
    </div>
  );
}
