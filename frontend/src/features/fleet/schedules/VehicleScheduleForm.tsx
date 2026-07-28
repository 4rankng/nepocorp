import { useEffect, useRef, useState, type FormEvent } from 'react';
import { VehicleScheduleKind } from '@tingting/shared';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/Select';
import { TextAreaField, TextField } from '../../../design-system';
import { fromVietnamIso, toVietnamIso } from './date-time';
import { VehicleDateTimePicker } from './VehicleDateTimePicker';

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
  const remindRef = useRef<HTMLButtonElement>(null);

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
        <div className="vehicle-schedule-form__field">
          <span id="vehicle-schedule-kind-label">Loại lịch</span>
          <Select
            name="scheduleType"
            value={form.kind}
            onValueChange={value => set('kind', value as VehicleScheduleKind)}
          >
            <SelectTrigger
              className="vehicle-schedule-form__select-trigger"
              aria-labelledby="vehicle-schedule-kind-label"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent
              className="vehicle-schedule-form__select-content"
              position="popper"
              sideOffset={6}
              collisionPadding={12}
            >
              <SelectGroup>
                <SelectItem value={VehicleScheduleKind.MAINTENANCE}>Bảo trì</SelectItem>
                <SelectItem value={VehicleScheduleKind.INSPECTION}>Đăng kiểm</SelectItem>
                <SelectItem value={VehicleScheduleKind.INSURANCE}>Bảo hiểm</SelectItem>
                <SelectItem value={VehicleScheduleKind.ROAD_FEE}>Phí đường bộ</SelectItem>
                <SelectItem value={VehicleScheduleKind.DOCUMENT}>Giấy tờ khác</SelectItem>
                <SelectItem value={VehicleScheduleKind.OTHER}>Khác</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <TextField
          ref={titleRef}
          className="vehicle-schedule-form__field--wide"
          label="Nội dung nhắc"
          name="title"
          value={form.title}
          onChange={event => set('title', event.target.value)}
          placeholder="Ví dụ: Đăng kiểm định kỳ…"
          autoComplete="off"
          required
          aria-invalid={error === 'Vui lòng nhập nội dung nhắc.'}
        />

        <div className="vehicle-schedule-form__field">
          <span id="vehicle-schedule-remind-at-label">Thời điểm nhắc</span>
          <VehicleDateTimePicker
            ref={remindRef}
            id="vehicle-schedule-remind-at"
            ariaLabel="Chọn thời điểm nhắc"
            value={form.remindAt}
            onChange={value => set('remindAt', value)}
            required
          />
        </div>

        <div className="vehicle-schedule-form__field">
          <span id="vehicle-schedule-due-at-label">Hạn hoàn thành</span>
          <VehicleDateTimePicker
            id="vehicle-schedule-due-at"
            ariaLabel="Chọn hạn hoàn thành"
            value={form.dueAt}
            onChange={value => set('dueAt', value)}
            required
          />
        </div>
        <p className="vehicle-schedule-form__timezone">Theo giờ Việt Nam (Asia/Ho_Chi_Minh).</p>

        <TextField
          label="Số giấy tờ (không bắt buộc)"
          name="documentNumber"
          value={form.documentNumber}
          onChange={event => set('documentNumber', event.target.value)}
          autoComplete="off"
        />

        <TextAreaField
          className="vehicle-schedule-form__field--wide"
          label="Ghi chú (không bắt buộc)"
          name="notes"
          value={form.notes}
          onChange={event => set('notes', event.target.value)}
          autoComplete="off"
          rows={5}
        />
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
