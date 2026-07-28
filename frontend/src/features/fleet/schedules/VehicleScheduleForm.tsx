import { useEffect, useRef, useState, type FormEvent } from 'react';
import { VehicleScheduleKind } from '@tingting/shared';
import { fromVietnamIso, toVietnamIso } from './date-time';

export interface VehicleScheduleDraft {
  kind: VehicleScheduleKind;
  title: string;
  documentNumber: string | null;
  notes: string | null;
  remindAt: string;
  dueAt: string;
}

interface VehicleScheduleFormProps {
  onSubmit: (draft: VehicleScheduleDraft) => void | Promise<unknown>;
  initialValue?: VehicleScheduleDraft;
  onCancel?: () => void;
  submitLabel?: string;
  submitting?: boolean;
}

const EMPTY_FORM = {
  kind: VehicleScheduleKind.MAINTENANCE,
  title: '',
  documentNumber: '',
  notes: '',
  remindAt: '',
  dueAt: '',
};

export function VehicleScheduleForm({
  onSubmit,
  initialValue,
  onCancel,
  submitLabel = initialValue ? 'Lưu thay đổi' : 'Tạo lịch',
  submitting = false,
}: VehicleScheduleFormProps) {
  const [form, setForm] = useState(() => initialValue ? {
    ...initialValue,
    documentNumber: initialValue.documentNumber ?? '',
    notes: initialValue.notes ?? '',
    remindAt: fromVietnamIso(initialValue.remindAt),
    dueAt: fromVietnamIso(initialValue.dueAt),
  } : EMPTY_FORM);
  const [error, setError] = useState('');
  const titleRef = useRef<HTMLInputElement>(null);
  const remindRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setForm(initialValue ? {
      ...initialValue,
      documentNumber: initialValue.documentNumber ?? '',
      notes: initialValue.notes ?? '',
      remindAt: fromVietnamIso(initialValue.remindAt),
      dueAt: fromVietnamIso(initialValue.dueAt),
    } : EMPTY_FORM);
    setError('');
  }, [initialValue]);

  const set = (key: keyof typeof form, value: string) => {
    setForm(current => ({ ...current, [key]: value }));
    setError('');
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const title = form.title.trim();
    if (!title) {
      setError('Vui lòng nhập nội dung nhắc.');
      titleRef.current?.focus();
      return;
    }

    let remindAt: string;
    let dueAt: string;
    try {
      remindAt = toVietnamIso(form.remindAt);
      dueAt = toVietnamIso(form.dueAt);
    } catch (timeError) {
      setError(timeError instanceof Error ? timeError.message : 'Thời gian không hợp lệ');
      remindRef.current?.focus();
      return;
    }

    if (new Date(remindAt).getTime() > new Date(dueAt).getTime()) {
      setError('Thời điểm nhắc phải trước hoặc trùng hạn hoàn thành.');
      remindRef.current?.focus();
      return;
    }

    await onSubmit({
      kind: form.kind,
      title,
      documentNumber: form.documentNumber.trim() || null,
      notes: form.notes.trim() || null,
      remindAt,
      dueAt,
    });
  };

  return (
    <form className="vehicle-schedule-form" data-testid="vehicle-schedule-form" onSubmit={handleSubmit} noValidate>
      {error && <div className="vehicle-schedule-form__error" role="alert">{error}</div>}
      <div className="vehicle-schedule-form__grid">
        <label className="vehicle-schedule-form__field">
          <span>Loại lịch</span>
          <select
            name="scheduleType"
            className="input"
            value={form.kind}
            onChange={event => set('kind', event.target.value as VehicleScheduleKind)}
            autoComplete="off"
          >
            <option value="MAINTENANCE">Bảo trì</option>
            <option value="INSPECTION">Đăng kiểm</option>
            <option value="INSURANCE">Bảo hiểm</option>
            <option value="ROAD_FEE">Phí đường bộ</option>
            <option value="DOCUMENT">Giấy tờ khác</option>
            <option value="OTHER">Khác</option>
          </select>
        </label>

        <label className="vehicle-schedule-form__field vehicle-schedule-form__field--wide">
          <span>Nội dung nhắc</span>
          <input
            ref={titleRef}
            name="title"
            className="input"
            value={form.title}
            onChange={event => set('title', event.target.value)}
            placeholder="Ví dụ: Đăng kiểm định kỳ…"
            autoComplete="off"
            required
          />
        </label>

        <label className="vehicle-schedule-form__field">
          <span>Thời điểm nhắc</span>
          <input
            ref={remindRef}
            name="remindAt"
            className="input"
            type="datetime-local"
            value={form.remindAt}
            onChange={event => set('remindAt', event.target.value)}
            autoComplete="off"
            required
          />
        </label>

        <label className="vehicle-schedule-form__field">
          <span>Hạn hoàn thành</span>
          <input
            name="dueAt"
            className="input"
            type="datetime-local"
            value={form.dueAt}
            onChange={event => set('dueAt', event.target.value)}
            autoComplete="off"
            required
          />
        </label>
        <p className="vehicle-schedule-form__timezone">Theo giờ Việt Nam (Asia/Ho_Chi_Minh).</p>

        <label className="vehicle-schedule-form__field">
          <span>Số giấy tờ <small>(không bắt buộc)</small></span>
          <input
            name="documentNumber"
            className="input"
            value={form.documentNumber}
            onChange={event => set('documentNumber', event.target.value)}
            autoComplete="off"
          />
        </label>

        <label className="vehicle-schedule-form__field vehicle-schedule-form__field--wide">
          <span>Ghi chú <small>(không bắt buộc)</small></span>
          <textarea
            name="notes"
            className="input"
            value={form.notes}
            onChange={event => set('notes', event.target.value)}
            autoComplete="off"
            rows={3}
          />
        </label>
      </div>

      <div className="vehicle-schedule-form__footer">
        {onCancel && (
          <button type="button" className="btn btn--ghost" onClick={onCancel} disabled={submitting}>
            Bỏ qua
          </button>
        )}
        <button type="submit" className="btn btn--primary" disabled={submitting}>
          {submitting ? 'Đang lưu…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
