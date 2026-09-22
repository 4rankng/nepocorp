import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import type { CounterTarget } from '../hooks/animations';
import ForwarderAdvancesPage from './ForwarderAdvancesPage';

const mocks = vi.hoisted(() => ({
  requests: vi.fn(),
  balance: vi.fn(),
  settlements: vi.fn(),
  create: vi.fn(),
  animateCounters: vi.fn(),
  prefersReduced: { value: true },
}));

vi.mock('../hooks/useQueries', () => ({
  useForwarderAdvanceRequests: mocks.requests,
  useCreateAdvanceRequest: mocks.create,
  useForwarderAdvanceBalance: mocks.balance,
  useForwarderSettlements: mocks.settlements,
}));
vi.mock('../hooks/useMonth', () => ({ useMonth: () => ({ month: 9, year: 2026 }) }));
vi.mock('../hooks/animations', () => ({
  usePageAnimations: () => ({ rootRef: { current: null } }),
  useListAnimations: () => ({ rootRef: { current: null } }),
  useCounterAnimation: () => ({ animateCounters: mocks.animateCounters }),
}));
vi.mock('../hooks/usePrefersReducedMotion', () => ({
  usePrefersReducedMotion: () => mocks.prefersReduced.value,
}));

/** Settled-counter stand-in for the documented useCounterAnimation contract:
 *  el.textContent = prefix + formatted value + suffix (verbatim concatenation). */
function settleCounters(targets: CounterTarget[]) {
  for (const { el, value, prefix = '', suffix = '', locale = 'vi-VN', format } of targets) {
    if (!el) continue;
    el.textContent = format
      ? format(value)
      : `${prefix}${Math.round(value).toLocaleString(locale)}${suffix}`;
  }
}

const request = {
  id: 1,
  requesterName: 'Nguyễn Văn A',
  requesterId: 2,
  amount: '20000000',
  createdAt: '2026-09-10T00:00:00.000Z',
  status: 'PENDING',
  reason: 'Tạm ứng nâng hạ',
  approverName: null,
  approvedAt: null,
};
const success = (data: unknown) => ({ data, isLoading: false, error: null, refetch: vi.fn() });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.prefersReduced.value = true;
  mocks.animateCounters.mockImplementation(() => {});
  mocks.requests.mockReturnValue(success({ items: [request], counts: { PENDING: 1 } }));
  mocks.balance.mockReturnValue(success({ outstanding: '197090978' }));
  mocks.settlements.mockReturnValue(success({ items: [] }));
  mocks.create.mockReturnValue({ error: null, mutate: vi.fn() });
});
afterEach(cleanup);

it('shows the outstanding amount with its ₫ marker and the normalized label', () => {
  const { container } = render(<MemoryRouter><ForwarderAdvancesPage /></MemoryRouter>);
  const value = container.querySelector('.hero-kpi-mini--accent .hero-kpi-mini__value');
  expect(value?.textContent).toBe('197.090.978₫');
  expect(value?.querySelector('.hero-kpi-mini__currency')?.textContent).toBe('₫');
  expect(screen.getByText('Đang tạm ứng thực tế')).toBeTruthy();
});

it('renders the pending count with exactly one space before the counter runs', () => {
  const { container } = render(<MemoryRouter><ForwarderAdvancesPage /></MemoryRouter>);
  expect(container.querySelector('.hero-kpi-mini--warn .hero-kpi-mini__value')?.textContent).toBe('1 chờ duyệt');
});

it('keeps one space and the ₫ marker after the counter animation settles', () => {
  mocks.prefersReduced.value = false;
  mocks.animateCounters.mockImplementation(settleCounters);
  const { container } = render(<MemoryRouter><ForwarderAdvancesPage /></MemoryRouter>);
  expect(container.querySelector('.hero-kpi-mini--warn .hero-kpi-mini__value')?.textContent).toBe('1 chờ duyệt');
  const value = container.querySelector('.hero-kpi-mini--accent .hero-kpi-mini__value');
  expect(value?.textContent).toBe('197.090.978₫');
  expect(value?.querySelector('.hero-kpi-mini__currency')?.textContent).toBe('₫');
});
