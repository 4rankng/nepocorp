// NEPO-27 / NEPO-28 — OCR usage tile contracts on the dashboard:
// 1. used vs allowance and remaining are always shown for the current month;
// 2. usage beyond the allowance is flagged with the overage count AND its
//    cost at the configured per-call price (VND, no decimals);
// 3. non-example figures (the settings are configurable) render as given;
// 4. load/error states are honest instead of showing zeros;
// 5. NEPO-28: the tile labels itself with the period the DATA covers, and the
//    four metric cells carry the month view (used · projected · average ·
//    overage cost) without repeating the daily chart.
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { OcrUsageCard } from './OcrUsageCard';
import type { OcrUsageStatus } from '@tingting/shared';

// The chart sizes itself from its container — jsdom has no ResizeObserver.
// Same stub the sibling chart tests use (RevenueTrendChart.test.tsx).
beforeAll(() => {
  vi.stubGlobal('ResizeObserver', class {
    observe() {}
    unobserve() {}
    disconnect() {}
  });
});

const BASE: OcrUsageStatus = {
  period: '2026-10',
  monthlyAllowance: 10000,
  overagePricePerCall: 200,
  used: 1234,
  remaining: 8766,
  overageCount: 0,
  overageCost: 0,
  elapsedDays: 10,
  daysInMonth: 31,
  daily: [
    { date: '2026-10-01', count: 100 },
    { date: '2026-10-02', count: 0 },
    { date: '2026-10-03', count: 234 },
    { date: '2026-10-04', count: 0 },
    { date: '2026-10-05', count: 200 },
    { date: '2026-10-06', count: 0 },
    { date: '2026-10-07', count: 300 },
    { date: '2026-10-08', count: 0 },
    { date: '2026-10-09', count: 200 },
    { date: '2026-10-10', count: 200 },
  ],
  dailyAverage: 123,
  projectedTotal: 3825,
};

const baseProps = {
  status: BASE,
  loading: false,
  isError: false,
  onRetry: vi.fn(),
  canManage: false,
  onNavigate: vi.fn(),
};

afterEach(cleanup);

describe('OcrUsageCard (NEPO-27)', () => {
  it('shows used vs allowance and remaining within the month', () => {
    render(<OcrUsageCard {...baseProps} />);
    expect(screen.getByText('1.234')).toBeTruthy();
    expect(screen.getByText('Đã dùng')).toBeTruthy();
    expect(screen.getByText('Còn 8.766 lượt')).toBeTruthy();
    expect(screen.queryByTestId('ocr-usage-overage')).toBeNull();
  });

  it('flags overage count and cost when the allowance is exceeded', () => {
    const over: OcrUsageStatus = {
      ...BASE,
      used: 10050,
      remaining: 0,
      overageCount: 50,
      overageCost: 10000,
    };
    render(<OcrUsageCard {...baseProps} status={over} />);
    expect(screen.getByTestId('ocr-usage-overage').textContent).toContain('50');
    expect(screen.getByTestId('ocr-usage-overage').textContent).toContain('10.000 ₫');
  });

  it('renders configurable (non-example) settings as given', () => {
    const custom: OcrUsageStatus = {
      ...BASE,
      monthlyAllowance: 5,
      overagePricePerCall: 12000,
      used: 8,
      remaining: 0,
      overageCount: 3,
      overageCost: 36000,
    };
    render(<OcrUsageCard {...baseProps} status={custom} />);
    expect(screen.getByText('Còn 0 lượt')).toBeTruthy();
    expect(screen.getByTestId('ocr-usage-overage').textContent).toContain('36.000 ₫');
  });

  it('offers the settings shortcut only to ADMIN', () => {
    const { rerender } = render(<OcrUsageCard {...baseProps} canManage />);
    expect(screen.getByText('Cài đặt')).toBeTruthy();
    rerender(<OcrUsageCard {...baseProps} canManage={false} />);
    expect(screen.queryByText('Cài đặt')).toBeNull();
  });

  it('shows an error state with retry instead of silent zeros', () => {
    render(<OcrUsageCard {...baseProps} status={null} isError />);
    expect(screen.getByTestId('ocr-usage-card-error')).toBeTruthy();
    expect(screen.getByText('Thử lại')).toBeTruthy();
  });
});

describe('OcrUsageCard (NEPO-28) — metric row + chart', () => {
  it('labels the tile with the period the data covers', () => {
    render(<OcrUsageCard {...baseProps} />);
    expect(screen.getByText('Tháng 10/2026 · counter tự reset đầu tháng')).toBeTruthy();
  });

  it('shows the four month-level metrics without duplicating the chart', () => {
    render(<OcrUsageCard {...baseProps} />);
    expect(screen.getByText('Đã dùng')).toBeTruthy();
    expect(screen.getByText('Dự báo tháng')).toBeTruthy();
    expect(screen.getByText('Trung bình')).toBeTruthy();
    expect(screen.getByText('Phát sinh ngoài gói')).toBeTruthy();
    expect(screen.getByText('~3.825')).toBeTruthy();
    expect(screen.getByText('123')).toBeTruthy();
    expect(screen.getByText('lượt / ngày')).toBeTruthy();
  });

  it('states the allowance state in words, not a badge', () => {
    render(<OcrUsageCard {...baseProps} />);
    expect(screen.getByText('Đang trong hạn mức')).toBeTruthy();
    expect(screen.getByText('Còn 8.766 lượt')).toBeTruthy();
  });

  it('flags the near-limit state in words', () => {
    const high: OcrUsageStatus = { ...BASE, used: 9000, remaining: 1000 };
    render(<OcrUsageCard {...baseProps} status={high} />);
    expect(screen.getByText('Sắp chạm hạn mức (còn 1.000)')).toBeTruthy();
  });

  it('renders the daily request chart with one slot per day of the month', () => {
    const { container } = render(<OcrUsageCard {...baseProps} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
    // 31 days of the month → 31 hit areas (the whole cadence, measured or not).
    expect(container.querySelectorAll('[role="button"]').length).toBe(31);
  });

  it('says so when the month has no requests yet (no empty 0–1 axis)', () => {
    const empty: OcrUsageStatus = {
      ...BASE,
      used: 0,
      remaining: 10000,
      dailyAverage: 0,
      projectedTotal: 0,
      daily: BASE.daily.map((d) => ({ ...d, count: 0 })),
    };
    const { container } = render(<OcrUsageCard {...baseProps} status={empty} />);
    expect(container.textContent).toContain('Chưa có request OCR nào trong tháng');
    // The y-axis must not invent a "1" gridline around an empty month.
    // (The y labels sit at x = mL - 6; the day labels sit under the axis.)
    const yLabels = Array.from(container.querySelectorAll('svg text'))
      .filter((t) => t.getAttribute('x') === '24')
      .map((t) => t.textContent);
    expect(yLabels).toEqual(['0']);
  });

  it('offers the report export to everyone who sees the tile', () => {
    render(<OcrUsageCard {...baseProps} />);
    expect(screen.getByText('Xuất báo cáo')).toBeTruthy();
  });

  it('labels the tile with the month the data covers (any month)', () => {
    const past: OcrUsageStatus = {
      ...BASE,
      period: '2026-09',
      elapsedDays: 30,
      daysInMonth: 30,
      daily: [],
      dailyAverage: 100,
      projectedTotal: 3000,
    };
    render(<OcrUsageCard {...baseProps} status={past} />);
    expect(screen.getByText('Tháng 09/2026 · counter tự reset đầu tháng')).toBeTruthy();
  });
});
