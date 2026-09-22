import type { TripDetail } from '@tingting/shared';
import { getTripDistance, getTripDisplayGrossProfit } from './tripHelpers';

export const TRIP_LIST_EXPORT_HEADERS = ['Mã', 'Khách hàng', 'Tuyến', 'Xe', 'Ngày khởi hành', 'KM', 'Loại cont', 'Số cont', 'Dầu (L)', 'Nhà CC Dầu', 'Giá trị dầu', 'Tổng tiền đi đường lái xe nhận', 'Doanh thu', 'Tổng chi phí', 'Trả hàng 2 điểm', 'Lưu ca xe', 'LN gộp', 'Trạng thái'];

export function buildTripListExportRows(allTrips: TripDetail[]) {
  return allTrips.map((t) => {
    const containers = (t as unknown as { containers?: Array<{ containerNumber: string; containerTypeCode: string | null; containerTypeName: string | null }> }).containers ?? [];
    const typeCodes = Array.from(new Set(containers.map((c) => c.containerTypeCode || c.containerTypeName).filter(Boolean))).join(', ');
    const numbers = containers.map((c) => c.containerNumber).join(', ');
    return [
      t.tripCode ?? '—',
      t.customer?.name ?? '',
      t.route?.name ?? '',
      t.carrierType === 'EXTERNAL' ? (t.externalPlateNumber ?? 'Xe ngoài') : (t.truck?.licensePlate ?? ''),
      t.departureDate ?? '',
      getTripDistance(t) || '',
      typeCodes, numbers,
      t.fuelLiters ?? '',
      t.fuelSupplier?.name ?? '',
      t.totalFuelCost ?? '',
      Number(t.totalRoadAllowance ?? 0) || '',
      t.revenue ?? '',
      t.totalCost ?? '',
      t.twoPointDeliveryBonus ?? '',
      t.vehicleShiftAllowance ?? '',
      getTripDisplayGrossProfit(t),
      t.status,
    ];
  });
}
