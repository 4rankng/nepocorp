import React from 'react';
import { AlertCircle, Check, Loader2, Lock, Plus } from 'lucide-react';
import { ANCILLARY_EXPENSE_TYPES } from '@tingting/shared';
import type { CatalogData } from '../../hooks/useCatalogs';
import { formatCurrency } from '../../lib/format';
import { Modal } from '../UI';
import { DateInput } from '../../design-system/forms/DateInput';
import { InputWithPrefix } from './InputWithPrefix';
import { EMPTY_FORM, feeTypeLabel } from './ancillary-fees-card-utils';
import './AncillaryFeeModal.css';

export type AncillaryFeeFormState = typeof EMPTY_FORM;

export interface AncillaryFeeModalProps {
  isOpen: boolean;
  isEditing: boolean;
  form: AncillaryFeeFormState;
  hasMarkup: boolean;
  submitting: boolean;
  formError: string;
  catalogTypes: CatalogData['forwarderExpenseTypes'] | undefined;
  onClose: () => void;
  onSubmit: () => void;
  onExpenseTypeChange: (newType: string) => void;
  onBuyAmountChange: (val: string) => void;
  onFieldChange: <K extends keyof AncillaryFeeFormState>(field: K, value: AncillaryFeeFormState[K]) => void;
}

export function AncillaryFeeModal({
  isOpen,
  isEditing,
  form,
  hasMarkup,
  submitting,
  formError,
  catalogTypes,
  onClose,
  onSubmit,
  onExpenseTypeChange,
  onBuyAmountChange,
  onFieldChange,
}: AncillaryFeeModalProps) {
  const buyNum = Number(form.buyAmount) || 0;
  const effectiveSell = hasMarkup ? (Number(form.sellAmount) || 0) : buyNum;
  const margin = effectiveSell - buyNum;
  const marginPct = buyNum > 0 ? Math.round((margin / buyNum) * 100) : 0;

  const isBuyInvalid = Boolean(formError) && (!form.buyAmount || buyNum <= 0);
  const isDeclarationInvalid = Boolean(formError) && form.expenseType === 'CUSTOMS' && !form.declarationNumber.trim();

  const expenseTypeOptions =
    catalogTypes && catalogTypes.length > 0
      ? catalogTypes
      : ANCILLARY_EXPENSE_TYPES.map((t) => ({ code: t, name: feeTypeLabel(t) }));

  return (
    <Modal
      isOpen={isOpen}
      title={isEditing ? 'Sửa dịch vụ đi kèm' : 'Thêm dịch vụ đi kèm'}
      onClose={onClose}
      onConfirm={onSubmit}
      maxWidth={560}
      footer={
        <div className="ancillary-modal__footer">
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            disabled={submitting}
            onClick={onClose}
          >
            Hủy
          </button>
          <button
            type="button"
            className="btn btn--primary btn--sm"
            disabled={submitting}
            onClick={onSubmit}
          >
            {submitting ? (
              <Loader2 size={14} className="spin" />
            ) : isEditing ? (
              <Check size={14} />
            ) : (
              <Plus size={14} />
            )}
            {isEditing ? 'Lưu thay đổi' : 'Thêm phí'}
          </button>
        </div>
      }
    >
      <div className="ancillary-modal">
        {formError && (
          <div className="ancillary-modal__error" role="alert">
            <AlertCircle size={15} aria-hidden="true" />
            <span>{formError}</span>
          </div>
        )}

        {/* ── Fee Type (full width) ─────────────────────────────────────── */}
        <div className="field">
          <div className="ancillary-modal__label-row">
            <label htmlFor="ancillary-expense-type" className="ancillary-modal__label">
              Loại phí *
            </label>
            {!hasMarkup && (
              <span className="ancillary-modal__badge">
                <Lock size={11} aria-hidden="true" />
                Thu hộ đúng giá gốc
              </span>
            )}
          </div>
          <select
            id="ancillary-expense-type"
            className="input"
            value={form.expenseType}
            onChange={(e) => onExpenseTypeChange(e.target.value)}
          >
            {expenseTypeOptions.map((t) => (
              <option key={t.code} value={t.code}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        {/* ── Pricing Block (paired amounts + live summary) ─────────────── */}
        <div className="ancillary-modal__pricing">
          <div className="ancillary-modal__grid">
            <div className={`field${isBuyInvalid ? ' ancillary-modal__field-invalid' : ''}`}>
              <label htmlFor="ancillary-buy-amount" className="ancillary-modal__label">
                Số tiền gốc *
              </label>
              <InputWithPrefix
                id="ancillary-buy-amount"
                value={form.buyAmount}
                onChange={onBuyAmountChange}
                placeholder="0"
                prefix="₫"
                mono
                type="money"
              />
            </div>

            <div className="field">
              <div className="ancillary-modal__label-row">
                <label htmlFor="ancillary-sell-amount" className="ancillary-modal__label">
                  Báo khách
                </label>
                {!hasMarkup && (
                  <span className="ancillary-modal__hint">= Số tiền gốc</span>
                )}
              </div>
              {hasMarkup ? (
                <InputWithPrefix
                  id="ancillary-sell-amount"
                  value={form.sellAmount}
                  onChange={(val) => onFieldChange('sellAmount', val)}
                  placeholder="0"
                  prefix="₫"
                  mono
                  type="money"
                />
              ) : (
                <div className="ancillary-modal__readonly-wrap">
                  <input
                    id="ancillary-sell-amount"
                    className="input mono ancillary-modal__readonly-input"
                    type="text"
                    value={form.buyAmount ? Number(form.buyAmount).toLocaleString('vi-VN') : '0'}
                    readOnly
                    disabled
                  />
                  <span className="ancillary-modal__readonly-suffix">₫</span>
                </div>
              )}
            </div>
          </div>

          <div className="ancillary-modal__summary">
            <div className="ancillary-modal__margin">
              {hasMarkup && buyNum > 0 ? (
                <>
                  <span>Chênh lệch:</span>
                  <span
                    className={`ancillary-modal__margin-pill mono ${
                      margin > 0
                        ? 'ancillary-modal__margin-pill--positive'
                        : margin < 0
                          ? 'ancillary-modal__margin-pill--negative'
                          : 'ancillary-modal__margin-pill--neutral'
                    }`}
                  >
                    {margin > 0 ? '+' : ''}
                    {formatCurrency(margin)}
                    {margin !== 0 ? ` (${margin > 0 ? '+' : ''}${marginPct}%)` : ''}
                  </span>
                </>
              ) : (
                <span>{hasMarkup ? 'Nhập số tiền gốc để tính chênh lệch' : 'Báo nợ bằng số tiền gốc'}</span>
              )}
            </div>

            <div className="ancillary-modal__debit">
              <span className="ancillary-modal__debit-label">Báo nợ</span>
              <span className="ancillary-modal__debit-value mono">{formatCurrency(effectiveSell)}</span>
            </div>
          </div>
        </div>

        {/* ── Documents & Tracking ──────────────────────────────────────── */}
        <div className="ancillary-modal__section">
          <div className="ancillary-modal__section-head">Chứng từ &amp; Theo dõi</div>

          <div className="ancillary-modal__grid">
            <div className="field">
              <label htmlFor="ancillary-invoice-number" className="ancillary-modal__label">
                Số hóa đơn
              </label>
              <input
                id="ancillary-invoice-number"
                className="input mono"
                type="text"
                placeholder="VD: HD-001"
                value={form.invoiceNumber}
                onChange={(e) => onFieldChange('invoiceNumber', e.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="ancillary-invoice-date" className="ancillary-modal__label">
                Ngày hóa đơn
              </label>
              <DateInput
                id="ancillary-invoice-date"
                label="Ngày hóa đơn"
                value={form.invoiceDate}
                onChange={(iso) => onFieldChange('invoiceDate', iso)}
              />
            </div>

            <div className={`field${form.expenseType !== 'CUSTOMS' ? ' ancillary-modal__full' : ''}`}>
              <label htmlFor="ancillary-container-number" className="ancillary-modal__label">
                Số công-te-nơ
              </label>
              <input
                id="ancillary-container-number"
                className="input mono"
                type="text"
                placeholder="VD: HDMU1234567"
                value={form.containerNumber}
                onChange={(e) => onFieldChange('containerNumber', e.target.value.toUpperCase())}
              />
            </div>

            {form.expenseType === 'CUSTOMS' && (
              <div className={`field${isDeclarationInvalid ? ' ancillary-modal__field-invalid' : ''}`}>
                <label htmlFor="ancillary-declaration-number" className="ancillary-modal__label">
                  Số tờ khai hải quan *
                </label>
                <input
                  id="ancillary-declaration-number"
                  className="input mono"
                  type="text"
                  placeholder="VD: TK-2024-001"
                  aria-invalid={isDeclarationInvalid || undefined}
                  value={form.declarationNumber}
                  onChange={(e) => onFieldChange('declarationNumber', e.target.value)}
                />
              </div>
            )}

            <div className="field ancillary-modal__full">
              <label htmlFor="ancillary-note" className="ancillary-modal__label">
                Ghi chú
              </label>
              <input
                id="ancillary-note"
                className="input"
                type="text"
                placeholder="Ghi chú thêm…"
                value={form.note}
                onChange={(e) => onFieldChange('note', e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
