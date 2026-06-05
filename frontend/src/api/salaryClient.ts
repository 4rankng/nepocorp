import { api } from '../lib/api';

export interface WorkDayRecord {
  id: number;
  driverId: number;
  date: string;
  status: 'TRIP_DAY' | 'STANDBY' | 'PERSONAL_LEAVE' | 'WEEKLY_OFF';
  tripId: number | null;
  note: string | null;
  trip?: { id: number; tripCode: string | null; routeName: string | null } | null;
}

export interface AttendanceSalary {
  driverId: number;
  year: number;
  month: number;
  periodStart: string;
  periodEnd: string;
  standardWorkDays: number;
  tripDays: number;
  standbyDays: number;
  personalLeaveDays: number;
  weeklyOffDays: number;
  paidDays: number;
  baseSalary: number;
  socialInsurance: number;
  dailyRate: number;
  totalTripSalary: number;
  adjustment: number;
  totalPenalties: number;
  standbyCost: number;
  netSalary: number;
  workDays?: WorkDayRecord[];
}

export interface DriverSalarySummary {
  id: number;
  name: string;
  baseSalary: string | null;
  status: string;
  salary: AttendanceSalary | null;
}

export interface WorkDayUpdate {
  date: string;
  status: 'TRIP_DAY' | 'STANDBY' | 'PERSONAL_LEAVE' | null;
  note?: string | null;
}

export const salaryClient = {
  // List all drivers with salary summary for a month
  getAll: (year: number, month: number) =>
    api.get<{ year: number; month: number; items: DriverSalarySummary[] }>(
      `/salary?year=${year}&month=${month}`
    ),

  // Full salary computation for one driver
  getSalary: (driverId: number, year: number, month: number) =>
    api.get<AttendanceSalary>(`/salary/${driverId}/${year}/${month}`),

  // Get raw work day records for calendar view
  getWorkDays: (driverId: number, year: number, month: number) =>
    api.get<{ period: { start: string; end: string; label: string }; workDays: WorkDayRecord[] }>(
      `/salary/${driverId}/${year}/${month}/workdays`
    ),

  // Batch update work days
  updateWorkDays: (driverId: number, year: number, month: number, items: WorkDayUpdate[]) =>
    api.put<{ results: any[]; salary: AttendanceSalary }>(
      `/salary/${driverId}/${year}/${month}/workdays`,
      { items }
    ),
};
