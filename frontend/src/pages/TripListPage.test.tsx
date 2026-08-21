import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TripStatus, type TripDetail } from '@tingting/shared';
import { QuickEditTripSummary } from './TripListPage';

describe('QuickEditTripSummary', () => {
  it('keeps persisted two-point delivery and vehicle-shift costs visible in mobile quick edit', () => {
    const trip = {
      id: 14,
      status: TripStatus.COMPLETED,
      totalCost: '8626606',
      twoPointDeliveryBonus: '100000',
      vehicleShiftAllowance: '200000',
    } as TripDetail;

    render(<QuickEditTripSummary trip={trip} />);

    expect(screen.getByText('8.626.606 ₫')).toBeTruthy();
    expect(screen.getByText('Trả hàng 2 điểm: 100.000 ₫')).toBeTruthy();
    expect(screen.getByText('Lưu ca xe: 200.000 ₫')).toBeTruthy();
  });
});
