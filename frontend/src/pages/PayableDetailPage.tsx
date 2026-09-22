import { useState, useMemo, useRef } from 'react';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { formatCurrency } from '../lib/format';
import { TxnType, FINANCIAL } from '@tingting/shared';
import type {
  SupplierStatement as SupplierStatementType,
  LedgerEntry,
  VendorPaymentRequest,
} from '@tingting/shared';
import { Phone, Building2, ArrowLeft, CreditCard, Download, FileSpreadsheet, FileText } from 'lucide-react';
import { useSupplierStatement } from '../hooks/useQueries';
import { api, ApiError } from '../lib/api';
import { useToast } from '../components/shared/Toast';
import { useConfirm } from '../components/UI';
import BillingDocumentsPanel from '../components/billing/BillingDocumentsPanel';
import { usePageAnimations } from '../hooks/animations';
import { useBackShortcut } from '../hooks/useBackShortcut';
import { qk } from '../api/keys';
import { useClickOutside } from '../hooks/useClickOutside';
import { PeriodFilter, resolvePeriodRange, initialPeriodState, applyModeSwitch } from '../components/debt/PeriodFilter';
import { PeriodSummaryCards } from '../components/debt/PeriodSummaryCards';
import { useMediaQuery } from '../hooks/useMediaQuery';
import './DebtDetailPage.css';
import { payableBillingDocumentEntityType } from './payable-billing-document';
import { FILTER_OPTIONS, normalizeAging } from '../features/payables/payableDetailUtils';
import type { LedgerFilter } from '../features/payables/payableDetailUtils';
import { LedgerRow, FuelLedgerRow, ExpenseLedgerRow } from '../features/payables/payableDetailLedger';
import { PayableLedgerCard, FuelLedgerCard, ExpenseLedgerCard } from '../features/payables/payableDetailLedger';
import { PayableSummarySection } from '../features/payables/payableDetailSummary';
import { PayablePaymentModal } from '../features/payables/payableDetailPaymentModal';

export default function PayableDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isCompactLedger = useMediaQuery('(max-width: 1023px)');
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const isCarrierPayable = searchParams.get('kind') === 'carrier';
  const backPath = location.pathname.startsWith('/suppliers/') ? '/suppliers' : '/payables';
  const queryClient = useQueryClient();

  // ── Period filter (ledger section) ───────────────────────────────────────
  // Declared before useSupplierStatement because the resolved range feeds the
  // statement query. Defaults to current month.
  const [period, setPeriod] = useState(() => initialPeriodState());
  const [appliedPeriod, setAppliedPeriod] = useState(period);
  const appliedPeriodRange = useMemo(
    () => resolvePeriodRange(appliedPeriod),
    [appliedPeriod],
  );

  const {
    data: statement,
    isLoading: loading,
    isFetching: isStatementFetching,
    error: queryError,
  } = useSupplierStatement(
    id ? Number(id) : undefined,
    appliedPeriodRange,
    isCarrierPayable ? 'carrier' : 'vendor',
  );
  const typedStatement = statement as SupplierStatementType | undefined;
  const error = queryError ? (queryError as Error).message : null;
  const { toast: showToast } = useToast();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const { rootRef } = usePageAnimations({ ready: !loading });

  const handleBack = () => navigate(backPath);
  useBackShortcut(handleBack);

  const [ledgerFilter, setLedgerFilter] = useState<LedgerFilter>('all');
  const isPeriodDirty = period.mode !== appliedPeriod.mode
    || period.month !== appliedPeriod.month
    || period.year !== appliedPeriod.year
    || period.dateFrom !== appliedPeriod.dateFrom
    || period.dateTo !== appliedPeriod.dateTo;
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showBillingDocumentBuilder, setShowBillingDocumentBuilder] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  useClickOutside(exportMenuRef, () => setShowExportMenu(false), { escapeKey: true, enabled: showExportMenu });
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentReceiptId, setPaymentReceiptId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const downloadExport = async (format: string) => {
    setShowExportMenu(false);
    try {
      const blob = await api.getBlob(`${FINANCIAL.SUPPLIER_STATEMENT_EXPORT(Number(id))}?format=${format}`);
      const url = URL.createObjectURL(blob);
      if (format === 'pdf') {
        window.open(url, '_blank');
      } else {
        const a = document.createElement('a');
        a.href = url;
        a.download = `sao-ke-ncc-${id}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      showToast({ kind: 'error', message: (err as Error).message || 'Lỗi xuất sao kê' });
    }
  };

  const agingAmounts = useMemo(() =>
    normalizeAging(typedStatement?.agingBuckets ?? []),
    [typedStatement?.agingBuckets]
  );

  const filteredRows = useMemo(() => {
    if (!typedStatement) return [];
    if (ledgerFilter === 'all') return typedStatement.ledgerRows;
    return typedStatement.ledgerRows.filter((r: LedgerEntry) => r.txnType === ledgerFilter);
  }, [typedStatement, ledgerFilter]);

  const activeAgingIdx = useMemo(() => {
    let max = -1, idx = 0;
    agingAmounts.forEach((a, i) => { if (a > max) { max = a; idx = i; } });
    return max > 0 ? idx : -1;
  }, [agingAmounts]);

  const totalOutstanding = typedStatement?.totalOutstanding ?? 0;

  async function handlePaymentSubmit(confirmOverpay = false) {
    if (!id || !paymentAmount) return;
    setSubmitting(true);
    try {
      const body: VendorPaymentRequest & { confirmOverpay?: boolean } = {
        supplierId: Number(id),
        amount: Number(paymentAmount),
        date: paymentDate,
        receiptId: paymentReceiptId,
        confirmOverpay,
      };
      // Backend returns `{ ...ledgerEntry, warning?, overpayment? }`. If the
      // payment exceeds outstanding debt, the backend throws a 422 unless confirmOverpay: true is sent.
      const resp = await api.post<{ warning?: string; overpayment?: number }>(
        isCarrierPayable ? FINANCIAL.PAYMENTS_CARRIER : FINANCIAL.PAYMENTS_VENDOR,
        body,
      );
      if (resp?.warning) {
        showToast({ kind: 'warning', message: resp.warning });
      } else {
        showToast({ kind: 'success', message: `Đã ghi thanh toán ${formatCurrency(body.amount)}` });
      }
      setShowPaymentModal(false);
      setPaymentAmount('');
      setPaymentReceiptId('');
      // Broad prefix — invalidates every supplier-statement query regardless
      // of period range, so the AP detail page's month/range-scoped statement
      // refetches alongside any other cached variant.
      queryClient.invalidateQueries({ queryKey: qk.financial.supplierStatementAll });
      queryClient.invalidateQueries({ queryKey: qk.financial.carrierPayableStatement(undefined) });
      queryClient.invalidateQueries({ queryKey: qk.financial.payablesSummaryAll });
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 422) {
        setSubmitting(false);
        const isConfirmed = await confirm(err.message, {
          confirmLabel: 'Xác nhận',
          cancelLabel: 'Hủy',
          variant: 'warning',
        });
        if (isConfirmed) {
          await handlePaymentSubmit(true);
        }
      } else {
        showToast({ kind: 'error', message: (err as Error).message || 'Lỗi ghi thanh toán' });
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading && !typedStatement) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--fg-3)' }}>
        Đang tải dữ liệu...
      </div>
    );
  }

  if (!typedStatement) {
    return (
      <div className="debt-detail-page">
        <div className="dd-header">
          <button className="dd-back" aria-label="Quay lại" onClick={handleBack}>
            <ArrowLeft size={20} />
          </button>
          <div className="dd-meta">
            <h1>Công nợ phải trả</h1>
          </div>
        </div>
        <div className="dd-summary">
          <p style={{ color: 'var(--danger)', fontSize: 'var(--fs-body)' }}>{error || 'Không tìm thấy dữ liệu'}</p>
        </div>
      </div>
    );
  }

  const { supplier, ledgerRows } = typedStatement;
  const hasDebt = totalOutstanding > 0;
  const lastLedgerRow = ledgerRows[0];
  const actualBalance = lastLedgerRow ? parseFloat(lastLedgerRow.balance) : 0;
  const hasCredit = actualBalance < 0;
  const overpaymentAmount = hasCredit ? Math.abs(actualBalance) : 0;
  const effectiveAging = totalOutstanding > 0 ? agingAmounts : [0, 0, 0, 0];
  const agingTotal = totalOutstanding || 1;

  return (
    <div ref={rootRef} className="debt-detail-page">
      {/* Supplier Header */}
      <div className="dd-header">
        <button className="dd-back" aria-label="Quay lại" onClick={handleBack}>
          <ArrowLeft size={20} />
        </button>
        <div className="dd-avatar" style={{ background: 'var(--warning)', color: '#fff' }}>
          {supplier.name.charAt(0)}
        </div>
        <div className="dd-meta">
          <h1>{supplier.name}</h1>
          <div className="dd-sub">
            {supplier.phone && (
              <span>
                <Phone size={15} />
                <span className="dd-mono">{supplier.phone}</span>
              </span>
            )}
            {supplier.contactPerson && (
              <span>
                <Building2 size={15} />
                {supplier.contactPerson}
              </span>
            )}
            {hasDebt ? (
              <span className="dd-tag dd-tag--warn dd-tag--dot">Còn nợ</span>
            ) : hasCredit ? (
              <span className="dd-tag dd-tag--warn dd-tag--dot">Đã trả thừa {formatCurrency(overpaymentAmount).replace(' ₫', '')}đ</span>
            ) : (
              <span className="dd-tag dd-tag--ok dd-tag--dot">Đã thanh toán đủ</span>
            )}
          </div>
        </div>
        <div className="dd-actions">
          {isCarrierPayable && (
            <button
              className="btn btn--secondary"
              onClick={() => setShowBillingDocumentBuilder(true)}
            >
              <FileSpreadsheet size={14} />
              Tạo bảng kê
            </button>
          )}
          {!isCarrierPayable && (
            <div ref={exportMenuRef} style={{ position: 'relative' }}>
              <button
                className="btn btn--secondary"
                onClick={() => setShowExportMenu(v => !v)}
              >
                <Download size={14} />
                Xuất sao kê
              </button>
              {showExportMenu && (
                <div style={{
                  position: 'absolute', right: 0, top: '100%', marginTop: 4,
                  background: 'var(--surface)', border: '1px solid var(--line)',
                  borderRadius: 8, boxShadow: 'var(--sh-lg)',
                  zIndex: 50, minWidth: 180, overflow: 'hidden',
                }}>
                  <button className="dd-export-btn" onClick={() => downloadExport('xlsx')}>
                    <FileSpreadsheet size={14} style={{ color: '#16a34a' }} />
                    Excel (.xlsx)
                  </button>
                  <button className="dd-export-btn" onClick={() => downloadExport('pdf')}>
                    <FileText size={14} style={{ color: '#dc2626' }} />
                    PDF (In)
                  </button>
                </div>
              )}
            </div>
          )}
          <button
            className="btn btn--primary"
            onClick={() => setShowPaymentModal(true)}
          >
            <CreditCard size={14} />
            Ghi thanh toán
          </button>
        </div>
      </div>

      {/* Summary Card */}
      <PayableSummarySection
        totalOutstanding={totalOutstanding}
        effectiveAging={effectiveAging}
        agingTotal={agingTotal}
        activeAgingIdx={activeAgingIdx}
        hasDebt={hasDebt}
        hasCredit={hasCredit}
        overpaymentAmount={overpaymentAmount}
        ledgerCount={ledgerRows.length}
      />

      {/* Ledger Card */}
      <section className="dd-ledger dd-ledger--standalone">
        <div className="dd-ledger-head">
          <div className="dd-ledger-heading">
            <h2>{isCarrierPayable ? 'Chi tiết cước vận chuyển thuê ngoài' : 'Chi tiết công nợ phải trả'}</h2>
            <p>{isCarrierPayable
              ? 'Cước theo chuyến và các khoản đã thanh toán cho nhà vận chuyển.'
              : 'Toàn bộ chi phí, khoản đã thanh toán và điều chỉnh với nhà cung cấp.'}</p>
          </div>
          <span className="dd-cnt">{filteredRows.length} giao dịch</span>
          <div className="dd-filters">
            {FILTER_OPTIONS.map(f => (
              <button
                key={f.key}
                className={`dd-filter-chip${ledgerFilter === f.key ? ' dd-filter-chip--on' : ''}`}
                onClick={() => setLedgerFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Period filter + period summary (số dư đầu kỳ / phát sinh / cuối kỳ) */}
        <PeriodFilter
          mode={period.mode}
          onModeChange={(m) => setPeriod(p => applyModeSwitch(p, m))}
          month={period.month}
          year={period.year}
          onMonthYearChange={({ month, year }) => setPeriod(p => ({ ...p, month, year }))}
          dateFrom={period.dateFrom}
          dateTo={period.dateTo}
          onRangeChange={(next) => setPeriod(p => ({ ...p, ...next }))}
          onApply={() => setAppliedPeriod(period)}
          isApplying={isStatementFetching}
          isApplyDisabled={!isPeriodDirty || isStatementFetching}
        />
        <PeriodSummaryCards
          summary={typedStatement.periodSummary}
          isLoading={isStatementFetching}
          entityType="VENDOR"
        />

        {isCompactLedger ? (
          <ul className="dd-ledger-mobile d-list" aria-label="Danh sách giao dịch công nợ phải trả">
            {filteredRows.map((row: LedgerEntry) => (
              row.txnType === TxnType.FUEL_EXPENSE
                ? <FuelLedgerCard key={row.id} row={row} />
                : row.txnType === TxnType.VENDOR_EXPENSE
                  ? <ExpenseLedgerCard key={row.id} row={row} />
                  : <PayableLedgerCard key={row.id} row={row} />
            ))}
            {filteredRows.length === 0 && (
              <li className="dd-ledger-mobile-empty">Không có giao dịch</li>
            )}
          </ul>
        ) : (
          <div className="table-scroll">
            <table className="dd-table dd-detail-table">
              <thead>
                {ledgerFilter === TxnType.FUEL_EXPENSE ? (
                  <tr>
                    <th>NGÀY</th>
                    <th>BIỂN SỐ XE</th>
                    <th>TUYẾN VẬN CHUYỂN</th>
                    <th className="dd-r">SỐ LÍT DẦU</th>
                    <th className="dd-r">ĐƠN GIÁ</th>
                    <th className="dd-r">THÀNH TIỀN</th>
                    <th className="dd-r">SỐ DƯ</th>
                    <th>ĐỐI CHIẾU</th>
                  </tr>
                ) : ledgerFilter === TxnType.VENDOR_EXPENSE ? (
                  <tr>
                    <th>NGÀY</th>
                    <th>BIỂN SỐ XE</th>
                    <th>HẠNG MỤC</th>
                    <th>ĐỐI CHIẾU</th>
                    <th className="dd-r">PHÁT SINH PHẢI TRẢ</th>
                    <th className="dd-r">ĐÃ THANH TOÁN</th>
                    <th className="dd-r">SỐ DƯ</th>
                    <th>GHI CHÚ</th>
                  </tr>
                ) : (
                  <tr>
                    <th>NGÀY</th>
                    <th>ĐỐI CHIẾU</th>
                    <th>LOẠI GIAO DỊCH</th>
                    <th className="dd-r">PHÁT SINH PHẢI TRẢ</th>
                    <th className="dd-r">ĐÃ THANH TOÁN</th>
                    <th className="dd-r">SỐ DƯ</th>
                    <th>GHI CHÚ</th>
                  </tr>
                )}
              </thead>
              <tbody>
                {filteredRows.map((row: LedgerEntry) => (
                  ledgerFilter === TxnType.FUEL_EXPENSE
                    ? <FuelLedgerRow key={row.id} row={row} />
                    : ledgerFilter === TxnType.VENDOR_EXPENSE
                      ? <ExpenseLedgerRow key={row.id} row={row} />
                      : <LedgerRow key={row.id} row={row} />
                ))}
                {filteredRows.length === 0 && (
                  <tr>
                    <td colSpan={ledgerFilter === 'all' ? 7 : 8} className="dd-table-empty">
                      Không có giao dịch
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Payment-statement builder (AP snapshot documents) */}
      {id && (
        <section className="dd-documents-section" aria-label="Chứng từ công nợ phải trả">
          <div className="dd-documents-section__head">
            <span className="dd-panel-eyebrow">Chứng từ công nợ</span>
            <h2>Bảng kê thanh toán</h2>
            <p>
              {isCarrierPayable
                ? 'Tạo hoặc mở lại bảng kê cước theo kỳ để gửi nhà vận chuyển.'
                : 'Tạo hoặc mở lại bảng kê khi cần gửi nhà cung cấp.'}
            </p>
          </div>
          <BillingDocumentsPanel
            type="PAYMENT_STATEMENT"
            entityType={payableBillingDocumentEntityType(isCarrierPayable)}
            entityId={Number(id)}
            entityName={typedStatement?.supplier.name ?? ''}
            buttonLabel="Tạo bảng kê"
            createBuilderOpen={showBillingDocumentBuilder}
            onOpenCreate={() => setShowBillingDocumentBuilder(true)}
            onBuilderClose={() => setShowBillingDocumentBuilder(false)}
          />
        </section>
      )}

      {/* Payment Modal */}
      <PayablePaymentModal
        isOpen={showPaymentModal}
        submitting={submitting}
        amount={paymentAmount}
        date={paymentDate}
        receiptId={paymentReceiptId}
        onAmountChange={setPaymentAmount}
        onDateChange={setPaymentDate}
        onReceiptIdChange={setPaymentReceiptId}
        onClose={() => setShowPaymentModal(false)}
        onConfirm={() => handlePaymentSubmit(false)}
      />
      {confirmDialog}
    </div>
  );
}

export { FuelLedgerRow, ExpenseLedgerRow, PayableLedgerCard, FuelLedgerCard, ExpenseLedgerCard } from '../features/payables/payableDetailLedger';
