import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FuelMode } from '@tingting/shared';
import type { ComputeTripTotalsOutput } from '@tingting/shared';
import { FuelSection } from './FuelSection';

const useTripFormContextMock = vi.fn();
const useFuelConfigMock = vi.fn();

vi.mock('../../hooks/useTripFormContext', () => ({
  useTripFormContext: () => useTripFormContextMock(),
}));

vi.mock('../../hooks/useQueries', () => ({
  useFuelConfig: () => useFuelConfigMock(),
}));

vi.mock('./FuelAllocationEditor', () => ({
  FuelAllocationEditor: () => <div data-testid="fuel-allocation-editor" />,
}));

function allocationRow(liters: string) {
  return {
    _key: `row-${liters}`,
    point: 'CUSTOM' as const,
    enabled: true,
    supplierId: 10,
    paymentMethod: 'CASH' as const,
    liters,
    unitPrice: '',
  };
}

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

function formStub(overrides: Record<string, unknown> = {}) {
  return {
    fuelMode: FuelMode.AUTO,
    setFuelMode: vi.fn(),
    fuelLitersOverride: '',
    setFuelLitersOverride: vi.fn(),
    fuelActualUnitPrice: '',
    setFuelActualUnitPrice: vi.fn(),
    fuelSupplementLiters: '',
    setFuelSupplementLiters: vi.fn(),
    fuelSupplementReason: '',
    setFuelSupplementReason: vi.fn(),
    carrierType: 'OWN',
    legs: [{ sequence: 1, origin: 'A', destination: 'B', km: '0', loadingType: 'HANG' }],
    fuelAllocations: [allocationRow('')],
    totals: { ...zeroTotals, totalFuelLiters: 3 },
    fuelFrozenLegacy: false,
    ...overrides,
  };
}

describe('FuelSection allocation reconciliation', () => {
  beforeEach(() => {
    useFuelConfigMock.mockReturnValue({ data: { unitPrice: '25000' } });
  });

  it('warns when allocated liters differ from the trip fuel total and offers the one-click reconcile', () => {
    useTripFormContextMock.mockReturnValue(formStub({
      fuelAllocations: [allocationRow('248')],
    }));

    render(<FuelSection />);

    const alert = screen.getByText(/Tổng phân bổ dầu \(248 lít\) ≠ tổng dầu chuyến \(3 lít\)/);
    expect(alert.getAttribute('role')).toBe('alert');
    expect(screen.getByText(/cự ly 0 km/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Khoán 248 lít làm tổng dầu chuyến' })).toBeTruthy();
  });

  it('reconciles by switching to FLAT_RATE with the allocation total minus the supplement', () => {
    const stub = formStub({
      fuelAllocations: [allocationRow('248')],
      fuelSupplementLiters: '3',
    });
    useTripFormContextMock.mockReturnValue(stub);

    render(<FuelSection />);

    fireEvent.click(screen.getByRole('button', { name: 'Khoán 248 lít làm tổng dầu chuyến' }));

    expect(stub.setFuelMode).toHaveBeenCalledWith(FuelMode.FLAT_RATE);
    expect(stub.setFuelLitersOverride).toHaveBeenCalledWith('245');
  });

  it('hides the reconcile button for decimal allocation totals and asks for rounding', () => {
    useTripFormContextMock.mockReturnValue(formStub({
      fuelAllocations: [allocationRow('248.5')],
    }));

    render(<FuelSection />);

    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByText('Làm tròn số lít phân bổ thành số nguyên để khoán được.')).toBeTruthy();
  });

  it('stays silent when the allocation matches the trip fuel total', () => {
    useTripFormContextMock.mockReturnValue(formStub({
      fuelAllocations: [allocationRow('248')],
      totals: { ...zeroTotals, totalFuelLiters: 248 },
    }));

    render(<FuelSection />);

    expect(screen.queryByText(/Tổng phân bổ dầu/)).toBeNull();
  });

  it('explains the stored-total freeze for committed legacy trips without offering a reconcile', () => {
    useTripFormContextMock.mockReturnValue(formStub({
      fuelAllocations: [allocationRow('248')],
      fuelFrozenLegacy: true,
    }));

    render(<FuelSection />);

    expect(screen.getByText(/Chuyến legacy này giữ nguyên tổng dầu đã lưu — phân bổ đúng 3 lít/)).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });
});
