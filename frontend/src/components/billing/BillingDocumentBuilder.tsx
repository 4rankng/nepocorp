import { useState, useMemo, type CSSProperties } from 'react';
import { Download, Plus, Trash2, Save, Filter, Loader2 } from 'lucide-react';
import { Modal } from '../UI';
import { useToast } from '../shared/Toast';
import { api } from '../../lib/api';
import { formatCurrency } from '../../lib/format';
import { financialClient } from '../../api/financialClient';
import type {
  BillingDocument,
  BillingDocumentType,
  BillingDocumentEntityType,
  BillingDocumentLine,
  BillingDraftLine,
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

  const total = useMemo(() => lines.reduce((s, l) => s + effective(l), 0), [lines]);

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

  const save = async () => {
    if (lines.length === 0) {
      showToast({ kind: 'error', message: 'Chưa có dòng nào để lưu. Hãy lọc dòng trước.' });
      return;
    }
    setSaving(true);
    try {
      const payload = {
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
      };
      const saved = isEdit && savedId
        ? await financialClient.updateBillingDocument(savedId, payload)
        : await financialClient.saveBillingDocument(payload);
      setSavedId(saved.id);
      showToast({ kind: 'success', message: 'Đã lưu tài liệu.' });
      onSaved?.();
    } catch (err) {
      showToast({ kind: 'error', message: (err as Error).message || 'Lỗi lưu tài liệu' });
    } finally {
      setSaving(false);
    }
  };

  const exportXlsx = async () => {
    if (!savedId) {
      showToast({ kind: 'error', message: 'Hãy lưu tài liệu trước khi xuất Excel.' });
      return;
    }
    try {
      const blob = await api.getBlob(financialClient.getBillingDocumentExportUrl(savedId));
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type === 'DEBIT_NOTE' ? 'giay-bao-no' : 'bang-ke-thanh-toan'}-${entityName}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      showToast({ kind: 'error', message: (err as Error).message || 'Lỗi xuất Excel' });
    }
  };

  const cellStyle: CSSProperties = { padding: '4px 6px', borderBottom: '1px solid var(--border)' };
  const inputBase: CSSProperties = { width: '100%', padding: '4px 6px', fontSize: 12.5 };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${TITLE[type]} — ${entityName}`}
      maxWidth={880}
      footer={
        <>
          <button className="btn btn--secondary" onClick={onClose}>Đóng</button>
          <button
            className="btn btn--secondary"
            onClick={exportXlsx}
            disabled={!savedId}
            title={savedId ? 'Xuất Excel' : 'Lưu trước khi xuất'}
          >
            <Download size={14} /> Xuất Excel
          </button>
          <button className="btn btn--primary" onClick={save} disabled={saving || lines.length === 0}>
            {saving ? <Loader2 size={14} className="spin" /> : <Save size={14} />}
            {isEdit ? 'Cập nhật' : 'Lưu'}
          </button>
        </>
      }
    >
      {/* Range + generate */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginBottom: 12, flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
          Từ ngày
          <input type="date" className="input" value={rangeFrom} onChange={(e) => setRangeFrom(e.target.value)} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
          Đến ngày
          <input type="date" className="input" value={rangeTo} onChange={(e) => setRangeTo(e.target.value)} />
        </label>
        <button className="btn btn--secondary" onClick={generate} disabled={loading}>
          {loading ? <Loader2 size={14} className="spin" /> : <Filter size={14} />}
          Lọc dòng
        </button>
        <button className="btn btn--ghost" onClick={addAdhoc} type="button">
          <Plus size={14} /> Thêm dòng
        </button>
      </div>

      {/* Lines table */}
      {lines.length === 0 ? (
        <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--fg-3)', fontSize: 13 }}>
          Chọn khoảng thời gian rồi bấm <b>Lọc dòng</b> để xem các dòng cước / phí trong kỳ.
        </div>
      ) : (
        <div style={{ overflowX: 'auto', maxHeight: 360 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--fg-3)' }}>
                <th style={cellStyle}>Diễn giải</th>
                <th style={cellStyle}>Tuyến</th>
                <th style={cellStyle}>Số Cont</th>
                <th style={{ ...cellStyle, textAlign: 'right' }}>Số tiền (đ)</th>
                <th style={cellStyle}>Hiện</th>
                <th style={cellStyle}></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => {
                const amt = l.amountOverride != null ? l.amountOverride : l.baseAmount;
                return (
                  <tr key={i} style={{ opacity: l.excluded ? 0.45 : 1 }}>
                    <td style={cellStyle}>
                      <input
                        className="input"
                        style={inputBase}
                        value={l.description}
                        onChange={(e) => updateLine(i, { description: e.target.value })}
                      />
                    </td>
                    <td style={cellStyle}>
                      <input
                        className="input"
                        style={{ ...inputBase, color: 'var(--fg-2)' }}
                        value={l.routeName ?? ''}
                        onChange={(e) => updateLine(i, { routeName: e.target.value || null })}
                      />
                    </td>
                    <td style={{ ...cellStyle, color: 'var(--fg-2)' }}>
                      {(l.containerNumbers ?? []).join(', ') || '—'}
                    </td>
                    <td style={{ ...cellStyle, textAlign: 'right' }}>
                      <input
                        type="number"
                        className="input mono"
                        style={{ ...inputBase, textAlign: 'right', width: 120 }}
                        value={amt}
                        onChange={(e) => updateLine(i, { amountOverride: Number(e.target.value) })}
                      />
                    </td>
                    <td style={{ ...cellStyle, textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={!l.excluded}
                        onChange={(e) => updateLine(i, { excluded: !e.target.checked })}
                      />
                    </td>
                    <td style={cellStyle}>
                      <button
                        className="btn-icon"
                        title="Xóa dòng"
                        onClick={() => removeLine(i)}
                        style={{ color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Note + total */}
      <div style={{ marginTop: 12, display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, flex: '1 1 280px' }}>
          Ghi chú
          <textarea
            className="input"
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Điều khoản thanh toán, ghi chú cho khách hàng/đối tác..."
          />
        </label>
        <div style={{ textAlign: 'right', minWidth: 200 }}>
          <div style={{ fontSize: 12, color: 'var(--fg-3)' }}>TỔNG CỘNG</div>
          <div className="mono" style={{ fontSize: 20, fontWeight: 700 }}>
            {formatCurrency(total).replace(' ₫', '')}<span style={{ fontSize: 13 }}>đ</span>
          </div>
        </div>
      </div>
    </Modal>
  );
}
