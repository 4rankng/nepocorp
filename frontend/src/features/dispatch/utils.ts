export interface Driver {
  id: number;
  name: string;
  assignedTruckId?: number | null;
  status: string;
}

export interface Truck {
  id: number;
  licensePlate: string;
  status: string;
  /** Hạn đăng kiểm tiếp theo (ISO date | null) — badge cảnh báo trên fleet-table. */
  nextInspectionDate?: string | null;
}

export interface ReassignState {
  carrierType: 'OWN' | 'EXTERNAL';
  truckId: string;
  driverId: string;
  externalCarrierId: string;
  externalPlateNumber: string;
  externalDriverName: string;
  externalDriverPhone: string;
  loading: boolean;
  error: string;
}

export type FleetFilter = 'all' | 'running' | 'ready' | 'waiting' | 'noassign' | 'maint';

export interface Toast {
  id: number;
  kind: 'success' | 'error';
  text: string;
}

const VN_WEEKDAYS = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
const VN_MONTHS = ['tháng 1', 'tháng 2', 'tháng 3', 'tháng 4', 'tháng 5', 'tháng 6', 'tháng 7', 'tháng 8', 'tháng 9', 'tháng 10', 'tháng 11', 'tháng 12'];

export { VN_WEEKDAYS, VN_MONTHS };

export function formatFullDate(d: Date): string {
  return `${VN_WEEKDAYS[d.getDay()]} · ${d.getDate()} ${VN_MONTHS[d.getMonth()]}, ${d.getFullYear()}`;
}

const BUSINESS_DATE_FORMATTER = new Intl.DateTimeFormat('en', {
  timeZone: 'Asia/Ho_Chi_Minh',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function businessDateKey(date: Date): string {
  const parts = Object.fromEntries(
    BUSINESS_DATE_FORMATTER.formatToParts(date).map(({ type, value }) => [type, value]),
  );
  const { year, month, day } = parts;
  return `${year}-${month}-${day}`;
}

export function isToday(iso: string, now: Date = new Date()): boolean {
  const businessDate = /^(\d{4}-\d{2}-\d{2})(?:$|T)/.exec(iso)?.[1];
  if (businessDate) return businessDate === businessDateKey(now);

  const parsed = new Date(iso);
  return !Number.isNaN(parsed.getTime()) && businessDateKey(parsed) === businessDateKey(now);
}

/** Số ngày QUÁ HẠN của lệnh chưa phân xe (departureDate đã qua, tính theo
 *  ngày business). 0 = chưa quá hạn. Đơn quá hạn hiển thị trước (vòng 5). */
export function overdueDays(iso: string, now: Date = new Date()): number {
  const businessDate = /^(\d{4}-\d{2}-\d{2})(?:$|T)/.exec(iso)?.[1];
  const target = businessDate ?? businessDateKey(new Date(iso));
  if (!target) return 0;
  const today = businessDateKey(now);
  if (target >= today) return 0;
  return Math.round((new Date(today).getTime() - new Date(target).getTime()) / 86400000);
}

export function isUrgent(iso: string, now: Date = new Date()): boolean {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const diffMs = d.getTime() - now.getTime();
  return diffMs > 0 && diffMs < 36 * 60 * 60 * 1000;
}
