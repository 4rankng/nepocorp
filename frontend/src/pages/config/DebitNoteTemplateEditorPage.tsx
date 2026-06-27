import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  Building2,
  Columns3,
  Eye,
  EyeOff,
  FileText,
  Loader2,
  PenLine,
  Plus,
  RotateCcw,
  Save,
  Star,
  Trash2,
} from 'lucide-react';
import { AssetIcon } from '../../components/AssetIcon';
import { useConfirm } from '../../components/UI';
import { useToast } from '../../components/shared/Toast';
import { configClient } from '../../api/configClient';
import { qk } from '../../api/keys';
import { useBackShortcut } from '../../hooks/useBackShortcut';
import {
  defaultDebitNoteColumns,
  type DebitNoteColumnVariable,
  type DebitNoteTemplate,
  type DebitNoteTemplateColumn,
  type DebitNoteTemplateInput,
} from '@tingting/shared';
import './config-page.css';
import './debit-note-template-editor.css';

const VARIABLES: Array<{ value: DebitNoteColumnVariable; label: string; sample: string }> = [
  { value: 'rowIndex', label: 'STT', sample: '1' },
  { value: 'departureDate', label: 'Ngày thực hiện', sample: '15/06/2026' },
  { value: 'truckPlate', label: 'Biển số xe', sample: '15C-180.99' },
  { value: 'actionType', label: 'Đóng / Trả', sample: 'ĐÓNG' },
  { value: 'origin', label: 'Điểm đi / về', sample: 'Cảng Nam Hải' },
  { value: 'destination', label: 'Điểm đóng / trả hàng', sample: 'KCN Quế Võ' },
  { value: 'deliveryAddress', label: 'Địa chỉ giao hàng', sample: 'Lô CN1F, CCN Quất Động' },
  { value: 'container20Count', label: "Cont 20'", sample: '1' },
  { value: 'container40Count', label: "Cont 40'", sample: '' },
  { value: 'containerNumbers', label: 'Số hiệu cont', sample: 'VSGU4230188' },
  { value: 'routeName', label: 'Tên tuyến', sample: 'HP - Quế Võ' },
  { value: 'description', label: 'Diễn giải', sample: 'Cước vận chuyển' },
  { value: 'lineTypeLabel', label: 'Loại dòng', sample: 'Doanh thu' },
  { value: 'unit', label: 'Đơn vị tính', sample: 'chuyến' },
  { value: 'amount', label: 'Số tiền', sample: '4.490.000' },
  { value: 'note', label: 'Ghi chú', sample: '-' },
  { value: 'tripCode', label: 'Mã chuyến', sample: 'TR-2606-001' },
];

const variableMap = new Map(VARIABLES.map(item => [item.value, item]));

type EditorSection = 'general' | 'company' | 'columns' | 'footer';
type SelectedTarget =
  | { type: 'general'; field?: 'name' | 'titleText' | 'orientation' | 'accentColor' }
  | { type: 'company'; field?: 'issuerName' | 'issuerTaxCode' | 'issuerAddress' | 'issuerRepresentative' | 'termsText' }
  | { type: 'column'; columnId: string }
  | { type: 'footer'; field?: 'signatureLeftLabel' | 'signatureLeftName' | 'signatureRightLabel' | 'signatureRightName' | 'termsText' };

const EDITOR_SECTIONS: Array<{ id: EditorSection; label: string; meta: string; Icon: typeof FileText }> = [
  { id: 'general', label: 'Chung', meta: 'Tên mẫu, tiêu đề, khổ giấy', Icon: FileText },
  { id: 'company', label: 'Công ty', meta: 'Thông tin phát hành', Icon: Building2 },
  { id: 'columns', label: 'Cột Excel', meta: 'Nhãn, dữ liệu, tổng', Icon: Columns3 },
  { id: 'footer', label: 'Chữ ký', meta: 'Nhóm dòng, điều khoản', Icon: PenLine },
];

function sectionFromTarget(target: SelectedTarget): EditorSection {
  return target.type === 'column' ? 'columns' : target.type;
}

function variableLabel(value: DebitNoteColumnVariable) {
  return variableMap.get(value)?.label ?? value;
}

function cloneStarterColumns(): DebitNoteTemplateColumn[] {
  return defaultDebitNoteColumns.map(column => ({ ...column }));
}

const DEFAULT_ACCOUNT_NUMBER = '190466529';
const DEFAULT_BANK_NAME = 'TMCP Á Châu PGD Thái Phiên - Hải Phòng';

function stripTermPrefix(value: string, prefixPattern: RegExp) {
  return value.normalize('NFC').replace(prefixPattern, '').trim();
}

function getAccountTerms(termsText?: string | null) {
  const [accountLine = '', bankLine = ''] = (termsText || '').split('\n');
  return {
    accountNumber: stripTermPrefix(accountLine, /^-\s*Số\s*TK\s*/i) || DEFAULT_ACCOUNT_NUMBER,
    bankName: stripTermPrefix(bankLine, /^-\s*Tại\s+ngân\s+hàng\s*/i) || DEFAULT_BANK_NAME,
  };
}

function buildAccountTerms(accountNumber: string, bankName: string) {
  return `- Số TK ${accountNumber.trim()}\n- Tại ngân hàng ${bankName.trim()}`;
}

function blankTemplate(): DebitNoteTemplateInput {
  return {
    name: 'Mẫu giấy báo nợ mới',
    isDefault: false,
    documentType: 'DEBIT_NOTE',
    logoStorageKey: null,
    titleText: 'GIẤY BÁO NỢ',
    issuerName: 'CÔNG TY TNHH NEPO',
    issuerAddress: null,
    issuerTaxCode: null,
    issuerRepresentative: null,
    accentColor: '#1F4E79',
    showContainerColumn: true,
    showUnitColumn: true,
    groupingMode: 'ROUTE',
    columns: cloneStarterColumns(),
    amountInWords: false,
    orientation: 'landscape',
    termsText: buildAccountTerms(DEFAULT_ACCOUNT_NUMBER, DEFAULT_BANK_NAME),
    signatureLeftLabel: 'Khách hàng',
    signatureLeftName: null,
    signatureRightLabel: 'Kế toán trưởng',
    signatureRightName: null,
  };
}

function toForm(template: DebitNoteTemplate): DebitNoteTemplateInput {
  return {
    name: template.name,
    isDefault: template.isDefault,
    documentType: template.documentType,
    logoStorageKey: template.logoStorageKey,
    titleText: template.titleText,
    issuerName: template.issuerName,
    issuerAddress: template.issuerAddress,
    issuerTaxCode: template.issuerTaxCode,
    issuerRepresentative: template.issuerRepresentative ?? null,
    accentColor: template.accentColor,
    showContainerColumn: template.showContainerColumn,
    showUnitColumn: template.showUnitColumn,
    groupingMode: template.groupingMode,
    columns: template.columns?.length ? template.columns.map(column => ({ ...column })) : cloneStarterColumns(),
    amountInWords: template.amountInWords,
    orientation: template.orientation,
    termsText: template.termsText,
    signatureLeftLabel: template.signatureLeftLabel,
    signatureLeftName: template.signatureLeftName,
    signatureRightLabel: template.signatureRightLabel,
    signatureRightName: template.signatureRightName,
  };
}

function sampleCell(column: DebitNoteTemplateColumn): string {
  return variableMap.get(column.variable)?.sample ?? '';
}

function makeColumn(index: number): DebitNoteTemplateColumn {
  return {
    id: `cot_${Date.now()}_${index}`,
    label: 'Cột mới',
    variable: 'description',
    width: 16,
    align: 'left',
    format: 'text',
    total: false,
  };
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="debit-editor-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function TemplatePreview({
  form,
  disabled,
  selectedTarget,
  onSelect,
  onSet,
  onUpdateColumn,
}: {
  form: DebitNoteTemplateInput;
  disabled: boolean;
  selectedTarget: SelectedTarget;
  onSelect: (target: SelectedTarget) => void;
  onSet: <K extends keyof DebitNoteTemplateInput>(key: K, value: DebitNoteTemplateInput[K]) => void;
  onUpdateColumn: (columnId: string, patch: Partial<DebitNoteTemplateColumn>) => void;
}) {
  const columns = (form.columns ?? []).filter(column => column.width > 0);
  const visible = columns.length > 0 ? columns : cloneStarterColumns();
  const totalColumns = visible.filter(column => column.total);
  const canvasLocked = disabled;
  const previewTerms = (form.termsText || '- Số TK 190466529\n- Tại ngân hàng TMCP Á Châu PGD Thái Phiên - Hải Phòng').split('\n');

  return (
    <aside className="debit-editor-preview" aria-label="Xem trước mẫu">
      <div className="debit-editor-canvas-frame">
        <div className="debit-editor-canvas-dragbar" aria-hidden="true">
          <span>⋮⋮</span>
          <span>Chọn nội dung để chỉnh</span>
          <span>⋮⋮</span>
        </div>
        <div className="debit-editor-preview__sheet">
          <div className="debit-editor-page-boundary">
            <div className="debit-editor-preview__export-header">
              <textarea
                className={`debit-editor-preview__title debit-editor-canvas-input ${selectedTarget.type === 'general' && selectedTarget.field === 'titleText' ? 'is-selected' : ''}`}
                value={form.titleText || ''}
                placeholder="GIẤY BÁO NỢ"
                rows={1}
                onFocus={() => onSelect({ type: 'general', field: 'titleText' })}
                onChange={event => onSet('titleText', event.target.value)}
                disabled={canvasLocked}
              />
              <div>(Kèm hoá đơn GTGT số: ........ ngày 30/06/2026)</div>
            </div>

            <div className={`debit-editor-preview__intro ${selectedTarget.type === 'company' ? 'is-selected' : ''}`}>
              <p><strong>BÊN A (BÊN THUÊ DỊCH VỤ): VIETSUN</strong></p>
              <p>Địa chỉ: </p>
              <p>Mã số thuế: </p>
              <p>Đại diện bởi : </p>
              <p>Chức vụ: Giám Đốc</p>
              <p>
                <strong>BÊN B (BÊN CUNG CẤP DỊCH VỤ): </strong>
                <span className="debit-editor-preview__inline-field">
                  <input
                    className="debit-editor-canvas-input debit-editor-canvas-input--issuer"
                    value={form.issuerName ?? ''}
                    placeholder="Tên công ty"
                    onFocus={() => onSelect({ type: 'company', field: 'issuerName' })}
                    onChange={event => onSet('issuerName', event.target.value || null)}
                    disabled={canvasLocked}
                  />
                </span>
              </p>
              <p>
                Địa chỉ:
                <span className="debit-editor-preview__inline-field">
                  <input
                    className="debit-editor-canvas-input"
                    value={form.issuerAddress ?? ''}
                    placeholder="Địa chỉ"
                    onFocus={() => onSelect({ type: 'company', field: 'issuerAddress' })}
                    onChange={event => onSet('issuerAddress', event.target.value || null)}
                    disabled={canvasLocked}
                  />
                </span>
              </p>
              <p>
                Mã số thuế:
                <span className="debit-editor-preview__inline-field">
                  <input
                    className="debit-editor-canvas-input"
                    value={form.issuerTaxCode ?? ''}
                    placeholder="MST"
                    onFocus={() => onSelect({ type: 'company', field: 'issuerTaxCode' })}
                    onChange={event => onSet('issuerTaxCode', event.target.value || null)}
                    disabled={canvasLocked}
                  />
                </span>
              </p>
              <p className={selectedTarget.type === 'company' && selectedTarget.field === 'issuerRepresentative' ? 'is-selected' : undefined}>
                Đại diện bởi : {form.issuerRepresentative || ''}
              </p>
              <p>Chức vụ: Giám Đốc</p>
              <p>{previewTerms[0] ?? '- Số TK '}</p>
              <p>{previewTerms[1] ?? '- Tại ngân hàng '}</p>
              <p>Cùng thống nhất tiến hành đối chiếu sản lượng và doanh thu dịch vụ Bên B đã hoàn thành cung cấp/thực hiện cho Bên A như sau:</p>
            </div>

            <div className="debit-editor-preview__table-wrap">
              <table className="debit-editor-preview__table">
                <thead>
                  <tr>
                    {visible.map(column => {
                      const isSelected = selectedTarget.type === 'column' && selectedTarget.columnId === column.id;
                      return (
                        <th
                          key={column.id}
                          className={isSelected ? 'is-selected' : undefined}
                          style={{
                            width: `${Math.max(column.width || 8, 8) * 12}px`,
                            minWidth: `${Math.max(column.width || 8, 8) * 12}px`,
                          }}
                          onClick={() => {
                            if (!canvasLocked) onSelect({ type: 'column', columnId: column.id });
                          }}
                        >
                          {isSelected ? (
                            <textarea
                              className="debit-editor-canvas-th-input"
                              value={column.label}
                              rows={2}
                              onClick={event => event.stopPropagation()}
                              onFocus={() => onSelect({ type: 'column', columnId: column.id })}
                              onChange={event => onUpdateColumn(column.id, { label: event.target.value })}
                              disabled={canvasLocked}
                            />
                          ) : (
                            <button type="button" disabled={canvasLocked}>
                              <span>{column.label}</span>
                            </button>
                          )}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {[0, 1].map(row => (
                    <tr key={row}>
                      {visible.map((column, index) => (
                        <td key={`${row}-${column.id}`}>
                          {column.variable === 'rowIndex' ? row + 1 : (sampleCell(column) || (index % 2 ? '-' : ''))}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {totalColumns.length > 0 && (
                    <tr>
                      <td colSpan={visible.length} className="debit-editor-preview__total">
                        TỔNG CỘNG {totalColumns.map(column => column.label.replace(/\n/g, ' ')).join(' · ')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="debit-editor-preview__signatures">
              <label className={selectedTarget.type === 'footer' && selectedTarget.field === 'signatureLeftLabel' ? 'is-selected' : undefined}>
                <input
                  className="debit-editor-canvas-input debit-editor-canvas-input--signature"
                  value={form.signatureLeftLabel || ''}
                  placeholder="Người lập biểu"
                  onFocus={() => onSelect({ type: 'footer', field: 'signatureLeftLabel' })}
                  onChange={event => onSet('signatureLeftLabel', event.target.value || null)}
                  disabled={canvasLocked}
                />
                <span>(Ký, họ tên)</span>
                <input
                  className={`debit-editor-canvas-input debit-editor-canvas-input--signature-name ${selectedTarget.type === 'footer' && selectedTarget.field === 'signatureLeftName' ? 'is-selected' : ''}`}
                  value={form.signatureLeftName || ''}
                  placeholder="Tên người ký"
                  onFocus={() => onSelect({ type: 'footer', field: 'signatureLeftName' })}
                  onChange={event => onSet('signatureLeftName', event.target.value || null)}
                  disabled={canvasLocked}
                />
              </label>
              <label className={selectedTarget.type === 'footer' && selectedTarget.field === 'signatureRightLabel' ? 'is-selected' : undefined}>
                <input
                  className="debit-editor-canvas-input debit-editor-canvas-input--signature"
                  value={form.signatureRightLabel || ''}
                  placeholder="Kế toán trưởng"
                  onFocus={() => onSelect({ type: 'footer', field: 'signatureRightLabel' })}
                  onChange={event => onSet('signatureRightLabel', event.target.value || null)}
                  disabled={canvasLocked}
                />
                <span>(Ký, họ tên, đóng dấu)</span>
                <input
                  className={`debit-editor-canvas-input debit-editor-canvas-input--signature-name ${selectedTarget.type === 'footer' && selectedTarget.field === 'signatureRightName' ? 'is-selected' : ''}`}
                  value={form.signatureRightName || ''}
                  placeholder="Tên người ký"
                  onFocus={() => onSelect({ type: 'footer', field: 'signatureRightName' })}
                  onChange={event => onSet('signatureRightName', event.target.value || null)}
                  disabled={canvasLocked}
                />
              </label>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

function ColumnTable({
  columns,
  accentColor,
  disabled,
  onChange,
}: {
  columns: DebitNoteTemplateColumn[];
  accentColor: string;
  disabled: boolean;
  onChange: (columns: DebitNoteTemplateColumn[]) => void;
}) {
  const [selectedColumnId, setSelectedColumnId] = useState(columns[0]?.id ?? '');
  const update = (index: number, patch: Partial<DebitNoteTemplateColumn>) => {
    onChange(columns.map((column, idx) => idx === index ? { ...column, ...patch } : column));
  };
  const updateSelected = (patch: Partial<DebitNoteTemplateColumn>) => {
    if (selectedIndex < 0) return;
    update(selectedIndex, patch);
  };
  const addColumn = () => {
    const nextColumn = makeColumn(columns.length + 1);
    setSelectedColumnId(nextColumn.id);
    onChange([...columns, nextColumn]);
  };
  const reset = () => onChange(cloneStarterColumns());
  const selectedIndex = columns.findIndex(column => column.id === selectedColumnId);
  const selectedColumn = selectedIndex >= 0 ? columns[selectedIndex] : columns[0];
  const moveColumn = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= columns.length) return;
    const next = [...columns];
    [next[index], next[target]] = [next[target], next[index]];
    setSelectedColumnId(next[target].id);
    onChange(next);
  };

  useEffect(() => {
    if (columns.length === 0) {
      setSelectedColumnId('');
      return;
    }
    if (!columns.some(column => column.id === selectedColumnId)) {
      setSelectedColumnId(columns[0].id);
    }
  }, [columns, selectedColumnId]);

  return (
    <section className="debit-editor-table-wrap">
      <div className="debit-editor-table-toolbar">
        <div>
          <strong>Cột Excel</strong>
          <span>{columns.filter(column => column.width > 0).length}/{columns.length} đang hiện</span>
        </div>
        <div>
          <button type="button" className="btn btn--ghost" onClick={reset} disabled={disabled}>
            <RotateCcw size={15} /> Mặc định
          </button>
          <button type="button" className="btn btn--secondary" onClick={addColumn} disabled={disabled}>
            <Plus size={15} /> Thêm cột
          </button>
        </div>
      </div>
      <div className="debit-editor-column-designer">
        <div className="debit-editor-column-preview" style={{ '--accent': accentColor } as React.CSSProperties} aria-label="Chọn cột để chỉnh">
          <table className="debit-editor-column-preview__table">
            <thead>
              <tr>
                {columns.map((column, index) => {
                  const hidden = column.width === 0;
                  return (
                    <th
                      key={column.id}
                      className={`${hidden ? 'is-hidden' : ''} ${column.id === selectedColumn?.id ? 'is-selected' : ''}`}
                      style={{ width: `${Math.max(column.width || 8, 8) * 10}px` }}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedColumnId(column.id)}
                        disabled={disabled}
                        aria-pressed={column.id === selectedColumn?.id}
                      >
                        <span>{column.label || `Cột ${index + 1}`}</span>
                        <small>{variableLabel(column.variable)}</small>
                      </button>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              <tr>
                {columns.map(column => {
                  const variable = variableMap.get(column.variable);
                  return (
                    <td key={column.id} className={column.width === 0 ? 'is-hidden' : undefined}>
                      {variable?.sample || '-'}
                    </td>
                  );
                })}
              </tr>
              <tr>
                {columns.map(column => (
                  <td key={column.id} className={`${column.total ? 'is-total' : ''} ${column.width === 0 ? 'is-hidden' : ''}`}>
                    {column.total ? 'Tổng' : ''}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        <div className="debit-editor-column-cards" aria-label="Danh sách cột">
          {columns.map((column, index) => {
            const hidden = column.width === 0;
            return (
              <div key={column.id} className={`debit-editor-column-card ${column.id === selectedColumn?.id ? 'is-selected' : ''} ${hidden ? 'is-hidden' : ''}`}>
                <button type="button" onClick={() => setSelectedColumnId(column.id)} disabled={disabled}>
                  <span>{column.label || `Cột ${index + 1}`}</span>
                  <small>Dữ liệu: {variableLabel(column.variable)}</small>
                </button>
                <div>
                  <span>{hidden ? 'Ẩn' : 'Hiện'}</span>
                  {column.total && <span>Tổng</span>}
                </div>
                <div className="debit-editor-column-card__actions">
                  <button type="button" className="btn btn--ghost btn--icon btn--sm" onClick={() => moveColumn(index, -1)} disabled={disabled || index === 0} aria-label={`Đưa ${column.label} lên trước`}>
                    <ArrowUp size={14} />
                  </button>
                  <button type="button" className="btn btn--ghost btn--icon btn--sm" onClick={() => moveColumn(index, 1)} disabled={disabled || index === columns.length - 1} aria-label={`Đưa ${column.label} xuống sau`}>
                    <ArrowDown size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {selectedColumn && (
          <aside className="debit-editor-column-inspector">
            <div className="debit-editor-column-stack">
              <div className="debit-editor-column-inspector__header">
                <div>
                  <span>Cột {selectedIndex + 1}</span>
                  <strong>{selectedColumn.label || 'Chưa đặt tên'}</strong>
                </div>
                <div className="debit-editor-column-inspector__actions">
                  <button type="button" className="btn btn--ghost btn--icon btn--sm" onClick={() => moveColumn(selectedIndex, -1)} disabled={disabled || selectedIndex <= 0} aria-label="Đưa cột lên trước">
                    <ArrowUp size={14} />
                  </button>
                  <button type="button" className="btn btn--ghost btn--icon btn--sm" onClick={() => moveColumn(selectedIndex, 1)} disabled={disabled || selectedIndex >= columns.length - 1} aria-label="Đưa cột xuống sau">
                    <ArrowDown size={14} />
                  </button>
                </div>
              </div>
              <Field label="Tiêu đề cột">
                <input
                  className="input"
                  value={selectedColumn.label}
                  disabled={disabled}
                  onChange={(event) => updateSelected({ label: event.target.value })}
                />
              </Field>
              <Field label="Biến dữ liệu">
                <select
                  className="input"
                  value={selectedColumn.variable}
                  disabled={disabled}
                  onChange={(event) => updateSelected({ variable: event.target.value as DebitNoteColumnVariable })}
                >
                  {VARIABLES.map(variable => (
                    <option key={variable.value} value={variable.value}>{variable.label}</option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="debit-editor-variable-grid">
              {VARIABLES.map(variable => (
                <button
                  key={variable.value}
                  type="button"
                  className={variable.value === selectedColumn.variable ? 'is-active' : undefined}
                  disabled={disabled}
                  onClick={() => updateSelected({ variable: variable.value })}
                >
                  <span>{variable.label}</span>
                  <small>{variable.sample || '-'}</small>
                </button>
              ))}
            </div>
            <div className="debit-editor-column-options">
              <label className="debit-editor-check">
                <input
                  type="checkbox"
                  checked={selectedColumn.total}
                  disabled={disabled}
                  onChange={(event) => updateSelected({ total: event.target.checked })}
                />
                <span>Tính tổng</span>
              </label>
              <label className="debit-editor-check">
                <input
                  type="checkbox"
                  checked={selectedColumn.width > 0}
                  disabled={disabled}
                  onChange={(event) => updateSelected({ width: event.target.checked ? 14 : 0 })}
                />
                <span>Hiện cột</span>
              </label>
              <Field label="Độ rộng">
                <input
                  className="input"
                  type="number"
                  min={6}
                  max={40}
                  value={selectedColumn.width || 14}
                  disabled={disabled || selectedColumn.width === 0}
                  onChange={(event) => updateSelected({ width: Number(event.target.value) || 14 })}
                />
              </Field>
            </div>
          </aside>
        )}
      </div>
    </section>
  );
}

function ColumnPropertyPanel({
  column,
  columns,
  disabled,
  onChange,
  onSelectColumn,
  onToggleColumnVisibility,
}: {
  column: DebitNoteTemplateColumn;
  columns: DebitNoteTemplateColumn[];
  disabled: boolean;
  onChange: (patch: Partial<DebitNoteTemplateColumn>) => void;
  onSelectColumn: (columnId: string) => void;
  onToggleColumnVisibility: (column: DebitNoteTemplateColumn) => void;
}) {
  return (
    <section className="debit-editor-selected-panel">
      <div className="debit-editor-column-picker" aria-label="Chọn cột">
        {columns.map((item, index) => {
          const visible = item.width > 0;
          const isActive = item.id === column.id;
          return (
            <div key={item.id} className={`debit-editor-column-picker__card ${isActive ? 'is-active' : ''} ${visible ? '' : 'is-hidden'}`}>
              <button
                type="button"
                className="debit-editor-column-picker__select"
                onClick={() => onSelectColumn(item.id)}
                disabled={disabled}
                aria-pressed={isActive}
              >
                <span>{item.label || `Cột ${index + 1}`}</span>
                <small>{visible ? `Hiện · ${variableLabel(item.variable)}` : `Ẩn · ${variableLabel(item.variable)}`}</small>
              </button>
              <button
                type="button"
                className="debit-editor-column-picker__visibility"
                onClick={() => onToggleColumnVisibility(item)}
                disabled={disabled}
                aria-label={visible ? `Ẩn cột ${item.label || `Cột ${index + 1}`}` : `Hiện cột ${item.label || `Cột ${index + 1}`}`}
                title={visible ? 'Ẩn cột' : 'Hiện cột'}
              >
                {visible ? <Eye size={16} /> : <EyeOff size={16} />}
              </button>
            </div>
          );
        })}
      </div>

      <div className="debit-editor-selected-group">
        <strong>Thuộc tính cột</strong>
        <Field label="Biến dữ liệu">
          <select
            className="input"
            value={column.variable}
            disabled={disabled}
            onChange={event => {
              const variable = event.target.value as DebitNoteColumnVariable;
              onChange({ variable, label: variableLabel(variable) });
            }}
          >
            {VARIABLES.map(item => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
        </Field>
        <Field label="Căn lề">
          <div className="debit-editor-align-control" role="group" aria-label="Căn lề">
            {[
              { value: 'left' as const, label: 'Trái', Icon: AlignLeft },
              { value: 'center' as const, label: 'Giữa', Icon: AlignCenter },
              { value: 'right' as const, label: 'Phải', Icon: AlignRight },
            ].map(item => {
              const Icon = item.Icon;
              return (
                <button
                  key={item.value}
                  type="button"
                  className={column.align === item.value ? 'is-active' : undefined}
                  onClick={() => onChange({ align: item.value })}
                  disabled={disabled}
                  aria-label={item.label}
                >
                  <Icon size={15} />
                </button>
              );
            })}
          </div>
        </Field>
        <div className="debit-editor-switch-list">
          <label>
            <span>Hiện cột</span>
            <input
              type="checkbox"
              checked={column.width > 0}
              disabled={disabled}
              onChange={event => onChange({ width: event.target.checked ? 14 : 0 })}
            />
          </label>
          <label>
            <span>Tính tổng</span>
            <input
              type="checkbox"
              checked={column.total}
              disabled={disabled}
              onChange={event => onChange({ total: event.target.checked })}
            />
          </label>
        </div>
      </div>
    </section>
  );
}

export default function DebitNoteTemplateEditorPage() {
  const navigate = useNavigate();
  const params = useParams();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const id = params.id === 'new' || !params.id ? null : Number(params.id);
  const isNew = id == null;
  const viewOnly = !isNew && searchParams.get('mode') === 'view';
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<DebitNoteTemplateInput>(() => blankTemplate());
  const [activeSection, setActiveSection] = useState<EditorSection>('columns');
  const [selectedTarget, setSelectedTarget] = useState<SelectedTarget>(() => ({ type: 'column', columnId: cloneStarterColumns()[0]?.id ?? '' }));

  const backToList = () => navigate('/config/debit-note-templates');
  useBackShortcut(backToList);

  const { data: template, isLoading } = useQuery<DebitNoteTemplate>({
    queryKey: qk.catalogs.debitNoteTemplate(id),
    queryFn: () => configClient.getDebitNoteTemplate(id as number),
    enabled: !isNew,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (template) setForm(toForm(template));
  }, [template]);

  const visibleColumns = useMemo(() => (form.columns ?? []).filter(column => column.width > 0), [form.columns]);
  const selectedColumn = useMemo(() => (
    selectedTarget.type === 'column'
      ? (form.columns ?? []).find(column => column.id === selectedTarget.columnId) ?? null
      : null
  ), [form.columns, selectedTarget]);
  const set = <K extends keyof DebitNoteTemplateInput>(key: K, value: DebitNoteTemplateInput[K]) => {
    setForm(previous => ({ ...previous, [key]: value }));
  };
  const selectTarget = (target: SelectedTarget) => {
    setSelectedTarget(target);
    setActiveSection(sectionFromTarget(target));
  };
  const selectSection = (section: EditorSection) => {
    setActiveSection(section);
    if (section === 'columns') {
      setSelectedTarget({ type: 'column', columnId: (form.columns ?? [])[0]?.id ?? '' });
    } else if (section === 'general') {
      setSelectedTarget({ type: 'general', field: 'titleText' });
    } else if (section === 'company') {
      setSelectedTarget({ type: 'company', field: 'issuerName' });
    } else {
      setSelectedTarget({ type: 'footer', field: 'signatureLeftLabel' });
    }
  };
  const updateColumn = (columnId: string, patch: Partial<DebitNoteTemplateColumn>) => {
    setForm(previous => ({
      ...previous,
      columns: (previous.columns ?? []).map(column => column.id === columnId ? { ...column, ...patch } : column),
    }));
  };
  const accountTerms = getAccountTerms(form.termsText);
  const setAccountNumber = (accountNumber: string) => {
    set('termsText', buildAccountTerms(accountNumber, accountTerms.bankName));
  };
  const setBankName = (bankName: string) => {
    set('termsText', buildAccountTerms(accountTerms.accountNumber, bankName));
  };
  useEffect(() => {
    if (selectedTarget.type !== 'column') return;
    const columns = form.columns ?? [];
    if (columns.length > 0 && !columns.some(column => column.id === selectedTarget.columnId)) {
      setSelectedTarget({ type: 'column', columnId: columns[0].id });
    }
  }, [form.columns, selectedTarget]);

  const validate = () => {
    if (!form.name.trim()) return 'Chưa nhập tên mẫu.';
    if (!form.titleText.trim()) return 'Chưa nhập tiêu đề.';
    if (!form.columns?.length) return 'Mẫu phải có ít nhất một cột.';
    return null;
  };

  const save = async () => {
    const error = validate();
    if (error) {
      toast({ kind: 'error', message: error });
      return;
    }

    setSaving(true);
    try {
      const payload = { ...form, name: form.name.trim(), titleText: form.titleText.trim() };
      const saved = isNew
        ? await configClient.saveDebitNoteTemplate(payload)
        : await configClient.updateDebitNoteTemplate(id as number, payload);
      await queryClient.invalidateQueries({ queryKey: qk.catalogs.debitNoteTemplates });
      await queryClient.invalidateQueries({ queryKey: qk.catalogs.debitNoteTemplate(saved.id) });
      toast({ kind: 'success', message: 'Đã lưu mẫu giấy báo nợ.' });
      backToList();
    } catch (err) {
      toast({ kind: 'error', message: (err as Error).message || 'Không lưu được mẫu.' });
    } finally {
      setSaving(false);
    }
  };

  const removeTemplate = async () => {
    if (isNew || !id) return;
    const ok = await confirm(`Xoá mẫu "${form.name}"? Các giấy báo nợ đã lưu vẫn giữ ảnh chụp mẫu cũ.`, { variant: 'danger' });
    if (!ok) return;
    setSaving(true);
    try {
      await configClient.deleteDebitNoteTemplate(id);
      await queryClient.invalidateQueries({ queryKey: qk.catalogs.debitNoteTemplates });
      toast({ kind: 'success', message: 'Đã xoá mẫu.' });
      backToList();
    } catch (err) {
      toast({ kind: 'error', message: (err as Error).message || 'Không xoá được mẫu.' });
    } finally {
      setSaving(false);
    }
  };

  const busy = saving || isLoading;
  const controlsDisabled = busy || viewOnly;
  const activeSectionLabel = selectedTarget.type === 'column'
    ? 'Cột đang chọn'
    : EDITOR_SECTIONS.find(section => section.id === activeSection)?.label ?? 'Chung';
  const renderInspector = () => {
    if (selectedTarget.type === 'column' && selectedColumn) {
      return (
        <ColumnPropertyPanel
          column={selectedColumn}
          columns={form.columns ?? []}
          disabled={controlsDisabled}
          onChange={patch => updateColumn(selectedColumn.id, patch)}
          onSelectColumn={columnId => selectTarget({ type: 'column', columnId })}
          onToggleColumnVisibility={item => updateColumn(item.id, { width: item.width > 0 ? 0 : 14 })}
        />
      );
    }

    if (activeSection === 'general') {
      return (
        <section className="debit-editor-settings">
          <Field label="Tên mẫu *">
            <input className="input debit-editor-inline-input" value={form.name} onChange={event => set('name', event.target.value)} disabled={controlsDisabled} />
          </Field>
          <Field label="Tiêu đề">
            <input className="input debit-editor-inline-input" value={form.titleText} onChange={event => set('titleText', event.target.value)} disabled={controlsDisabled} />
          </Field>
          <Field label="Hướng giấy">
            <select className="input debit-editor-inline-select debit-editor-settings-select" value={form.orientation} onChange={event => set('orientation', event.target.value as DebitNoteTemplateInput['orientation'])} disabled={controlsDisabled}>
              <option value="landscape">Ngang</option>
              <option value="portrait">Dọc</option>
            </select>
          </Field>
          <Field label="Màu nhấn">
            <div className="debit-editor-color">
              <input type="color" value={form.accentColor} onChange={event => set('accentColor', event.target.value)} disabled={controlsDisabled} />
              <input className="input mono debit-editor-inline-input" value={form.accentColor} onChange={event => set('accentColor', event.target.value)} disabled={controlsDisabled} />
            </div>
          </Field>
          <label className="debit-editor-check">
            <input type="checkbox" checked={form.isDefault} onChange={event => set('isDefault', event.target.checked)} disabled={controlsDisabled} />
            <Star size={15} />
            <span>Mẫu mặc định</span>
          </label>
        </section>
      );
    }

    if (activeSection === 'company') {
      return (
        <section className="debit-editor-settings debit-editor-settings--issuer">
          <Field label="Tên công ty">
            <input className="input debit-editor-inline-input" value={form.issuerName ?? ''} onChange={event => set('issuerName', event.target.value || null)} disabled={controlsDisabled} />
          </Field>
          <Field label="Mã số thuế">
            <input className="input debit-editor-inline-input" value={form.issuerTaxCode ?? ''} onChange={event => set('issuerTaxCode', event.target.value || null)} disabled={controlsDisabled} />
          </Field>
          <Field label="Địa chỉ">
            <input className="input debit-editor-inline-input" value={form.issuerAddress ?? ''} onChange={event => set('issuerAddress', event.target.value || null)} disabled={controlsDisabled} />
          </Field>
          <Field label="Đại diện bởi">
            <input className="input debit-editor-inline-input" value={form.issuerRepresentative ?? ''} onChange={event => set('issuerRepresentative', event.target.value || null)} disabled={controlsDisabled} />
          </Field>
          <Field label="Chức vụ">
            <input className="input debit-editor-inline-input" value="Giám Đốc" disabled />
          </Field>
          <Field label="Số TK">
            <input className="input debit-editor-inline-input" value={accountTerms.accountNumber} onChange={event => setAccountNumber(event.target.value)} disabled={controlsDisabled} />
          </Field>
          <Field label="Tại ngân hàng">
            <input className="input debit-editor-inline-input" value={accountTerms.bankName} onChange={event => setBankName(event.target.value)} disabled={controlsDisabled} />
          </Field>
        </section>
      );
    }

    if (activeSection === 'columns') {
      return (
        <ColumnTable
          columns={form.columns ?? []}
          accentColor={form.accentColor}
          disabled={controlsDisabled}
          onChange={columns => set('columns', columns)}
        />
      );
    }

    return (
      <section className="debit-editor-settings debit-editor-settings--footer">
        <Field label="Nhóm dòng">
          <select className="input debit-editor-inline-select debit-editor-settings-select" value={form.groupingMode} onChange={event => set('groupingMode', event.target.value as DebitNoteTemplateInput['groupingMode'])} disabled={controlsDisabled}>
            <option value="ROUTE">Theo tuyến</option>
            <option value="LINE_TYPE">Theo loại dòng</option>
            <option value="NONE">Không nhóm</option>
          </select>
        </Field>
        <Field label="Chữ ký trái">
          <input className="input debit-editor-inline-input" value={form.signatureLeftLabel ?? ''} onChange={event => set('signatureLeftLabel', event.target.value || null)} disabled={controlsDisabled} />
        </Field>
        <Field label="Tên người ký trái">
          <input className="input debit-editor-inline-input" value={form.signatureLeftName ?? ''} onChange={event => set('signatureLeftName', event.target.value || null)} disabled={controlsDisabled} />
        </Field>
        <Field label="Chữ ký phải">
          <input className="input debit-editor-inline-input" value={form.signatureRightLabel ?? ''} onChange={event => set('signatureRightLabel', event.target.value || null)} disabled={controlsDisabled} />
        </Field>
        <Field label="Tên người ký phải">
          <input className="input debit-editor-inline-input" value={form.signatureRightName ?? ''} onChange={event => set('signatureRightName', event.target.value || null)} disabled={controlsDisabled} />
        </Field>
        <Field label="Điều khoản">
          <input className="input debit-editor-inline-input" value={form.termsText ?? ''} onChange={event => set('termsText', event.target.value || null)} disabled={controlsDisabled} />
        </Field>
      </section>
    );
  };

  return (
    <div className="cfg-page debit-editor-page">
      <header className="debit-editor-topbar">
        <div className="debit-editor-title">
          <button type="button" className="billing-builder__close" onClick={backToList} aria-label="Quay lại" disabled={busy}>
            <ArrowLeft size={21} />
          </button>
          <div className="billing-builder__icon">
            <AssetIcon name="document" size={34} />
          </div>
          <div>
            <p className="billing-builder__eyebrow">{viewOnly ? 'Xem mẫu' : isNew ? 'Tạo mẫu mới' : 'Chỉnh sửa mẫu'}</p>
            <input
              className="debit-editor-template-name"
              value={form.name}
              placeholder="Tên mẫu"
              aria-label="Tên mẫu"
              onChange={event => set('name', event.target.value)}
              disabled={controlsDisabled}
            />
            <div className="billing-builder__meta">
              <span>{visibleColumns.length} cột đang hiện</span>
              <span>{form.orientation === 'landscape' ? 'Khổ ngang' : 'Khổ dọc'}</span>
              {form.isDefault && <span>Mẫu mặc định</span>}
            </div>
          </div>
        </div>
        <div className="debit-editor-topbar__actions">
          {viewOnly ? (
            <button type="button" className="btn btn--primary" onClick={() => navigate(`/config/debit-note-templates/${id}`)} disabled={busy}>
              <PenLine size={16} /> Sửa mẫu
            </button>
          ) : !isNew && (
            <button type="button" className="btn btn--ghost" onClick={removeTemplate} disabled={busy}>
              <Trash2 size={16} /> Xoá
            </button>
          )}
          {!viewOnly && (
            <button type="button" className="btn btn--primary" onClick={save} disabled={busy}>
              {saving ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
              Lưu mẫu
            </button>
          )}
        </div>
      </header>

      {isLoading ? (
        <main className="debit-editor-loading">
          <Loader2 size={28} className="spin" />
          <span>Đang tải mẫu</span>
        </main>
      ) : (
        <main className="debit-editor-workspace">
          <nav className="debit-editor-side-nav" aria-label="Mục chỉnh sửa">
            {EDITOR_SECTIONS.map(section => {
              const Icon = section.Icon;
              return (
                <button
                  key={section.id}
                  type="button"
                  className={section.id === activeSection ? 'is-active' : undefined}
                  onClick={() => selectSection(section.id)}
                  aria-pressed={section.id === activeSection}
                >
                  <Icon size={17} />
                  <span>{section.label}</span>
                  <small>{section.meta}</small>
                </button>
              );
            })}
          </nav>

          <section className="debit-editor-preview-pane">
            <TemplatePreview
              form={form}
              disabled={controlsDisabled}
              selectedTarget={selectedTarget}
              onSelect={selectTarget}
              onSet={set}
              onUpdateColumn={updateColumn}
            />
          </section>

          <aside className="debit-editor-inspector" aria-label={`Chỉnh ${activeSectionLabel}`}>
            {renderInspector()}
          </aside>
        </main>
      )}

      {confirmDialog}
    </div>
  );
}
