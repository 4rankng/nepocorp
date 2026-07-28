import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { VehicleDateTimePicker } from './VehicleDateTimePicker';

describe('VehicleDateTimePicker', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('formats an existing local value in Vietnamese', () => {
    render(
      <VehicleDateTimePicker
        id="due-at"
        ariaLabel="Chọn hạn hoàn thành"
        value="2026-08-02T17:30"
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Chọn hạn hoàn thành' }).textContent)
      .toContain('02/08/2026');
    expect(screen.getByRole('button', { name: 'Chọn hạn hoàn thành' }).textContent)
      .toContain('17:30');
  });

  it('applies today and a selected time as the local form value', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-28T08:00:00.000Z'));
    const onChange = vi.fn();

    render(
      <VehicleDateTimePicker
        id="remind-at"
        ariaLabel="Chọn thời điểm nhắc"
        value=""
        onChange={onChange}
        required
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Chọn thời điểm nhắc' }));
    fireEvent.click(screen.getByRole('button', { name: 'Hôm nay' }));
    fireEvent.change(screen.getByLabelText('Giờ'), { target: { value: '17:30' } });
    fireEvent.click(screen.getByRole('button', { name: 'Áp dụng' }));

    expect(onChange).toHaveBeenCalledWith('2026-07-28T17:30');
  });
});
