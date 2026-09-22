/**
 * Vehicle / amount / validity / receipt / note groups of the expense entry
 * form. Presentational only: the page owns the form state and passes parsed
 * values back through the narrow callbacks below, so nothing here holds a
 * second copy of the form.
 */

interface VehicleOption { id: number; licensePlate: string }

/** Display-only thousands grouping for the amount input (vi-VN). */
const formatAmountDisplay = (val: string) => {
  if (!val) return '';
  const num = parseFloat(val.replace(/,/g, ''));
  if (isNaN(num)) return val;
  return num.toLocaleString('vi-VN');
};

interface DetailFieldsProps {
  expenseType: 'COMPANY' | 'TRUCK' | 'TRAILER';
  onExpenseTypeChange: (value: 'COMPANY' | 'TRUCK' | 'TRAILER') => void;
  truckId: number | '';
  onTruckIdChange: (id: number | '') => void;
  trucks: VehicleOption[];
  trailers: VehicleOption[];
  amount: string;
  onAmountChange: (value: string) => void;
  showValidityFields: boolean;
  validFrom: string;
  onValidFromChange: (value: string) => void;
  validTo: string;
  onValidToChange: (value: string) => void;
  receiptId: string;
  onReceiptIdChange: (value: string) => void;
  note: string;
  onNoteChange: (value: string) => void;
  errors: Record<string, string>;
}

export function ExpenseDetailFields({
  expenseType, onExpenseTypeChange,
  truckId, onTruckIdChange, trucks, trailers,
  amount, onAmountChange,
  showValidityFields, validFrom, onValidFromChange, validTo, onValidToChange,
  receiptId, onReceiptIdChange, note, onNoteChange,
  errors,
}: DetailFieldsProps) {
  return <>
              <div className="expense-group">
                <label htmlFor="expenseType" className="expense-label">Loại chi phí</label>
                <select
                  id="expenseType"
                  name="expenseType"
                  className="expense-input"
                  value={expenseType}
                  onChange={e => onExpenseTypeChange(e.target.value as 'COMPANY' | 'TRUCK' | 'TRAILER')}
                >
                  <option value="COMPANY">Chi phí công ty</option>
                  <option value="TRUCK">Xe (Đầu kéo)</option>
                  <option value="TRAILER">Rơ-moóc</option>
                </select>
              </div>

              {expenseType === 'TRUCK' && (
                <div className="expense-group">
                  <label htmlFor="truckId" className="expense-label">Biển số xe <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <select
                    name="truckId"
                    id="truckId"
                    className={`expense-input${errors.truckId ? ' expense-input--error' : ''}`}
                    value={truckId}
                    onChange={e => onTruckIdChange(e.target.value ? Number(e.target.value) : '')}
                  >
                    <option value="">Chọn xe…</option>
                    {trucks.map(t => (
                      <option key={t.id} value={t.id}>{t.licensePlate}</option>
                    ))}
                  </select>
                  {errors.truckId && <p style={{ fontSize: 'var(--fs-body)', color: 'var(--danger)', marginTop: 4 }}>{errors.truckId}</p>}
                </div>
              )}

              {expenseType === 'TRAILER' && (
                <div className="expense-group">
                  <label htmlFor="truckId" className="expense-label">Biển số rơ-moóc <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <select
                    name="truckId"
                    id="truckId"
                    className={`expense-input${errors.truckId ? ' expense-input--error' : ''}`}
                    value={truckId}
                    onChange={e => onTruckIdChange(e.target.value ? Number(e.target.value) : '')}
                  >
                    <option value="">Chọn rơ-moóc…</option>
                    {trailers
                      .map(t => (
                        <option key={t.id} value={t.id}>{t.licensePlate}</option>
                      ))}
                  </select>
                  {errors.truckId && <p style={{ fontSize: 'var(--fs-body)', color: 'var(--danger)', marginTop: 4 }}>{errors.truckId}</p>}
                </div>
              )}

              <div className="expense-group">
                <label htmlFor="amount" className="expense-label">Số tiền (đ) <span style={{ color: 'var(--danger)' }}>*</span></label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    name="amount"
                    id="amount"
                    inputMode="numeric"
                    className={`expense-input${errors.amount ? ' expense-input--error' : ''}`}
                    value={amount ? formatAmountDisplay(amount) : ''}
                    onChange={e => onAmountChange(e.target.value.replace(/[^\d]/g, ''))}
                    placeholder="0"
                    style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-control)', fontWeight: 600, color: 'var(--accent-2)' }}
                  />
                  <span style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-4)', pointerEvents: 'none', fontWeight: 500 }}>
                    đ
                  </span>
                </div>
                {errors.amount && <p style={{ fontSize: 'var(--fs-body)', color: 'var(--danger)', marginTop: 4 }}>{errors.amount}</p>}
              </div>

              {showValidityFields && (
                <>
                  <div className="expense-group">
                    <label htmlFor="validFrom" className="expense-label">Hiệu lực từ <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <input
                      type="date"
                      name="validFrom"
                      id="validFrom"
                      className={`expense-input${errors.validFrom ? ' expense-input--error' : ''}`}
                      value={validFrom}
                      onChange={e => onValidFromChange(e.target.value)}
                    />
                    {errors.validFrom && <p style={{ fontSize: 'var(--fs-body)', color: 'var(--danger)', marginTop: 4 }}>{errors.validFrom}</p>}
                  </div>
                  <div className="expense-group">
                    <label htmlFor="validTo" className="expense-label">Hiệu lực đến <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <input
                      type="date"
                      name="validTo"
                      id="validTo"
                      className={`expense-input${errors.validTo ? ' expense-input--error' : ''}`}
                      value={validTo}
                      onChange={e => onValidToChange(e.target.value)}
                    />
                    {errors.validTo && <p style={{ fontSize: 'var(--fs-body)', color: 'var(--danger)', marginTop: 4 }}>{errors.validTo}</p>}
                  </div>
                </>
              )}

              <div className="expense-group">
                <label htmlFor="receiptId" className="expense-label">Mã biên lai</label>
                <input
                  type="text"
                  name="receiptId"
                  id="receiptId"
                  className="expense-input"
                  value={receiptId}
                  onChange={e => onReceiptIdChange(e.target.value)}
                  placeholder="Nhập mã biên lai…"
                />
              </div>

              <div className="expense-group" style={{ gridColumn: '1 / -1' }}>
                <label htmlFor="note" className="expense-label">Ghi chú</label>
                <input
                  type="text"
                  name="note"
                  id="note"
                  className="expense-input"
                  value={note}
                  onChange={e => onNoteChange(e.target.value)}
                  placeholder="Ghi chú thêm…"
                />
              </div>
  </>;
}
