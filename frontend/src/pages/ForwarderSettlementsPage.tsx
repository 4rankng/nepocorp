import { useState, useMemo } from 'react';
import { FileText, Loader2, Plus, X, Check } from 'lucide-react';
import { formatCurrency, formatDate } from '../lib/format';
import { ADVANCE_SETTLEMENT_STATUS_LABELS, type AdvanceSettlementStatus } from '@nepocorp/shared';
import { PageHeader, Panel, StatusPill, FormGroup } from '../components/UI';
import { useForwarderSettlements, useForwarderAdvanceRequests, useCreateAdvanceSettlement } from '../hooks/useQueries';

interface LinkedRequest {
  id: number;
  amount: string;
  reason: string;
  status: string;
  createdAt: string;
}

interface Settlement {
  id: number;
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
}

interface AdvanceRequest {
  id: number;
  requesterId: number;
  amount: string;
  reason: string;
  status: string;
  createdAt: string;
}

function settlementStatusVariant(status: AdvanceSettlementStatus): 'neutral' | 'info' | 'warn' | 'success' | 'danger' {
  switch (status) {
    case 'PENDING': return 'warn';
    case 'CHECKED_BY_ACCOUNTANT': return 'info';
    case 'APPROVED': return 'success';
    case 'REJECTED': return 'danger';
    default: return 'neutral';
  }
}

export default function ForwarderSettlementsPage() {
  const [showForm, setShowForm] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [expenseAmount, setExpenseAmount] = useState('');
  const [refundAmount, setRefundAmount] = useState('0');
  const [note, setNote] = useState('');

  const { data: settlementsData, isLoading: loadingSettlements, error: settlementsError } = useForwarderSettlements();
  const { data: requestsData } = useForwarderAdvanceRequests();
  const createSettlement = useCreateAdvanceSettlement();

  const settlements = (settlementsData?.items ?? settlementsData ?? []) as Settlement[];
  const allRequests = ((requestsData?.items ?? requestsData ?? []) as AdvanceRequest[]);
  const approvedRequests = allRequests.filter(r => r.status === 'APPROVED');

  const totalAdvance = useMemo(() => {
    return approvedRequests
      .filter(r => selectedIds.has(r.id))
      .reduce((sum, r) => sum + Number(r.amount), 0);
  }, [approvedRequests, selectedIds]);

  const totalExpense = Number(expenseAmount) || 0;
  const totalRefund = Number(refundAmount) || 0;
  const balance = totalAdvance - totalExpense - totalRefund;

  function toggleRequest(id: number) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function resetForm() {
    setShowForm(false);
    setSelectedIds(new Set());
    setExpenseAmount('');
    setRefundAmount('0');
    setNote('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedIds.size === 0) return;
    await createSettlement.mutateAsync({
      totalExpenseAmount: totalExpense,
      refundAmount: totalRefund,
      note: note || undefined,
      advanceRequestIds: Array.from(selectedIds),
    });
    resetForm();
  }

  const error = settlementsError ? 'Không thể tải danh sách phiếu thanh toán' : null;

  if (loadingSettlements) return (
    <Panel>
      <div style={{ padding: 32, textAlign: 'center', color: 'var(--fg-3)' }}>
        <Loader2 size={20} className="spin" style={{ display: 'inline-block' }} />
        <p style={{ marginTop: 8 }}>Đang tải danh sách phiếu thanh toán…</p>
      </div>
    </Panel>
  );

  if (error) return (
    <Panel><div style={{ padding: 20, textAlign: 'center', color: 'var(--danger)' }}>{error}</div></Panel>
  );

  return (
    <div>
      <PageHeader
        title="Phiếu thanh toán"
        description="Tạo và xem phiếu thanh toán tạm ứng"
      />

      <div style={{ marginBottom: 16 }}>
        {!showForm ? (
          <button className="btn btn--primary" onClick={() => setShowForm(true)}>
            <Plus size={16} /> Tạo phiếu thanh toán
          </button>
        ) : (
          <Panel>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Tạo phiếu thanh toán</h3>
              <button className="btn btn--ghost" onClick={resetForm}><X size={16} /></button>
            </div>

            <form onSubmit={handleSubmit}>
              <FormGroup label="Chọn tạm ứng đã duyệt">
                {approvedRequests.length === 0 ? (
                  <p style={{ color: 'var(--fg-3)', fontSize: 14 }}>Không có tạm ứng nào đã duyệt</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {approvedRequests.map(r => (
                      <label key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(r.id)}
                          onChange={() => toggleRequest(r.id)}
                        />
                        <span style={{ flex: 1 }}>
                          <span style={{ fontWeight: 500 }}>{formatCurrency(Number(r.amount))}</span>
                          <span style={{ color: 'var(--fg-3)', marginLeft: 8 }}>- {r.reason}</span>
                        </span>
                        <span style={{ color: 'var(--fg-3)', fontSize: 12 }}>{formatDate(r.createdAt)}</span>
                      </label>
                    ))}
                  </div>
                )}
              </FormGroup>

              <FormGroup label="Tổng tiền tạm ứng">
                <input
                  type="text"
                  value={formatCurrency(totalAdvance)}
                  readOnly
                  style={{ background: 'var(--bg-2)', width: '100%' }}
                  className="input"
                />
              </FormGroup>

              <FormGroup label="Tổng chi phí">
                <input
                  type="number"
                  value={expenseAmount}
                  onChange={e => setExpenseAmount(e.target.value)}
                  placeholder="Nhập tổng chi phí"
                  className="input"
                  style={{ width: '100%' }}
                  min={0}
                />
              </FormGroup>

              <FormGroup label="Tiền hoàn lại">
                <input
                  type="number"
                  value={refundAmount}
                  onChange={e => setRefundAmount(e.target.value)}
                  placeholder="0"
                  className="input"
                  style={{ width: '100%' }}
                  min={0}
                />
              </FormGroup>

              {totalAdvance > 0 && balance !== 0 && (
                <div style={{ padding: '8px 12px', background: 'var(--warn-bg, #FEF9C3)', borderRadius: 6, fontSize: 14, color: 'var(--warn, #A16207)', marginBottom: 12 }}>
                  Chênh lệch: {formatCurrency(balance)} (tạm ứng - chi phí - hoàn lại)
                </div>
              )}

              <FormGroup label="Ghi chú">
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Ghi chú (không bắt buộc)"
                  className="input"
                  style={{ width: '100%', minHeight: 64, resize: 'vertical' }}
                />
              </FormGroup>

              {createSettlement.error && (
                <div style={{ padding: '8px 12px', background: '#FEE2E2', borderRadius: 6, fontSize: 14, color: 'var(--danger)', marginBottom: 12 }}>
                  {(createSettlement.error as Error)?.message || 'Có lỗi xảy ra'}
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn--ghost" onClick={resetForm}>Hủy</button>
                <button
                  type="submit"
                  className="btn btn--primary"
                  disabled={selectedIds.size === 0 || !expenseAmount || createSettlement.isPending}
                >
                  {createSettlement.isPending ? <Loader2 size={16} className="spin" /> : <Check size={16} />}
                  Gửi phiếu thanh toán
                </button>
              </div>
            </form>
          </Panel>
        )}
      </div>

      {settlements.length === 0 && !showForm ? (
        <div className="empty-state">
          <h3 className="empty-state-title">Chưa có phiếu thanh toán nào</h3>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {settlements.map(s => (
            <Panel key={s.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FileText size={16} style={{ color: 'var(--brand)' }} />
                    <span style={{ fontWeight: 600 }}>#{s.id}</span>
                  </div>
                  <div style={{ fontSize: 14, color: 'var(--fg-3)', marginTop: 4 }}>
                    Tạo ngày {formatDate(s.createdAt)}
                  </div>
                </div>
                <StatusPill variant={settlementStatusVariant(s.status)}>
                  {ADVANCE_SETTLEMENT_STATUS_LABELS[s.status] || s.status}
                </StatusPill>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 14 }}>
                <div><span style={{ color: 'var(--fg-3)' }}>Tổng chi phí:</span> <strong>{formatCurrency(Number(s.totalExpenseAmount))}</strong></div>
                <div><span style={{ color: 'var(--fg-3)' }}>Tiền hoàn lại:</span> <strong>{formatCurrency(Number(s.refundAmount))}</strong></div>
              </div>

              {s.linkedRequests && s.linkedRequests.length > 0 && (
                <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 12, color: 'var(--fg-3)', fontWeight: 500 }}>Tạm ứng liên kết:</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                    {s.linkedRequests.map(r => (
                      <span key={r.id} style={{ fontSize: 12, padding: '2px 8px', background: 'var(--bg-2)', borderRadius: 4 }}>
                        #{r.id} — {formatCurrency(Number(r.amount))}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {s.note && (
                <div style={{ marginTop: 8, fontSize: 13, color: 'var(--fg-3)' }}>
                  <span style={{ fontWeight: 500 }}>Ghi chú:</span> {s.note}
                </div>
              )}

              <div style={{ marginTop: 8, display: 'flex', gap: 16, fontSize: 12, color: 'var(--fg-3)', flexWrap: 'wrap' }}>
                {s.checkerName && s.checkedAt && (
                  <span>Kiểm tra: {s.checkerName} ({formatDate(s.checkedAt)})</span>
                )}
                {s.approverName && s.approvedAt && (
                  <span>Duyệt: {s.approverName} ({formatDate(s.approvedAt)})</span>
                )}
              </div>
            </Panel>
          ))}
        </div>
      )}
    </div>
  );
}
