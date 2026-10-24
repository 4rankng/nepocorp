// NEPO-13 — KPI trust contracts on the dashboard stat row:
// 1. a zero baseline is not a comparison: no 'Mới' pill and no fake
//    'Tháng trước · 0 ₫' line;
// 2. net ≡ gross (no company expense / other income) must say so instead of
//    rendering two identical figures like a bug;
// 3. the debt card reconciles its two overdue numbers on one line and routes
//    to /debt like the banner does.
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DashboardKpiRow } from './DashboardKpiRow';

const BASE = {
  currentMonth: 10,
  currentYear: 2026,
  revenue: 2_921_000_000,
  prevRevenue: 0,
  revenueMoM: null,
  costs: 491_295_850,
  costsMoM: null,
  costRatio: 16.8,
  grossProfit: 2_429_704_150,
  grossMoM: null,
  grossMargin: 83.2,
  netProfit: 2_429_704_150,
  netMoM: null,
  netEqualsGross: false,
  totalOutstanding: 6_182_338_926,
  overdueCustomers: 13,
  over90Count: 5,
  onNavigate: vi.fn(),
};

afterEach(cleanup);

describe('DashboardKpiRow (NEPO-13)', () => {
  it('shows no baseline line and no Mới pill when the previous month is empty', () => {
    render(<DashboardKpiRow {...BASE} />);
    expect(screen.getByText('Không có số tháng trước')).toBeTruthy();
    expect(screen.queryByText(/Mới/)).toBeNull();
  });

  it('keeps the previous-month line and pill once a real baseline exists', () => {
    render(<DashboardKpiRow {...BASE} prevRevenue={1_000} revenueMoM="+12.0%" />);
    expect(screen.getByText(/Tháng trước · 1\.000 ₫/)).toBeTruthy();
    expect(screen.getByText(/12\.0%/)).toBeTruthy();
  });

  it('explains net ≡ gross when no company expense / other income exists', () => {
    render(<DashboardKpiRow {...BASE} netEqualsGross />);
    expect(screen.getByText(/Bằng LN gộp — chưa có chi phí công ty \/ thu khác/)).toBeTruthy();
  });

  it('keeps the "Sau phí quản lý" wording once company figures exist', () => {
    render(<DashboardKpiRow {...BASE} netEqualsGross={false} />);
    expect(screen.getByText(/Sau phí quản lý/)).toBeTruthy();
  });

  it('reconciles the overdue counts on the debt card and routes to /debt', () => {
    const onNavigate = vi.fn();
    render(<DashboardKpiRow {...BASE} onNavigate={onNavigate} over90Count={5} />);
    expect(screen.getByText(/13 khách quá hạn · 5 trên 90 ngày/)).toBeTruthy();
    fireEvent.click(screen.getByText('Xem công nợ →'));
    expect(onNavigate).toHaveBeenCalledWith('/debt');
  });
});
