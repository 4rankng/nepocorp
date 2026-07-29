import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { VehicleScheduleVehiclePicker } from './VehicleScheduleVehiclePicker';

const trucks = [
  { id: 11, plate: '15C-136.31', meta: 'Hoạt động' },
  { id: 12, plate: '15H-168.73', meta: 'Bảo trì' },
];

const trailers = [
  { id: 21, plate: '15R-067.95', meta: '40 feet · Hoạt động' },
];

describe('VehicleScheduleVehiclePicker', () => {
  it('selects a tractor directly from the default vehicle list', async () => {
    const onSelect = vi.fn();
    render(
      <VehicleScheduleVehiclePicker
        isOpen
        trucks={trucks}
        trailers={trailers}
        onClose={vi.fn()}
        onSelect={onSelect}
      />,
    );

    expect(await screen.findByRole('dialog')).not.toBeNull();
    expect(screen.getByRole('tab', { name: /Xe đầu kéo\s*2/ }).getAttribute('aria-selected')).toBe('true');

    fireEvent.click(screen.getByRole('button', { name: 'Chọn xe đầu kéo 15C-136.31' }));

    expect(onSelect).toHaveBeenCalledWith('TRUCK', trucks[0]);
  });

  it('switches to trailers and filters the list by plate', async () => {
    const onSelect = vi.fn();
    render(
      <VehicleScheduleVehiclePicker
        isOpen
        trucks={trucks}
        trailers={trailers}
        onClose={vi.fn()}
        onSelect={onSelect}
      />,
    );

    await screen.findByRole('dialog');
    fireEvent.click(screen.getByRole('tab', { name: /Rơ-moóc\s*1/ }));
    fireEvent.change(screen.getByRole('searchbox', { name: 'Tìm biển số phương tiện' }), {
      target: { value: '067' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Chọn rơ-moóc 15R-067.95' }));

    expect(onSelect).toHaveBeenCalledWith('TRAILER', trailers[0]);
  });

  it('shows a useful empty result instead of an empty list', async () => {
    render(
      <VehicleScheduleVehiclePicker
        isOpen
        trucks={trucks}
        trailers={trailers}
        onClose={vi.fn()}
        onSelect={vi.fn()}
      />,
    );

    await screen.findByRole('dialog');
    fireEvent.change(screen.getByRole('searchbox', { name: 'Tìm biển số phương tiện' }), {
      target: { value: 'không tồn tại' },
    });

    expect(screen.getByText('Không tìm thấy biển số phù hợp.')).not.toBeNull();
  });
});
