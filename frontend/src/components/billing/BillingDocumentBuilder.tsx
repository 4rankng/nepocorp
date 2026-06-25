import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, Filter, Loader2, Plus, Trash2, X } from 'lucide-react';
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
  initialDoc?: BillingDocument | null;
  onSaved?: () => void;
}

interface BillingRouteGroup {
  key: string;
  routeName: string;
  startIndex: number;
  lines: Array<{ line: BillingDocumentLine; index: number }>;
  subtotal: number;
  visibleCount: number;
}

const TITLE: Record<BillingDocumentType, string> = {
  DEBIT_NOTE: 'Giấy báo nợ',
  PAYMENT_STATEMENT: 'Bảng kê thanh toán',
};

const SERVICE_FEE_LABELS: Record<string, string> = {
  LIFTING: 'Phí nâng container',
  LOWERING: 'Phí hạ container',
  CUSTOMS: 'Phí hải quan',
  INFRASTRUCTURE: 'Phí hạ tầng',
  WEIGHING: 'Phí cân hàng',
  INSPECTION: 'Phí kiểm hóa',
  INSPECTION_SVC: 'Phí dịch vụ kiểm hóa',
  OTHER: 'Phí chi hộ khác',
};

function normalizeLine(line: BillingDocumentLine): BillingDocumentLine {
  if (line.lineType !== 'SERVICE_FEE') return line;
  const label = SERVICE_FEE_LABELS[line.description?.trim().toUpperCase() ?? ''];
  return label ? { ...line, description: label } : line;
}

function lineTotal(line: BillingDocumentLine): number {
  if (line.excluded) return 0;
  return line.amountOverride != null ? Number(line.amountOverride) : Number(line.baseAmount);
}

function thisMonthRange(): { from: string; to: string } {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { from: fmt(from), to: fmt(to) };
}

function displayDate(value: string): string {
  const [year, month, day] = value.split('-');
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function documentFileName(type: BillingDocumentType, entityName: string): string {
  const prefix = type === 'DEBIT_NOTE' ? 'giay-bao-no' : 'bang-ke-thanh-toan';
  return `${prefix}-${entityName}.xlsx`;
}

export default function BillingDocumentBuilder({
  isOpen,
  onClose,
  type,
  entityType,
  entityId,
  entityName,
  initialDoc,
  onSaved,
}: Props) {
  const { toast: showToast } = useToast();
  const isEdit = !!initialDoc;
  const autoGenerateRef = useRef(false);
  const month = useMemo(() => thisMonthRange(), []);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  const [rangeFrom, setRangeFrom] = useState(initialDoc?.rangeFrom ?? month.from);
  const [rangeTo, setRangeTo] = useState(initialDoc?.rangeTo ?? month.to);
  const [lines, setLines] = useState<BillingDocumentLine[]>((initialDoc?.lines as BillingDocumentLine[]) ?? []);
  const [note, setNote] = useState(initialDoc?.note ?? '');
  const [savedId, setSavedId] = useState<number | null>(initialDoc?.id ?? null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  const visibleLines = useMemo(() => lines.filter((line) => !line.excluded).length, [lines]);
  const total = useMemo(() => lines.reduce((sum, line) => sum + lineTotal(line), 0), [lines]);
  const groupedLines = useMemo<BillingRouteGroup[]>(() => {
    const groups: BillingRouteGroup[] = [];
    let index = 0;
    while (index < lines.length) {
      const route = lines[index]?.routeName ?? '';
      let end = index + 1;
      while (end < lines.length && (lines[end]?.routeName ?? '') === route) end += 1;
      const groupLines = lines.slice(index, end).map((line, offset) => ({ line, index: index + offset }));
      groups.push({
        key: `${route || 'no-route'}-${index}`,
        routeName: route,
        startIndex: index,
        lines: groupLines,
        subtotal: groupLines.reduce((sum, item) => sum + lineTotal(item.line), 0),
        visibleCount: groupLines.filter((item) => !item.line.excluded).length,
      });
      index = end;
    }
    return groups;
  }, [lines]);

  useEffect(() => {
    if (!isOpen) {
      autoGenerateRef.current = false;
      return;
    }

    if (initialDoc) {
      setRangeFrom(initialDoc.rangeFrom);
      setRangeTo(initialDoc.rangeTo);
      setLines(((initialDoc.lines as BillingDocumentLine[]) ?? []).map(normalizeLine));
      setNote(initialDoc.note ?? '');
      setSavedId(initialDoc.id);
      return;
    }

    const freshMonth = thisMonthRange();
    setRangeFrom(freshMonth.from);
    setRangeTo(freshMonth.to);
    setLines([]);
    setNote('');
    setSavedId(null);
  }, [isOpen, initialDoc]);

  const generateDraft = async (from = rangeFrom, to = rangeTo, silent = false) => {
    setLoading(true);
    try {
      const draft = await financialClient.generateBillingDraft({
        type,
        entityType,
        entityId,
        rangeFrom: from,
        rangeTo: to,
      });
      setLines((draft.lines as BillingDocumentLine[]).map(normalizeLine));
      setSavedId(null);
      if (!silent && draft.lines.length === 0) {
        showToast({ kind: 'info', message: 'Không có dòng công nợ trong khoảng ngày đã chọn.' });
      }
    } catch (err) {
      showToast({ kind: 'error', message: (err as Error).message || 'Lỗi lọc dòng' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen || isEdit) return;
    if (autoGenerateRef.current) return;
    autoGenerateRef.current = true;
    const freshMonth = thisMonthRange();
    void generateDraft(freshMonth.from, freshMonth.to, true);
    // Auto-generate only once per open. generateDraft intentionally stays out
    // of deps because it changes with range state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityId, entityType, isEdit, isOpen, type]);

  const updateLine = (index: number, patch: Partial<BillingDocumentLine>) => {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));
    setSavedId(null);
  };

  const updateRouteGroup = (index: number, routeName: string) => {
    setLines((prev) => {
      const current = prev[index]?.routeName ?? '';
      let start = index;
      while (start > 0 && (prev[start - 1]?.routeName ?? '') === current) start -= 1;
      let end = index;
      while (end + 1 < prev.length && (prev[end + 1]?.routeName ?? '') === current) end += 1;
      return prev.map((line, i) => (
        i >= start && i <= end ? { ...line, routeName: routeName || null } : line
      ));
    });
    setSavedId(null);
  };

  const addAdhoc = () => {
    setLines((prev) => [
      ...prev,
      {
        sourceType: 'ADHOC',
        sourceId: null,
        lineType: 'ADHOC',
        description: '',
        routeName: null,
        containerNumbers: null,
        baseAmount: 0,
        amountOverride: 0,
        excluded: false,
        sortOrder: prev.length,
      } as BillingDocumentLine,
    ]);
    setSavedId(null);
  };

  const removeLine = (index: number) => {
    setLines((prev) => prev.filter((_, i) => i !== index));
    setSavedId(null);
  };

  const buildPayload = () => ({
    type,
    entityType,
    entityId,
    entityName,
    rangeFrom,
    rangeTo,
    note: note.trim() || null,
    lines: lines.map((line, index) => ({
      sourceType: line.sourceType,
      sourceId: line.sourceId,
      lineType: line.lineType,
      description: line.description,
      routeName: line.routeName ?? null,
      containerNumbers: line.containerNumbers ?? null,
      baseAmount: Number(line.baseAmount),
      amountOverride: line.amountOverride != null ? Number(line.amountOverride) : null,
      excluded: line.excluded ?? false,
      sortOrder: index,
    })),
  });

  const persistDocument = async ({ notify = true }: { notify?: boolean } = {}): Promise<BillingDocument | null> => {
    if (lines.length === 0) {
      showToast({ kind: 'error', message: 'Chưa có dòng nào để lưu. Hãy lọc dòng hoặc thêm dòng trước.' });
      return null;
    }

    setSaving(true);
    try {
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
      a.download = documentFileName(type, entityName);
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

  useEffect(() => {
    setPortalTarget(document.body);
  }, []);

  if (!isOpen) return null;

  if (!portalTarget) return null;

  const content = (
    <section className="billing-builder" role="dialog" aria-modal="true" aria-labelledby="billing-builder-title">
      <header className="billing-builder__topbar">
        <div className="billing-builder__title-block">
          <div className="billing-builder__icon">
            <AssetIcon name={type === 'DEBIT_NOTE' ? 'receivables' : 'document'} size={34} />
          </div>
          <div>
            <p className="billing-builder__eyebrow">{isEdit ? 'Chỉnh sửa tài liệu' : 'Tạo tài liệu mới'}</p>
            <h1 id="billing-builder-title">{TITLE[type]}</h1>
            <div className="billing-builder__meta">
              <span>{entityName}</span>
              <span>{displayDate(rangeFrom)} - {displayDate(rangeTo)}</span>
              <span>{lines.length} dòng</span>
            </div>
          </div>
        </div>
        <button className="billing-builder__close" type="button" onClick={onClose} disabled={busy} aria-label="Đóng">
          <X size={22} />
        </button>
      </header>

      <main className="billing-builder__body">
        <section className="billing-builder__controls" aria-label="Khoảng thời gian và thao tác">
          <label>
            <span>Từ ngày</span>
            <input type="date" className="input" value={rangeFrom} onChange={(e) => setRangeFrom(e.target.value)} disabled={busy} />
          </label>
          <label>
            <span>Đến ngày</span>
            <input type="date" className="input" value={rangeTo} onChange={(e) => setRangeTo(e.target.value)} disabled={busy} />
          </label>
          <button className="btn btn--secondary" type="button" onClick={() => generateDraft(rangeFrom, rangeTo)} disabled={busy}>
            {loading ? <Loader2 size={15} className="spin" /> : <Filter size={15} />}
            Lọc lại
          </button>
          <button className="btn btn--ghost" type="button" onClick={addAdhoc} disabled={busy}>
            <Plus size={15} />
            Thêm dòng
          </button>
        </section>

        <section className="billing-builder__content">
          <div className="billing-builder__summary" aria-label="Tổng hợp">
            <div className="billing-builder__total">
              <span>Tổng cộng</span>
              <strong className="mono">{formatCurrency(total).replace(' ₫', '')}đ</strong>
            </div>
            <div className="billing-builder__stat">
              <span>Dòng hiển thị</span>
              <strong>{visibleLines}/{lines.length}</strong>
            </div>
          </div>

          <div className="billing-builder__table-wrap">
            {loading ? (
              <div className="billing-builder__state">
                <Loader2 size={24} className="spin" />
                <span>Đang lấy dòng công nợ trong kỳ...</span>
              </div>
            ) : lines.length === 0 ? (
              <div className="billing-builder__state billing-builder__state--empty">
                <AssetIcon name="document" size={46} />
                <strong>Không có dòng công nợ trong khoảng ngày này</strong>
                <span>Đổi khoảng ngày hoặc thêm dòng thủ công nếu cần tạo tài liệu ngoài dữ liệu hệ thống.</span>
              </div>
            ) : (
              <>
                <table className="billing-builder__table">
                  <colgroup>
                    <col className="billing-builder__col-desc" />
                    <col className="billing-builder__col-containers" />
                    <col className="billing-builder__col-unit" />
                    <col className="billing-builder__col-amount" />
                    <col className="billing-builder__col-action" />
                  </colgroup>
                  <thead>
                    <tr>
                      <th>Diễn giải</th>
                      <th>Số cont</th>
                      <th>ĐVT</th>
                      <th>Số tiền (VNĐ)</th>
                      <th aria-label="Thao tác"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupedLines.map((group) => (
                      <Fragment key={group.key}>
                        <tr className="billing-builder__route-row">
                          <td colSpan={5}>
                            <div className="billing-builder__route-summary">
                              <div className="billing-builder__route-main">
                                <span>Tuyến</span>
                                <textarea
                                  className="input billing-builder__text-field billing-builder__route-field"
                                  value={group.routeName}
                                  rows={1}
                                  aria-label="Tuyến"
                                  placeholder="Chưa có tuyến"
                                  disabled={busy}
                                  onChange={(e) => updateRouteGroup(group.startIndex, e.target.value)}
                                />
                              </div>
                              <div className="billing-builder__route-metrics">
                                <span>{group.visibleCount}/{group.lines.length} dòng</span>
                                <strong className="mono">{formatCurrency(group.subtotal).replace(' ₫', '')}</strong>
                              </div>
                            </div>
                          </td>
                        </tr>
                        {group.lines.map(({ line, index }) => {
                          const amount = line.amountOverride != null ? line.amountOverride : line.baseAmount;
                          return (
                            <tr key={`${line.sourceType}-${line.sourceId ?? 'adhoc'}-${index}`} className={`billing-builder__item-row${line.excluded ? ' is-excluded' : ''}`}>
                              <td>
                                <textarea
                                  className="input billing-builder__text-field"
                                  value={line.description}
                                  rows={2}
                                  disabled={busy}
                                  onChange={(e) => updateLine(index, { description: e.target.value })}
                                />
                              </td>
                              <td className="billing-builder__containers">
                                {(line.containerNumbers ?? []).join(', ') || '-'}
                              </td>
                              <td className="billing-builder__unit">lần</td>
                              <td>
                                <input
                                  type="number"
                                  className="input mono billing-builder__amount"
                                  value={amount}
                                  disabled={busy}
                                  onChange={(e) => updateLine(index, { amountOverride: e.target.value === '' ? null : Number(e.target.value) })}
                                />
                              </td>
                              <td className="billing-builder__row-actions">
                                <button className="billing-builder__action billing-builder__action--delete" type="button" onClick={() => removeLine(index)} disabled={busy} aria-label={`Xóa dòng ${index + 1}`}>
                                  <Trash2 size={15} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </Fragment>
                    ))}
                  </tbody>
                </table>

                <div className="billing-builder__mobile-groups">
                  {groupedLines.map((group) => (
                    <section className="billing-builder__mobile-group" key={`${group.key}-mobile`}>
                      <div className="billing-builder__mobile-route">
                        <div>
                          <span>Tuyến</span>
                          <textarea
                            className="input billing-builder__text-field billing-builder__route-field"
                            value={group.routeName}
                            rows={1}
                            aria-label="Tuyến"
                            placeholder="Chưa có tuyến"
                            disabled={busy}
                            onChange={(e) => updateRouteGroup(group.startIndex, e.target.value)}
                          />
                        </div>
                        <strong className="mono">{formatCurrency(group.subtotal).replace(' ₫', '')}</strong>
                      </div>
                      <div className="billing-builder__mobile-items">
                        {group.lines.map(({ line, index }) => {
                          const amount = line.amountOverride != null ? line.amountOverride : line.baseAmount;
                          return (
                            <div key={`${line.sourceType}-${line.sourceId ?? 'adhoc'}-${index}-mobile`} className={`billing-builder__mobile-item${line.excluded ? ' is-excluded' : ''}`}>
                              <textarea
                                className="input billing-builder__text-field"
                                value={line.description}
                                rows={2}
                                disabled={busy}
                                onChange={(e) => updateLine(index, { description: e.target.value })}
                              />
                              <div className="billing-builder__mobile-row">
                                <span>Số cont</span>
                                <strong>{(line.containerNumbers ?? []).join(', ') || '-'}</strong>
                              </div>
                              <div className="billing-builder__mobile-money">
                                <label>
                                  <span>Số tiền</span>
                                  <input
                                    type="number"
                                    className="input mono billing-builder__amount"
                                    value={amount}
                                    disabled={busy}
                                    onChange={(e) => updateLine(index, { amountOverride: e.target.value === '' ? null : Number(e.target.value) })}
                                  />
                                </label>
                                <button className="billing-builder__action billing-builder__action--delete" type="button" onClick={() => removeLine(index)} disabled={busy} aria-label={`Xóa dòng ${index + 1}`}>
                                  <Trash2 size={17} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  ))}
                </div>
              </>
            )}
          </div>

          <label className="billing-builder__note">
            <span>Ghi chú</span>
            <textarea
              className="input"
              rows={4}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Điều khoản thanh toán, ghi chú cho khách hàng/đối tác..."
              disabled={busy}
            />
          </label>
        </section>
      </main>

      <footer className="billing-builder__footer">
        <button className="btn btn--secondary" type="button" onClick={onClose} disabled={busy}>
          Đóng
        </button>
        <button className="btn btn--primary" type="button" onClick={exportXlsx} disabled={busy || lines.length === 0}>
          {exporting || saving ? <Loader2 size={16} className="spin" /> : <Download size={16} />}
          {exporting || saving ? 'Đang lưu & xuất...' : 'Xuất Excel'}
        </button>
      </footer>
    </section>
  );

  return createPortal(content, portalTarget);
}
