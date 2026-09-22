import type { Dispatch, SetStateAction } from 'react';
import { FORWARDER_EXPENSE_TYPE_DEFAULTS } from '@tingting/shared';
import { FormGroup } from '../../components/UI';
import { containerDisplayName, type ForwarderExpenseContainer } from './forwarderContainerLabel';

export interface ExpenseFormState {
  expenseType: string;
  buyAmount: string;
  sellAmount: string;
  settlementMethod: 'FORWARDER_ADVANCE' | 'COMPANY_DIRECT';
  supplierId: string;
  tripContainerId: string;
  invoiceNumber: string;
  invoiceDate: string;
  declarationNumber: string;
  note: string;
}

export interface ExpenseFormErrors {
  buyAmount?: string;
  declarationNumber?: string;
  supplierId?: string;
}

interface ForwarderExpenseFormProps {
  form: ExpenseFormState;
  setForm: Dispatch<SetStateAction<ExpenseFormState>>;
  errors: ExpenseFormErrors;
  setErrors: Dispatch<SetStateAction<ExpenseFormErrors>>;
  submitError: string | null;
  supplierOptions: ReadonlyArray<{ id: number; name: string }>;
  containers: ForwarderExpenseContainer[];
  selectedContainer?: ForwarderExpenseContainer;
  editing: boolean;
  saving: boolean;
  onTypeChange: (newType: string) => void;
  onBuyAmountChange: (val: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export function ForwarderExpenseForm({
  form,
  setForm,
  errors,
  setErrors,
  submitError,
  supplierOptions,
  containers,
  selectedContainer,
  editing,
  saving,
  onTypeChange,
  onBuyAmountChange,
  onSubmit,
  onCancel,
}: ForwarderExpenseFormProps) {
  return (
        <div className="fwd-expense-form">
          {/* Row 1: type + amounts + settlement */}
          <div className="fwd-expense-grid fwd-expense-grid--primary">
            <FormGroup label="Loại chi phí">
              <select
                className="input"
                value={form.expenseType}
                onChange={e => onTypeChange(e.target.value)}
              >
                {Object.entries(FORWARDER_EXPENSE_TYPE_DEFAULTS).map(([code, cfg]) => (
                  <option key={code} value={code}>{cfg.name}</option>
                ))}
              </select>
            </FormGroup>

            <FormGroup
              label="Giá mua vào (VNĐ) *"
            >
              <input
                className={`input${errors.buyAmount ? ' input--error' : ''}`}
                type="number"
                value={form.buyAmount}
                onChange={e => onBuyAmountChange(e.target.value)}
                placeholder="0"
                min="1"
              />
              {errors.buyAmount && (
                <span style={{ fontSize: 'var(--fs-caption)', lineHeight: 1.35, color: 'var(--danger)', display: 'block', marginTop: 2 }}>
                  {errors.buyAmount}
                </span>
              )}
            </FormGroup>

            <FormGroup
              label="Giá bán ra (VNĐ)"
            >
              <input
                className="input"
                type="number"
                value={form.sellAmount}
                onChange={e => setForm(f => ({ ...f, sellAmount: e.target.value }))}
                placeholder="0"
                min="0"
                readOnly={!FORWARDER_EXPENSE_TYPE_DEFAULTS[form.expenseType]?.defaultMarkup}
                style={
                  !FORWARDER_EXPENSE_TYPE_DEFAULTS[form.expenseType]?.defaultMarkup
                    ? { background: 'var(--bg-3)', color: 'var(--fg-3)' }
                    : undefined
                }
              />
            </FormGroup>

            <FormGroup label="Hình thức chi">
              <select
                className="input"
                value={form.settlementMethod}
                onChange={e => {
                  const v = e.target.value as 'FORWARDER_ADVANCE' | 'COMPANY_DIRECT';
                  setForm(f => ({ ...f, settlementMethod: v, supplierId: v === 'FORWARDER_ADVANCE' ? '' : f.supplierId }));
                  if (errors.supplierId) setErrors(e => ({ ...e, supplierId: undefined }));
                }}
              >
                <option value="FORWARDER_ADVANCE">Chi hộ tạm ứng</option>
                <option value="COMPANY_DIRECT">Công ty trả trực tiếp</option>
              </select>
            </FormGroup>
          </div>

          {/* Row 2: supplier (when company-direct) + container number */}
          <div className="fwd-expense-grid fwd-expense-grid--context">
            {form.settlementMethod === 'COMPANY_DIRECT' && (
              <FormGroup label="Nhà cung cấp *">
                <select
                  className={`input${errors.supplierId ? ' input--error' : ''}`}
                  value={form.supplierId}
                  onChange={e => {
                    setForm(f => ({ ...f, supplierId: e.target.value }));
                    if (errors.supplierId) setErrors(err => ({ ...err, supplierId: undefined }));
                  }}
                >
                  <option value="">-- Chọn NCC --</option>
                  {supplierOptions.map(s => (
                    <option key={s.id} value={String(s.id)}>{s.name}</option>
                  ))}
                </select>
                {errors.supplierId && (
                  <span style={{ fontSize: 'var(--fs-caption)', lineHeight: 1.35, color: 'var(--danger)', display: 'block', marginTop: 2 }}>
                    {errors.supplierId}
                  </span>
                )}
              </FormGroup>
            )}

            {containers.length === 0 && (
              <div className="fwd-expense-empty-container">
                Chưa có container; chi phí này sẽ lưu như chi phí chung của chuyến.
              </div>
            )}

            {containers.length === 1 && selectedContainer && (
              <FormGroup label="Container áp dụng">
                <div
                  className="input"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                    background: 'var(--brand-subtle, rgba(0,177,79,0.08))',
                    borderColor: 'rgba(0, 107, 63, 0.22)',
                  }}
                >
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{containerDisplayName(selectedContainer)}</span>
                  {selectedContainer.sealNumber && (
                    <span style={{ color: 'var(--fg-3)', fontSize: 'var(--fs-body)' }}>Seal {selectedContainer.sealNumber}</span>
                  )}
                </div>
              </FormGroup>
            )}

            {containers.length > 1 && (
              <FormGroup label="Container áp dụng">
                <select
                  className="input"
                  value={form.tripContainerId}
                  onChange={e => setForm(f => ({ ...f, tripContainerId: e.target.value }))}
                >
                  <option value="">Chi phí chung của chuyến</option>
                  {containers.map(c => (
                    <option key={c.id} value={String(c.id)}>
                      {containerDisplayName(c)}{c.sealNumber ? ` · Seal ${c.sealNumber}` : ''}
                    </option>
                  ))}
                </select>
                <span style={{ fontSize: 'var(--fs-caption)', lineHeight: 1.35, color: 'var(--fg-3)', display: 'block', marginTop: 4 }}>
                  Chọn container từ danh sách đã nhập, không cần gõ lại số container.
                </span>
              </FormGroup>
            )}
          </div>

          {/* Row 3: invoice + declaration + note */}
          <div className="fwd-expense-grid fwd-expense-grid--invoice">
            {form.expenseType !== 'INFRASTRUCTURE' && (
              <>
                <FormGroup label="Số hóa đơn">
                  <input
                    className="input"
                    value={form.invoiceNumber}
                    onChange={e => setForm(f => ({ ...f, invoiceNumber: e.target.value }))}
                    placeholder="Số hóa đơn"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  />
                </FormGroup>
                <FormGroup label="Ngày hóa đơn">
                  <input
                    className="input"
                    type="date"
                    value={form.invoiceDate}
                    onChange={e => setForm(f => ({ ...f, invoiceDate: e.target.value }))}
                  />
                </FormGroup>
              </>
            )}

            {form.expenseType === 'CUSTOMS' && (
              <FormGroup label="Số tờ khai hải quan *">
                <input
                  className={`input${errors.declarationNumber ? ' input--error' : ''}`}
                  value={form.declarationNumber}
                  onChange={e => {
                    setForm(f => ({ ...f, declarationNumber: e.target.value }));
                    if (errors.declarationNumber) setErrors(err => ({ ...err, declarationNumber: undefined }));
                  }}
                  placeholder="Số tờ khai"
                  style={{ fontFamily: 'var(--font-mono)' }}
                />
                {errors.declarationNumber && (
                  <span style={{ fontSize: 'var(--fs-caption)', lineHeight: 1.35, color: 'var(--danger)', display: 'block', marginTop: 2 }}>
                    {errors.declarationNumber}
                  </span>
                )}
              </FormGroup>
            )}

            <FormGroup label="Ghi chú">
              <input
                className="input"
                value={form.note}
                onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                placeholder="Ghi chú (tuỳ chọn)"
              />
            </FormGroup>
          </div>

          {submitError && (
            <div
              className="animate-shake"
              role="alert"
              style={{ marginBottom: 10, padding: '9px 12px', borderRadius: 6, background: 'var(--danger-soft)', color: 'var(--danger-text)', fontSize: 'var(--fs-body)' }}
            >
              {submitError}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button
              className="btn btn--ghost btn--sm"
              onClick={onCancel}
              disabled={saving}
            >
              Hủy
            </button>
            <button
              className="btn btn--primary btn--sm"
              onClick={onSubmit}
              disabled={saving}
            >
              {saving ? 'Đang lưu…' : editing ? 'Lưu điều chỉnh' : 'Lưu chi phí'}
            </button>
          </div>
        </div>
  );
}
