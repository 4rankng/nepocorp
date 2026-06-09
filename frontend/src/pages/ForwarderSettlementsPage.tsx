import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Loader2, Plus, X, Check } from 'lucide-react';
import { formatCurrency, formatDate } from '../lib/format';
import { groupExpensesByType } from '../lib/expense-breakdown';
import { ADVANCE_SETTLEMENT_STATUS_LABELS, type AdvanceSettlementStatus } from '@tingting/shared';
import { PageHeader, Panel, StatusPill, FormGroup } from '../components/UI';
import { useForwarderSettlements, useForwarderAdvanceRequests, useCreateAdvanceSettlement, useUnlinkedExpenses } from '../hooks/useForwarderQueries';
import { useCatalogs } from '../hooks/useCatalogs';
import { advanceSettlementStatusVariant } from '../lib/status-variants';

/** Vietnamese fallback labels for expense type codes (used when catalog hasn't loaded) */
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
  linkedExpenses?: LinkedExpense[];
}

interface AdvanceRequest {
  id: number;
  requesterId: number;
  amount: string;
  reason: string;
  status: string;
  createdAt: string;
}

export default function ForwarderSettlementsPage() {
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [selectedRequestIds, setSelectedRequestIds] = useState<Set<number>>(new Set());
  const [selectedExpenseIds, setSelectedExpenseIds] = useState<Set<number>>(new Set());
  const [refundAmount, setRefundAmount] = useState('0');
  const [note, setNote] = useState('');

  const { data: settlementsData, isLoading: loadingSettlements, error: settlementsError } = useForwarderSettlements();
  const { data: requestsData } = useForwarderAdvanceRequests();
  const { data: unlinkedData } = useUnlinkedExpenses();
  const { data: catalogs } = useCatalogs();
  const createSettlement = useCreateAdvanceSettlement();

  const settlements = (settlementsData?.items ?? settlementsData ?? []) as Settlement[];
  const allRequests = ((requestsData?.items ?? requestsData ?? []) as AdvanceRequest[]);
  const approvedRequests = allRequests.filter(r => r.status === 'APPROVED');
  const unlinkedExpenses = (unlinkedData?.items ?? []) as Array<{
    id: number; tripId: number; expenseType: string; buyAmount: string; approvalStatus?: string; note: string | null; createdAt: string; tripCode: string | null;
  }>;
  const expenseTypeOptions = catalogs?.forwarderExpenseTypes ?? [];

  const totalAdvance = useMemo(() => {
    return approvedRequests
      .filter(r => selectedRequestIds.has(r.id))
      .reduce((sum, r) => sum + Number(r.amount), 0);
  }, [approvedRequests, selectedRequestIds]);

  const totalExpense = useMemo(() => {
    return unlinkedExpenses
      .filter(e => selectedExpenseIds.has(e.id))
      .reduce((sum, e) => sum + Number(e.buyAmount), 0);
  }, [unlinkedExpenses, selectedExpenseIds]);

  const totalRefund = Number(refundAmount) || 0;
  const balance = totalAdvance - totalExpense - totalRefund;

  const expenseBreakdown = useMemo(() => {
    const selected = unlinkedExpenses.filter(e => selectedExpenseIds.has(e.id));
    return groupExpensesByType(selected, expenseTypeOptions);
  }, [unlinkedExpenses, selectedExpenseIds, expenseTypeOptions]);

  function toggleRequest(id: number) {
    setSelectedRequestIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleExpense(id: number) {
    setSelectedExpenseIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function resetForm() {
    setShowForm(false);
    setSelectedRequestIds(new Set());
    setSelectedExpenseIds(new Set());
    setRefundAmount('0');
    setNote('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedRequestIds.size === 0) return;
    await createSettlement.mutateAsync({
      totalExpenseAmount: totalExpense,
      refundAmount: totalRefund,
      note: note || undefined,
      advanceRequestIds: Array.from(selectedRequestIds),
      tripExpenseIds: selectedExpenseIds.size > 0 ? Array.from(selectedExpenseIds) : undefined,
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
              {/* Step 1: Select advance requests */}
              <FormGroup label="Bước 1: Chọn tạm ứng đã duyệt">
                {approvedRequests.length === 0 ? (
                  <p style={{ color: 'var(--fg-3)', fontSize: 14 }}>Không có tạm ứng nào đã duyệt</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: 'var(--bg-2)', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
                      <input
                        type="checkbox"
                        checked={approvedRequests.length > 0 && selectedRequestIds.size === approvedRequests.length}
                        onChange={() => {
                          if (selectedRequestIds.size === approvedRequests.length) {
                            setSelectedRequestIds(new Set());
                          } else {
                            setSelectedRequestIds(new Set(approvedRequests.map(r => r.id)));
                          }
                        }}
                      />
                      Chọn tất cả ({approvedRequests.length})
                    </label>
                    {approvedRequests.map(r => (
                      <label key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer' }}>
                        <input type="checkbox" checked={selectedRequestIds.has(r.id)} onChange={() => toggleRequest(r.id)} />
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

              {/* Step 2: Select trip expenses */}
              <FormGroup label="Bước 2: Chọn chi phí phát sinh">
                {unlinkedExpenses.length === 0 ? (
                  <p style={{ color: 'var(--fg-3)', fontSize: 14 }}>Không có chi phí nào chưa thanh toán</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: 'var(--bg-2)', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
                      <input
                        type="checkbox"
                        checked={unlinkedExpenses.length > 0 && selectedExpenseIds.size === unlinkedExpenses.length}
                        onChange={() => {
                          if (selectedExpenseIds.size === unlinkedExpenses.length) {
                            setSelectedExpenseIds(new Set());
                          } else {
                            setSelectedExpenseIds(new Set(unlinkedExpenses.map(e => e.id)));
                          }
                        }}
                      />
                      Chọn tất cả ({unlinkedExpenses.length})
                    </label>
                    {unlinkedExpenses.map(exp => (
                      <label key={exp.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer' }}>
                        <input type="checkbox" checked={selectedExpenseIds.has(exp.id)} onChange={() => toggleExpense(exp.id)} />
                        <span style={{ flex: 1 }}>
                          <span style={{ fontWeight: 500 }}>
                            {expenseLabel(exp.expenseType, expenseTypeOptions)}
                          </span>
                          {exp.tripCode && (
                            <span style={{ color: 'var(--fg-3)', marginLeft: 8, fontSize: 12 }}>({exp.tripCode})</span>
                          )}
                          {exp.note && (
                            <span style={{ color: 'var(--fg-3)', marginLeft: 8, fontSize: 12 }}>{exp.note}</span>
                          )}
                          {exp.approvalStatus === 'PENDING' && (
                            <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--warn, #A16207)', background: 'var(--warn-bg, #FEF9C3)', padding: '1px 6px', borderRadius: 3 }}>Chờ duyệt</span>
                          )}
                        </span>
                        <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(Number(exp.buyAmount))}</span>
                      </label>
                    ))}
                  </div>
                )}
              </FormGroup>

              {/* Summary: auto-calculated totals */}
              <div style={{ background: 'var(--bg-2)', borderRadius: 8, padding: 16, marginBottom: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 14 }}>
                  <div><span style={{ color: 'var(--fg-3)' }}>Tổng tạm ứng:</span> <strong>{formatCurrency(totalAdvance)}</strong></div>
                  <div><span style={{ color: 'var(--fg-3)' }}>Tổng chi phí:</span> <strong>{formatCurrency(totalExpense)}</strong></div>
                </div>

                {/* Breakdown by category */}
                {expenseBreakdown.size > 0 && (
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 12, color: 'var(--fg-3)', fontWeight: 500 }}>Chi tiết theo hạng mục:</span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                      {[...expenseBreakdown.entries()].map(([label, amount]) => (
                        <span key={label} style={{ fontSize: 12, padding: '2px 8px', background: 'var(--bg-3, var(--bg))', borderRadius: 4 }}>
                          {label}: {formatCurrency(amount)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

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
                  disabled={selectedRequestIds.size === 0 || createSettlement.isPending}
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
            <div
              key={s.id}
              style={{ cursor: 'pointer' }}
              onClick={() => navigate(`/my-settlements/${s.id}`)}
            >
            <Panel
              style={{ transition: 'box-shadow 150ms ease, border-color 150ms ease' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FileText size={16} style={{ color: 'var(--brand)' }} />
                    <span style={{ fontWeight: 600 }}>Mã {s.id}</span>
                  </div>
                  <div style={{ fontSize: 14, color: 'var(--fg-3)', marginTop: 4 }}>
                    Tạo ngày {formatDate(s.createdAt)}
                  </div>
                </div>
                <StatusPill variant={advanceSettlementStatusVariant(s.status)}>
                  {ADVANCE_SETTLEMENT_STATUS_LABELS[s.status] || s.status}
                </StatusPill>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 14 }}>
                <div><span style={{ color: 'var(--fg-3)' }}>Tổng chi phí:</span> <strong>{formatCurrency(Number(s.totalExpenseAmount))}</strong></div>
                <div><span style={{ color: 'var(--fg-3)' }}>Tiền hoàn lại:</span> <strong>{formatCurrency(Number(s.refundAmount))}</strong></div>
              </div>

              {/* Expense breakdown by category */}
              {s.linkedExpenses && s.linkedExpenses.length > 0 && (() => {
                const groups = groupExpensesByType(s.linkedExpenses, expenseTypeOptions);
                return (
                  <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 12, color: 'var(--fg-3)', fontWeight: 500 }}>Chi phí theo hạng mục:</span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                      {[...groups.entries()].map(([label, amount]) => (
                        <span key={label} style={{ fontSize: 12, padding: '2px 8px', background: 'var(--bg-2)', borderRadius: 4 }}>
                          {label}: {formatCurrency(amount)}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {s.linkedRequests && s.linkedRequests.length > 0 && (
                <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 12, color: 'var(--fg-3)', fontWeight: 500 }}>Tạm ứng liên kết:</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                    {s.linkedRequests.map(r => (
                      <span key={r.id} style={{ fontSize: 12, padding: '2px 8px', background: 'var(--bg-2)', borderRadius: 4 }}>
                        Mã {r.id} — {formatCurrency(Number(r.amount))}
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
