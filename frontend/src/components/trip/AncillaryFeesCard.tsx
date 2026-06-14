import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Plus, Check, X } from 'lucide-react';
import { FORWARDER_EXPENSE_TYPE_DEFAULTS, ANCILLARY_EXPENSE_TYPES, FINANCIAL_ROLES } from '@tingting/shared';
import type { AncillaryExpenseType } from '@tingting/shared';
import type { TripExpense } from '@tingting/shared';
import { tripClient } from '../../api/tripClient';
import { formatCurrency, formatNumber } from '../../lib/format';
import { useAuth } from '../../hooks/useAuth';
import { useCatalogs } from '../../hooks/useCatalogs';
import type { CatalogData } from '../../hooks/useCatalogs';
import { InputWithPrefix } from './InputWithPrefix';
import { StatusPill, useConfirm } from '../UI';
import { qk } from '../../api/keys';

function AncillaryEmptyState() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 24px', gap: 12, textAlign: 'center' }}>
      <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <rect x="5" y="3" width="18" height="22" rx="2.5" stroke="#16a34a" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          <line x1="9" y1="10" x2="19" y2="10" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="9" y1="15" x2="19" y2="15" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="9" y1="20" x2="15" y2="20" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round"/>
          <circle cx="22" cy="23" r="6" fill="#dcfce7" stroke="#16a34a" strokeWidth="1.5"/>
          <line x1="22" y1="20" x2="22" y2="26" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="19" y1="23" x2="25" y2="23" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </div>
      <div style={{ fontSize: 15, fontWeight: 600, color: '#14532d' }}>Chưa có chi phí dịch vụ</div>
      <div style={{ fontSize: 13, color: '#4b7a5a', maxWidth: 320, lineHeight: 1.5 }}>
        Thêm phí nâng/hạ, hải quan, cân hàng… để theo dõi lãi dịch vụ cho chuyến này.
      </div>
    </div>
  );
}

interface AncillaryFeesCardProps {
  tripId: number;
  readOnly?: boolean;
  hideAddButton?: boolean;
}

const EXPENSE_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  Object.entries(FORWARDER_EXPENSE_TYPE_DEFAULTS).map(([k, v]) => [k, v.name])
);

function feeTypeLabel(code: string): string {
  return EXPENSE_TYPE_LABELS[code] ?? code;
}

// Single source of truth for the markup formula. Changing the multiplier
// (e.g. to 1.18) or per-type override only requires editing this one helper —
// previously the same `Math.round(buy * 1.2)` lived in 3 places including
// the prefill-detection check, which silently produced wrong auto-suggestions
// when the formula drifted out of sync.
const MARKUP_MULTIPLIER = 1.2;
function suggestedSellFor(buyNum: number, hasMarkup: boolean): string {
  if (!hasMarkup) return String(buyNum);
  if (!buyNum) return '';
  return String(Math.round(buyNum * MARKUP_MULTIPLIER));
}

function resolveMarkupConfig(
  catalogTypes: CatalogData['forwarderExpenseTypes'] | undefined,
  code: string,
): boolean {
  const fromCatalog = catalogTypes?.find(t => t.code === code)?.defaultMarkup;
  return fromCatalog ?? (FORWARDER_EXPENSE_TYPE_DEFAULTS[code]?.defaultMarkup ?? false);
}

const EMPTY_FORM = {
  expenseType: 'LIFTING' as AncillaryExpenseType,
  buyAmount: '',
  sellAmount: '',
  settlementMethod: 'FORWARDER_ADVANCE' as 'COMPANY_DIRECT' | 'FORWARDER_ADVANCE',
  supplierId: '',
  containerNumber: '',
  invoiceNumber: '',
  invoiceDate: '',
  declarationNumber: '',
  note: '',
};

export function AncillaryFeesCard({ tripId, readOnly = false, hideAddButton = false }: AncillaryFeesCardProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: catalogData } = useCatalogs();
  const { confirm, dialog: confirmDialog } = useConfirm();

  const canApprove = !!user?.role && (FINANCIAL_ROLES as readonly string[]).includes(user.role);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  // Per-row in-flight flag — disables the buttons while a request is pending
  // so a double click can't fire approve + reject on the same row.
  const [pendingId, setPendingId] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: qk.tripForm.tripExpenses(tripId),
    queryFn: async () => {
      const res = await tripClient.listTripExpenses(tripId);
      return res.items ?? [];
    },
    enabled: !!tripId,
  });

  const expenses: (TripExpense & { supplierName?: string | null })[] = data ?? [];

  const handleExpenseTypeChange = (newType: string) => {
    const hasMarkup = resolveMarkupConfig(catalogData?.forwarderExpenseTypes, newType);

    setForm(f => {
      const buyNum = Number(f.buyAmount);
      return {
        ...f,
        expenseType: newType as AncillaryExpenseType,
        sellAmount: suggestedSellFor(buyNum, hasMarkup),
      };
    });
  };

  const handleBuyAmountChange = (val: string) => {
    const hasMarkup = resolveMarkupConfig(catalogData?.forwarderExpenseTypes, form.expenseType);

    setForm(f => {
      const buyNum = Number(val);
      const oldBuyNum = Number(f.buyAmount);
      const oldPrefill = suggestedSellFor(oldBuyNum, hasMarkup);
      // Auto-suggest only if sell amount matches the old prefill or is empty
      // — preserves any value the user typed manually.
      const isPrefilledOrEmpty = !f.sellAmount
        || Number(f.sellAmount) === Number(oldPrefill)
        || Number(f.sellAmount) === oldBuyNum;
      const newSell = isPrefilledOrEmpty
        ? suggestedSellFor(buyNum, hasMarkup)
        : f.sellAmount;
      return {
        ...f,
        buyAmount: val,
        sellAmount: newSell,
      };
    });
  };

  const handleAdd = async () => {
    setFormError('');
    if (!form.buyAmount || Number(form.buyAmount) <= 0) {
      setFormError('Vui lòng nhập số tiền mua vào hợp lệ.');
      return;
    }
    if (form.expenseType === 'CUSTOMS' && !form.declarationNumber.trim()) {
      setFormError('Số tờ khai là bắt buộc cho phí hải quan.');
      return;
    }
    if (form.settlementMethod === 'COMPANY_DIRECT' && !form.supplierId) {
      setFormError('Vui lòng chọn nhà cung cấp khi công ty trả trực tiếp.');
      return;
    }
    setSubmitting(true);
    try {
      await tripClient.createTripExpense(tripId, {
        expenseType: form.expenseType,
        buyAmount: Number(form.buyAmount),
        sellAmount: form.sellAmount ? Number(form.sellAmount) : 0,
        settlementMethod: form.settlementMethod,
        supplierId: form.settlementMethod === 'COMPANY_DIRECT' && form.supplierId ? Number(form.supplierId) : undefined,
        containerNumber: form.containerNumber.trim() || undefined,
        invoiceNumber: form.invoiceNumber.trim() || undefined,
        invoiceDate: form.invoiceDate || undefined,
        declarationNumber: form.declarationNumber.trim() || undefined,
        note: form.note.trim() || undefined,
      });
      await queryClient.invalidateQueries({ queryKey: qk.tripForm.tripExpenses(tripId) });
      setForm(EMPTY_FORM);
      setShowForm(false);
    } catch (e: unknown) {
      setFormError((e as Error).message || 'Lỗi khi thêm phí.');
    } finally {
      setSubmitting(false);
    }
  };

  // Wraps an approve/reject call with a confirm dialog. Returns true if the
  // user confirmed AND the action succeeded; false otherwise. Single entry
  // point so the message format stays consistent.
  const confirmAndRun = async (fee: TripExpense, action: 'approve' | 'reject') => {
    const label = feeTypeLabel(fee.expenseType);
    const amount = formatCurrency(Number(fee.buyAmount));
    const message = action === 'approve'
      ? `Duyệt khoản phí "${label}" (${amount})?`
      : `Từ chối khoản phí "${label}" (${amount})?`;
    const options = action === 'reject'
      ? { variant: 'danger' as const, confirmLabel: 'Từ chối' }
      : { confirmLabel: 'Duyệt' };
    const ok = await confirm(message, options);
    if (!ok) return false;
    setPendingId(fee.id);
    try {
      if (action === 'approve') {
        await tripClient.approveTripExpense(tripId, fee.id);
      } else {
        await tripClient.rejectTripExpense(tripId, fee.id);
      }
      await queryClient.invalidateQueries({ queryKey: qk.tripForm.tripExpenses(tripId) });
      await queryClient.invalidateQueries({ queryKey: qk.trips.tripDetail(tripId) });
      return true;
    } catch {
      // silently ignore — toast wiring lives outside this card
      return false;
    } finally {
      setPendingId(null);
    }
  };

  const totalBuy = expenses.reduce((s, e) => s + Number(e.buyAmount), 0);
  const totalSell = expenses.reduce((s, e) => s + Number(e.sellAmount), 0);
  const totalMargin = totalSell - totalBuy;

  const hasMarkup = resolveMarkupConfig(catalogData?.forwarderExpenseTypes, form.expenseType);

  const buyVal = Number(form.buyAmount) || 0;
  const sellVal = Number(form.sellAmount) || 0;
  const liveMargin = sellVal - buyVal;

  return (
    <div>
      {isLoading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--fg-3)', fontSize: 13 }}>
          <Loader2 size={14} className="spin" /> Đang tải chi phí…
        </div>
      ) : (
        <>
          {expenses.length > 0 ? (
            <>
              {/* ── Desktop / Tablet: classic table ────────────────────────── */}
              <div className="table-scroll ancillary-fees__scroll ancillary-fees__desktop" style={{ marginBottom: 12 }}>
                <table className="ancillary-fees__table">
                  <thead>
                    <tr>
                      <th>Loại phí</th>
                      <th className="num" style={{ color: 'var(--ink-3)' }}>Mua vào</th>
                      <th className="num" style={{ color: 'var(--ink-3)' }}>Bán ra</th>
                      <th className="num" style={{ fontWeight: 700, color: 'var(--ink)' }}>Lãi DV</th>
                      <th>Nhà CC</th>
                      <th>Chứng từ</th>
                      <th>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map((fee, i) => {
                      const buy = Number(fee.buyAmount);
                      const sell = Number(fee.sellAmount);
                      const margin = sell - buy;
                      const canDecide = canApprove && fee.approvalStatus === 'PENDING';
                      const isBusy = pendingId === fee.id;
                      return (
                        <tr key={fee.id ?? i}>
                          <td>
                            <div style={{ lineHeight: 1.25 }}>
                              <div>{feeTypeLabel(fee.expenseType)}</div>
                              <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginTop: 2, flexWrap: 'wrap' }}>
                                <span style={{ fontSize: 11, color: 'var(--ink-3)', background: 'var(--surface-2)', padding: '2px 4px', borderRadius: 4 }}>
                                  {fee.settlementMethod === 'COMPANY_DIRECT' ? 'Cty trả' : 'Tạm ứng'}
                                </span>
                                {fee.containerNumber && (
                                  <span style={{ fontSize: 11, color: 'var(--ink-3)' }} className="mono">
                                    {fee.containerNumber}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="num" style={{ color: 'var(--ink-2)' }}>
                            {buy > 0 ? formatCurrency(buy) : ''}
                          </td>
                          <td className="num" style={{ color: 'var(--ink-2)' }}>
                            {sell > 0 ? formatCurrency(sell) : ''}
                          </td>
                          <td
                            className="num"
                            style={{
                              color: margin > 0 ? 'var(--success)' : margin < 0 ? 'var(--danger)' : 'var(--ink-3)',
                              fontWeight: 700,
                            }}
                          >
                            {margin !== 0 ? `${formatCurrency(margin)} ${margin > 0 ? '↑' : '↓'}` : ''}
                          </td>
                          <td style={{ fontSize: 12, maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={fee.supplierName || ''}>
                            {fee.supplierName ?? ''}
                          </td>
                          <td
                            style={{ fontSize: 12, color: 'var(--ink-3)', whiteSpace: 'nowrap', maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis' }}
                            title={[fee.invoiceNumber && `HĐ ${fee.invoiceNumber}`, fee.invoiceDate && `Ngày ${fee.invoiceDate}`, fee.declarationNumber && `TK ${fee.declarationNumber}`].filter(Boolean).join(' · ') || undefined}
                          >
                            {fee.invoiceNumber || fee.declarationNumber ? (
                              <>
                                <span style={{ color: 'var(--ink)' }}>{fee.invoiceNumber ?? fee.declarationNumber}</span>
                                {fee.invoiceDate && <span style={{ marginLeft: 4, fontSize: 11 }}>· {fee.invoiceDate.slice(5)}</span>}
                              </>
                            ) : ''}
                          </td>
                          <td>
                            <div className="fee-decision-cell">
                              {fee.approvalStatus === 'APPROVED' ? (
                                <span title="Đã duyệt"><StatusPill variant="success">Duyệt</StatusPill></span>
                              ) : fee.approvalStatus === 'REJECTED' ? (
                                <span title="Từ chối"><StatusPill variant="danger">Từ chối</StatusPill></span>
                              ) : (
                                <span title="Chờ duyệt"><StatusPill variant="neutral">Chờ</StatusPill></span>
                              )}
                              {canDecide && !readOnly && (
                                <div className="fee-decision-cell__actions">
                                  <button
                                    type="button"
                                    className="fee-decision-cell__btn fee-decision-cell__btn--approve"
                                    onClick={() => confirmAndRun(fee, 'approve')}
                                    disabled={isBusy}
                                    title="Duyệt khoản phí này"
                                    aria-label="Duyệt"
                                  >
                                    {isBusy ? <Loader2 size={13} className="spin" /> : <Check size={13} strokeWidth={2.6} />}
                                  </button>
                                  <button
                                    type="button"
                                    className="fee-decision-cell__btn fee-decision-cell__btn--reject"
                                    onClick={() => confirmAndRun(fee, 'reject')}
                                    disabled={isBusy}
                                    title="Từ chối khoản phí này"
                                    aria-label="Từ chối"
                                  >
                                    {isBusy ? <Loader2 size={13} className="spin" /> : <X size={13} strokeWidth={2.6} />}
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {!readOnly && !hideAddButton && !showForm && (
                      <tr
                        className="ancillary-fees__add-row"
                        onClick={() => { setForm(EMPTY_FORM); setFormError(''); setShowForm(true); }}
                      >
                        <td colSpan={7}>
                          <Plus size={13} /> Thêm phí
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={1}>Tổng</td>
                      <td className="num">{formatNumber(totalBuy)}</td>
                      <td className="num">{formatNumber(totalSell)}</td>
                      <td
                        className="num"
                        style={{ color: totalMargin >= 0 ? 'var(--success)' : 'var(--danger)' }}
                      >
                        {formatNumber(totalMargin)}
                      </td>
                      <td colSpan={3}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* ── Mobile: card-based layout ──────────────────────────────── */}
              <div className="ancillary-fees__mobile" style={{ marginBottom: 12 }}>
                <div className="ancillary-fees__cards">
                  {expenses.map((fee, i) => {
                    const buy = Number(fee.buyAmount);
                    const sell = Number(fee.sellAmount);
                    const margin = sell - buy;
                    const canDecide = canApprove && fee.approvalStatus === 'PENDING';
                    const isBusy = pendingId === fee.id;
                    return (
                      <div className="ancillary-fee-card" key={fee.id ?? i}>
                        <div className="ancillary-fee-card__head">
                          <div className="ancillary-fee-card__name">
                            <span>{feeTypeLabel(fee.expenseType)}</span>
                            <span className="ancillary-fee-card__badge">
                              {fee.settlementMethod === 'COMPANY_DIRECT' ? 'Cty trả' : 'Tạm ứng'}
                            </span>
                          </div>
                          <div className="ancillary-fee-card__status">
                            {fee.approvalStatus === 'APPROVED' ? (
                              <StatusPill variant="success">Duyệt</StatusPill>
                            ) : fee.approvalStatus === 'REJECTED' ? (
                              <StatusPill variant="danger">Từ chối</StatusPill>
                            ) : (
                              <StatusPill variant="neutral">Chờ duyệt</StatusPill>
                            )}
                          </div>
                        </div>

                        <div className="ancillary-fee-card__amounts">
                          <div className="ancillary-fee-card__amount">
                            <span className="ancillary-fee-card__label">Mua vào</span>
                            <span className="ancillary-fee-card__value mono">{buy > 0 ? formatCurrency(buy) : '—'}</span>
                          </div>
                          <div className="ancillary-fee-card__amount">
                            <span className="ancillary-fee-card__label">Bán ra</span>
                            <span className="ancillary-fee-card__value mono">{sell > 0 ? formatCurrency(sell) : '—'}</span>
                          </div>
                          <div className="ancillary-fee-card__amount">
                            <span className="ancillary-fee-card__label">Lãi DV</span>
                            <span
                              className="ancillary-fee-card__value ancillary-fee-card__value--margin mono"
                              style={{ color: margin > 0 ? 'var(--success)' : margin < 0 ? 'var(--danger)' : 'var(--ink-3)' }}
                            >
                              {margin !== 0 ? `${formatCurrency(margin)} ${margin > 0 ? '↑' : '↓'}` : '—'}
                            </span>
                          </div>
                        </div>

                        {(fee.containerNumber || fee.supplierName || fee.invoiceNumber || fee.declarationNumber) && (
                          <div className="ancillary-fee-card__meta">
                            {fee.containerNumber && <span className="mono">{fee.containerNumber}</span>}
                            {fee.supplierName && <span>{fee.supplierName}</span>}
                            {fee.invoiceNumber && <span>HĐ {fee.invoiceNumber}</span>}
                            {fee.declarationNumber && <span>TK {fee.declarationNumber}</span>}
                          </div>
                        )}

                        {canDecide && !readOnly && (
                          <div className="ancillary-fee-card__actions">
                            <button
                              type="button"
                              className="btn btn--sm ancillary-fee-card__btn ancillary-fee-card__btn--approve"
                              onClick={() => confirmAndRun(fee, 'approve')}
                              disabled={isBusy}
                            >
                              {isBusy ? <Loader2 size={13} className="spin" /> : <Check size={13} />}
                              Duyệt
                            </button>
                            <button
                              type="button"
                              className="btn btn--sm btn--ghost ancillary-fee-card__btn ancillary-fee-card__btn--reject"
                              onClick={() => confirmAndRun(fee, 'reject')}
                              disabled={isBusy}
                            >
                              {isBusy ? <Loader2 size={13} className="spin" /> : <X size={13} />}
                              Từ chối
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Mobile totals bar */}
                <div className="ancillary-fees__mobile-totals">
                  <span className="ancillary-fees__mobile-totals-label">Tổng</span>
                  <div className="ancillary-fees__mobile-totals-nums">
                    <div>
                      <span className="ancillary-fee-card__label">Mua</span>
                      <span className="mono">{formatNumber(totalBuy)}</span>
                    </div>
                    <div>
                      <span className="ancillary-fee-card__label">Bán</span>
                      <span className="mono">{formatNumber(totalSell)}</span>
                    </div>
                    <div>
                      <span className="ancillary-fee-card__label">Lãi</span>
                      <span className="mono" style={{ color: totalMargin >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 700 }}>
                        {formatNumber(totalMargin)}
                      </span>
                    </div>
                  </div>
                </div>

                {!readOnly && !hideAddButton && !showForm && (
                  <button
                    type="button"
                    className="ancillary-fees__mobile-add"
                    onClick={() => { setForm(EMPTY_FORM); setFormError(''); setShowForm(true); }}
                  >
                    <Plus size={14} /> Thêm phí
                  </button>
                )}
              </div>
            </>
          ) : (
            <AncillaryEmptyState />
          )}

          {!readOnly && showForm && (
            <div
              style={{
                padding: 14,
                border: '1px solid var(--border-1)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-3)',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-1)', marginBottom: 2 }}>
                Thêm chi phí dịch vụ
              </div>

              {formError && (
                <div style={{ padding: '6px 10px', background: 'var(--danger-soft)', color: 'var(--danger-text)', borderRadius: 6, fontSize: 12 }}>
                  {formError}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="field">
                  <label style={{ fontSize: 12 }}>Loại phí *</label>
                  <select
                    className="input"
                    value={form.expenseType}
                    onChange={(e) => handleExpenseTypeChange(e.target.value)}
                  >
                    {(catalogData?.forwarderExpenseTypes && catalogData.forwarderExpenseTypes.length > 0
                      ? catalogData.forwarderExpenseTypes
                      : ANCILLARY_EXPENSE_TYPES.map(t => ({ code: t, name: feeTypeLabel(t) }))
                    ).map(t => (
                      <option key={t.code} value={t.code}>{t.name}</option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label style={{ fontSize: 12 }}>Hình thức thanh toán</label>
                  <select
                    className="input"
                    value={form.settlementMethod}
                    onChange={(e) => setForm(f => ({ ...f, settlementMethod: e.target.value as 'COMPANY_DIRECT' | 'FORWARDER_ADVANCE', supplierId: '' }))}
                  >
                    <option value="FORWARDER_ADVANCE">Chi hộ tạm ứng</option>
                    <option value="COMPANY_DIRECT">Công ty trả trực tiếp</option>
                  </select>
                </div>

                {form.settlementMethod === 'COMPANY_DIRECT' && (
                  <div className="field" style={{ gridColumn: '1 / -1' }}>
                    <label style={{ fontSize: 12 }}>Nhà cung cấp *</label>
                    <select
                      className="input"
                      value={form.supplierId}
                      onChange={(e) => setForm(f => ({ ...f, supplierId: e.target.value }))}
                    >
                      <option value="">-- Chọn nhà cung cấp --</option>
                      {catalogData?.suppliers?.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="field">
                  <label style={{ fontSize: 12 }}>Mua vào *</label>
                  <InputWithPrefix
                    value={form.buyAmount}
                    onChange={handleBuyAmountChange}
                    placeholder="0"
                    prefix="đ"
                    mono
                    type="money"
                  />
                </div>

                <div className="field">
                  <label style={{ fontSize: 12 }}>
                    Bán ra {hasMarkup ? '' : '(= mua vào)'}
                  </label>
                  {hasMarkup ? (
                    <InputWithPrefix
                      value={form.sellAmount}
                      onChange={(val) => setForm(f => ({ ...f, sellAmount: val }))}
                      placeholder="0"
                      prefix="đ"
                      mono
                      type="money"
                    />
                  ) : (
                    <div style={{ position: 'relative' }}>
                      <input
                        className="input mono"
                        type="text"
                        value={form.buyAmount ? Number(form.buyAmount).toLocaleString('vi-VN') : '0'}
                        readOnly
                        disabled
                        style={{ background: 'var(--bg-2)', color: 'var(--fg-3)', cursor: 'not-allowed', paddingRight: 32 }}
                      />
                      <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: 'var(--fg-3)' }}>đ</span>
                    </div>
                  )}
                </div>

                <div className="field" style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', minHeight: 24 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: liveMargin >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                    Lãi DV gợi ý: <span className="mono">{formatCurrency(liveMargin)}</span>
                  </div>
                </div>

                <div className="field">
                  <label style={{ fontSize: 12 }}>Số hóa đơn</label>
                  <input
                    className="input mono"
                    type="text"
                    placeholder="VD: HD-001"
                    value={form.invoiceNumber}
                    onChange={(e) => setForm(f => ({ ...f, invoiceNumber: e.target.value }))}
                  />
                </div>

                <div className="field">
                  <label style={{ fontSize: 12 }}>Ngày hóa đơn</label>
                  <input
                    className="input mono"
                    type="date"
                    value={form.invoiceDate}
                    onChange={(e) => setForm(f => ({ ...f, invoiceDate: e.target.value }))}
                  />
                </div>

                <div className="field">
                  <label style={{ fontSize: 12 }}>Số công-te-nơ</label>
                  <input
                    className="input mono"
                    type="text"
                    placeholder="VD: HDMU1234567"
                    value={form.containerNumber}
                    onChange={(e) => setForm(f => ({ ...f, containerNumber: e.target.value.toUpperCase() }))}
                  />
                </div>

                {form.expenseType === 'CUSTOMS' && (
                  <div className="field">
                    <label style={{ fontSize: 12 }}>Số tờ khai hải quan *</label>
                    <input
                      className="input mono"
                      type="text"
                      placeholder="VD: TK-2024-001"
                      value={form.declarationNumber}
                      onChange={(e) => setForm(f => ({ ...f, declarationNumber: e.target.value }))}
                    />
                  </div>
                )}

                <div className="field" style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: 12 }}>Ghi chú</label>
                  <input
                    className="input"
                    type="text"
                    placeholder="Ghi chú thêm…"
                    value={form.note}
                    onChange={(e) => setForm(f => ({ ...f, note: e.target.value }))}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button
                  type="button"
                  className="btn btn--primary btn--sm"
                  disabled={submitting}
                  onClick={handleAdd}
                >
                  {submitting ? <Loader2 size={13} className="spin" /> : <Plus size={13} />}
                  Lưu phí
                </button>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  disabled={submitting}
                  onClick={() => { setShowForm(false); setFormError(''); }}
                >
                  Hủy
                </button>
              </div>
            </div>
          )}
        </>
      )}
      {confirmDialog}
    </div>
  );
}
