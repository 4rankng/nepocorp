import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TripStatus, type TripDetail } from '@tingting/shared';
import { exportTripsToCSV } from './tripExports';

const downloadCSV = vi.fn();

vi.mock('../../lib/csv', () => ({ downloadCSV }));

describe('exportTripsToCSV', () => {
  beforeEach(() => downloadCSV.mockReset());

  it('keeps two-point delivery as an audit column without summing it twice', async () => {
    const trip = {
      id: 14,
      tripCode: 'TRP-202607-0014',
      status: TripStatus.COMPLETED,
      totalRoadAllowance: '2480000',
      tollCost: '980000',
      twoPointDeliveryBonus: '100000',
      vehicleShiftAllowance: '200000',
    } as TripDetail;

    await exportTripsToCSV({
      fetcher: vi.fn().mockResolvedValue({ items: [trip], total: 1, pageSize: 100 }),
    });

    const [, headers, rows, options] = downloadCSV.mock.calls[0];

    expect(headers).toEqual(expect.arrayContaining([
      'Tổng tiền đi đường lái xe nhận',
      'Trả hàng 2 điểm',
      'Lưu ca xe',
    ]));
    expect(rows[0][11]).toBe(2480000);
    expect(rows[0][15]).toBe('100000');
    expect(rows[0][16]).toBe('200000');
    expect(options.totalsColumns).toEqual(expect.arrayContaining([11, 16]));
    expect(options.totalsColumns).not.toContain(15);
  });

  it('exports revenue on the ex-VAT basis beside the labeled contract value (kanban 101026203100)', async () => {
    // Trip 356 / TRP-202610-0002 figures: 8% VAT on a 8.466.120 ₫ contract.
    const trip = {
      id: 356,
      tripCode: 'TRP-202610-0002',
      status: TripStatus.COMPLETED,
      revenue: '8466120',
      vatRate: '0.080',
      customerCommission: '0',
      totalCost: '5459525',
      grossProfit: '2379475',
    } as TripDetail;

    await exportTripsToCSV({
      fetcher: vi.fn().mockResolvedValue({ items: [trip], total: 1, pageSize: 100 }),
    });

    const [, headers, rows] = downloadCSV.mock.calls[0];

    expect(headers[12]).toBe('Doanh thu (chưa VAT)');
    expect(headers[13]).toBe('Thuế VAT đầu ra');
    expect(headers[14]).toBe('Doanh thu (gồm VAT)');
    expect(rows[0][12]).toBe(7839000);
    expect(rows[0][13]).toBe(627120);
    expect(rows[0][14]).toBe(8466120);
  });
});
