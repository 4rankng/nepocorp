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

describe('trip money columns share one VAT basis (kanban 101026203100)', () => {
  // Trip 356 / TRP-202610-0002: 8% VAT on a 8.466.120 ₫ contract; stored
  // profit 2.379.475 ₫ = 7.839.000 − 5.459.525 (the ex-VAT basis).
  const vatTrip = {
    id: 356,
    status: TripStatus.COMPLETED,
    carrierType: 'OWN',
    revenue: '8466120',
    vatRate: '0.080',
    customerCommission: '0',
    totalCost: '5459525',
    grossProfit: '2379475',
  } as TripDetail;

  const renderCell = (columnId: string, trip: TripDetail) => {
    const column = buildTripColumns(37).find((item) => item.id === columnId);
    if (!column || typeof column.cell !== 'function') {
      throw new Error(`Missing ${columnId} cell renderer`);
    }
    render(column.cell({ row: { original: trip } } as never));
  };

  it('prints revenue, cost, profit and margin on the ex-VAT basis with the contract value labeled', () => {
    const revenueColumn = buildTripColumns(37).find((item) => item.id === 'revenue');
    expect(revenueColumn?.header).toBe('Doanh thu (chưa VAT)');

    renderCell('revenue', vatTrip);
    renderCell('totalCost', vatTrip);
    renderCell('grossProfit', vatTrip);

    // Doanh thu (chưa VAT) 7.839.000 − Tổng chi phí 5.459.525 = LN gộp 2.379.475,
    // and Biên LN is measured on that same 7.839.000 revenue.
    expect(screen.getByText('7.839.000')).toBeTruthy();
    expect(screen.getByText('gồm VAT: 8.466.120 ₫')).toBeTruthy();
    expect(screen.getByText('5.459.525')).toBeTruthy();
    expect(screen.getByText('2.379.475')).toBeTruthy();
    expect(screen.getByText('Biên LN 30,4%')).toBeTruthy();
    expect(screen.queryByText('8.466.120', { exact: true })).toBeNull();
  });

  it('names the contract basis on the quick-edit editor, which writes the stored value', () => {
    const quickEdit = {
      enabled: true,
      state: { selectedIds: new Set<number>(), drafts: { 356: { fuelLiters: '', roadAllowance: '', driverSalary: '', revenue: '8466120' } }, errors: {} },
      onToggleSelect: () => {},
      onDraftChange: () => {},
    };
    const revenueColumn = buildTripColumns(37, quickEdit).find((item) => item.id === 'revenue');
    expect(revenueColumn?.header).toBe('Doanh thu (gồm VAT)');
  });
});
