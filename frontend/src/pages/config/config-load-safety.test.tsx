import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import SalaryPeriodConfigPage from './SalaryPeriodConfigPage';
import CompanyInfoConfigPage from './CompanyInfoConfigPage';

const mocks = vi.hoisted(() => ({ salaryConfig: vi.fn(), salarySave: vi.fn(), company: vi.fn(), retry: vi.fn() }));
vi.mock('../../hooks/useSalaryQueries', () => ({ useSalaryPeriodDefault: mocks.salaryConfig, useUpdateSalaryPeriodDefault: mocks.salarySave }));
vi.mock('../../hooks/useCatalogQueries', () => ({ useCompanyInfo: mocks.company, useSaveCompanyInfo: () => ({ mutateAsync: vi.fn() }) }));
vi.mock('../../hooks/animations', () => ({ usePageAnimations: () => ({ rootRef: { current: null } }) }));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.salaryConfig.mockReturnValue({ data: undefined, isLoading: false, error: new Error('offline'), refetch: mocks.retry });
  mocks.salarySave.mockReturnValue({ error: null, isPending: false, mutateAsync: vi.fn() });
  mocks.company.mockReturnValue({ data: undefined, isLoading: false, error: new Error('offline'), refetch: mocks.retry });
});
afterEach(cleanup);

it('does not let office users overwrite a salary rule that failed to load', () => {
  render(<MemoryRouter><SalaryPeriodConfigPage /></MemoryRouter>);
  expect(screen.queryByRole('button', { name: 'Lưu mặc định' })).toBeNull();
  expect(screen.queryByText(/Cấu hình hiện tại:/)).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
  expect(mocks.retry).toHaveBeenCalledOnce();
});

it('waits for the existing salary rule before enabling configuration', () => {
  mocks.salaryConfig.mockReturnValue({ data: undefined, isLoading: true, error: null });
  render(<MemoryRouter><SalaryPeriodConfigPage /></MemoryRouter>);
  expect(screen.getByRole('status').textContent).toBe('Đang tải cấu hình kỳ lương…');
  expect(screen.queryByRole('button', { name: 'Lưu mặc định' })).toBeNull();
});

it('surfaces failed salary saves and labels both custom-period controls', () => {
  mocks.salaryConfig.mockReturnValue({ data: { defaultStartDay: 26, defaultEndDay: 25 }, isLoading: false, error: null });
  mocks.salarySave.mockReturnValue({ error: new Error('Không có quyền thay đổi'), isPending: false, mutateAsync: vi.fn() });
  render(<MemoryRouter><SalaryPeriodConfigPage /></MemoryRouter>);
  expect(screen.getByRole('alert').textContent).toBe('Không có quyền thay đổi');
  expect(screen.getByLabelText('Ngày bắt đầu (tháng trước)')).toHaveProperty('value', '26');
  expect(screen.getByLabelText('Ngày kết thúc (tháng này)')).toHaveProperty('value', '25');
});

it('does not render an empty company editor after a failed fetch', () => {
  render(<MemoryRouter><CompanyInfoConfigPage /></MemoryRouter>);
  expect(screen.getByText('Không thể tải thông tin công ty')).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Lưu thông tin' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
  expect(mocks.retry).toHaveBeenCalledOnce();
});
