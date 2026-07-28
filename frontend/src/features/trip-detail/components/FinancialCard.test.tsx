import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { TripDerivedData } from '../types';
import { FinancialCard } from './FinancialCard';

const externalTripDerived: TripDerivedData = {
  revenue: 6_800_000,
  freightRevenue: 7_000_000,
  totalCost: 6_600_000,
  grossProfit: 200_000,
  marginPct: '2.9',
  fuelCost: 0,
  roadAllowance: 0,
  tollCost: 0,
  tollsDiscount: 0,
  driverSalary: 0,
  serviceCost: 0,
  twoPointDeliveryBonus: 0,
  vehicleShiftAllowance: 0,
  totalKm: 0,
  fuelLiters: 0,
  computedLiters: 0,
  ttbq: 0,
  fuelVarianceLiters: 0,
  fuelVarianceOver: false,
  externalCarrierName: 'Nhà xe',
  externalMargin: 200_000,
  externalHireCost: 6_600_000,
};

describe('FinancialCard', () => {
  it('shows a reconciling ex-VAT breakdown for an external-carrier trip', () => {
    render(<FinancialCard derived={externalTripDerived} customerCommission={200_000} />);

    expect(screen.getByText('7.000.000')).toBeTruthy();
    expect(screen.getByText('Hoa hồng khách hàng')).toBeTruthy();
    expect(screen.getByText('Cước thuê xe ngoài')).toBeTruthy();
    expect(screen.getAllByText('6.600.000')).toHaveLength(2);
    expect(screen.getAllByText('200.000')).toHaveLength(2);
    expect(screen.queryByText('Chi phí nhiên liệu')).toBeNull();
    expect(screen.queryByText('Tiền lương lái xe')).toBeNull();
  });
});
