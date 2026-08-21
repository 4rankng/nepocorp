import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TripStatus, type TripDetail } from '@tingting/shared';
import { buildTripColumns } from './tripColumns';

describe('trip total-cost column', () => {
  it('renders persisted two-point delivery and vehicle-shift costs below the total', () => {
    const trip = {
      id: 14,
      status: TripStatus.COMPLETED,
      totalCost: '8626606',
      twoPointDeliveryBonus: '100000',
      vehicleShiftAllowance: '200000',
    } as TripDetail;
    const column = buildTripColumns(37).find((item) => item.id === 'totalCost');

    if (!column || typeof column.cell !== 'function') {
      throw new Error('Missing total-cost cell renderer');
    }

    render(column.cell({ row: { original: trip } } as never));

    expect(screen.getByText('8.626.606')).toBeTruthy();
    expect(screen.getByText('Trả hàng 2 điểm: 100.000 ₫')).toBeTruthy();
    expect(screen.getByText('Lưu ca xe: 200.000 ₫')).toBeTruthy();
  });
});
