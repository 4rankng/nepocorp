import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import { qk } from '../../../api/keys';
import { formatCompact } from '../../../lib/format';
import type { TripDetail, TripLeg } from '@tingting/shared';
import { FINANCIAL_ROLES, parseThreshold } from '@tingting/shared';
import { useAuth } from '../../../hooks/useAuth';
import {
  useDashboardStats,
  usePnlReport,
  useMonthlyTrips,
  useCreatedTrips,
  useYearlyPnl,
  useFuelConfig,
  useRenewalReminders,
  type PnlReport,
} from '../../../hooks/useQueries';
import { buildPieSlices } from '../utils';

const EMPTY_TRIPS: TripDetail[] = [];
const EMPTY_CREATED: TripDetail[] = [];
const EMPTY_YEARLY: (PnlReport | null)[] = [];

export interface FuelWarning {
  tripId: number;
  code: string;
  driver: string;
  ttbq: number;
  critical: boolean;
}

export interface DerivedData {
  revenue: number;
  costs: number;
  grossProfit: number;
  netProfit: number;
  displayTrucks: Array<{ plate: string; trips: number; revenue: number; profit: number; driver: string }>;
  maxTruckProfit: number;
  displayRoutes: Array<{ name: string; trips: number; profit: number; meta: string }>;
  fuelCost: number;
  roadCost: number;
  driverCost: number;
  slicesWithPct: Array<{ label: string; value: number; color: string; pct: number }>;
  conicGradient: string;
  totalPie: number;
  prevRevenue: number;
  prevCosts: number;
  prevGross: number;
  prevNet: number;
}

export interface ReceivablesSummary {
  buckets: Array<{ range: string; label: string; count: number; amount: number }>;
  totalOutstanding: number;
  totalCustomers: number;
  overdueCustomers: number;
}

export interface DashboardAuditEntry {
  id: number;
  timestamp: string;
  userName: string;
  action: string;
  message: string;
  category?: 'trip' | 'config' | 'finance' | 'auth' | 'penalty';
}

export function useDashboardData(currentMonth: number, currentYear: number) {

  const { data: stats, isLoading: loading } = useDashboardStats();
  const { data: pnlReport } = usePnlReport(currentMonth, currentYear);
  const previousMonth = currentMonth === 1 ? 12 : currentMonth - 1;
  const previousYear = currentMonth === 1 ? currentYear - 1 : currentYear;
  const { data: prevPnlReport } = usePnlReport(previousMonth, previousYear);
  const { data: allTrips = EMPTY_TRIPS } = useMonthlyTrips(currentYear, currentMonth);
  const { data: createdTrips = EMPTY_CREATED } = useCreatedTrips();
  const { data: fuelConfig } = useFuelConfig();
  const { data: renewalReminders = [] } = useRenewalReminders();
  const { data: receivablesSummary } = useQuery({
    queryKey: qk.dashboard.receivablesSummary,
    queryFn: () => api.get<ReceivablesSummary>('/reports/receivables-summary').catch(() => null),
    staleTime: 2 * 60 * 1000,
  });
  const { data: thisYearRaw = EMPTY_YEARLY } = useYearlyPnl(currentYear);
  const { data: lastYearRaw = EMPTY_YEARLY } = useYearlyPnl(currentYear - 1);

  // Latest audit-log activity for the dashboard widget.
  // Only ADMIN/MANAGER/ACCOUNTANT can access audit logs — skip the query entirely
  // for DRIVER/FORWARDER to avoid wasted 403s.
  const { user } = useAuth();
  const canSeeAudit = user?.role && (FINANCIAL_ROLES as readonly string[]).includes(user.role);
  const { data: recentAudit = [] } = useQuery<DashboardAuditEntry[]>({
    queryKey: qk.dashboard.auditRecent,
    queryFn: async () => {
      const res = await api.get<{ items: DashboardAuditEntry[]; total: number }>(
        '/audit-logs?page=1&limit=8',
      );
      return res.items ?? [];
    },
    enabled: !!canSeeAudit,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const yearlySeries = useMemo(() => {
    const out: Array<{ revenue: number; grossProfit: number }> = [];
    for (let i = 11; i >= 0; i--) {
      let m = currentMonth - i;
      let yArr = thisYearRaw;
      while (m <= 0) { m += 12; yArr = lastYearRaw; }
      const r: PnlReport | null | undefined = yArr[m - 1];
      out.push({
        revenue: Number(r?.totalRevenue ?? 0),
        grossProfit: Number(r?.grossProfit ?? 0),
      });
    }
    return out;
  }, [thisYearRaw, lastYearRaw, currentMonth]);

  const topOverdueCustomer = stats?.topOverdueCustomer ?? null;
  const topShareholder = stats?.topShareholder ?? null;

  const fuelWarnings = useMemo((): FuelWarning[] => {
    if (!fuelConfig || allTrips.length === 0) return [];
    const warnThreshold = parseThreshold(fuelConfig.warningThreshold, 0);
    const critThreshold = parseThreshold(fuelConfig.criticalThreshold, 0);
    if (!warnThreshold) return [];
    const flagged: FuelWarning[] = [];
    for (const t of allTrips) {
      const trip: TripDetail = t;
      const totalKm = trip.legs?.reduce((s: number, l: TripLeg) => s + Number(l.km), 0) ?? 0;
      const totalLiters = Number(trip.fuelLiters) || 0;
      if (totalKm <= 0 || totalLiters <= 0) continue;
      const ttbq = (totalLiters / totalKm) * 100;
      if (ttbq > warnThreshold) {
        flagged.push({
          tripId: trip.id,
          code: trip.tripCode ?? '—',
          driver: trip.driver?.name ?? '—',
          ttbq,
          critical: critThreshold > 0 && ttbq > critThreshold,
        });
      }
    }
    return flagged.sort((a, b) => b.ttbq - a.ttbq).slice(0, 5);
  }, [fuelConfig, allTrips]);

  const derived = useMemo((): DerivedData | null => {
    if (!stats) return null;

    // Use P&L report as single source of truth for all 4 KPIs when available,
    // so net profit is always consistent with revenue/costs/gross.
    // Falls back to dashboard stats (which lack otherIncome/companyExpenses).
    const revenue = pnlReport?.totalRevenue ?? stats.revenue ?? 0;
    const costs = pnlReport?.totalCosts ?? stats.costs ?? 0;
    const grossProfit = pnlReport?.grossProfit ?? stats.grossProfit ?? 0;
    const otherIncome = pnlReport?.otherIncome ?? 0;
    const companyExpenses = pnlReport?.companyExpenses ?? 0;
    const netProfit = pnlReport?.netProfit ?? (grossProfit - companyExpenses + otherIncome);

    const sortedTrucks = pnlReport?.trucks
      ? [...pnlReport.trucks].sort((a, b) => b.profit - a.profit).slice(0, 5)
      : [];

    const routeMap = new Map<string, { name: string; trips: number; profit: number }>();
    allTrips.forEach((t: TripDetail) => {
      if (!t.route || !t.route.name) return;
      if (t.status === 'CANCELED') return;
      const name = t.route.name;
      const profVal = parseFloat(t.grossProfit as string || '0');
      const existing = routeMap.get(name) || { name, trips: 0, profit: 0 };
      existing.trips++;
      existing.profit += profVal;
      routeMap.set(name, existing);
    });
    const sortedRoutes = Array.from(routeMap.values())
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 5);

    const displayTrucks = sortedTrucks.map(t => ({
      plate: t.plate,
      trips: t.trips,
      revenue: t.revenue,
      profit: t.profit,
      driver: `Đầu kéo · ${t.trips} chuyến`
    }));

    const maxTruckProfit = Math.max(...displayTrucks.map(t => t.profit), 1);

    const avgRevenuePerTrip = pnlReport?.tripCount ? pnlReport.totalRevenue / pnlReport.tripCount : 0;

    const displayRoutes = sortedRoutes.map(r => ({
      name: r.name,
      trips: r.trips,
      profit: r.profit,
      meta: r.trips > 0 && avgRevenuePerTrip > 0
        ? `${r.trips} chuyến · biên ${Math.round((r.profit / (r.trips * avgRevenuePerTrip)) * 100)}%`
        : `${r.trips} chuyến`,
    }));

    // Match the P&L KPI snapshot: completed/locked OWN trips plus their
    // vehicle expenses. External hire is netted from revenue; company
    // overhead is deducted separately when calculating net profit.
    const ownDetails = pnlReport?.tripDetails?.filter(trip => !trip.isExternal);
    const maintenanceCost = Number(pnlReport?.maintenanceExpensesTotal ?? 0);
    const tripCost = costs - maintenanceCost;
    const fuelCost = ownDetails?.reduce((sum, trip) => sum + trip.fuelOrHireCost, 0) ?? 0;
    const roadCost = ownDetails?.reduce((sum, trip) => sum + trip.roadAllowance + trip.tollAndCompanyTickets, 0) ?? 0;
    const driverCost = ownDetails?.reduce((sum, trip) => sum + trip.driverAndAllowances, 0) ?? 0;
    const componentCost = fuelCost + roadCost + driverCost;
    const detailTotal = ownDetails?.reduce((sum, trip) => sum + trip.totalCost, 0) ?? 0;
    const hasMatchingDetails = ownDetails !== undefined
      && Math.abs(detailTotal - tripCost) <= 1
      && componentCost <= tripCost;

    const pieSlices: Array<{ label: string; value: number; color: string }> = [];
    if (tripCost < 0 || maintenanceCost < 0) {
      pieSlices.push({ label: 'Chi phí đã ghi nhận', value: costs, color: 'var(--brand)' });
    } else {
      if (hasMatchingDetails) {
        pieSlices.push(
          { label: 'Nhiên liệu', value: fuelCost, color: 'var(--brand)' },
          { label: 'Lương & phụ cấp lái xe', value: driverCost, color: 'var(--info)' },
          { label: 'Tiền đi đường & vé', value: roadCost, color: 'var(--warning)' },
          { label: 'Chi phí chuyến khác', value: tripCost - componentCost, color: 'var(--fg-3)' },
        );
      } else {
        // Older cached responses may omit details. Show the recorded total
        // without inventing percentages or mixing newer operational trip data.
        pieSlices.push({ label: 'Chi phí chuyến', value: tripCost, color: 'var(--brand)' });
      }
      pieSlices.push({ label: 'Chi phí phương tiện', value: maintenanceCost, color: 'var(--accent)' });
    }

    const { slicesWithPct, conicGradient, totalPie } = buildPieSlices(pieSlices);

    const prevRevenue = prevPnlReport?.totalRevenue ?? 0;
    const prevCosts = prevPnlReport?.totalCosts ?? 0;
    const prevGross = prevPnlReport?.grossProfit ?? 0;
    const prevNet = prevPnlReport?.netProfit
      ?? (prevGross - (prevPnlReport?.companyExpenses ?? 0) + (prevPnlReport?.otherIncome ?? 0));

    return {
      revenue, costs, grossProfit, netProfit,
      displayTrucks, maxTruckProfit, displayRoutes,
      fuelCost, roadCost, driverCost,
      slicesWithPct, conicGradient, totalPie,
      prevRevenue, prevCosts, prevGross, prevNet,
    };
  }, [stats, pnlReport, prevPnlReport, allTrips]);

  const createdTripsCount = createdTrips.length;

  const formattedRevenue = formatCompact(derived?.revenue ?? 0);
  const formattedCosts = formatCompact(derived?.costs ?? 0);
  const formattedTotalPie = formatCompact(derived?.totalPie ?? 1);
  const formattedGross = formatCompact(derived?.grossProfit ?? 0);
  const formattedNet = formatCompact(derived?.netProfit ?? 0);

  return {
    currentMonth,
    currentYear,
    stats,
    loading,
    pnlReport,
    prevPnlReport,
    allTrips,
    createdTrips,
    createdTripsCount,
    renewalReminders,
    receivablesSummary,
    yearlySeries,
    topOverdueCustomer,
    topShareholder,
    fuelWarnings,
    recentAudit,
    derived,
    formattedRevenue,
    formattedCosts,
    formattedTotalPie,
    formattedGross,
    formattedNet,
  };
}
