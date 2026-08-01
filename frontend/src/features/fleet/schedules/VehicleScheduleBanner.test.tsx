import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { VehicleComponent, VehicleScheduleKind, VehicleScheduleStatus } from '@tingting/shared';
import { VehicleScheduleBanner } from './VehicleScheduleBanner';

const reminders = [
  {
    id: 11,
    vehicleComponent: VehicleComponent.TRUCK,
    vehicleId: 7,
    vehiclePlate: '15C-136.31',
    kind: VehicleScheduleKind.INSPECTION,
    status: VehicleScheduleStatus.ACTIVE,
    title: 'Đăng kiểm định kỳ',
    documentNumber: null,
    notes: null,
    remindAt: '2026-07-28T01:00:00.000Z',
    dueAt: '2026-07-28T02:00:00.000Z',
    isOverdue: true,
    completedAt: null,
    cancelledAt: null,
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
  },
  {
    id: 12,
    vehicleComponent: VehicleComponent.TRAILER,
    vehicleId: 7,
    vehiclePlate: '15R-067.95',
    kind: VehicleScheduleKind.INSURANCE,
    status: VehicleScheduleStatus.ACTIVE,
    title: 'Bảo hiểm bắt buộc',
    documentNumber: 'BH-2026-07',
    notes: null,
    remindAt: '2026-07-28T01:00:00.000Z',
    dueAt: '2026-07-30T02:00:00.000Z',
    isOverdue: false,
    completedAt: null,
    cancelledAt: null,
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
  },
];

describe('VehicleScheduleBanner', () => {
  it('does not reserve banner space when there are no active reminders', () => {
    const { container } = render(<VehicleScheduleBanner items={[]} />);

    expect(container.childElementCount).toBe(0);
  });

  it('keeps truck and trailer reminders distinct even when their numeric IDs match', () => {
    render(<VehicleScheduleBanner items={reminders} />);

    expect(screen.getByText('15C-136.31')).not.toBeNull();
    expect(screen.getByText('15R-067.95')).not.toBeNull();
    expect(screen.getByText('Xe đầu kéo')).not.toBeNull();
    expect(screen.getByText('Rơ-moóc')).not.toBeNull();
  });

  it('uses a non-color overdue label and exposes the Fleet action', () => {
    const onOpenFleet = vi.fn();
    render(<VehicleScheduleBanner items={reminders} onOpenFleet={onOpenFleet} />);

    expect(screen.getByText('Quá hạn')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Xem lịch đội xe' }));
    expect(onOpenFleet).toHaveBeenCalledOnce();
  });

  it('shows future active schedules as upcoming with both reminder and due times', () => {
    render(<VehicleScheduleBanner items={[{
      ...reminders[1],
      id: 13,
      title: 'Đăng kiểm sắp tới',
      remindAt: '2099-08-10T01:00:00.000Z',
      dueAt: '2099-08-20T01:00:00.000Z',
    }]} />);

    expect(screen.getByText('Sắp tới')).not.toBeNull();
    expect(screen.getByText(/Nhắc .*10\/08\/2099/)).not.toBeNull();
    expect(screen.getByText(/Hạn .*20\/08\/2099/)).not.toBeNull();
  });

  it('changes an upcoming reminder to due when remindAt arrives without navigation', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-02T01:00:00.000Z'));

    try {
      render(<VehicleScheduleBanner items={[{
        ...reminders[1],
        id: 14,
        remindAt: '2026-08-02T01:01:00.000Z',
        dueAt: '2026-08-03T01:00:00.000Z',
      }]} />);

      expect(screen.getByText('Sắp tới')).not.toBeNull();

      act(() => vi.advanceTimersByTime(60_100));

      expect(screen.getByText('Đến hạn nhắc')).not.toBeNull();
      expect(screen.queryByText('Sắp tới')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});
