import { api } from '../lib/api';
import { DRIVER } from '@nepocorp/shared';

export const driverClient = {
  getTrips: async () => {
    return api.get<{
      items: Array<{
        id: number;
        departureDate: string;
        status: string;
        driverSalary: string | null;
        routeName: string | null;
        truckPlate: string | null;
      }>;
    }>(DRIVER.TRIPS);
  },

  getEarnings: async (month: number, year: number) => {
    return api.get<{
      baseSalary: string;
      tripIncome: string;
      penalties: string;
      netIncome: string;
      periodStart?: string;
      periodEnd?: string;
    }>(`${DRIVER.EARNINGS}?month=${month}&year=${year}`);
  },

  getPenalties: async (params?: { dateFrom: string; dateTo: string }) => {
    const qs = params ? `?dateFrom=${params.dateFrom}&dateTo=${params.dateTo}` : '';
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
      | { items: Array<any> }
    >(`${DRIVER.PENALTIES}${qs}`);
  },
};
