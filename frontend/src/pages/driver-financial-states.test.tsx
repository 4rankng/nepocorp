import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import DriverPenaltyPage from './DriverPenaltyPage';
import DriverEarningsPage from './DriverEarningsPage';

const mocks = vi.hoisted(() => ({ penalties: vi.fn(), period: vi.fn(), earnings: vi.fn(), retry: vi.fn(), animateCounters: vi.fn() }));
vi.mock('../hooks/useQueries', () => ({
  useDriverPenalties: mocks.penalties,
  useSalaryPeriod: mocks.period,
  useDriverEarnings: mocks.earnings,
  useDriverVehicleAlerts: () => ({ data: { items: [] } }),
}));
vi.mock('../hooks/useMonth', () => ({ useMonth: () => ({ month: 9, year: 2026 }) }));
vi.mock('../hooks/animations', () => ({
  usePageAnimations: () => ({ rootRef: { current: null } }),
  useListAnimations: () => ({ rootRef: { current: null } }),
  useCounterAnimation: () => ({ animateCounters: mocks.animateCounters }),
}));
const success = (data: unknown) => ({ data, isLoading: false, error: null, refetch: mocks.retry });
const penalty = { id: 1, date: '2026-01-04', amount: '150000', customReason: 'Vi phạm tháng cũ' };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.penalties.mockReturnValue(success([penalty]));
  mocks.period.mockReturnValue(success({ start: '2026-09-01', end: '2026-09-30' }));
  mocks.earnings.mockReturnValue(success({ baseSalary: '5000000', penalties: '150000', productionSalary: '1000000', roadAllowance: '200000', paidOrAdvanced: '3000000', payableBalance: '3050000', netIncome: '4850000' }));
});
afterEach(cleanup);

it('never claims no violations while driver penalties are still loading', () => {
  mocks.penalties.mockReturnValue({ ...success(undefined), isLoading: true });
  const { container } = render(<DriverPenaltyPage />);
  expect(screen.queryByText(/Không vi phạm/)).toBeNull();
  expect(container.querySelector('.penalty-kpi-grid')).toBeNull();
  expect(screen.getByText('Đang tải dữ liệu kỳ lương...')).toBeTruthy();
});

it('shows a recoverable error instead of a clean record when penalties fail', () => {
  mocks.penalties.mockReturnValue({ ...success(undefined), error: new Error('offline') });
  render(<DriverPenaltyPage />);
  expect(screen.queryByText(/Không vi phạm/)).toBeNull();
  expect(screen.queryByText('Không có biên bản vi phạm')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
  expect(mocks.retry).toHaveBeenCalled();
});

it('does not display unfiltered penalty history while the selected salary period loads', () => {
  mocks.period.mockImplementation((month) => month === 8 ? { ...success(undefined), isLoading: true } : success({ start: '2026-09-01', end: '2026-09-30' }));
  render(<DriverPenaltyPage />);
  const select = screen.getByRole('combobox');
  // Add an explicit option to keep this interaction independent of the test machine date.
  const option = document.createElement('option');
  option.value = '2026-08';
  select.append(option);
  fireEvent.change(select, { target: { value: '2026-08' } });
  expect(screen.queryByText(penalty.customReason)).toBeNull();
  expect(screen.getByText('Đang tải…')).toBeTruthy();
});

it('shows penalty-history failure separately from the loaded earnings totals', () => {
  mocks.penalties.mockReturnValue({ ...success(undefined), error: new Error('offline') });
  render(<DriverEarningsPage />);
  expect(screen.getByText('Lương chưa thanh toán')).toBeTruthy();
  expect(screen.getByText('Không thể tải lịch sử khấu trừ.')).toBeTruthy();
  expect(screen.queryByText('Chưa có khoản khấu trừ nào')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Tải lại lịch sử' }));
  expect(mocks.retry).toHaveBeenCalled();
});

it('keeps the deduction minus sign and currency when income counters animate', () => {
  render(<DriverEarningsPage />);
  const targets = mocks.animateCounters.mock.calls[0][0] as Array<{ value: number; prefix?: string; suffix?: string }>;
  expect(targets.find(target => target.value === 150000)).toMatchObject({ prefix: '-', suffix: ' đ' });
  expect(targets.find(target => target.value === 5000000)).toMatchObject({ suffix: ' đ' });
});

it('retains canceled penalties in history without counting them as current violations', () => {
  mocks.period.mockReturnValue(success({ start: '2026-01-01', end: '2026-01-31' }));
  mocks.penalties.mockReturnValue(success([{ ...penalty, status: 'CANCELED' }]));
  render(<DriverPenaltyPage />);
  expect(screen.getByText(/Không vi phạm/)).toBeTruthy();
  expect(screen.getByText(penalty.customReason)).toBeTruthy();
  expect(screen.getByText('Đã hủy · Không khấu trừ')).toBeTruthy();
  expect(screen.queryByText('-150.000 ₫')).toBeNull();
});

it('shows only active entries as payroll deductions while retaining authoritative earnings', () => {
  mocks.penalties.mockReturnValue(success([
    { ...penalty, status: 'CANCELED' },
    { ...penalty, id: 2, status: 'ACTIVE', customReason: 'Vi phạm còn hiệu lực' },
  ]));
  render(<DriverEarningsPage />);
  expect(screen.queryByText(penalty.customReason)).toBeNull();
  expect(screen.getByText('Vi phạm còn hiệu lực')).toBeTruthy();
  expect(screen.getByText('1 khoản khấu trừ')).toBeTruthy();
  expect(screen.getAllByText('3.050.000').length).toBeGreaterThan(0);
});
