import { useMemo } from 'react';
import { getActiveCapTable } from '../lib/cap-table';
import type { TripDetail, CapTableHistory } from '@tingting/shared';
import type { PnlReport } from '../hooks/useQueries';

export const EMPTY_TRIPS: TripDetail[] = [];
export const EMPTY_CAP: CapTableHistory[] = [];
export const EMPTY_YEARLY: (PnlReport | null)[] = [];

export function compactNum(value: number): string {
  if (value === 0) return '0';
  if (Math.abs(value) >= 1e9) return `${(value / 1e9).toFixed(1)}tỷ`.replace('.0', '');
  if (Math.abs(value) >= 1e6) return `${(value / 1e6).toFixed(1)}tr`.replace('.0', '');
  return `${(value / 1e3).toFixed(0)}k`;
}

export function marginPct(grossProfit: number, totalRevenue: number): string {
  return totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(1) : '0.0';
}

export function yoyPct(current: number, previous: number): string {
  if (previous == null || previous === 0) return current > 0 ? 'Mới' : '—';
  const pct = ((current - previous) / previous * 100).toFixed(1);
  return `${Number(pct) >= 0 ? '+' : ''}${pct}%`;
}

export function yoyClass(current: number, previous: number): string {
  if (previous == null) return '';
  return current >= previous ? 'pnl-row__pct--up' : 'pnl-row__pct--down';
}

const runningSum = (arr: number[]): number[] => {
  let acc = 0;
  return arr.map((value) => (acc += value));
};

interface FinanceDerivedInput {
  allTrips: TripDetail[];
  report?: PnlReport;
  prevReport?: PnlReport;
  capTableRaw: CapTableHistory[];
  yearlyData: (PnlReport | null)[];
  month: number;
  chartView: 'day' | 'month';
}

export function useFinanceDerived({ allTrips, report, prevReport, capTableRaw, yearlyData, month, chartView }: FinanceDerivedInput) {

    const {
      fuelCost, roadCost, driverCost, maintenanceCost, companyExpenses,
      totalRevenue, otherRevenue, transRevenue, totalCosts, grossProfit, netProfit,
      totalRevenueLY, otherRevenueLY, transRevenueLY, totalCostsLY, grossProfitLY, companyExpensesLY, netProfitLY,
      activeCapTable, revenueChartData, costPieData, topTrucks, categoryBreakdown, truckBreakdown,
    } = useMemo(() => {
      const activeTrips = allTrips.filter((t: TripDetail) => t.status !== 'CANCELED');
      const realFuelCost = activeTrips.reduce((s, t) => s + parseFloat(t.totalFuelCost || '0'), 0);
      const realRoadCost = activeTrips.reduce((s, t) => s + parseFloat(t.totalRoadAllowance || '0'), 0);
      const realDriverCost = activeTrips.reduce((s, t) => s + parseFloat(t.driverSalary || '0'), 0);
      const totalCosts = report?.totalCosts ?? 0;

      const hasRealCosts = realFuelCost + realRoadCost + realDriverCost > 0;
      const fuelCost   = hasRealCosts ? realFuelCost   : Math.round(totalCosts * 0.55);
      const roadCost   = hasRealCosts ? realRoadCost   : Math.round(totalCosts * 0.25);
      const driverCost = hasRealCosts ? realDriverCost : Math.round(totalCosts * 0.20);
      const maintenanceCost = report?.maintenanceExpensesTotal ?? 0;
      const companyExpenses = report?.companyExpenses ?? 0;

      const totalRevenue = report?.totalRevenue ?? 0;
      const otherRevenue = report?.otherIncome ?? 0;
      const transRevenue = Math.max(0, totalRevenue - otherRevenue);
      // totalCosts is already defined above
      const grossProfit = report?.grossProfit ?? (totalRevenue - totalCosts);
      const netProfit = report?.netProfit ?? (grossProfit - companyExpenses + otherRevenue);

      const totalRevenueLY = prevReport?.totalRevenue ?? 0;
      const otherRevenueLY = prevReport?.otherIncome ?? 0;
      const transRevenueLY = Math.max(0, totalRevenueLY - otherRevenueLY);
      const totalCostsLY = prevReport?.totalCosts ?? 0;
      const grossProfitLY = prevReport?.grossProfit ?? (totalRevenueLY - totalCostsLY);
      const companyExpensesLY = prevReport?.companyExpenses ?? 0;
      const netProfitLY = prevReport?.netProfit ?? (grossProfitLY - companyExpensesLY + otherRevenueLY);

      const activeCapTable = getActiveCapTable(capTableRaw)
        .map(c => ({ name: c.partnerName, pct: c.percentage }));

      const revenueChartData = yearlyData.map((r, i) => ({
        name: `T${i + 1}`,
        'Doanh thu': (r?.totalRevenue ?? 0) / 1_000_000,
        'LN gộp': (r?.grossProfit ?? 0) / 1_000_000,
      }));

      const costPieData = [
        { name: 'Nhiên liệu', value: fuelCost, fill: '#059669' },
        { name: 'Tiền đi đường', value: roadCost, fill: '#D97706' },
        { name: 'Lương lái xe', value: driverCost, fill: '#2563EB' },
        { name: 'Bảo dưỡng', value: maintenanceCost, fill: '#DC2626' },
      ].filter(d => d.value > 0.5);

      const categoryBreakdown: Array<{ categoryName: string; total: number }> =
        (report?.categoryBreakdown ?? []).map(c => ({
          categoryName: c.categoryName,
          total: parseFloat(c.total),
        }));

      const topTrucks = [...(report?.trucks ?? [])]
        .sort((a, b) => b.profit - a.profit)
        .slice(0, 5)
        .map(t => ({
          name: t.plate,
          'LN gộp': t.profit,
          maintenance: t.maintenanceExpenses ?? 0,
        }));

      // Per-truck breakdown from all active trips (not gated on locked status)
      const truckMap = new Map<number, { id: number; plate: string; trips: number; revenue: number; costs: number; profit: number }>();
      for (const t of activeTrips) {
        const isExternal = t.carrierType === 'EXTERNAL';
        const key = isExternal ? 0 : t.truckId;
        const plate = isExternal ? 'Xe ngoài' : (t.truck?.licensePlate ?? `Truck #${t.truckId}`);
        const rev = parseFloat(t.revenue ?? '0') + parseFloat(t.revenueEmptyReturn ?? '0');
        const cost = parseFloat(t.totalCost ?? '0');
        const gp = parseFloat(t.grossProfit ?? '0');
        const existing = truckMap.get(key);
        if (existing) {
          existing.trips++;
          existing.revenue += rev;
          existing.costs += cost;
          existing.profit += gp;
        } else {
          truckMap.set(key, { id: key, plate, trips: 1, revenue: rev, costs: cost, profit: gp });
        }
      }
      const truckBreakdown = [...truckMap.values()].sort((a, b) => b.profit - a.profit);

      return {
        fuelCost, roadCost, driverCost, maintenanceCost, companyExpenses,
        totalRevenue, otherRevenue, transRevenue, totalCosts, grossProfit, netProfit,
        totalRevenueLY, otherRevenueLY, transRevenueLY, totalCostsLY, grossProfitLY, companyExpensesLY, netProfitLY,
        activeCapTable, revenueChartData, costPieData, topTrucks, categoryBreakdown, truckBreakdown,
      };
    }, [allTrips, report, prevReport, capTableRaw, yearlyData]);

    const trimmedChartData = useMemo(() => {
      const firstDataIdx = revenueChartData.findIndex(d => d['Doanh thu'] > 0 || d['LN gộp'] > 0);
      if (firstDataIdx < 0) return [];
      const lastDataIdx = [...revenueChartData].reverse().findIndex(d => d['Doanh thu'] > 0 || d['LN gộp'] > 0);
      return revenueChartData.slice(firstDataIdx, revenueChartData.length - lastDataIdx);
    }, [revenueChartData]);

    const currentChartMonthIdx = useMemo(() => {
      return trimmedChartData.findIndex(d => d.name === `T${month}`);
    }, [trimmedChartData, month]);

    const dailyChartData = useMemo(() => {
      const dayMap = new Map<string, { revenue: number; gross: number }>();
      for (const t of allTrips) {
        if (t.status === 'CANCELED') continue;
        const dateKey = t.departureDate?.slice(0, 10);
        if (!dateKey) continue;
        const rev = Number(t.revenue) || 0;
        const gp = Number(t.grossProfit) || 0;
        const existing = dayMap.get(dateKey) ?? { revenue: 0, gross: 0 };
        existing.revenue += rev;
        existing.gross += gp;
        dayMap.set(dateKey, existing);
      }
      const sorted = Array.from(dayMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .filter(([, v]) => v.revenue > 0 || v.gross > 0);
      return {
        labels: sorted.map(([d]) => String(parseInt(d.slice(8, 10), 10))),
        revenue: runningSum(sorted.map(([, v]) => v.revenue / 1_000_000)),
        gross: runningSum(sorted.map(([, v]) => v.gross / 1_000_000)),
      };
    }, [allTrips]);

    const activeChartData = useMemo(() => {
      if (chartView === 'day') {
        return {
          months: dailyChartData.labels,
          revenue: dailyChartData.revenue,
          gross: dailyChartData.gross,
          currentIdx: undefined,
        };
      }
      return {
        months: trimmedChartData.map(d => d.name as string),
        revenue: trimmedChartData.map(d => d['Doanh thu'] as number),
        gross: trimmedChartData.map(d => d['LN gộp'] as number),
        currentIdx: currentChartMonthIdx >= 0 ? currentChartMonthIdx : undefined,
      };
    }, [chartView, dailyChartData, trimmedChartData, currentChartMonthIdx]);

    const hasChartData = chartView === 'day' ? dailyChartData.labels.length > 0 : trimmedChartData.length > 0;
  return {
    fuelCost, roadCost, driverCost, maintenanceCost, companyExpenses,
    totalRevenue, otherRevenue, transRevenue, totalCosts, grossProfit, netProfit,
    totalRevenueLY, otherRevenueLY, transRevenueLY, totalCostsLY, grossProfitLY,
    companyExpensesLY, netProfitLY, activeCapTable, revenueChartData, costPieData,
    topTrucks, categoryBreakdown, truckBreakdown, trimmedChartData, activeChartData, hasChartData,
  };
}
