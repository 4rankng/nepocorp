import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { VehicleScheduleForm } from './VehicleScheduleForm';

describe('VehicleScheduleForm', () => {
  it('submits exact Vietnam reminder and due instants', () => {
    const onSubmit = vi.fn();
    render(<VehicleScheduleForm onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText('Loại lịch'), { target: { value: 'INSPECTION' } });
    fireEvent.change(screen.getByLabelText('Nội dung nhắc'), { target: { value: 'Đăng kiểm định kỳ' } });
    fireEvent.change(screen.getByLabelText('Thời điểm nhắc'), { target: { value: '2026-07-28T08:00' } });
    fireEvent.change(screen.getByLabelText('Hạn hoàn thành'), { target: { value: '2026-07-30T17:30' } });
    fireEvent.click(screen.getByRole('button', { name: 'Tạo lịch' }));

    expect(onSubmit).toHaveBeenCalledWith({
      kind: 'INSPECTION',
      title: 'Đăng kiểm định kỳ',
      documentNumber: null,
      notes: null,
      remindAt: '2026-07-28T01:00:00.000Z',
      dueAt: '2026-07-30T10:30:00.000Z',
    });
  });

  it('rejects a reminder after its completion deadline', () => {
    const onSubmit = vi.fn();
    render(<VehicleScheduleForm onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText('Nội dung nhắc'), { target: { value: 'Bảo dưỡng định kỳ' } });
    fireEvent.change(screen.getByLabelText('Thời điểm nhắc'), { target: { value: '2026-07-31T08:00' } });
    fireEvent.change(screen.getByLabelText('Hạn hoàn thành'), { target: { value: '2026-07-30T08:00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Tạo lịch' }));

    expect(screen.getByRole('alert').textContent).toContain(
      'Thời điểm nhắc phải trước hoặc trùng hạn hoàn thành',
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
