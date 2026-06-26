import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Loader2,
  Plus,
  RotateCcw,
  Save,
  Star,
  Trash2,
  Upload,
} from 'lucide-react';
import { AssetIcon } from '../../components/AssetIcon';
import { useConfirm } from '../../components/UI';
import { useToast } from '../../components/shared/Toast';
import { api } from '../../lib/api';
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

function cloneStarterColumns(): DebitNoteTemplateColumn[] {
  return defaultDebitNoteColumns.map(column => ({ ...column }));
}

function blankTemplate(): DebitNoteTemplateInput {
  return {
    name: '',
    isDefault: false,
    documentType: 'DEBIT_NOTE',
    logoStorageKey: null,
    titleText: 'GIẤY BÁO NỢ',
    issuerName: 'CÔNG TY TNHH NEPO',
    issuerAddress: null,
    issuerTaxCode: null,
    accentColor: '#1F4E79',
    showContainerColumn: true,
    showUnitColumn: true,
    groupingMode: 'ROUTE',
    columns: cloneStarterColumns(),
    amountInWords: false,
    orientation: 'landscape',
    termsText: null,
    signatureLeftLabel: 'Khách hàng',
    signatureRightLabel: 'Kế toán trưởng',
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
    accentColor: template.accentColor,
    showContainerColumn: template.showContainerColumn,
    showUnitColumn: template.showUnitColumn,
    groupingMode: template.groupingMode,
    columns: template.columns?.length ? template.columns.map(column => ({ ...column })) : cloneStarterColumns(),
    amountInWords: template.amountInWords,
    orientation: template.orientation,
    termsText: template.termsText,
    signatureLeftLabel: template.signatureLeftLabel,
    signatureRightLabel: template.signatureRightLabel,
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

function TemplatePreview({ form }: { form: DebitNoteTemplateInput }) {
  const columns = (form.columns ?? []).filter(column => column.width > 0);
  const visible = columns.length > 0 ? columns : cloneStarterColumns();
  const totalColumns = visible.filter(column => column.total);

  return (
    <aside className="debit-editor-preview" aria-label="Xem trước mẫu">
      <div className="debit-editor-preview__sheet">
        {(form.issuerName || form.issuerAddress || form.issuerTaxCode || form.logoStorageKey) && (
          <div className="debit-editor-preview__issuer">
            <div>
              {form.issuerName && <strong>{form.issuerName}</strong>}
              {form.issuerAddress && <span>{form.issuerAddress}</span>}
              {form.issuerTaxCode && <span>MST: {form.issuerTaxCode}</span>}
            </div>
            {form.logoStorageKey && (
              <img src={`/api/photos/${encodeURIComponent(form.logoStorageKey)}`} alt="logo" />
            )}
          </div>
        )}
        <div className="debit-editor-preview__title">{form.titleText || 'GIẤY BÁO NỢ'}</div>
        <div className="debit-editor-preview__subtitle">Khách hàng: VIETSUN - Kỳ: 01/06 - 30/06</div>
        <div className="debit-editor-preview__table-wrap">
          <table className="debit-editor-preview__table">
            <thead>
              <tr>
                {visible.map(column => (
                  <th key={column.id} style={{ background: form.accentColor }}>
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[0, 1].map(row => (
                <tr key={row}>
                  {visible.map(column => (
                    <td key={`${row}-${column.id}`}>
                      {sampleCell(column)}
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
          <span>{form.signatureLeftLabel || 'Khách hàng'}</span>
          <span>{form.signatureRightLabel || 'Kế toán trưởng'}</span>
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
  const variableLabel = (value: DebitNoteColumnVariable) => variableMap.get(value)?.label ?? value;
  const selectedIndex = columns.findIndex(column => column.id === selectedColumnId);
  const selectedColumn = selectedIndex >= 0 ? columns[selectedIndex] : columns[0];

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

        {selectedColumn && (
          <aside className="debit-editor-column-inspector">
            <div className="debit-editor-column-inspector__header">
              <span>Cột {selectedIndex + 1}</span>
              <strong>{selectedColumn.label || 'Chưa đặt tên'}</strong>
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

export default function DebitNoteTemplateEditorPage() {
  const navigate = useNavigate();
  const params = useParams();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const id = params.id === 'new' || !params.id ? null : Number(params.id);
  const isNew = id == null;
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState<DebitNoteTemplateInput>(() => blankTemplate());

  const backToList = () => navigate('/config/debit-note-templates');
  useBackShortcut(backToList);

  const { data: template, isLoading } = useQuery<DebitNoteTemplate>({
    queryKey: ['debit-note-template', id],
    queryFn: () => configClient.getDebitNoteTemplate(id as number),
    enabled: !isNew,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (template) setForm(toForm(template));
  }, [template]);

  const visibleColumns = useMemo(() => (form.columns ?? []).filter(column => column.width > 0), [form.columns]);
  const set = <K extends keyof DebitNoteTemplateInput>(key: K, value: DebitNoteTemplateInput[K]) => {
    setForm(previous => ({ ...previous, [key]: value }));
  };

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
      await queryClient.invalidateQueries({ queryKey: ['debit-note-template', saved.id] });
      toast({ kind: 'success', message: 'Đã lưu mẫu giấy báo nợ.' });
      if (isNew) navigate(`/config/debit-note-templates/${saved.id}`, { replace: true });
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

  const uploadLogo = async (file: File | undefined) => {
    if (!file || !id) return;
    setUploading(true);
    try {
      const data = new FormData();
      data.append('file', file);
      data.append('template_id', String(id));
      const result = await api.upload('/upload/debit-note-template-logo', data) as { storageKey: string };
      const next = { ...form, logoStorageKey: result.storageKey };
      setForm(next);
      await configClient.updateDebitNoteTemplate(id, next);
      await queryClient.invalidateQueries({ queryKey: qk.catalogs.debitNoteTemplates });
      toast({ kind: 'success', message: 'Đã tải logo.' });
    } catch (err) {
      toast({ kind: 'error', message: (err as Error).message || 'Không tải được logo.' });
    } finally {
      setUploading(false);
    }
  };

  const busy = saving || uploading || isLoading;

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
            <p className="billing-builder__eyebrow">{isNew ? 'Tạo mẫu mới' : 'Chỉnh sửa mẫu'}</p>
            <h1>{isNew ? 'Mẫu giấy báo nợ mới' : form.name || 'Mẫu giấy báo nợ'}</h1>
            <div className="billing-builder__meta">
              <span>{visibleColumns.length} cột đang hiện</span>
              <span>{form.orientation === 'landscape' ? 'Khổ ngang' : 'Khổ dọc'}</span>
              {form.isDefault && <span>Mẫu mặc định</span>}
            </div>
          </div>
        </div>
        <div className="debit-editor-topbar__actions">
          {!isNew && (
            <button type="button" className="btn btn--ghost" onClick={removeTemplate} disabled={busy}>
              <Trash2 size={16} /> Xoá
            </button>
          )}
          <button type="button" className="btn btn--primary" onClick={save} disabled={busy}>
            {saving ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
            Lưu mẫu
          </button>
        </div>
      </header>

      {isLoading ? (
        <main className="debit-editor-loading">
          <Loader2 size={28} className="spin" />
          <span>Đang tải mẫu</span>
        </main>
      ) : (
        <main className="debit-editor-workspace">
          <section className="debit-editor-main">
            <section className="debit-editor-settings">
              <Field label="Tên mẫu *">
                <textarea className="input debit-editor-inline-textarea debit-editor-settings-textarea" rows={1} value={form.name} onChange={event => set('name', event.target.value)} disabled={busy} />
              </Field>
              <Field label="Tiêu đề">
                <textarea className="input debit-editor-inline-textarea debit-editor-settings-textarea" rows={1} value={form.titleText} onChange={event => set('titleText', event.target.value)} disabled={busy} />
              </Field>
              <Field label="Hướng giấy">
                <select className="input debit-editor-inline-select debit-editor-settings-select" value={form.orientation} onChange={event => set('orientation', event.target.value as DebitNoteTemplateInput['orientation'])} disabled={busy}>
                  <option value="landscape">Ngang</option>
                  <option value="portrait">Dọc</option>
                </select>
              </Field>
              <Field label="Màu nhấn">
                <div className="debit-editor-color">
                  <input type="color" value={form.accentColor} onChange={event => set('accentColor', event.target.value)} disabled={busy} />
                  <textarea className="input mono debit-editor-inline-textarea debit-editor-settings-textarea" rows={1} value={form.accentColor} onChange={event => set('accentColor', event.target.value)} disabled={busy} />
                </div>
              </Field>
              <label className="debit-editor-check">
                <input type="checkbox" checked={form.isDefault} onChange={event => set('isDefault', event.target.checked)} disabled={busy} />
                <Star size={15} />
                <span>Mẫu mặc định</span>
              </label>
            </section>

            <section className="debit-editor-settings debit-editor-settings--issuer">
              <Field label="Tên công ty">
                <input className="input debit-editor-inline-input" value={form.issuerName ?? ''} onChange={event => set('issuerName', event.target.value || null)} disabled={busy} />
              </Field>
              <Field label="Mã số thuế">
                <input className="input debit-editor-inline-input" value={form.issuerTaxCode ?? ''} onChange={event => set('issuerTaxCode', event.target.value || null)} disabled={busy} />
              </Field>
              <Field label="Địa chỉ">
                <input className="input debit-editor-inline-input" value={form.issuerAddress ?? ''} onChange={event => set('issuerAddress', event.target.value || null)} disabled={busy} />
              </Field>
              <Field label="Logo">
                <div className="debit-editor-logo">
                  {form.logoStorageKey && <img src={`/api/photos/${encodeURIComponent(form.logoStorageKey)}`} alt="logo" />}
                  {id ? (
                    <label className="btn btn--ghost">
                      {uploading ? <Loader2 size={15} className="spin" /> : <Upload size={15} />}
                      {form.logoStorageKey ? 'Đổi logo' : 'Tải logo'}
                      <input type="file" accept="image/*" onChange={event => uploadLogo(event.target.files?.[0])} disabled={busy} />
                    </label>
                  ) : (
                    <span>Lưu mẫu trước</span>
                  )}
                </div>
              </Field>
            </section>

            <ColumnTable
              columns={form.columns ?? []}
              accentColor={form.accentColor}
              disabled={busy}
              onChange={columns => set('columns', columns)}
            />

            <section className="debit-editor-settings debit-editor-settings--footer">
              <Field label="Nhóm dòng">
                <select className="input debit-editor-inline-select debit-editor-settings-select" value={form.groupingMode} onChange={event => set('groupingMode', event.target.value as DebitNoteTemplateInput['groupingMode'])} disabled={busy}>
                  <option value="ROUTE">Theo tuyến</option>
                  <option value="LINE_TYPE">Theo loại dòng</option>
                  <option value="NONE">Không nhóm</option>
                </select>
              </Field>
              <Field label="Chữ ký trái">
                <textarea className="input debit-editor-inline-textarea debit-editor-settings-textarea" rows={1} value={form.signatureLeftLabel ?? ''} onChange={event => set('signatureLeftLabel', event.target.value || null)} disabled={busy} />
              </Field>
              <Field label="Chữ ký phải">
                <textarea className="input debit-editor-inline-textarea debit-editor-settings-textarea" rows={1} value={form.signatureRightLabel ?? ''} onChange={event => set('signatureRightLabel', event.target.value || null)} disabled={busy} />
              </Field>
              <Field label="Điều khoản">
                <textarea className="input debit-editor-small-textarea" rows={3} value={form.termsText ?? ''} onChange={event => set('termsText', event.target.value || null)} disabled={busy} />
              </Field>
            </section>
          </section>

          <TemplatePreview form={form} />
        </main>
      )}

      {confirmDialog}
    </div>
  );
}
