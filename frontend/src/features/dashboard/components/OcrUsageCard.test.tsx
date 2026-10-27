// NEPO-27 — OCR usage tile contracts on the dashboard:
// 1. used vs allowance and remaining are always shown for the current month;
// 2. usage beyond the allowance is flagged with the overage count AND its
//    cost at the configured per-call price (VND, no decimals);
// 3. non-example figures (the settings are configurable) render as given;
// 4. load/error states are honest instead of showing zeros.
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { OcrUsageCard } from './OcrUsageCard';
import type { OcrUsageStatus } from '@tingting/shared';

const BASE: OcrUsageStatus = {
  period: '2026-10',
  monthlyAllowance: 10000,
  overagePricePerCall: 200,
  used: 1234,
  remaining: 8766,
  overageCount: 0,
  overageCost: 0,
};

const baseProps = {
  status: BASE,
  loading: false,
  isError: false,
  onRetry: vi.fn(),
  monthLabel: '10',
  canManage: false,
  onNavigate: vi.fn(),
};

afterEach(cleanup);

describe('OcrUsageCard (NEPO-27)', () => {
  it('shows used vs allowance and remaining within the month', () => {
    render(<OcrUsageCard {...baseProps} />);
    expect(screen.getByText('Tháng 10 · counter tự reset đầu tháng')).toBeTruthy();
    expect(screen.getByText('1.234')).toBeTruthy();
    expect(screen.getByText('Đã dùng / 10.000')).toBeTruthy();
    expect(screen.getByText('8.766')).toBeTruthy();
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
    expect(screen.getByText('Đã dùng / 5')).toBeTruthy();
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
