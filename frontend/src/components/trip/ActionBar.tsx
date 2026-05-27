import React from 'react';
import { AlertTriangle, Check, Save, ArrowRight, Loader2 } from 'lucide-react';

interface ActionBarProps {
  requiredFieldsFilled: number;
  totalRequiredFields: number;
  submitting: boolean;
  uploading: boolean;
  loading: boolean;
  error: string;
  onCancel: () => void;
  onSubmit: () => void;
}

export function ActionBar({ requiredFieldsFilled, totalRequiredFields, submitting, uploading, loading, error, onCancel, onSubmit }: ActionBarProps) {
  const allFilled = requiredFieldsFilled >= totalRequiredFields;
  const disabled = submitting || uploading || loading;

  return (
    <>
      {error && <div className="form-alert form-alert--danger">{error}</div>}
      <div className="tc-action-bar">
        <div className="tc-action-bar__status">
          <span className="tc-action-bar__status-icon">
            {allFilled
              ? <Check size={16} style={{ color: 'var(--accent)' }} />
              : <AlertTriangle size={16} style={{ color: 'var(--warning)' }} />}
          </span>
          <div>
            <div className="tc-action-bar__status-main">
              {allFilled ? 'Sẵn sàng tạo lệnh' : `Còn ${totalRequiredFields - requiredFieldsFilled} trường bắt buộc chưa điền`}
            </div>
            <div className="tc-action-bar__status-sub">Bản nháp được lưu tự động</div>
          </div>
        </div>
        <div className="tc-action-bar__spacer" />
        <button className="btn btn--ghost" type="button" onClick={onCancel} disabled={submitting}>Hủy</button>
        <button className="btn btn--secondary" type="button" disabled title="Chưa hỗ trợ">
          <Save size={16} /> Lưu nháp
        </button>
        <button className="btn btn--primary" type="button" disabled={disabled || !allFilled} onClick={onSubmit}>
          {submitting ? <Loader2 size={16} className="spin" /> : <ArrowRight size={16} />}
          Tạo lệnh
        </button>
      </div>
    </>
  );
}
