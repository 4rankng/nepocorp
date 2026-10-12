import { describe, expect, it } from 'vitest';
import { TripStatus, type TripDetail } from '@tingting/shared';
import { getTripDisplayMarginPct } from './tripHelpers';
import { TRIP_LIST_EXPORT_HEADERS, buildTripListExportRows } from './tripListExport';

describe('buildTripListExportRows (kanban 101026203100)', () => {
  // Trip 356 / TRP-202610-0002: 8% VAT on a 8.466.120 ₫ contract; stored
  // profit 2.379.475 ₫ = 7.839.000 − 5.459.525 (the ex-VAT basis).
  const vatTrip = {
    id: 356,
    tripCode: 'TRP-202610-0002',
    status: TripStatus.COMPLETED,
    carrierType: 'OWN',
    revenue: '8466120',
    vatRate: '0.080',
    customerCommission: '0',
    totalCost: '5459525',
    grossProfit: '2379475',
  } as TripDetail;

  it('exports revenue, cost and profit on one VAT basis beside the labeled contract value', () => {
    const rows = buildTripListExportRows([vatTrip]);

    expect(TRIP_LIST_EXPORT_HEADERS.slice(12, 16)).toEqual([
      'Doanh thu (chưa VAT)', 'Thuế VAT đầu ra', 'Doanh thu (gồm VAT)', 'Tổng chi phí',
    ]);
    const [exVat, vat, inclVat, cost] = rows[0].slice(12, 16).map(Number);
    const profit = Number(rows[0][18]);

    expect([exVat, vat, inclVat]).toEqual([7839000, 627120, 8466120]);
    expect(cost).toBe(5459525);
    expect(profit).toBe(2379475);

    // The exported row adds up on the ex-VAT basis and its margin matches the
    // Biên LN the trip list prints from the same figures.
    expect(exVat - cost).toBe(profit);
    expect(((profit / exVat) * 100).toFixed(1)).toBe('30.4');
    expect((getTripDisplayMarginPct(vatTrip) ?? 0).toFixed(1)).toBe('30.4');
  });
});
