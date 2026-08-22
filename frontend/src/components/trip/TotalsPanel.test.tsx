import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TotalsPanel } from './TotalsPanel';

const useTripFormContextMock = vi.fn();
const useFuelConfigMock = vi.fn();

const externalTripForm = {
  legs: [],
  fuelMode: 'AUTO',
  fuelLitersOverride: '',
  fuelSupplementLiters: '',
  tollsDiscount: '0',
  tollsAddition: '0',
  tollsStations: '0',
  hasReturnCargo: false,
  driverSalary: '500000',
  revenue: '7560000',
  customerCommission: '200000',
  revenueEmptyReturn: '0',
  revenueCombine: '0',
  selectedRouteData: null,
  roadAllowanceBaseApplied: 0,
  fuelActualUnitPrice: '',
  roadAllowanceOverride: '',
  tollPerStationApplied: 0,
  returnCargoBonusApplied: 0,
  carrierType: 'EXTERNAL',
  externalFreightCost: '7128000',
  vatRate: 0.08,
  twoPointDeliveryBonus: '0',
  vehicleShiftAllowance: '0',
} as const;

vi.mock('../../hooks/useTripFormContext', () => ({
  useTripFormContext: () => useTripFormContextMock(),
}));

vi.mock('../../hooks/useQueries', () => ({
  useFuelConfig: () => useFuelConfigMock(),
}));

describe('TotalsPanel', () => {
  beforeEach(() => {
    useFuelConfigMock.mockReturnValue({ data: { unitPrice: '25000' } });
  });

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
      externalFreightCost: '',
      vatRate: 0,
      customerCommission: '0',
      revenue: '4000000',
    });

    render(<TotalsPanel />);

    expect(screen.getByText('Phân bổ chi phí')).toBeTruthy();
    expect(screen.getByText('Chi phí nhiên liệu')).toBeTruthy();
    expect(screen.getByText('Tiền đi đường & phí trạm')).toBeTruthy();
    expect(screen.getByText('Tiền lương lái xe')).toBeTruthy();
    expect(screen.queryByText('Cước thuê ngoài')).toBeNull();
  });
});
