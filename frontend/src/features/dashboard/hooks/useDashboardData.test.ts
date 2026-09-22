import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useDashboardData } from './useDashboardData';

const mocks = vi.hoisted(() => ({ pnl: vi.fn(), trips: vi.fn(() => ({})) }));
vi.mock('@tanstack/react-query', () => ({ useQuery: () => ({ data: undefined }) }));
vi.mock('../../../hooks/useAuth', () => ({ useAuth: () => ({ user: { role: 'ADMIN' } }) }));
vi.mock('../../../hooks/useQueries', () => ({
  useDashboardStats: () => ({ data: { revenue: 0, costs: 0, grossProfit: 0 }, isLoading: false }),
  usePnlReport: mocks.pnl,
  useMonthlyTrips: mocks.trips, useCreatedTrips: () => ({}),
  useYearlyPnl: () => ({}), useFuelConfig: () => ({}), useRenewalReminders: () => ({}),
}));

afterEach(() => { cleanup(); vi.clearAllMocks(); mocks.trips.mockReturnValue({}); });

describe('dashboard month comparisons', () => {
  it.each([
    [9, 2026, 8, 2026],
    [1, 2026, 12, 2025],
  ])('compares %s/%s against %s/%s', (month, year, previousMonth, previousYear) => {
    mocks.pnl.mockImplementation((m, y) => ({ data: m === previousMonth && y === previousYear
      ? { totalRevenue: 99_536_400, totalCosts: 40_000_000, grossProfit: 59_536_400, netProfit: 42_000_000 }
      : { totalRevenue: 120_000_000, totalCosts: 50_000_000, grossProfit: 70_000_000, netProfit: 45_000_000 },
    }));
    const { result } = renderHook(() => useDashboardData(month, year));

    expect(mocks.pnl).toHaveBeenCalledWith(previousMonth, previousYear);
    expect(result.current.derived).toMatchObject({
      revenue: 120_000_000, netProfit: 45_000_000,
      prevRevenue: 99_536_400, prevCosts: 40_000_000,
      prevGross: 59_536_400, prevNet: 42_000_000,
    });
  });

  it('derives previous net consistently when an older report omits netProfit', () => {
    mocks.pnl.mockReturnValue({ data: { grossProfit: 50_000_000, companyExpenses: 12_000_000, otherIncome: 2_000_000 } });
    const { result } = renderHook(() => useDashboardData(9, 2026));
    expect(result.current.derived?.netProfit).toBe(40_000_000);
    expect(result.current.derived?.prevNet).toBe(40_000_000);
  });

  it('reconciles cost bars to the P&L snapshot without draft trips, external hire or company overhead', () => {
    mocks.trips.mockReturnValue({ data: [
      { status: 'CREATED', totalFuelCost: '9000000', totalRoadAllowance: '400000', driverSalary: '300000' },
      { status: 'IN_TRANSIT', totalFuelCost: '8000000', totalRoadAllowance: '500000', driverSalary: '400000' },
    ] });
    mocks.pnl.mockReturnValue({ data: {
      totalCosts: 7_000_000, companyExpenses: 2_000_000, maintenanceExpensesTotal: 1_000_000,
      categoryBreakdown: [{ categoryName: 'Văn phòng', total: '2000000' }, { categoryName: 'Sửa chữa xe', total: '1000000' }],
      tripDetails: [
        { isExternal: false, fuelOrHireCost: 3_000_000, roadAllowance: 1_000_000, tollAndCompanyTickets: 500_000, driverAndAllowances: 1_000_000, totalCost: 6_000_000 },
        { isExternal: true, fuelOrHireCost: 9_000_000, roadAllowance: 0, tollAndCompanyTickets: 0, driverAndAllowances: 0, totalCost: 9_000_000 },
      ],
    } });
    const { result } = renderHook(() => useDashboardData(9, 2026));
    const data = result.current.derived!;
    expect(data.costs).toBe(7_000_000);
    expect(data.slicesWithPct.reduce((sum, slice) => sum + slice.value, 0)).toBe(data.costs);
    expect(data.totalPie).toBe(data.costs);
    expect(Object.fromEntries(data.slicesWithPct.map(slice => [slice.label, slice.value]))).toEqual({
      'Nhiên liệu': 3_000_000,
      'Lương & phụ cấp lái xe': 1_000_000,
      'Tiền đi đường & vé': 1_500_000,
      'Chi phí chuyến khác': 500_000,
      'Chi phí phương tiện': 1_000_000,
    });
  });

  it('shows aggregate trip cost when detailed costs are unavailable instead of fabricating percentages', () => {
    mocks.pnl.mockReturnValue({ data: { totalCosts: 7_000_000, maintenanceExpensesTotal: 1_000_000 } });
    const { result } = renderHook(() => useDashboardData(9, 2026));
    expect(result.current.derived?.slicesWithPct.map(slice => [slice.label, slice.value])).toEqual([
      ['Chi phí chuyến', 6_000_000], ['Chi phí phương tiện', 1_000_000],
    ]);
  });
});
