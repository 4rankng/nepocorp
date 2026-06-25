import { useState, useMemo, useEffect, useRef, type CSSProperties } from 'react';
import { Download, Plus, Trash2, Filter, Loader2, X, ReceiptText } from 'lucide-react';
import { useToast } from '../shared/Toast';
import { AssetIcon } from '../AssetIcon';
import { api } from '../../lib/api';
import { formatCurrency } from '../../lib/format';
import { financialClient } from '../../api/financialClient';
import './BillingDocumentBuilder.css';
import type {
  BillingDocument,
  BillingDocumentType,
  BillingDocumentEntityType,
  BillingDocumentLine,
} from '@tingting/shared';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  type: BillingDocumentType;
  entityType: BillingDocumentEntityType;
  entityId: number;
  entityName: string;
  /** When provided, the builder opens in edit mode (PUT) with these lines pre-loaded. */
  initialDoc?: BillingDocument | null;
  onSaved?: () => void;
}

const TITLE: Record<BillingDocumentType, string> = {
  DEBIT_NOTE: 'Tạo giấy báo nợ',
  PAYMENT_STATEMENT: 'Tạo bảng kê thanh toán',
};

function effective(line: BillingDocumentLine): number {
  if (line.excluded) return 0;
  const ov = line.amountOverride;
  return ov != null ? Number(ov) : Number(line.baseAmount);
}

function thisMonthRange(): { from: string; to: string } {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { from: fmt(from), to: fmt(to) };
}

export default function BillingDocumentBuilder({
  isOpen, onClose, type, entityType, entityId, entityName, initialDoc, onSaved,
}: Props) {
  const { toast: showToast } = useToast();
  const isEdit = !!initialDoc;

  const [rangeFrom, setRangeFrom] = useState(initialDoc?.rangeFrom ?? thisMonthRange().from);
  const [rangeTo, setRangeTo] = useState(initialDoc?.rangeTo ?? thisMonthRange().to);
  const [lines, setLines] = useState<BillingDocumentLine[]>(
    (initialDoc?.lines as BillingDocumentLine[]) ?? [],
  );
  const [note, setNote] = useState(initialDoc?.note ?? '');
  const [savedId, setSavedId] = useState<number | null>(initialDoc?.id ?? null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  // StrictMode (React 18 dev) double-invokes mount effects; without a ref
  // guard, the auto-generate below fires twice → 2 POSTs to
  // /billing-documents/generate + 2 toasts. The ref persists across the
  // double-invoke but resets when the builder closes, so re-opening still
  // auto-generates. Mirrors the pattern in ContainerInstancesCard.tsx.
  const autoGenerateRef = useRef(false);

  const total = useMemo(() => lines.reduce((s, l) => s + effective(l), 0), [lines]);
  const serviceFeeTotal = useMemo(
    () => lines.filter((l) => l.lineType === 'SERVICE_FEE').reduce((s, l) => s + effective(l), 0),
    [lines],
  );
  const visibleLineCount = useMemo(() => lines.filter((l) => !l.excluded).length, [lines]);
  const excludedLineCount = lines.length - visibleLineCount;

  // Auto-load lines the first time the builder opens so the user lands on
  // pre-populated rows instead of an empty state. Skipped when editing an
  // existing document (lines are pre-loaded from initialDoc) or when the
  // builder is being reopened with state already restored.
  useEffect(() => {
    if (!isOpen) {
      autoGenerateRef.current = false; // reset so re-open auto-generates again
      return;
    }
    if (isEdit) return;
    if (lines.length > 0 || savedId) return;
    if (autoGenerateRef.current) return; // StrictMode dev double-invoke guard
    autoGenerateRef.current = true;
    void generate();
    // Intentionally only depends on isOpen: re-running on every state change
    // (lines / savedId / loading) would cause re-generation loops.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const generate = async () => {
    setLoading(true);
    try {
      const draft = await financialClient.generateBillingDraft({
        type, entityType, entityId, rangeFrom, rangeTo,
      });
      setLines(draft.lines as BillingDocumentLine[]);
      setSavedId(null); // edited → must re-save to export the edited version
      if (draft.lines.length === 0) {
        showToast({ kind: 'info', message: 'Không có dòng nào trong khoảng thời gian đã chọn.' });
      }
    } catch (err) {
      showToast({ kind: 'error', message: (err as Error).message || 'Lỗi lọc dòng' });
    } finally {
      setLoading(false);
    }
  };

  const updateLine = (idx: number, patch: Partial<BillingDocumentLine>) => {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  };

  const addAdhoc = () => {
    setLines((prev) => [
      ...prev,
      {
        sourceType: 'ADHOC', sourceId: null, lineType: 'ADHOC',
        description: '', routeName: null, containerNumbers: null,
        baseAmount: 0, amountOverride: 0, excluded: false,
        sortOrder: prev.length,
      } as BillingDocumentLine,
    ]);
  };

  const removeLine = (idx: number) => {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  };

  const buildPayload = () => ({
    type, entityType, entityId, entityName,
    rangeFrom, rangeTo,
    note: note.trim() || null,
    lines: lines.map((l, i) => ({
      sourceType: l.sourceType, sourceId: l.sourceId,
      lineType: l.lineType, description: l.description,
      routeName: l.routeName ?? null,
      containerNumbers: l.containerNumbers ?? null,
      baseAmount: Number(l.baseAmount),
      amountOverride: l.amountOverride != null ? Number(l.amountOverride) : null,
      excluded: l.excluded ?? false, sortOrder: i,
    })),
  });

  const persistDocument = async ({ notify = true }: { notify?: boolean } = {}) => {
    if (lines.length === 0) {
      showToast({ kind: 'error', message: 'Chưa có dòng nào để lưu. Hãy lọc dòng trước.' });
      return null;
    }
    setSaving(true);
    try {
      // Edit mode always updates the ORIGINAL document — re-filtering ("Lọc
      // dòng") must not turn the next save into a duplicate POST. New mode
      // creates on first save, then updates via savedId.
      const updateId = isEdit ? (initialDoc?.id ?? null) : savedId;
      const saved = updateId
        ? await financialClient.updateBillingDocument(updateId, buildPayload())
        : await financialClient.saveBillingDocument(buildPayload());
      setSavedId(saved.id);
      if (notify) showToast({ kind: 'success', message: 'Đã lưu tài liệu.' });
      onSaved?.();
      return saved;
    } catch (err) {
      showToast({ kind: 'error', message: (err as Error).message || 'Lỗi lưu tài liệu' });
      return null;
    } finally {
      setSaving(false);
    }
  };

  const exportXlsx = async () => {
    if (exporting || saving) return;
    setExporting(true);
    try {
      const saved = await persistDocument({ notify: false });
      if (!saved) return;
      const blob = await api.getBlob(financialClient.getBillingDocumentExportUrl(saved.id));
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type === 'DEBIT_NOTE' ? 'giay-bao-no' : 'bang-ke-thanh-toan'}-${entityName}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      showToast({ kind: 'success', message: 'Đã lưu và xuất Excel.' });
    } catch (err) {
      showToast({ kind: 'error', message: (err as Error).message || 'Lỗi xuất Excel' });
    } finally {
      setExporting(false);
    }
  };

  const busy = loading || saving || exporting;

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [busy, isOpen, onClose]);

  if (!isOpen) return null;

  const cellStyle: CSSProperties = { verticalAlign: 'middle' };
  const inputBase: CSSProperties = { width: '100%', minWidth: 0 };

  return (
    <section className="billing-builder" role="dialog" aria-modal="true" aria-labelledby="billing-builder-title">
      <header className="billing-builder__header">
        <div className="billing-builder__title-block">
          <div className="billing-builder__mark" aria-hidden="true">
            <ReceiptText size={22} />
          </div>
          <div>
            <div className="billing-builder__eyebrow">
              {type === 'DEBIT_NOTE' ? 'Giấy báo nợ' : 'Bảng kê thanh toán'}
            </div>
            <h1 id="billing-builder-title">{isEdit ? 'Chỉnh sửa tài liệu' : TITLE[type]}</h1>
            <p>{entityName}</p>
          </div>
        </div>
        <div className="billing-builder__header-actions">
          <button className="btn btn--secondary" onClick={onClose} disabled={busy}>
            <X size={14} />
            Đóng
          </button>
          <button
            className="btn btn--primary"
            onClick={exportXlsx}
            disabled={busy || lines.length === 0}
            title="Tự lưu tài liệu rồi xuất Excel"
          >
            {exporting || saving ? <Loader2 size={14} className="spin" /> : <Download size={14} />}
            {exporting || saving ? 'Đang lưu & xuất...' : 'Xuất Excel'}
          </button>
        </div>
      </header>

      <div className="billing-builder__toolbar" aria-label="Bộ lọc tài liệu">
        <label className="billing-builder__field">
          <span>Từ ngày</span>
          <input type="date" className="input" value={rangeFrom} onChange={(e) => setRangeFrom(e.target.value)} disabled={busy} />
        </label>
        <label className="billing-builder__field">
          <span>Đến ngày</span>
          <input type="date" className="input" value={rangeTo} onChange={(e) => setRangeTo(e.target.value)} disabled={busy} />
        </label>
        <div className="billing-builder__toolbar-actions">
          <button
            className={lines.length === 0 ? 'btn btn--primary' : 'btn btn--secondary'}
            type="button"
            onClick={generate}
            disabled={busy}
          >
            {loading ? <Loader2 size={14} className="spin" /> : <Filter size={14} />}
            Lọc dòng
          </button>
          <button className="btn btn--ghost" onClick={addAdhoc} type="button" disabled={busy}>
            <Plus size={14} /> Thêm dòng
          </button>
        </div>
        <div className="billing-builder__counts" aria-live="polite">
          <span>{visibleLineCount} dòng hiện</span>
          {excludedLineCount > 0 && <span>{excludedLineCount} dòng ẩn</span>}
        </div>
      </div>

      <div className="billing-builder__content">
        <main className="billing-builder__main">
          <div className="billing-builder__section-head">
            <div>
              <h2>Dòng thanh toán</h2>
              <span>{lines.length} dòng trong tài liệu</span>
            </div>
          </div>

          {lines.length === 0 ? (
            <div className="billing-builder__empty">
              <AssetIcon name="document" size={46} />
              <p>Chọn khoảng thời gian rồi bấm <b>Lọc dòng</b>.</p>
            </div>
          ) : (
            <div className="billing-builder__table-shell">
              <table className="billing-builder__table">
                <colgroup>
                  <col className="billing-builder__col-desc" />
                  <col className="billing-builder__col-route" />
                  <col className="billing-builder__col-cont" />
                  <col className="billing-builder__col-amount" />
                  <col className="billing-builder__col-visible" />
                  <col className="billing-builder__col-action" />
                </colgroup>
                <thead>
                  <tr>
                    <th>Diễn giải</th>
                    <th>Tuyến</th>
                    <th>Số Cont</th>
                    <th className="billing-builder__num">Số tiền (đ)</th>
                    <th className="billing-builder__center">Hiện</th>
                    <th aria-label="Thao tác"></th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l, i) => {
                    const amt = l.amountOverride !== null && l.amountOverride !== undefined ? l.amountOverride : l.baseAmount;
                    return (
                      <tr key={i} className={l.excluded ? 'billing-builder__row--excluded' : undefined}>
                        <td style={cellStyle}>
                          <input
                            className="input billing-builder__text-input"
                            style={inputBase}
                            value={l.description}
                            title={l.description}
                            disabled={busy}
                            onChange={(e) => updateLine(i, { description: e.target.value })}
                          />
                        </td>
                        <td style={cellStyle}>
                          <input
                            className="input billing-builder__text-input"
                            style={inputBase}
                            value={l.routeName ?? ''}
                            title={l.routeName ?? ''}
                            disabled={busy}
                            onChange={(e) => updateLine(i, { routeName: e.target.value || null })}
                          />
                        </td>
                        <td
                          className="billing-builder__containers"
                          style={cellStyle}
                          title={(l.containerNumbers ?? []).join(', ')}
                        >
                          {(l.containerNumbers ?? []).join(', ') || '-'}
                        </td>
                        <td style={cellStyle}>
                          <input
                            type="number"
                            className="input mono billing-builder__amount-input"
                            style={inputBase}
                            value={amt}
                            disabled={busy}
                            onChange={(e) => updateLine(i, { amountOverride: e.target.value === '' ? null : Number(e.target.value) })}
                          />
                        </td>
                        <td className="billing-builder__center" style={cellStyle}>
                          <input
                            type="checkbox"
                            checked={!l.excluded}
                            disabled={busy}
                            aria-label={`Hiện dòng ${i + 1}`}
                            onChange={(e) => updateLine(i, { excluded: !e.target.checked })}
                          />
                        </td>
                        <td className="billing-builder__center" style={cellStyle}>
                          <button
                            className="billing-builder__delete"
                            title="Xóa dòng"
                            aria-label={`Xóa dòng ${i + 1}`}
                            onClick={() => removeLine(i)}
                            disabled={busy}
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </main>

        <aside className="billing-builder__summary" aria-label="Tổng hợp tài liệu">
          <div className="billing-builder__summary-icon" aria-hidden="true">
            <AssetIcon name="receivables" size={38} />
          </div>
          {serviceFeeTotal > 0 && entityType === 'CUSTOMER' && (
            <div className="billing-builder__summary-row">
              <span>Phí chi hộ</span>
              <strong className="mono">
                {formatCurrency(serviceFeeTotal).replace(' ₫', '')}<small>đ</small>
              </strong>
            </div>
          )}
          <div className="billing-builder__grand-total">
            <span>Tổng cộng</span>
            <strong className="mono">
              {formatCurrency(total).replace(' ₫', '')}<small>đ</small>
            </strong>
          </div>
          {serviceFeeTotal > 0 && entityType === 'CUSTOMER' && (
            <p className="billing-builder__hint">
              Phí chi hộ gồm các khoản đã thanh toán hộ khách như cảng, hải quan, nâng/hạ container.
            </p>
          )}
          <label className="billing-builder__note">
            <span>Ghi chú</span>
            <textarea
              className="input"
              rows={8}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Điều khoản thanh toán, ghi chú cho khách hàng/đối tác..."
              disabled={busy}
            />
          </label>
        </aside>
      </div>
    </section>
  );
}
