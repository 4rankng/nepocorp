import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { FORWARDER_EXPENSE_TYPE_DEFAULTS, ANCILLARY_EXPENSE_TYPES } from '@nepocorp/shared';
import type { AncillaryExpenseType } from '@nepocorp/shared';
import type { TripExpense } from '@nepocorp/shared';
import { tripClient } from '../../api/tripClient';
import { formatCurrency } from '../../lib/format';
import { useAuth } from '../../hooks/useAuth';
import { useCatalogs } from '../../hooks/useCatalogs';
import type { CatalogData } from '../../hooks/useCatalogs';
import { InputWithPrefix } from './InputWithPrefix';
import { StatusPill } from '../UI';

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
  
  const isManager = user?.role === 'MANAGER' || user?.role === 'ADMIN';
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['trip-expenses', tripId],
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
      await queryClient.invalidateQueries({ queryKey: ['trip-expenses', tripId] });
      setForm(EMPTY_FORM);
      setShowForm(false);
    } catch (e: any) {
      setFormError(e.message || 'Lỗi khi thêm phí.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (eid: number) => {
    try {
      await tripClient.deleteTripExpense(tripId, eid);
      await queryClient.invalidateQueries({ queryKey: ['trip-expenses', tripId] });
    } catch {
      // silently ignore — UI will refresh on next load
    }
  };

  const handleApprove = async (eid: number) => {
    try {
      await tripClient.approveTripExpense(tripId, eid);
      await queryClient.invalidateQueries({ queryKey: ['trip-expenses', tripId] });
      await queryClient.invalidateQueries({ queryKey: ['trip-detail', String(tripId)] });
    } catch {
      // silently ignore
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
            <div className="table-scroll ancillary-fees__scroll" style={{ marginBottom: 12 }}>
              <table className="ancillary-fees__table">
                <thead>
                  <tr>
                    <th>Loại phí / Cont / Hình thức</th>
                    <th className="num">Mua vào</th>
                    <th className="num">Bán ra</th>
                    <th className="num">Lãi DV</th>
                    <th>Nhà cung cấp</th>
                    <th>Chứng từ</th>
                    <th>Trạng thái</th>
                    {!readOnly && <th style={{ width: 64 }}></th>}
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((fee, i) => {
                    const margin = Number(fee.sellAmount) - Number(fee.buyAmount);
                    return (
                      <tr key={fee.id ?? i}>
                        <td>
                          <div style={{ lineHeight: 1.25 }}>
                            <div>{feeTypeLabel(fee.expenseType)}</div>
                            <div style={{ fontSize: 11, color: 'var(--fg-3)', display: 'flex', gap: 6 }}>
                              {fee.containerNumber && <span className="mono">{fee.containerNumber}</span>}
                              {fee.containerNumber && <span>·</span>}
                              <span>{fee.settlementMethod === 'COMPANY_DIRECT' ? 'Cty trả' : 'Tạm ứng'}</span>
                            </div>
                          </div>
                        </td>
                        <td className="num">{formatCurrency(Number(fee.buyAmount))}</td>
                        <td className="num">{formatCurrency(Number(fee.sellAmount))}</td>
                        <td
                          className="num"
                          style={{
                            color: margin >= 0 ? 'var(--success)' : 'var(--danger)',
                            fontWeight: 600,
                          }}
                        >
                          {formatCurrency(margin)}
                        </td>
                        <td style={{ fontSize: 12, maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={fee.supplierName || ''}>
                          {fee.supplierName ?? '—'}
                        </td>
                        <td
                          style={{ fontSize: 12, color: 'var(--fg-3)', whiteSpace: 'nowrap', maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis' }}
                          title={[fee.invoiceNumber && `HĐ ${fee.invoiceNumber}`, fee.invoiceDate && `Ngày ${fee.invoiceDate}`, fee.declarationNumber && `TK ${fee.declarationNumber}`].filter(Boolean).join(' · ') || '—'}
                        >
                          {fee.invoiceNumber || fee.declarationNumber ? (
                            <>
                              <span style={{ color: 'var(--fg-1)' }}>{fee.invoiceNumber ?? fee.declarationNumber}</span>
                              {fee.invoiceDate && <span style={{ marginLeft: 4, fontSize: 11 }}>· {fee.invoiceDate.slice(5)}</span>}
                            </>
                          ) : '—'}
                        </td>
                        <td>
                          {fee.approvalStatus === 'APPROVED' ? (
                            <span title="Đã duyệt"><StatusPill variant="success">Duyệt</StatusPill></span>
                          ) : fee.approvalStatus === 'REJECTED' ? (
                            <span title="Từ chối"><StatusPill variant="danger">Từ chối</StatusPill></span>
                          ) : (
                            <span title="Chờ duyệt"><StatusPill variant="warn">Chờ</StatusPill></span>
                          )}
                        </td>
                        {!readOnly && (
                          <td style={{ whiteSpace: 'nowrap' }}>
                            {isManager && fee.approvalStatus === 'PENDING' && (
                              <button
                                type="button"
                                className="btn btn--sm btn--primary"
                                style={{
                                  padding: '2px 8px',
                                  fontSize: 11,
                                  background: '#16a34a',
                                  borderColor: '#16a34a',
                                  marginRight: 6,
                                  borderRadius: 4,
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                                onClick={() => handleApprove(fee.id)}
                              >
                                Duyệt
                              </button>
                            )}
                            <button
                              type="button"
                              className="btn btn--ghost btn--icon btn--sm"
                              onClick={() => handleDelete(fee.id)}
                              title="Xóa phí này"
                            >
                              <Trash2 size={13} style={{ color: 'var(--danger)' }} />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ fontWeight: 600, borderTop: '2px solid var(--border-1)' }}>
                    <td>Tổng</td>
                    <td></td>
                    <td className="num">{formatCurrency(totalBuy)}</td>
                    <td className="num">{formatCurrency(totalSell)}</td>
                    <td
                      className="num"
                      style={{ color: totalMargin >= 0 ? 'var(--success)' : 'var(--danger)' }}
                    >
                      {formatCurrency(totalMargin)}
                    </td>
                    <td colSpan={readOnly ? 2 : 3}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <AncillaryEmptyState />
          )}

          {!readOnly && !showForm && !hideAddButton && (
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={() => { setForm(EMPTY_FORM); setFormError(''); setShowForm(true); }}
            >
              <Plus size={14} /> Thêm phí
            </button>
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
    </div>
  );
}
