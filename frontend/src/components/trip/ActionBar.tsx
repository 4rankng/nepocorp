import './ActionBar.css';
import { AlertTriangle, Check, ArrowRight, Loader2 } from 'lucide-react';
import { useTripFormContext } from '../../hooks/useTripFormContext';
import { isAnyUploading } from '../../hooks/useTripFormPhotos';

interface ActionBarProps {
  loading?: boolean;
  onCancel: () => void;
  onSubmit: () => void;
}

export function ActionBar({ loading, onCancel, onSubmit }: ActionBarProps) {
  const form = useTripFormContext();
  const allFilled = form.requiredFieldsFilled >= form.totalRequiredFields;
  const disabled = form.submitting || isAnyUploading(form.uploading) || loading;
  const pct = form.totalRequiredFields > 0
    ? Math.round((form.requiredFieldsFilled / form.totalRequiredFields) * 100)
    : 0;
  const revenue = Number(form.revenue) || 0;
  const estCost = (form.estimatedFuelCost || 0) + (form.estimatedTollCost || 0) + (Number(form.driverSalary) || 0);
  const profit = form.estimatedProfit;
  const fmt = (v: number) => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(Math.abs(v));

  return (
    <>
      {form.error && <div className="form-alert form-alert--danger">{form.error}</div>}
      <div className="tc-action-bar">
        {/* Thanh tiến độ 4px (audit Gemini 23/10): thay panel radio 'Hoàn tất lệnh'. */}
        <div className="tc-action-bar__progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <div className="tc-action-bar__progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="tc-action-bar__status">
          <span className="tc-action-bar__status-icon">
            {allFilled
              ? <Check size={16} style={{ color: 'var(--accent)' }} />
              : <AlertTriangle size={16} style={{ color: 'var(--warning)' }} />}
          </span>
          <div>
            <div className="tc-action-bar__status-main">
              {form.createdTripId ? 'Lệnh đã được tạo' : allFilled ? 'Sẵn sàng tạo lệnh' : `Còn ${form.totalRequiredFields - form.requiredFieldsFilled} trường bắt buộc chưa điền`}
            </div>
            <div className="tc-action-bar__status-sub">{form.createdTripId ? 'Sửa dữ liệu báo lỗi rồi tiếp tục lưu vào chuyến này.' : 'Điền đủ trường bắt buộc để bật nút "Tạo lệnh"'}</div>
          </div>
        </div>
        {/* Ước tính inline (audit Gemini 23/10): thay card 400px đầu trang. */}
        <div className="tc-action-bar__money mono">
          <span className="tc-money"><i>DT</i> {fmt(revenue)} ₫</span>
          <span className="tc-money tc-money--cost"><i>CP ước</i> −{fmt(estCost)} ₫</span>
          <span className={`tc-money tc-money--${profit < 0 ? 'neg' : profit > 0 ? 'pos' : 'flat'}`}><i>LN</i> {profit < 0 ? '−' : profit > 0 ? '+' : ''}{fmt(profit)} ₫</span>
        </div>
        <div className="tc-action-bar__actions">
          <button className="btn btn--ghost" type="button" onClick={onCancel} disabled={form.submitting}>Hủy</button>
          <button className="btn btn--primary" id="trip-new-submit" type="button" disabled={disabled || !allFilled} onClick={onSubmit}>
            {form.submitting ? <Loader2 size={16} className="spin" /> : <ArrowRight size={16} />}
            {form.createdTripId ? 'Tiếp tục lưu' : 'Tạo lệnh'}
          </button>
        </div>
      </div>
    </>
  );
}
