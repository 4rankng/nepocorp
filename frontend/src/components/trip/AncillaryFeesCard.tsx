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
import { InputWithPrefix } from './InputWithPrefix';

interface AncillaryFeesCardProps {
  tripId: number;
  readOnly?: boolean;
}

const EXPENSE_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  Object.entries(FORWARDER_EXPENSE_TYPE_DEFAULTS).map(([k, v]) => [k, v.name])
);

function feeTypeLabel(code: string): string {
  return EXPENSE_TYPE_LABELS[code] ?? code;
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

export function AncillaryFeesCard({ tripId, readOnly = false }: AncillaryFeesCardProps) {
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
    const currentConfig = catalogData?.forwarderExpenseTypes?.find(t => t.code === newType);
    const hasMarkup = currentConfig 
      ? !!currentConfig.defaultMarkup 
      : (FORWARDER_EXPENSE_TYPE_DEFAULTS[newType]?.defaultMarkup ?? false);
    
    setForm(f => {
      const buyNum = Number(f.buyAmount);
      const newSell = hasMarkup
        ? (buyNum ? String(Math.round(buyNum * 1.2)) : '')
        : f.buyAmount;
      return {
        ...f,
        expenseType: newType as AncillaryExpenseType,
        sellAmount: newSell,
      };
    });
  };

  const handleBuyAmountChange = (val: string) => {
    const currentConfig = catalogData?.forwarderExpenseTypes?.find(t => t.code === form.expenseType);
    const hasMarkup = currentConfig 
      ? !!currentConfig.defaultMarkup 
      : (FORWARDER_EXPENSE_TYPE_DEFAULTS[form.expenseType]?.defaultMarkup ?? false);
    
    setForm(f => {
      const buyNum = Number(val);
      const oldBuyNum = Number(f.buyAmount);
      // Auto-suggest only if sell amount matches the old prefill or is empty
      const isPrefilledOrEmpty = !f.sellAmount || Number(f.sellAmount) === Math.round(oldBuyNum * 1.2) || Number(f.sellAmount) === oldBuyNum;
      const newSell = hasMarkup
        ? (isPrefilledOrEmpty ? (buyNum ? String(Math.round(buyNum * 1.2)) : '') : f.sellAmount)
        : val;
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

  const currentConfig = catalogData?.forwarderExpenseTypes?.find(t => t.code === form.expenseType);
  const hasMarkup = currentConfig 
    ? !!currentConfig.defaultMarkup 
    : (FORWARDER_EXPENSE_TYPE_DEFAULTS[form.expenseType]?.defaultMarkup ?? false);

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
            <div className="table-scroll" style={{ marginBottom: 12 }}>
              <table>
                <thead>
                  <tr>
                    <th>Loại phí</th>
                    <th>Số Cont</th>
                    <th className="num">Mua vào</th>
                    <th className="num">Bán ra</th>
                    <th className="num">Lãi DV</th>
                    <th>Hình thức</th>
                    <th>Nhà cung cấp</th>
                    <th>Số HĐ</th>
                    <th>Ngày HĐ</th>
                    <th>Trạng thái</th>
                    {!readOnly && <th style={{ width: 64 }}></th>}
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((fee, i) => {
                    const margin = Number(fee.sellAmount) - Number(fee.buyAmount);
                    return (
                      <tr key={fee.id ?? i}>
                        <td>{feeTypeLabel(fee.expenseType)}</td>
                        <td className="mono" style={{ fontSize: 12 }}>{fee.containerNumber ?? '—'}</td>
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
                        <td style={{ fontSize: 12 }}>
                          {fee.settlementMethod === 'COMPANY_DIRECT' ? 'Công ty trả' : 'Chi hộ tạm ứng'}
                        </td>
                        <td style={{ fontSize: 12, maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={fee.supplierName || ''}>
                          {fee.supplierName ?? '—'}
                        </td>
                        <td style={{ fontSize: 12, color: 'var(--fg-3)' }}>{fee.invoiceNumber ?? '—'}</td>
                        <td style={{ fontSize: 12, color: 'var(--fg-3)', whiteSpace: 'nowrap' }}>
                          {fee.invoiceDate ?? '—'}
                        </td>
                        <td>
                          <span
                            className="pill pill--sm"
                            style={
                              fee.approvalStatus === 'APPROVED'
                                ? { background: '#dcfce7', color: '#16a34a', border: '1px solid #bbf7d0', padding: '1px 6px', borderRadius: 4, fontSize: 11, fontWeight: 600 }
                                : fee.approvalStatus === 'REJECTED'
                                ? { background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', padding: '1px 6px', borderRadius: 4, fontSize: 11, fontWeight: 600 }
                                : { background: '#fffbeb', color: '#92400e', border: '1px solid #fde68a', padding: '1px 6px', borderRadius: 4, fontSize: 11, fontWeight: 600 }
                            }
                          >
                            {fee.approvalStatus === 'APPROVED'
                              ? 'Đã duyệt'
                              : fee.approvalStatus === 'REJECTED'
                              ? 'Từ chối'
                              : 'Chờ duyệt'}
                          </span>
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
                    <td colSpan={readOnly ? 5 : 6}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <p style={{ fontSize: 13, color: 'var(--fg-3)', marginBottom: 12 }}>
              Chưa có chi phí dịch vụ nào.
            </p>
          )}

          {!readOnly && !showForm && (
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
