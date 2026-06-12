import { TRIP_STATUS_LABELS, type TripDetail } from '@tingting/shared';
import { downloadCSV } from '../../lib/csv';
import { buildTripCode, type TripListRow } from './tripHelpers';

export type TripExportFilters = {
  status?: string;
  truckId?: number;
  customerId?: number;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
};

export interface TripExportOptions extends TripExportFilters {
  fetcher: (params: TripExportFilters) => Promise<{ items: TripDetail[]; total: number; pageSize: number }>;
}

const EXPORT_HEADERS = [
  'Mã', 'Khách hàng', 'Tuyến', 'Xe', 'Ngày khởi hành', 'KM',
  'Loại cont', 'Số cont', 'Dầu (L)', 'Nhà CC Dầu', 'Giá trị dầu',
  'Tổng đi đường', 'Doanh thu', 'Trạng thái',
];

export async function exportTripsToCSV(opts: TripExportOptions): Promise<void> {
  const commonParams: TripExportFilters = {
    status: opts.status,
    truckId: opts.truckId,
    customerId: opts.customerId,
    search: opts.search,
    dateFrom: opts.dateFrom,
    dateTo: opts.dateTo,
  };
  const first = await opts.fetcher({ ...commonParams });
  const allTrips = [...first.items];
  const totalPages = Math.ceil(first.total / first.pageSize);
  if (totalPages > 1) {
    const remaining = await Promise.all(
      Array.from({ length: totalPages - 1 }, (_, i) =>
        opts.fetcher({ ...commonParams }).then((r) => r.items),
      ),
    );
    for (const items of remaining) allTrips.push(...items);
  }

  const rows = allTrips.map((t) => {
    const containers = (t as TripListRow).containers ?? [];
    const typeCodes = Array.from(new Set(containers.map((c) => c.containerTypeCode || c.containerTypeName).filter(Boolean))).join(', ');
    const numbers = containers.map((c) => c.containerNumber).join(', ');
    return [
      buildTripCode(t),
      t.customer?.name ?? '',
      t.route?.name ?? '',
      t.truck?.licensePlate ?? '',
      t.departureDate ?? '',
      Number(t.route?.distanceKm ?? 0) || '',
      typeCodes,
      numbers,
      t.fuelLiters ?? '',
      t.fuelSupplier?.name ?? '',
      t.totalFuelCost ?? '',
      (Number(t.totalRoadAllowance ?? 0) + Number(t.tollCost ?? 0)) || '',
      t.revenue ?? '',
      TRIP_STATUS_LABELS[t.status],
    ];
  });

  downloadCSV(`so-chuyen-${new Date().toISOString().slice(0, 10)}.csv`, EXPORT_HEADERS, rows);
}
