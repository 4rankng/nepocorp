import React from 'react';
import './ActionBar.css';
import { AlertTriangle, Check, Save, ArrowRight, Loader2 } from 'lucide-react';
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
              {allFilled ? 'Sẵn sàng tạo lệnh' : `Còn ${form.totalRequiredFields - form.requiredFieldsFilled} trường bắt buộc chưa điền`}
            </div>
            <div className="tc-action-bar__status-sub">Bản nháp được lưu tự động</div>
          </div>
        </div>
        <div className="tc-action-bar__spacer" />
        <button className="btn btn--ghost" type="button" onClick={onCancel} disabled={form.submitting}>Hủy</button>
        <button className="btn btn--secondary desktop-only" type="button" disabled title="Chưa hỗ trợ">
          <Save size={16} /> Lưu nháp
        </button>
        <button className="btn btn--primary" type="button" disabled={disabled || !allFilled} onClick={onSubmit}>
          {form.submitting ? <Loader2 size={16} className="spin" /> : <ArrowRight size={16} />}
          Tạo lệnh
        </button>
      </div>
    </>
  );
}
