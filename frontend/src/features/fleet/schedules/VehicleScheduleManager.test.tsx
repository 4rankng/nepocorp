import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { VehicleComponent, VehicleScheduleKind, VehicleScheduleStatus } from '@tingting/shared';
import { VehicleScheduleManager } from './VehicleScheduleManager';

const items = [
  {
    id: 21,
    vehicleComponent: VehicleComponent.TRUCK,
    vehicleId: 7,
    vehiclePlate: '15C-136.31',
    kind: VehicleScheduleKind.MAINTENANCE,
    status: VehicleScheduleStatus.ACTIVE,
    title: 'Bảo dưỡng định kỳ',
    documentNumber: null,
    notes: null,
    remindAt: '2026-08-01T01:00:00.000Z',
    dueAt: '2026-08-02T01:00:00.000Z',
    isOverdue: false,
    completedAt: null,
    completedBy: null,
    cancelledAt: null,
    cancelledBy: null,
    createdAt: '2026-07-01T00:00:00.000Z',
    createdBy: 1,
    updatedAt: '2026-07-01T00:00:00.000Z',
    updatedBy: 1,
  },
  {
    id: 22,
    vehicleComponent: VehicleComponent.TRUCK,
    vehicleId: 7,
    vehiclePlate: '15C-136.31',
    kind: VehicleScheduleKind.INSPECTION,
    status: VehicleScheduleStatus.COMPLETED,
    title: 'Đăng kiểm quý trước',
    documentNumber: null,
    notes: null,
    remindAt: '2026-06-01T01:00:00.000Z',
    dueAt: '2026-06-02T01:00:00.000Z',
    isOverdue: false,
    completedAt: '2026-06-02T00:00:00.000Z',
    completedBy: 1,
    cancelledAt: null,
    cancelledBy: null,
    createdAt: '2026-05-01T00:00:00.000Z',
    createdBy: 1,
    updatedAt: '2026-06-02T00:00:00.000Z',
    updatedBy: 1,
  },
];

describe('VehicleScheduleManager', () => {
  it('separates active work from completed history for the selected plate', async () => {
    render(
      <VehicleScheduleManager
        isOpen
        vehicleComponent={VehicleComponent.TRUCK}
        vehicleId={7}
        vehiclePlate="15C-136.31"
        items={items}
        onClose={vi.fn()}
        onCreate={vi.fn()}
        onUpdate={vi.fn()}
        onComplete={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(await screen.findByText('Xe đầu kéo 15C-136.31')).not.toBeNull();
    expect(screen.getByText('Bảo dưỡng định kỳ')).not.toBeNull();
    expect(screen.queryByText('Đăng kiểm quý trước')).toBeNull();

    expect(screen.getByRole('tab', { name: /Đang theo dõi\s*1/ }).getAttribute('aria-selected')).toBe('true');
    fireEvent.click(screen.getByRole('tab', { name: /Đã xử lý\s*1/ }));
    expect(screen.getByText('Đăng kiểm quý trước')).not.toBeNull();
    expect(screen.queryByText('Bảo dưỡng định kỳ')).toBeNull();
    expect(screen.getByRole('tab', { name: /Đã xử lý\s*1/ }).getAttribute('aria-selected')).toBe('true');
  });

  it('opens the creation form without changing vehicle identity', async () => {
    render(
      <VehicleScheduleManager
        isOpen
        vehicleComponent={VehicleComponent.TRAILER}
        vehicleId={7}
        vehiclePlate="15R-067.95"
        items={[]}
        onClose={vi.fn()}
        onCreate={vi.fn()}
        onUpdate={vi.fn()}
        onComplete={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(await screen.findByText('Rơ-moóc 15R-067.95')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Thêm lịch nhắc việc' }));
    expect(screen.getByTestId('vehicle-schedule-form')).not.toBeNull();
  });
});
