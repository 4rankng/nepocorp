import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TripStatus, type TripDetail } from '@tingting/shared';
import { buildTripListExportRows, QuickEditTripSummary, TRIP_LIST_EXPORT_HEADERS } from './TripListPage';

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

describe('buildTripListExportRows', () => {
  it('exports the net road money received by the driver, excluding toll cost', () => {
    const trip = {
      id: 14,
      status: TripStatus.COMPLETED,
      totalRoadAllowance: '2480000',
      tollCost: '980000',
      totalCost: '8626606',
    } as TripDetail;

    const [row] = buildTripListExportRows([trip]);

    expect(TRIP_LIST_EXPORT_HEADERS[11]).toBe('Tổng tiền đi đường lái xe nhận');
    expect(row[11]).toBe(2480000);
    expect(row[11]).not.toBe(3460000);
    expect(row[13]).toBe('8626606');
  });
});
