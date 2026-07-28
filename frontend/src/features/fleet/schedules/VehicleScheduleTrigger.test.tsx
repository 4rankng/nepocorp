import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { VehicleComponent, VehicleScheduleKind, VehicleScheduleStatus } from '@tingting/shared';
import { VehicleScheduleTrigger } from './VehicleScheduleTrigger';

describe('VehicleScheduleTrigger', () => {
  it('offers schedule creation when the vehicle has no active reminder', () => {
    const onOpen = vi.fn();
    render(
      <VehicleScheduleTrigger
        vehicleComponent="TRAILER"
        vehicleId={7}
        items={[]}
        onOpen={onOpen}
      />,
    );

    const trigger = screen.getByRole('button', { name: 'Thêm lịch cho rơ-moóc' });
    fireEvent.click(trigger);

    expect(trigger.textContent).toContain('Thêm lịch');
    expect(onOpen).toHaveBeenCalledWith('create');
  });

  it('shows an explicit overdue state and does not bubble into the vehicle card', () => {
    const onOpen = vi.fn();
    const parentClick = vi.fn();
    render(
      <div onClick={parentClick}>
        <VehicleScheduleTrigger
          vehicleComponent="TRUCK"
          vehicleId={7}
          items={[{
            id: 11,
            vehicleComponent: VehicleComponent.TRUCK,
            vehicleId: 7,
            vehiclePlate: '15C-136.31',
            kind: VehicleScheduleKind.INSPECTION,
            status: VehicleScheduleStatus.ACTIVE,
            title: 'Đăng kiểm',
            documentNumber: null,
            notes: null,
            remindAt: '2026-07-28T01:00:00.000Z',
            dueAt: '2026-07-28T02:00:00.000Z',
            isOverdue: true,
            completedAt: null,
            cancelledAt: null,
            createdAt: '2026-07-01T00:00:00.000Z',
            updatedAt: '2026-07-01T00:00:00.000Z',
          }]}
          onOpen={onOpen}
        />
      </div>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Mở 1 lịch của xe đầu kéo, có lịch quá hạn' }));
    expect(screen.getByText('Quá hạn')).not.toBeNull();
    expect(onOpen).toHaveBeenCalledWith('overview');
    expect(parentClick).not.toHaveBeenCalled();
  });
});
