import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TripStatus, type TripDetail } from '@tingting/shared';
import { exportTripsToCSV } from './tripExports';

const downloadCSV = vi.fn();

vi.mock('../../lib/csv', () => ({ downloadCSV }));

describe('exportTripsToCSV', () => {
  beforeEach(() => downloadCSV.mockReset());

  it('exports two-point delivery and vehicle-shift costs as separate, summed columns', async () => {
    const trip = {
      id: 14,
      tripCode: 'TRP-202607-0014',
      status: TripStatus.COMPLETED,
      twoPointDeliveryBonus: '100000',
      vehicleShiftAllowance: '200000',
    } as TripDetail;

    await exportTripsToCSV({
      fetcher: vi.fn().mockResolvedValue({ items: [trip], total: 1, pageSize: 100 }),
    });

    const [, headers, rows, options] = downloadCSV.mock.calls[0];

    expect(headers).toEqual(expect.arrayContaining(['Trả hàng 2 điểm', 'Lưu ca xe']));
    expect(rows[0][13]).toBe('100000');
    expect(rows[0][14]).toBe('200000');
    expect(options.totalsColumns).toEqual(expect.arrayContaining([13, 14]));
  });
});
