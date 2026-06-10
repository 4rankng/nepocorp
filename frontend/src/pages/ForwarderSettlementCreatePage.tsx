import { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Check, ArrowLeft, Info, Printer, FileSpreadsheet, X } from 'lucide-react';
import { formatCurrency, formatDate } from '../lib/format';
import { groupExpensesByType } from '../lib/expense-breakdown';
import { PageHeader, FormGroup } from '../components/UI';
import { useForwarderAdvanceRequests, useCreateAdvanceSettlement, useUnlinkedExpenses } from '../hooks/useForwarderQueries';
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

interface AdvanceRequest {
  id: number;
  requesterId: number;
  amount: string;
  reason: string;
  status: string;
  createdAt: string;
}

interface CreatedSettlement {
  id: number;
  code: string;
}

export default function ForwarderSettlementCreatePage() {
  const navigate = useNavigate();
  const [selectedRequestIds, setSelectedRequestIds] = useState<Set<number>>(new Set());
  const [selectedExpenseIds, setSelectedExpenseIds] = useState<Set<number>>(new Set());
  const [refundAmount, setRefundAmount] = useState('0');
  const [note, setNote] = useState('');
  const [created, setCreated] = useState<CreatedSettlement | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const { data: requestsData } = useForwarderAdvanceRequests();
  const { data: unlinkedData } = useUnlinkedExpenses();
  const { data: catalogs } = useCatalogs();
  const createSettlement = useCreateAdvanceSettlement();

  const allRequests = ((requestsData?.items ?? requestsData ?? []) as AdvanceRequest[]);
  const approvedRequests = allRequests.filter(r => r.status === 'APPROVED');
  const unlinkedExpenses = (unlinkedData?.items ?? []) as Array<{
    id: number; tripId: number; expenseType: string; buyAmount: string; approvalStatus?: string; note: string | null; createdAt: string; tripCode: string | null; departureDate: string | null; truckPlate: string | null;
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

  const handlePrint = async () => {
    if (!created) return;
    const token = localStorage.getItem('token');
    const res = await fetch(`/api/forwarder/me/advance-settlements/${created.id}/export?format=html`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const html = await res.text();
    setPreviewHtml(html);
    setShowPreview(true);
  };

  const handleIframePrint = () => {
    iframeRef.current?.contentWindow?.print();
  };

  const handleExportExcel = () => {
    if (!created) return;
    const token = localStorage.getItem('token');
    const url = `/api/forwarder/me/advance-settlements/${created.id}/export`;
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `phieu-thanh-toan-${created.code}.xlsx`;
        a.click();
        URL.revokeObjectURL(a.href);
      });
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedRequestIds.size === 0) return;
    const result = await createSettlement.mutateAsync({
      totalExpenseAmount: totalExpense,
      refundAmount: totalRefund,
      note: note || undefined,
      advanceRequestIds: Array.from(selectedRequestIds),
      tripExpenseIds: selectedExpenseIds.size > 0 ? Array.from(selectedExpenseIds) : undefined,
    });
    setCreated(result as CreatedSettlement);
  }

  // ── Success state ──
  if (created) {
    return (
      <div className="fset-page">
        <button className="btn btn--ghost btn--sm" onClick={() => navigate('/my-settlements')} style={{ marginBottom: 4 }}>
          <ArrowLeft size={14} /> Danh sách phiếu thanh toán
        </button>
        <PageHeader
          title="Tạo phiếu thanh toán"
          description="Thanh toán tạm ứng"
          onBack={() => navigate('/my-settlements')}
        />

        <div className="fset-create-success fade-up">
          <div className="fset-create-success__icon">
            <Check size={32} />
          </div>
          <h2 className="fset-create-success__title">Phiếu đã tạo thành công!</h2>
          <p className="fset-create-success__code">{created.code}</p>

          <div className="fset-create-success__actions">
            <button className="btn btn--primary btn--sm" onClick={handlePrint}>
              <Printer size={14} /> In / Lưu PDF
            </button>
            <button className="btn btn--secondary btn--sm" onClick={handleExportExcel}>
              <FileSpreadsheet size={14} /> Xuất Excel
            </button>
            <button className="btn btn--secondary btn--sm" onClick={() => navigate(`/my-settlements/${created.id}`)}>
              Xem chi tiết
            </button>
            <button className="btn btn--ghost btn--sm" onClick={() => navigate('/my-settlements')}>
              <ArrowLeft size={14} /> Quay lại danh sách
            </button>
          </div>
        </div>

        {/* Print Preview Modal */}
        {showPreview && previewHtml && (
          <div className="print-preview-overlay">
            <div className="print-preview-toolbar">
              <span className="print-preview-title">Phiếu thanh toán {created.code}</span>
              <div className="print-preview-actions">
                <button className="btn btn--primary btn--sm" onClick={handleIframePrint}>
                  <Printer size={14} /> In / Lưu PDF
                </button>
                <button className="btn btn--secondary btn--sm" onClick={() => setShowPreview(false)}>
                  <X size={14} /> Đóng
                </button>
              </div>
            </div>
            <div className="print-preview-body">
              <iframe
                ref={iframeRef}
                className="print-preview-iframe"
                title={`Phiếu thanh toán ${created.code}`}
                srcDoc={previewHtml}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Form state ──
  return (
    <div className="fset-page">
      <button className="btn btn--ghost btn--sm" onClick={() => navigate('/my-settlements')} style={{ marginBottom: 4 }}>
        <ArrowLeft size={14} /> Danh sách phiếu thanh toán
      </button>
      <PageHeader
        title="Tạo phiếu thanh toán"
        description="Thanh toán tạm ứng"
      />

      <form onSubmit={handleSubmit} className="fset-create-form fade-up">
        {/* Step 1: Select advance requests */}
        <FormGroup label="Bước 1 · Chọn tạm ứng đã duyệt">
          {approvedRequests.length === 0 ? (
            <p style={{ color: 'var(--ink-3)', fontSize: 13 }}>Không có tạm ứng nào đã duyệt</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label className="fset-form-panel__select-all">
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
                <label key={r.id} className="fset-form-panel__item">
                  <input type="checkbox" checked={selectedRequestIds.has(r.id)} onChange={() => toggleRequest(r.id)} />
                  <div className="fset-form-panel__item-text">
                    <span className="fset-form-panel__item-amount">{formatCurrency(Number(r.amount))}</span>
                    <span className="fset-form-panel__item-meta">— {r.reason}</span>
                  </div>
                  <span className="fset-form-panel__item-date">{formatDate(r.createdAt)}</span>
                </label>
              ))}
            </div>
          )}
        </FormGroup>

        {/* Step 2: Select trip expenses */}
        <FormGroup label="Bước 2 · Chọn chi phí phát sinh">
          {unlinkedExpenses.length === 0 ? (
            <div className="fset-form-panel__empty-hint">
              <Info size={14} />
              <span>Không có chi phí nào chưa thanh toán. Các chi phí đã nằm trong phiếu khác sẽ không hiện ở đây.</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label className="fset-form-panel__select-all">
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
                <label key={exp.id} className="fset-form-panel__item fset-form-panel__item--two-row">
                  <input type="checkbox" checked={selectedExpenseIds.has(exp.id)} onChange={() => toggleExpense(exp.id)} />
                  <div className="fset-form-panel__item-text">
                    <span className="fset-form-panel__item-row1">
                      <span className="fset-form-panel__item-label">
                        {expenseLabel(exp.expenseType, expenseTypeOptions)}
                      </span>
                      {exp.tripCode && (
                        <span className="fset-form-panel__item-meta">({exp.tripCode})</span>
                      )}
                      <span className="fset-form-panel__item-price">
                        {formatCurrency(Number(exp.buyAmount))}
                      </span>
                    </span>
                    <span className="fset-form-panel__item-row2">
                      {formatDate(exp.createdAt)}
                      {exp.truckPlate ? ` · ${exp.truckPlate}` : ''}
                      {exp.note && ` · ${exp.note}`}
                    </span>
                  </div>
                </label>
              ))}
            </div>
          )}
        </FormGroup>

        {/* Summary */}
        <div className="fset-form-panel__summary">
          <div className="fset-form-panel__summary-grid">
            <div><span className="fset-form-panel__summary-label">Tổng tạm ứng:</span> <span className="fset-form-panel__summary-value">{formatCurrency(totalAdvance)}</span></div>
            <div><span className="fset-form-panel__summary-label">Tổng chi phí:</span> <span className="fset-form-panel__summary-value">{formatCurrency(totalExpense)}</span></div>
          </div>
          {expenseBreakdown.size > 0 && (
            <div className="fset-form-panel__breakdown">
              <span className="fset-form-panel__breakdown-label">Chi tiết theo hạng mục:</span>
              <div className="fset-form-panel__breakdown-chips">
                {[...expenseBreakdown.entries()].map(([label, amount]) => (
                  <span key={label} className="fset-chip">{label}: {formatCurrency(amount)}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        <FormGroup label="Tiền hoàn lại">
          <input type="number" value={refundAmount} onChange={e => setRefundAmount(e.target.value)} placeholder="0" min={0} />
        </FormGroup>

        {totalAdvance > 0 && balance !== 0 && (
          <div className="fset-form-panel__warn">
            Chênh lệch: {formatCurrency(balance)} (tạm ứng − chi phí − hoàn lại)
          </div>
        )}

        <FormGroup label="Ghi chú">
          <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Ghi chú (không bắt buộc)" style={{ minHeight: 64, resize: 'vertical' }} />
        </FormGroup>

        {createSettlement.error && (
          <div className="fset-form-panel__error">
            {(createSettlement.error as Error)?.message || 'Có lỗi xảy ra'}
          </div>
        )}

        <div className="fset-form-panel__actions">
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => navigate('/my-settlements')}>
            <ArrowLeft size={14} /> Hủy
          </button>
          <button
            type="submit"
            className="btn btn--primary btn--sm"
            disabled={selectedRequestIds.size === 0 || createSettlement.isPending}
          >
            {createSettlement.isPending ? <Loader2 size={14} className="spin" /> : <Check size={14} />}
            Gửi phiếu thanh toán
          </button>
        </div>
      </form>
    </div>
  );
}
