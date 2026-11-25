import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ComputeTripTotalsOutput } from '@tingting/shared';
import { TotalsPanel } from './TotalsPanel';

const useTripFormContextMock = vi.fn();

/** Zeroed totals; tests override the fields the panel renders. */
const zeroTotals: ComputeTripTotalsOutput = {
  totalFuelLiters: 0,
  legCalculations: [],
  totalFuelCost: 0,
  fuelPriceVariance: 0,
  effectiveFuelPrice: 0,
  totalRoadAllowance: 0,
  tollCost: 0,
  totalCost: 0,
  grossProfit: 0,
  freightExVat: 0,
  recordedRevenue: 0,
  serviceMargin: 0,
  totalServiceBuy: 0,
  totalServiceSell: 0,
  externalMargin: 0,
  externalFreightExVat: 0,
};

const externalTripForm = {
  tollsDiscount: '0',
  tollsAddition: '0',
  tollsStations: '0',
  hasReturnCargo: false,
  driverSalary: '500000',
  revenue: '7560000',
  revenueEmptyReturn: '0',
  revenueCombine: '0',
  roadAllowanceBaseApplied: 0,
  roadAllowanceOverride: '',
  tollPerStationApplied: 0,
  returnCargoBonusApplied: 0,
  carrierType: 'EXTERNAL',
  twoPointDeliveryBonus: '0',
  vehicleShiftAllowance: '0',
  totals: {
    ...zeroTotals,
    recordedRevenue: 6800000,
    externalFreightExVat: 6600000,
    grossProfit: 200000,
  },
} as const;

vi.mock('../../hooks/useTripFormContext', () => ({
  useTripFormContext: () => useTripFormContextMock(),
}));

describe('TotalsPanel', () => {
  it('shows outsourced cost only for external trips', () => {
    useTripFormContextMock.mockReturnValue(externalTripForm);

    render(<TotalsPanel />);

    expect(screen.getByText('Cước thuê ngoài')).toBeTruthy();
    expect(screen.queryByText('Phân bổ chi phí')).toBeNull();
    expect(screen.queryByText('Chi phí nhiên liệu')).toBeNull();
    expect(screen.queryByText('Tiền đi đường & phí trạm')).toBeNull();
    expect(screen.queryByText('Tiền lương lái xe')).toBeNull();
    expect(screen.getByText('Lợi nhuận dự kiến')).toBeTruthy();
    expect(screen.getByText('Doanh thu ghi nhận (chưa VAT)')).toBeTruthy();
    expect(screen.getByText('6.800.000')).toBeTruthy();
    expect(screen.getByText('6.600.000')).toBeTruthy();
    expect(screen.getByText('200.000')).toBeTruthy();
    const profitRow = screen.getByText('Lợi nhuận dự kiến').closest('.tc-totals__profit');
    expect(profitRow?.querySelector('.money__sign')?.textContent).toBe('+');
  });

  it('keeps own-truck cost allocation and operating rows', () => {
    useTripFormContextMock.mockReturnValue({
      ...externalTripForm,
      carrierType: 'OWN',
      driverSalary: '800000',
      revenue: '4000000',
      totals: {
        ...zeroTotals,
        totalFuelLiters: 48,
        totalFuelCost: 1200000,
        totalRoadAllowance: 800000,
        tollCost: 110000,
        totalCost: 2710000,
        grossProfit: 970000,
        recordedRevenue: 4000000,
        freightExVat: 4000000,
      },
    });

    render(<TotalsPanel />);

    expect(screen.getByText('Phân bổ chi phí')).toBeTruthy();
    expect(screen.getByText('Chi phí nhiên liệu')).toBeTruthy();
    expect(screen.getByText(/Dầu \(48L\)/)).toBeTruthy();
    expect(screen.getByText('Tiền đi đường & phí trạm')).toBeTruthy();
    expect(screen.getByText('Tiền lương lái xe')).toBeTruthy();
    expect(screen.queryByText('Cước thuê ngoài')).toBeNull();
  });
});
