import { api } from '../lib/api';
import { toQuery } from '../lib/http/query';
import { DRIVER } from '@tingting/shared';
import type { VehicleAlert } from '@tingting/shared';

/** Driver trips list row (server-paginated). */
export interface DriverTripRow {
  id: number;
  departureDate: string;
  status: string;
  driverSalary: string | null;
  routeName: string | null;
  truckPlate: string | null;
  customerName: string | null;
  containerNumbers: string[] | null;
}

/** Driver trips envelope — statusCounts powers the status tabs. */
export interface DriverTripsPageData {
  items: DriverTripRow[];
  total: number;
  page: number;
  pageSize: number;
  statusCounts: Record<string, number>;
}

export const driverClient = {
  getTrips: async (params?: { page?: number; limit?: number; status?: string }) => {
    return api.get<DriverTripsPageData>(`${DRIVER.TRIPS}${toQuery(params)}`);
  },

  getEarnings: async (month: number, year: number) => {
    return api.get<{
      baseSalary: string;
      tripIncome: string;
      penalties: string;
      netIncome: string;
      // F2 / B2 — trip-based income + outstanding payable.
      productionSalary: string;
      roadAllowance: string;
      paidOrAdvanced: string;
      payableBalance: string;
      adjustment?: number;
      supplementPay?: number;
      leaveDeduction?: number;
      standardWorkDays?: number;
      paidDays?: number;
      dailyRate?: number;
      periodStart?: string;
      periodEnd?: string;
    }>(`${DRIVER.EARNINGS}${toQuery({ month, year })}`);
  },

  getPenalties: async (params?: { dateFrom: string; dateTo: string }) => {
    return api.get<
      | Array<{
          id: number;
          driverId: number;
          tripId: number | null;
          tripCode?: string | null;
          reasonId: number | null;
          customReason: string | null;
          amount: string;
          date: string;
          reasonText?: string;
        }>
      | {
          items: Array<{
            id: number;
            driverId: number;
            tripId: number | null;
            tripCode?: string | null;
            reasonId: number | null;
            customReason: string | null;
            amount: string;
            date: string;
            reasonText?: string;
          }>;
        }
    >(`${DRIVER.PENALTIES}${toQuery(params)}`);
  },

  /** N5 / B4 — overdue/due reminders for the driver's truck. */
  getVehicleAlerts: async () => {
    return api.get<{ items: VehicleAlert[] }>(DRIVER.VEHICLE_ALERTS);
  },
};
