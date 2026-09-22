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

  return (
    <>
      {form.error && <div className="form-alert form-alert--danger">{form.error}</div>}
      <div className="tc-action-bar">
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
