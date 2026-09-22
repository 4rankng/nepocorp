import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import SalaryAttendancePage from './SalaryAttendancePage';
const mocks = vi.hoisted(() => ({ list: vi.fn(), workDays: vi.fn(), salary: vi.fn(), period: vi.fn(), retry: vi.fn(), update: vi.fn() }));
vi.mock('../hooks/useSalaryQueries', () => ({
  useSalaryList: mocks.list, useDriverWorkDays: mocks.workDays, useDriverSalary: mocks.salary,
  useUpdateWorkDays: () => ({ mutateAsync: mocks.update }),
  useConfirmSalary: () => ({}), useUnconfirmSalary: () => ({}),
}));
vi.mock('../hooks/useCatalogQueries', () => ({ useSalaryPeriod: mocks.period }));
vi.mock('../hooks/useMonth', () => ({ useMonth: () => ({ month: 9, year: 2026 }) }));
vi.mock('../hooks/useAuth', () => ({ useAuth: () => ({ user: { role: 'ADMIN' } }) }));
vi.mock('../hooks/animations', () => ({ usePageAnimations: () => ({ rootRef: { current: null } }) }));
vi.mock('../hooks/useBackShortcut', () => ({ useBackShortcut: vi.fn() }));
vi.mock('../components/shared/Toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('./salary-attendance-components', () => ({
  CalCell: () => <button>Attendance cell</button>, MobileDayList: () => <button>Mobile attendance</button>,
  DriverPayoutModal: () => null, SalarySummaryCard: () => <div>Salary summary</div>, STATUS_CONFIG: {}, DOW_LABELS: [],
}));
const loaded = (data: unknown) => ({ data, error: null, isLoading: false, refetch: mocks.retry });
const mount = () => render(<MemoryRouter><SalaryAttendancePage /></MemoryRouter>);
beforeEach(() => {
  vi.clearAllMocks();
  mocks.list.mockReturnValue(loaded({ items: [{ id: 1, name: 'Lái xe A' }, { id: 2, name: 'Lái xe B' }] }));
  mocks.workDays.mockReturnValue(loaded({ workDays: [] }));
  mocks.salary.mockReturnValue(loaded({ confirmationStatus: 'DRAFT' }));
  mocks.period.mockReturnValue(loaded({ start: '2026-09-01', end: '2026-09-30' }));
});
afterEach(cleanup);

it.each(['list', 'workDays', 'salary', 'period'] as const)('does not display defaults or editable attendance when %s fails', (key) => {
  mocks[key].mockReturnValue({ ...mocks[key](), error: new Error('offline') });
  const view = mount();
  expect(screen.getByRole('alert').textContent).toContain('Không thể tải dữ liệu kỳ lương');
  expect(screen.queryByText('Attendance cell')).toBeNull();
  expect(screen.queryByText('Mobile attendance')).toBeNull();
  expect(screen.queryByRole('button', { name: 'Ghi thanh toán' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
  expect(mocks.retry).toHaveBeenCalled();
  mocks[key].mockReturnValue({ ...mocks[key](), error: null });
  view.rerender(<MemoryRouter><SalaryAttendancePage /></MemoryRouter>);
  expect(screen.queryByRole('alert')).toBeNull();
});

it.each(['workDays', 'salary', 'period'] as const)('waits for %s before displaying editable attendance', (key) => {
  mocks[key].mockReturnValue({ ...loaded(undefined), isLoading: true });
  mount();
  expect(screen.queryByText('Attendance cell')).toBeNull();
  expect(screen.queryByText('Mobile attendance')).toBeNull();
});

it('exposes driver selection as focusable buttons with the current state', () => {
  mount();
  const second = screen.getByRole('button', { name: 'Lái xe B' });
  second.focus();
  expect(document.activeElement).toBe(second);
  expect(second.getAttribute('aria-pressed')).toBe('false');
  fireEvent.click(second);
  expect(second.getAttribute('aria-pressed')).toBe('true');
  expect(mocks.salary).toHaveBeenLastCalledWith(2, 2026, 9);
});
