import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TripStatus, type TripDetail } from '@tingting/shared';
import { buildTripColumns } from './tripColumns';

describe('trip total-cost column', () => {
  it('shows only the road money received by the driver, excluding toll cost', () => {
    const trip = {
      id: 14,
      status: TripStatus.COMPLETED,
      totalRoadAllowance: '2480000',
      tollCost: '980000',
    } as TripDetail;
    const column = buildTripColumns(37).find((item) => item.id === 'road');

    if (!column || typeof column.cell !== 'function') {
      throw new Error('Missing road-money cell renderer');
    }

    expect(column.header).toBe('Tổng tiền đi đường lái xe nhận');
    render(column.cell({ row: { original: trip } } as never));

    expect(screen.getByText('2.480.000')).toBeTruthy();
    expect(screen.queryByText('3.460.000')).toBeNull();
  });

  it('renders vehicle-shift cost below the total without repeating two-point delivery', () => {
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
    expect(screen.queryByText('Trả hàng 2 điểm: 100.000 ₫')).toBeNull();
    expect(screen.getByText('Lưu ca xe: 200.000 ₫')).toBeTruthy();
  });
});
