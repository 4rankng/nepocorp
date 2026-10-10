import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { TripDerivedData } from '../types';
import { FinancialCard } from './FinancialCard';

const externalTripDerived: TripDerivedData = {
  revenue: 6_800_000,
  freightRevenue: 7_000_000,
  contractRevenue: 7_560_000,
  vatAmount: 560_000,
  vatRate: 0.08,
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

  // Trip 356 (TRP-202610-0002): the reported case — 8.466.120 ₫ contract value
  // at 8% VAT printed above a 2.379.475 ₫ profit recorded on 7.839.000 ₫.
  const ownVatTripDerived: TripDerivedData = {
    revenue: 7_839_000,
    freightRevenue: 7_839_000,
    contractRevenue: 8_466_120,
    vatAmount: 627_120,
    vatRate: 0.08,
    totalCost: 5_459_525,
    grossProfit: 2_379_475,
    marginPct: '30.4',
    fuelCost: 3_594_910,
    roadAllowance: 1_480_000,
    tollCost: 0,
    tollsDiscount: 0,
    driverSalary: 384_615,
    serviceCost: 0,
    twoPointDeliveryBonus: 0,
    vehicleShiftAllowance: 0,
    totalKm: 0,
    fuelLiters: 0,
    computedLiters: 0,
    ttbq: 0,
    fuelVarianceLiters: 0,
    fuelVarianceOver: false,
    externalCarrierName: '—',
    externalMargin: null,
    externalHireCost: null,
  };

  it('states the output VAT on an own-truck trip so the revenue row reconciles with the profit', () => {
    render(<FinancialCard derived={ownVatTripDerived} />);

    expect(screen.getByText('Doanh thu (chưa VAT)')).toBeTruthy();
    expect(screen.getByText('Thuế VAT đầu ra 8%')).toBeTruthy();
    expect(screen.getByText('Doanh thu gồm VAT')).toBeTruthy();
    // The three figures the reporter put side by side, each now on a stated basis:
    // 7.839.000 + 627.120 = 8.466.120 and 7.839.000 − 5.459.525 = 2.379.475.
    expect(screen.getByText('7.839.000')).toBeTruthy();
    expect(screen.getByText('627.120')).toBeTruthy();
    expect(screen.getByText('8.466.120')).toBeTruthy();
    expect(screen.getByText('5.459.525')).toBeTruthy();
    expect(screen.getByText('2.379.475')).toBeTruthy();
  });

  it('keeps the plain revenue row on a trip without VAT', () => {
    render(<FinancialCard derived={{ ...ownVatTripDerived, contractRevenue: 7_839_000, vatAmount: 0, vatRate: 0 }} />);

    expect(screen.getByText('Doanh thu')).toBeTruthy();
    expect(screen.queryByText('Doanh thu (chưa VAT)')).toBeNull();
    expect(screen.queryByText('Thuế VAT đầu ra 0%')).toBeNull();
  });
});
