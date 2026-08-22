import { render, screen } from '@testing-library/react';
import { TripStatus, type TripDetail } from '@tingting/shared';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { TripMobileCard } from './TripMobileCard';

describe('TripMobileCard', () => {
  it('shows the net road money received by the driver, not toll cost', () => {
    const trip = {
      id: 14,
      status: TripStatus.COMPLETED,
      departureDate: '2026-08-22',
      totalRoadAllowance: '2480000',
      tollCost: '980000',
    } as TripDetail;

    render(
      <MemoryRouter>
        <TripMobileCard trip={trip} warnThreshold={37} />
      </MemoryRouter>,
    );

    expect(screen.getByText('Tổng tiền đi đường lái xe nhận')).toBeTruthy();
    expect(screen.getByText('2.480.000 ₫')).toBeTruthy();
    expect(screen.queryByText('3.460.000 ₫')).toBeNull();
  });
});
