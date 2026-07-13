import React, { useEffect, useRef } from 'react';
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
  const barRef = useRef<HTMLDivElement>(null);
  const form = useTripFormContext();
  const allFilled = form.requiredFieldsFilled >= form.totalRequiredFields;
  const disabled = form.submitting || isAnyUploading(form.uploading) || loading;

  // The guided tour is mounted at the app root, while this bar is fixed within
  // the trip form. Publish the actual responsive height so floating guidance
  // can stay above the controls instead of being covered by them.
  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    const publishHeight = () => {
      document.documentElement.style.setProperty('--trip-action-bar-height', `${bar.offsetHeight}px`);
    };
    publishHeight();
    const observer = new ResizeObserver(publishHeight);
    observer.observe(bar);
    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty('--trip-action-bar-height');
    };
  }, []);

  return (
    <>
      {form.error && <div className="form-alert form-alert--danger">{form.error}</div>}
      <div ref={barRef} className="tc-action-bar">
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
        <button className="btn btn--primary" id="trip-new-submit" type="button" disabled={disabled || !allFilled} onClick={onSubmit}>
          {form.submitting ? <Loader2 size={16} className="spin" /> : <ArrowRight size={16} />}
          Tạo lệnh
        </button>
      </div>
    </>
  );
}
