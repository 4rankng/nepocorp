import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { VehicleScheduleKind } from '@tingting/shared';
import { VehicleScheduleForm } from './VehicleScheduleForm';

describe('VehicleScheduleForm', () => {
  it('connects the input label and focuses the required field after validation', () => {
    render(<VehicleScheduleForm onSubmit={vi.fn()} submitLabel="Tạo lịch" />);

    const titleInput = screen.getByRole('textbox', { name: /Nội dung nhắc/ });
    fireEvent.click(screen.getByRole('button', { name: 'Tạo lịch' }));

    expect(titleInput.hasAttribute('required')).toBe(true);
    expect(titleInput.getAttribute('aria-invalid')).toBe('true');
    expect(document.activeElement).toBe(titleInput);
  });

  it('selects the schedule type from an accessible dropdown', () => {
    render(<VehicleScheduleForm onSubmit={vi.fn()} />);

    const trigger = screen.getByRole('combobox', { name: 'Loại lịch' });
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole('option', { name: 'Bảo hiểm' }));

    expect(trigger.textContent).toContain('Bảo hiểm');
  });

  it('submits exact Vietnam reminder and due instants', () => {
    const onSubmit = vi.fn();
    render(
      <VehicleScheduleForm
        onSubmit={onSubmit}
        submitLabel="Tạo lịch"
        initialValue={{
          kind: VehicleScheduleKind.INSPECTION,
          title: 'Đăng kiểm định kỳ',
          documentNumber: null,
          notes: null,
          remindAt: '2026-07-28T01:00:00.000Z',
          dueAt: '2026-07-30T10:30:00.000Z',
        }}
      />,
    );

    fireEvent.change(screen.getByRole('textbox', { name: 'Ghi chú (không bắt buộc)' }), {
      target: { value: 'Mang theo bản gốc' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Tạo lịch' }));

    expect(onSubmit).toHaveBeenCalledWith({
      kind: 'INSPECTION',
      title: 'Đăng kiểm định kỳ',
      documentNumber: null,
      notes: 'Mang theo bản gốc',
      remindAt: '2026-07-28T01:00:00.000Z',
      dueAt: '2026-07-30T10:30:00.000Z',
    });
  });

  it('rejects a reminder after its completion deadline', () => {
    const onSubmit = vi.fn();
    render(
      <VehicleScheduleForm
        onSubmit={onSubmit}
        submitLabel="Tạo lịch"
        initialValue={{
          kind: VehicleScheduleKind.MAINTENANCE,
          title: 'Bảo dưỡng định kỳ',
          documentNumber: null,
          notes: null,
          remindAt: '2026-07-31T01:00:00.000Z',
          dueAt: '2026-07-30T01:00:00.000Z',
        }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Tạo lịch' }));

    expect(screen.getByRole('alert').textContent).toContain(
      'Thời điểm nhắc phải trước hoặc trùng hạn hoàn thành',
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
